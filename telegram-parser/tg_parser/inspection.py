"""Разведка целей: что именно можно собрать из каждого чата/канала.

Главный вопрос для не-админа — доступен ли список участников. На него
отвечает флаг Telegram `can_view_participants`; всё остальное (комментарии,
реакции, авторы сообщений) доступно любому, кто видит контент.
"""

from __future__ import annotations

from typing import Any

from tg_parser.utils import RateLimiter, TargetError, audit, invite_hash, log, resolve_entity

# Колонки отчёта разведки.
REPORT_FIELDS = [
    "target",
    "status",
    "type",
    "title",
    "chat_id",
    "username",
    "participants",
    "members_available",
    "linked_chat",
    "linked_chat_id",
    "reactions",
    "recommended_modes",
    "note",
]


async def inspect_target(client: Any, target: str, limiter: RateLimiter) -> dict[str, Any]:
    """Возвращает строку отчёта по одной цели. Не бросает исключений."""
    row: dict[str, Any] = {name: None for name in REPORT_FIELDS}
    row["target"] = target
    await limiter.wait()

    try:
        entity = await resolve_entity(client, target)
    except TargetError as exc:
        row.update(
            status="нет доступа",
            type="приватный" if invite_hash(target) else "?",
            note=str(exc),
            recommended_modes="",
        )
        return row
    except Exception as exc:  # noqa: BLE001 — одна битая ссылка не роняет прогон
        row.update(status="ошибка", note=f"{type(exc).__name__}: {exc}", recommended_modes="")
        return row

    row.update(
        status="ok",
        type=entity_kind(entity),
        title=getattr(entity, "title", None) or getattr(entity, "first_name", None),
        chat_id=getattr(entity, "id", None),
        username=getattr(entity, "username", None),
    )

    if row["type"] in {"пользователь", "бот"}:
        row.update(
            members_available=False,
            recommended_modes="",
            note="Это личный аккаунт, а не чат — собирать нечего.",
        )
        return row

    await limiter.wait()
    full = await get_full(client, entity)
    if full is None:
        row.update(members_available=False, recommended_modes="messages", note="Нет данных чата.")
        return row

    linked = await linked_chat_info(client, full)
    row.update(
        participants=getattr(full, "participants_count", None),
        members_available=bool(getattr(full, "can_view_participants", False)),
        linked_chat=linked[0],
        linked_chat_id=linked[1],
        reactions=reactions_state(full),
    )
    row["recommended_modes"] = ",".join(recommend_modes(row))
    row["note"] = explain(row)
    return row


def entity_kind(entity: Any) -> str:
    from telethon.tl.types import Channel, Chat, User

    if isinstance(entity, User):
        return "бот" if getattr(entity, "bot", False) else "пользователь"
    if isinstance(entity, Chat):
        return "группа"
    if isinstance(entity, Channel):
        if getattr(entity, "megagroup", False):
            return "супергруппа"
        if getattr(entity, "gigagroup", False):
            return "broadcast-группа"
        return "канал"
    return type(entity).__name__


async def get_full(client: Any, entity: Any) -> Any | None:
    """ChannelFull / ChatFull — там живут participants_count и can_view_participants."""
    from telethon.tl.functions.channels import GetFullChannelRequest
    from telethon.tl.functions.messages import GetFullChatRequest
    from telethon.tl.types import Channel, Chat

    try:
        if isinstance(entity, Channel):
            result = await client(GetFullChannelRequest(entity))
        elif isinstance(entity, Chat):
            result = await client(GetFullChatRequest(entity.id))
        else:
            return None
    except Exception as exc:  # noqa: BLE001
        log.warning("Полные данные %s недоступны: %s", getattr(entity, "id", "?"), exc)
        return None
    full = result.full_chat
    full._chats = getattr(result, "chats", [])  # пригодится для linked-чата
    return full


async def linked_chat_info(client: Any, full: Any) -> tuple[str | None, int | None]:
    """Название и id связанного чата обсуждений, если он есть."""
    linked_id = getattr(full, "linked_chat_id", None)
    if not linked_id:
        return None, None
    for chat in getattr(full, "_chats", []):
        if chat.id == linked_id:
            return getattr(chat, "title", None), linked_id
    try:
        chat = await client.get_entity(linked_id)
        return getattr(chat, "title", None), linked_id
    except Exception:  # noqa: BLE001
        return None, linked_id


def reactions_state(full: Any) -> str:
    from telethon.tl.types import ChatReactionsAll, ChatReactionsSome

    value = getattr(full, "available_reactions", None)
    if isinstance(value, ChatReactionsAll):
        return "все"
    if isinstance(value, ChatReactionsSome):
        return f"ограничены ({len(value.reactions)})"
    return "выключены"


def recommend_modes(row: dict[str, Any]) -> list[str]:
    """Какие режимы имеет смысл запускать по этой цели."""
    modes: list[str] = []
    if row["members_available"]:
        modes.append("members")
    if row["linked_chat_id"]:
        modes.append("comments")
    if row["reactions"] != "выключены":
        modes.append("reactions")
    if row["type"] in {"супергруппа", "группа"} or not modes:
        modes.append("messages")
    return modes


def explain(row: dict[str, Any]) -> str:
    if row["members_available"]:
        return "Список участников открыт — можно забирать целиком."
    if row["type"] == "канал":
        return (
            "Подписчики канала закрыты (это ограничение Telegram, не обход). "
            "Доступны только те, кто себя проявил: комментарии, реакции, авторы постов."
        )
    return "Список участников закрыт настройками чата; доступна активность в сообщениях."


async def inspect_all(client: Any, targets: list[str], limiter: RateLimiter) -> list[dict]:
    rows = []
    for index, target in enumerate(targets, 1):
        row = await inspect_target(client, target, limiter)
        rows.append(row)
        log.info(
            "[%d/%d] %s -> %s | %s | участников: %s | участники видны: %s",
            index, len(targets), target, row["status"], row["type"] or "-",
            row["participants"] or "-", "да" if row["members_available"] else "нет",
        )
    audit("inspect", f"{len(targets)} целей", ok=sum(r["status"] == "ok" for r in rows))
    return rows


def summarize(rows: list[dict[str, Any]]) -> str:
    """Короткая сводка по итогам разведки."""
    ok = [r for r in rows if r["status"] == "ok"]
    members = [r for r in ok if r["members_available"]]
    linked = [r for r in ok if r["linked_chat_id"]]
    reach = sum(r["participants"] or 0 for r in ok)
    by_type: dict[str, int] = {}
    for row in ok:
        by_type[row["type"]] = by_type.get(row["type"], 0) + 1

    lines = [
        f"Проверено целей: {len(rows)}, доступно: {len(ok)}, недоступно: {len(rows) - len(ok)}",
        "  типы: " + ", ".join(f"{k} — {v}" for k, v in sorted(by_type.items())),
        f"  суммарная аудитория: {reach:,}".replace(",", " "),
        f"  список участников открыт: {len(members)}",
        f"  есть чат обсуждений (режим comments): {len(linked)}",
    ]
    if members:
        lines.append("\n  Участники доступны целиком:")
        lines += [
            f"    {r['target']} — {r['title']} ({r['participants'] or '?'})" for r in members[:20]
        ]
    return "\n".join(lines)
