"""CLI парсера Telegram-аккаунтов.

    python -m tg_parser login
    python -m tg_parser parse @mychat --mode members --out exports/chat.csv
    python -m tg_parser export --format xlsx --out exports/all.xlsx
    python -m tg_parser stats
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Any, Sequence

from tg_parser import __version__
from tg_parser.client import build_client, ensure_authorized
from tg_parser.collectors import COLLECTORS, MODES, CollectContext, CollectorError
from tg_parser.config import ConfigError, Settings
from tg_parser.exporters import ExportError, export
from tg_parser.filters import Filters
from tg_parser.models import UserRecord
from tg_parser.storage import Storage
from tg_parser.utils import (
    RateLimiter,
    TargetError,
    audit,
    confirm,
    log,
    parse_since,
    resolve_entity,
    setup_logging,
    with_flood_retry,
)

DEFAULT_DB = "data/accounts.db"


# --------------------------------------------------------------------------
# Разбор аргументов
# --------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tg_parser",
        description="Парсер Telegram-аккаунтов из групп и каналов",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Режимы сбора:\n"
            "  members   участники группы/супергруппы (для канала — только админам)\n"
            "  admins    администраторы и владелец\n"
            "  messages  авторы сообщений в истории\n"
            "  comments  комментаторы канала (связанный чат обсуждений)\n"
            "  reactions поставившие реакции на посты\n"
            "  all       все режимы подряд, недоступные пропускаются\n"
        ),
    )
    parser.add_argument("--version", action="version", version=f"tg_parser {__version__}")
    parser.add_argument("-v", "--verbose", action="store_true", help="подробный лог")
    parser.add_argument("--env-file", default=".env", help="путь к .env (по умолчанию ./.env)")
    parser.add_argument("--db", default=DEFAULT_DB, help=f"файл базы (по умолчанию {DEFAULT_DB})")
    parser.add_argument("--log-file", default="logs/tg_parser.log", help="файл журнала действий")

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("login", help="войти в Telegram и сохранить сессию")

    run = sub.add_parser("parse", help="собрать аккаунты из чатов/каналов")
    run.add_argument("targets", nargs="+", help="@username, ссылка t.me/... или числовой id")
    run.add_argument(
        "--mode",
        default="members",
        help=f"режимы через запятую: {', '.join(MODES)}, all (по умолчанию members)",
    )
    run.add_argument("--limit", type=int, help="лимит участников / просматриваемых сообщений")
    run.add_argument("--since", help="не глубже даты: 2026-01-31, 30d, 12h, 4w")
    run.add_argument(
        "--deep",
        action="store_true",
        help="обход лимита ~10000 участников перебором поисковых префиксов (дольше)",
    )
    run.add_argument("--out", help="сразу выгрузить результат в файл")
    run.add_argument("--format", dest="fmt", help="csv | json | jsonl | xlsx | txt")
    _add_filter_args(run)

    out = sub.add_parser("export", help="выгрузить накопленную базу в файл")
    out.add_argument("--out", required=True, help="путь к файлу выгрузки")
    out.add_argument("--format", dest="fmt", help="csv | json | jsonl | xlsx | txt")
    out.add_argument("--chat-id", type=int, help="только по одному чату")
    out.add_argument("--source-mode", help="только записи одного режима сбора")
    out.add_argument("--force", action="store_true", help="перезаписать существующий файл")
    _add_filter_args(out)

    sub.add_parser("stats", help="статистика по базе")

    reset = sub.add_parser("reset", help="очистить базу (требует подтверждения)")
    reset.add_argument("--yes", action="store_true", help="без интерактивного подтверждения")

    return parser


def _add_filter_args(parser: argparse.ArgumentParser) -> None:
    group = parser.add_argument_group("фильтры")
    group.add_argument("--include-bots", action="store_true", help="не отбрасывать ботов")
    group.add_argument("--include-deleted", action="store_true", help="не отбрасывать удалённых")
    group.add_argument("--skip-scam", action="store_true", help="отбросить scam/fake аккаунты")
    group.add_argument("--only-username", action="store_true", help="только с @username")
    group.add_argument("--only-phone", action="store_true", help="только с видимым телефоном")
    group.add_argument("--only-premium", action="store_true", help="только Telegram Premium")
    group.add_argument(
        "--last-seen",
        choices=["online", "offline", "recently", "last_week", "last_month"],
        help="не старее указанной активности",
    )
    group.add_argument("--name-match", help="регулярка по имени/юзернейму")
    group.add_argument("--min-messages", type=int, default=0, help="минимум сообщений автора")


def filters_from_args(args: argparse.Namespace) -> Filters:
    return Filters(
        skip_bots=not getattr(args, "include_bots", False),
        skip_deleted=not getattr(args, "include_deleted", False),
        skip_scam=getattr(args, "skip_scam", False),
        only_with_username=getattr(args, "only_username", False),
        only_with_phone=getattr(args, "only_phone", False),
        only_premium=getattr(args, "only_premium", False),
        max_last_seen=getattr(args, "last_seen", None),
        name_pattern=getattr(args, "name_match", None),
        min_messages=getattr(args, "min_messages", 0),
    )


def resolve_modes(raw: str) -> list[str]:
    if raw.strip().lower() == "all":
        return list(MODES)
    modes = [m.strip().lower() for m in raw.split(",") if m.strip()]
    unknown = [m for m in modes if m not in COLLECTORS]
    if unknown:
        raise SystemExit(
            f"Неизвестный режим: {', '.join(unknown)}. Доступно: {', '.join(MODES)}, all"
        )
    return modes


# --------------------------------------------------------------------------
# Команды
# --------------------------------------------------------------------------

async def cmd_login(args: argparse.Namespace, settings: Settings) -> int:
    client = build_client(settings)
    try:
        me = await ensure_authorized(client, settings)
        name = f"@{me.username}" if me.username else me.first_name
        print(f"Вход выполнен: {name} (id {me.id}). Сессия: {settings.session}.session")
    finally:
        await client.disconnect()
    return 0


async def cmd_parse(args: argparse.Namespace, settings: Settings) -> int:
    modes = resolve_modes(args.mode)
    since = parse_since(args.since)
    filters = filters_from_args(args)
    limiter = RateLimiter(settings.request_delay)

    client = build_client(settings)
    total_new = 0
    failures = 0

    with Storage(args.db) as storage:
        try:
            await ensure_authorized(client, settings)

            for target in args.targets:
                try:
                    entity = await resolve_entity(client, target)
                except (TargetError, ValueError) as exc:
                    log.error("Цель %s недоступна: %s", target, exc)
                    audit("resolve", target, result="failed", error=type(exc).__name__)
                    failures += 1
                    continue

                for mode in modes:
                    stats = {"new": 0, "seen": 0}

                    def emit(record: UserRecord, _stats: dict[str, int] = stats) -> None:
                        if not filters.match(record):
                            return
                        if storage.upsert(record):
                            _stats["new"] += 1
                        _stats["seen"] += 1

                    ctx = CollectContext(
                        client=client,
                        entity=entity,
                        limiter=limiter,
                        emit=emit,
                        limit=args.limit,
                        since=since,
                        deep=args.deep,
                    )
                    try:
                        await with_flood_retry(
                            lambda mode=mode, ctx=ctx: COLLECTORS[mode](ctx),
                            max_retries=settings.max_retries,
                            label=f"{target}:{mode}",
                        )
                    except CollectorError as exc:
                        log.warning("%s [%s]: %s", target, mode, exc)
                        audit("collect", target, result="skipped", mode=mode)
                        failures += 1
                    except Exception as exc:  # noqa: BLE001 — не роняем остальные цели
                        log.error("%s [%s]: %s: %s", target, mode, type(exc).__name__, exc)
                        audit("collect", target, result="error", mode=mode)
                        failures += 1
                    finally:
                        storage.commit()

                    total_new += stats["new"]
                    print(
                        f"{ctx.title} [{mode}]: отобрано {stats['seen']}, "
                        f"новых {stats['new']}"
                    )
        finally:
            await client.disconnect()

        if args.out:
            _do_export(storage, args, filters)

    print(f"Готово. Новых аккаунтов в базе: {total_new}. База: {args.db}")
    return 1 if failures and not total_new else 0


def cmd_export(args: argparse.Namespace) -> int:
    out_path = Path(args.out)
    if out_path.exists() and not args.force:
        if not confirm(f"Файл {out_path} существует. Перезаписать?"):
            print("Отменено.")
            return 1
    with Storage(args.db) as storage:
        _do_export(storage, args, filters_from_args(args))
    return 0


def _do_export(storage: Storage, args: argparse.Namespace, filters: Filters) -> None:
    rows = storage.iter_rows(
        chat_id=getattr(args, "chat_id", None),
        method=getattr(args, "source_mode", None),
    )
    count = export(filters.apply(rows), args.out, args.fmt)
    audit("export", args.out, rows=count, format=args.fmt or Path(args.out).suffix.lstrip("."))
    print(f"Выгружено {count} записей -> {args.out}")


def cmd_stats(args: argparse.Namespace) -> int:
    with Storage(args.db) as storage:
        data = storage.stats()
    print(f"База: {args.db}")
    print(f"  всего аккаунтов : {data['users']}")
    print(f"  с @username     : {data['with_username']}")
    print(f"  с телефоном     : {data['with_phone']}")
    print(f"  premium         : {data['premium']}")
    print(f"  ботов           : {data['bots']}")
    print(f"  удалённых       : {data['deleted']}")
    if data["by_source"]:
        print("\n  Источники:")
        for row in data["by_source"]:
            print(f"    {row['source_chat']} [{row['method']}]: {row['n']}")
    return 0


def cmd_reset(args: argparse.Namespace) -> int:
    with Storage(args.db) as storage:
        count = storage.stats()["users"]
        if not confirm(f"Удалить все {count} аккаунтов из {args.db}?", assume_yes=args.yes):
            print("Отменено.")
            return 1
        storage.clear()
    audit("reset_db", args.db, removed=count)
    print(f"База очищена ({count} записей удалено).")
    return 0


# --------------------------------------------------------------------------

def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    setup_logging(args.verbose, args.log_file)

    try:
        if args.command == "stats":
            return cmd_stats(args)
        if args.command == "reset":
            return cmd_reset(args)
        if args.command == "export":
            return cmd_export(args)

        settings = Settings.from_env(args.env_file)
        handler: Any = cmd_login if args.command == "login" else cmd_parse
        return asyncio.run(handler(args, settings))
    except (ConfigError, ExportError, TargetError) as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nПрервано пользователем.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
