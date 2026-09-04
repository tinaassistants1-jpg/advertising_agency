"""Логирование, троттлинг и разбор ссылок на чаты."""

from __future__ import annotations

import asyncio
import logging
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Iterable, Iterator, TypeVar

log = logging.getLogger("tg_parser")

T = TypeVar("T")


def setup_logging(verbose: bool = False, log_file: str | None = "logs/tg_parser.log") -> None:
    """Пишет журнал в консоль и в файл: кто, что сделал, с каким результатом."""
    level = logging.DEBUG if verbose else logging.INFO
    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(name)s | %(message)s")

    root = logging.getLogger("tg_parser")
    root.setLevel(level)
    root.handlers.clear()

    stream = logging.StreamHandler(sys.stderr)
    stream.setFormatter(fmt)
    root.addHandler(stream)

    if log_file:
        path = Path(log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(path, encoding="utf-8")
        file_handler.setFormatter(fmt)
        root.addHandler(file_handler)

    # Telethon по умолчанию очень болтлив.
    logging.getLogger("telethon").setLevel(logging.WARNING)


def audit(action: str, target: str = "", result: str = "ok", **extra: Any) -> None:
    """Строка журнала действий в едином формате."""
    parts = [f"action={action}"]
    if target:
        parts.append(f"target={target}")
    parts.extend(f"{key}={value}" for key, value in extra.items())
    parts.append(f"result={result}")
    log.info(" ".join(parts))


class RateLimiter:
    """Минимальная пауза между запросами к API."""

    def __init__(self, delay: float) -> None:
        self.delay = max(0.0, delay)
        self._last = 0.0

    async def wait(self) -> None:
        if not self.delay:
            return
        gap = time.monotonic() - self._last
        if gap < self.delay:
            await asyncio.sleep(self.delay - gap)
        self._last = time.monotonic()


async def with_flood_retry(
    factory: Callable[[], Awaitable[T]],
    *,
    max_retries: int = 3,
    max_wait: int = 3600,
    label: str = "",
) -> T:
    """Выполняет корутину, переживая FloodWaitError.

    Собранное складывается в БД по ходу дела, поэтому повтор безопасен:
    уже сохранённые аккаунты просто обновятся.
    """
    from telethon.errors import FloodWaitError  # локальный импорт: telethon не нужен для тестов

    attempt = 0
    while True:
        try:
            return await factory()
        except FloodWaitError as exc:
            attempt += 1
            wait_for = int(getattr(exc, "seconds", 0))
            if attempt > max_retries or wait_for > max_wait:
                audit("flood_wait", label, result="aborted", seconds=wait_for, attempt=attempt)
                raise
            audit("flood_wait", label, result="sleeping", seconds=wait_for, attempt=attempt)
            await asyncio.sleep(wait_for + 1)


_LINK_RE = re.compile(r"^(?:https?://)?(?:www\.)?t\.me/(.+)$", re.IGNORECASE)
_ID_RE = re.compile(r"^-?\d+$")


class TargetError(ValueError):
    """Цель нельзя разобрать или она требует ручного вступления."""


def normalize_target(target: str) -> str | int:
    """@name | t.me/name | https://t.me/name/123 | -1001234567890 -> аргумент для get_entity."""
    value = target.strip()
    if not value:
        raise TargetError("Пустая цель")

    match = _LINK_RE.match(value)
    if match:
        tail = match.group(1).strip("/")
        if tail.startswith("+") or tail.lower().startswith("joinchat/"):
            raise TargetError(
                f"{target}: приватная инвайт-ссылка. Вступите в чат аккаунтом "
                "и передайте цель как числовой id или @username."
            )
        value = tail.split("/")[0].split("?")[0]

    if _ID_RE.match(value):
        return int(value)
    return value if value.startswith("@") else "@" + value


async def resolve_entity(client: Any, target: str) -> Any:
    """Возвращает Telethon-сущность чата/канала."""
    key = normalize_target(target)
    return await client.get_entity(key)


def entity_title(entity: Any) -> str:
    for attr in ("title", "username", "first_name"):
        value = getattr(entity, attr, None)
        if value:
            return str(value)
    return str(getattr(entity, "id", "unknown"))


def chunked(items: Iterable[T], size: int) -> Iterator[list[T]]:
    batch: list[T] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def parse_since(value: str | None) -> datetime | None:
    """'2026-01-31' или '30d' / '12h' -> datetime в UTC."""
    if not value:
        return None
    raw = value.strip().lower()
    match = re.fullmatch(r"(\d+)([dhw])", raw)
    if match:
        hours = {"h": 1, "d": 24, "w": 168}[match.group(2)] * int(match.group(1))
        return datetime.now(timezone.utc) - timedelta(hours=hours)
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise TargetError(
            f"Не понимаю дату {value!r}. Форматы: 2026-01-31, 2026-01-31T10:00, 30d, 12h, 4w."
        ) from exc
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def confirm(question: str, assume_yes: bool = False) -> bool:
    """Подтверждение перед разрушительным действием."""
    if assume_yes:
        return True
    if not sys.stdin.isatty():
        log.warning("Нет интерактивного ввода — действие отменено: %s", question)
        return False
    answer = input(f"{question} [y/N]: ").strip().lower()
    return answer in {"y", "yes", "д", "да"}
