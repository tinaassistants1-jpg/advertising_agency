"""Комментаторы канала: все они живут в связанном чате обсуждений."""

from __future__ import annotations

from typing import Any

from tg_parser.collectors.base import CollectContext, CollectorError
from tg_parser.collectors.messages import collect_from_messages
from tg_parser.utils import audit, entity_title


async def collect_comments(ctx: CollectContext) -> int:
    """Находит linked-чат канала и собирает авторов комментариев."""
    linked = await get_linked_chat(ctx.client, ctx.entity)
    if linked is None:
        raise CollectorError(
            f"{ctx.title}: у канала нет чата обсуждений — комментарии собирать неоткуда."
        )
    title = entity_title(linked)
    audit("linked_chat", ctx.title, linked=title, linked_id=getattr(linked, "id", None))
    return await collect_from_messages(ctx, method="comments", entity=linked, title=title)


async def get_linked_chat(client: Any, entity: Any) -> Any | None:
    """Возвращает связанную группу обсуждений или None."""
    from telethon.tl.functions.channels import GetFullChannelRequest

    try:
        full = await client(GetFullChannelRequest(entity))
    except (TypeError, ValueError):
        return None  # не канал/супергруппа

    linked_id = getattr(full.full_chat, "linked_chat_id", None)
    if not linked_id:
        return None
    for chat in full.chats:
        if chat.id == linked_id:
            return chat
    return await client.get_entity(linked_id)
