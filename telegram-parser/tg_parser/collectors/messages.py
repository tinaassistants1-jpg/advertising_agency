"""Авторы сообщений — единственный способ собрать живых людей там,
где список участников закрыт (каналы, крупные супергруппы)."""

from __future__ import annotations

from collections import Counter
from typing import Any

from tg_parser.collectors.base import CollectContext, is_user
from tg_parser.utils import audit, log


async def collect_from_messages(
    ctx: CollectContext,
    *,
    method: str = "messages",
    entity: Any = None,
    title: str | None = None,
) -> int:
    """Идёт по истории от новых к старым и собирает отправителей.

    ctx.limit — сколько сообщений просмотреть, ctx.since — не глубже этой даты.
    """
    target = entity if entity is not None else ctx.entity
    label = title or ctx.title

    counts: Counter[int] = Counter()
    senders: dict[int, Any] = {}
    scanned = 0

    async for message in ctx.client.iter_messages(target, limit=ctx.limit):
        scanned += 1
        if ctx.since and message.date and message.date < ctx.since:
            break

        sender_id = message.sender_id
        # Отрицательный id = пост от имени канала или анонимного админа.
        if not sender_id or sender_id < 0:
            continue

        counts[sender_id] += 1
        if sender_id not in senders:
            sender = await message.get_sender()  # почти всегда берётся из кэша Telethon
            if sender is not None and is_user(sender):
                senders[sender_id] = sender
        if scanned % (ctx.progress_every * 5) == 0:
            log.info("… %s: просмотрено %d сообщений, авторов %d", label, scanned, len(senders))

    for sender_id, user in senders.items():
        record = ctx.record(user, method, messages_count=counts[sender_id])
        record.source_chat = label
        record.source_chat_id = int(getattr(target, "id", ctx.chat_id) or ctx.chat_id)
        ctx.emit(record)

    audit("collect_messages", label, scanned=scanned, authors=len(senders), method=method)
    return len(senders)
