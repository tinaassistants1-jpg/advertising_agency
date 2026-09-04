"""Общий контекст сборщиков."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable

from tg_parser.models import UserRecord
from tg_parser.utils import RateLimiter, entity_title


class CollectorError(RuntimeError):
    """Сбор невозможен: нет прав, не тот тип чата и т. п."""


@dataclass
class CollectContext:
    """Всё, что нужно сборщику: клиент, цель, троттлинг и приёмник записей."""

    client: Any
    entity: Any
    limiter: RateLimiter
    emit: Callable[[UserRecord], None]
    limit: int | None = None
    since: datetime | None = None
    deep: bool = False
    progress_every: int = 200
    title: str = field(init=False, default="")
    chat_id: int = field(init=False, default=0)

    def __post_init__(self) -> None:
        self.title = entity_title(self.entity)
        self.chat_id = int(getattr(self.entity, "id", 0) or 0)

    def record(self, user: Any, method: str, **extra: Any) -> UserRecord:
        return UserRecord.from_telethon(
            user,
            source_chat=self.title,
            source_chat_id=self.chat_id,
            method=method,
            **extra,
        )


def is_user(obj: Any) -> bool:
    """Telethon-объект — это пользователь, а не канал/чат?"""
    from telethon.tl.types import User

    return isinstance(obj, User)
