"""Фильтры отбора аккаунтов."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Iterator

# Насколько «свежими» считаются категории последнего онлайна.
_RECENCY_ORDER = {
    "online": 0,
    "offline": 1,
    "recently": 2,
    "last_week": 3,
    "last_month": 4,
    "long_ago": 5,
    None: 6,
}


@dataclass
class Filters:
    skip_bots: bool = True
    skip_deleted: bool = True
    skip_scam: bool = False
    only_with_username: bool = False
    only_with_phone: bool = False
    only_premium: bool = False
    # Максимальная «давность» онлайна: online / recently / last_week / last_month.
    max_last_seen: str | None = None
    # Регулярка по имени/юзернейму (поиск по подстроке, без учёта регистра).
    name_pattern: str | None = None
    min_messages: int = 0

    def __post_init__(self) -> None:
        self._name_re = re.compile(self.name_pattern, re.IGNORECASE) if self.name_pattern else None
        if self.max_last_seen and self.max_last_seen not in _RECENCY_ORDER:
            raise ValueError(
                f"Неизвестное значение last-seen: {self.max_last_seen}. "
                f"Доступно: {', '.join(k for k in _RECENCY_ORDER if k)}"
            )

    def match(self, record: Any) -> bool:
        get = record.get if isinstance(record, dict) else lambda k, d=None: getattr(record, k, d)

        if self.skip_bots and get("is_bot"):
            return False
        if self.skip_deleted and get("is_deleted"):
            return False
        if self.skip_scam and (get("is_scam") or get("is_fake")):
            return False
        if self.only_with_username and not get("username"):
            return False
        if self.only_with_phone and not get("phone"):
            return False
        if self.only_premium and not get("is_premium"):
            return False
        if self.min_messages and (get("messages_count", 0) or 0) < self.min_messages:
            return False
        if self.max_last_seen:
            limit = _RECENCY_ORDER[self.max_last_seen]
            if _RECENCY_ORDER.get(get("last_seen"), 6) > limit:
                return False
        if self._name_re:
            haystack = " ".join(
                str(get(field) or "") for field in ("username", "first_name", "last_name")
            )
            if not self._name_re.search(haystack):
                return False
        return True

    def apply(self, rows: Iterable[Any]) -> Iterator[Any]:
        return (row for row in rows if self.match(row))


def build_predicate(filters: Filters) -> Callable[[Any], bool]:
    return filters.match
