"""Участники группы/супергруппы (и отдельно — администраторы).

Ограничения Telegram:
* обычный участник видит список только в группах и супергруппах;
* у канала (broadcast) список подписчиков доступен только администратору;
* за один проход отдаётся не больше ~10 000 участников — режим --deep
  обходит это перебором поисковых префиксов.
"""

from __future__ import annotations

import string
from typing import Any

from tg_parser.collectors.base import CollectContext, CollectorError, is_user
from tg_parser.utils import audit, log

# Префиксы для --deep: латиница, кириллица и цифры.
SEARCH_PREFIXES = ["", *string.ascii_lowercase, *string.digits, *"абвгдежзийклмнопрстуфхцчшщэюя"]


async def collect_members(ctx: CollectContext) -> int:
    """Складывает участников чата в ctx.emit. Возвращает число уникальных."""
    from telethon.errors import ChatAdminRequiredError

    prefixes = SEARCH_PREFIXES if ctx.deep else [""]
    seen: set[int] = set()

    for prefix in prefixes:
        await ctx.limiter.wait()
        try:
            async for user in ctx.client.iter_participants(ctx.entity, search=prefix):
                if not is_user(user) or user.id in seen:
                    continue
                seen.add(user.id)
                ctx.emit(ctx.record(user, "members", role=participant_role(user)))
                if len(seen) % ctx.progress_every == 0:
                    log.info("… %s: собрано %d участников", ctx.title, len(seen))
                if ctx.limit and len(seen) >= ctx.limit:
                    audit("collect_members", ctx.title, collected=len(seen), stopped="limit")
                    return len(seen)
        except ChatAdminRequiredError as exc:
            raise CollectorError(
                f"{ctx.title}: Telegram не отдаёт список участников без прав администратора. "
                "Для каналов используйте --mode messages / comments / reactions."
            ) from exc
        except ValueError as exc:
            # iter_participants падает так на broadcast-каналах в части версий Telethon.
            raise CollectorError(f"{ctx.title}: список участников недоступен ({exc}).") from exc

    audit("collect_members", ctx.title, collected=len(seen), deep=ctx.deep)
    return len(seen)


async def collect_admins(ctx: CollectContext) -> int:
    """Только администраторы и владелец чата."""
    from telethon.tl.types import ChannelParticipantsAdmins

    count = 0
    await ctx.limiter.wait()
    async for user in ctx.client.iter_participants(ctx.entity, filter=ChannelParticipantsAdmins()):
        if not is_user(user):
            continue
        ctx.emit(ctx.record(user, "admins", role=participant_role(user) or "admin"))
        count += 1
    audit("collect_admins", ctx.title, collected=count)
    return count


def participant_role(user: Any) -> str | None:
    """creator / admin / restricted / banned / member."""
    participant = getattr(user, "participant", None)
    if participant is None:
        return None
    name = type(participant).__name__
    for marker, role in (
        ("Creator", "creator"),
        ("Admin", "admin"),
        ("Banned", "banned"),
        ("Left", "left"),
    ):
        if marker in name:
            return role
    return "member"
