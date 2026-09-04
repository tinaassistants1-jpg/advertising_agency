"""Пользователи, поставившие реакции на посты.

Работает и для каналов: реакции публичны, если автор поста не скрыл их.
"""

from __future__ import annotations

from tg_parser.collectors.base import CollectContext, CollectorError
from tg_parser.utils import audit, log

PAGE_SIZE = 100


async def collect_reactions(ctx: CollectContext) -> int:
    """Просматривает последние ctx.limit сообщений и собирает авторов реакций."""
    from telethon.errors import FloodWaitError, RPCError
    from telethon.tl.functions.messages import GetMessageReactionsListRequest

    seen: set[int] = set()
    posts = 0

    async for message in ctx.client.iter_messages(ctx.entity, limit=ctx.limit or 100):
        if ctx.since and message.date and message.date < ctx.since:
            break
        if not getattr(message, "reactions", None):
            continue
        posts += 1

        offset = None
        while True:
            await ctx.limiter.wait()
            try:
                result = await ctx.client(
                    GetMessageReactionsListRequest(
                        peer=ctx.entity, id=message.id, limit=PAGE_SIZE, offset=offset
                    )
                )
            except FloodWaitError:
                raise  # обрабатывается в with_flood_retry уровнем выше
            except RPCError as exc:
                log.warning("Реакции поста %s недоступны: %s", message.id, exc)
                break

            users = {user.id: user for user in result.users}
            for reaction in result.reactions:
                user_id = getattr(reaction.peer_id, "user_id", None)
                user = users.get(user_id)
                if user is None or user.id in seen:
                    continue
                seen.add(user.id)
                ctx.emit(ctx.record(user, "reactions"))

            offset = getattr(result, "next_offset", None)
            if not offset:
                break

    if posts == 0:
        raise CollectorError(f"{ctx.title}: в просмотренных постах нет реакций.")
    audit("collect_reactions", ctx.title, posts=posts, collected=len(seen))
    return len(seen)
