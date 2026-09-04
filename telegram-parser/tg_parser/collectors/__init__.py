"""Сборщики аккаунтов по источникам."""

from tg_parser.collectors.base import CollectContext, CollectorError
from tg_parser.collectors.comments import collect_comments
from tg_parser.collectors.members import collect_admins, collect_members
from tg_parser.collectors.messages import collect_from_messages
from tg_parser.collectors.reactions import collect_reactions

# Имя режима -> сборщик. Используется в CLI (--mode).
COLLECTORS = {
    "members": collect_members,
    "admins": collect_admins,
    "messages": collect_from_messages,
    "comments": collect_comments,
    "reactions": collect_reactions,
}

MODES = tuple(COLLECTORS)

__all__ = ["COLLECTORS", "MODES", "CollectContext", "CollectorError"]
