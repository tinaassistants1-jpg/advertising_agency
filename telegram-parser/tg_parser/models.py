"""Модель собранного аккаунта."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

# Порядок колонок в CSV/XLSX.
FIELDS = [
    "user_id",
    "username",
    "first_name",
    "last_name",
    "full_name",
    "phone",
    "lang_code",
    "is_bot",
    "is_premium",
    "is_verified",
    "is_scam",
    "is_fake",
    "is_deleted",
    "is_contact",
    "restricted",
    "last_seen",
    "last_online",
    "source_chat",
    "source_chat_id",
    "method",
    "role",
    "messages_count",
    "collected_at",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class UserRecord:
    """Один Telegram-аккаунт + метаданные о том, откуда он взят."""

    user_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    lang_code: str | None = None
    is_bot: bool = False
    is_premium: bool = False
    is_verified: bool = False
    is_scam: bool = False
    is_fake: bool = False
    is_deleted: bool = False
    is_contact: bool = False
    restricted: bool = False
    last_seen: str | None = None
    last_online: str | None = None
    source_chat: str = ""
    source_chat_id: int | None = None
    method: str = ""
    role: str | None = None
    messages_count: int = 0
    collected_at: str = field(default_factory=_utc_now)

    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.last_name) if p).strip()

    @property
    def link(self) -> str:
        return f"https://t.me/{self.username}" if self.username else f"tg://user?id={self.user_id}"

    def to_row(self) -> dict[str, Any]:
        row = asdict(self)
        row["full_name"] = self.full_name
        return {name: row.get(name) for name in FIELDS}

    @classmethod
    def from_telethon(
        cls,
        user: Any,
        *,
        source_chat: str = "",
        source_chat_id: int | None = None,
        method: str = "",
        role: str | None = None,
        messages_count: int = 0,
    ) -> "UserRecord":
        last_seen, last_online = describe_status(getattr(user, "status", None))
        return cls(
            user_id=user.id,
            username=getattr(user, "username", None),
            first_name=getattr(user, "first_name", None),
            last_name=getattr(user, "last_name", None),
            phone=getattr(user, "phone", None),
            lang_code=getattr(user, "lang_code", None),
            is_bot=bool(getattr(user, "bot", False)),
            is_premium=bool(getattr(user, "premium", False)),
            is_verified=bool(getattr(user, "verified", False)),
            is_scam=bool(getattr(user, "scam", False)),
            is_fake=bool(getattr(user, "fake", False)),
            is_deleted=bool(getattr(user, "deleted", False)),
            is_contact=bool(getattr(user, "contact", False)),
            restricted=bool(getattr(user, "restricted", False)),
            last_seen=last_seen,
            last_online=last_online,
            source_chat=source_chat,
            source_chat_id=source_chat_id,
            method=method,
            role=role,
            messages_count=messages_count,
        )


def describe_status(status: Any) -> tuple[str | None, str | None]:
    """Превращает UserStatus* в пару (категория, точное время последнего онлайна).

    Telegram отдаёт точное время только если пользователь это разрешил;
    иначе доступны лишь грубые категории.
    """
    if status is None:
        return None, None
    name = type(status).__name__
    mapping = {
        "UserStatusOnline": "online",
        "UserStatusRecently": "recently",
        "UserStatusLastWeek": "last_week",
        "UserStatusLastMonth": "last_month",
        "UserStatusEmpty": "long_ago",
    }
    if name == "UserStatusOffline":
        was_online = getattr(status, "was_online", None)
        return "offline", was_online.isoformat() if was_online else None
    return mapping.get(name, name), None
