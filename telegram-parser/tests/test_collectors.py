"""Сборщики на фейковом клиенте — без обращений к Telegram."""

from __future__ import annotations

import asyncio
import unittest
from datetime import datetime, timedelta, timezone

try:
    from telethon.tl.types import ChannelParticipantAdmin, User
except ImportError:  # telethon не установлен — тест не применим
    User = None

from tg_parser.collectors.base import CollectContext
from tg_parser.utils import RateLimiter


def make_user(user_id: int, name: str, **kwargs):
    return User(id=user_id, first_name=name, username=name.lower(), **kwargs)


class FakeMessage:
    def __init__(self, msg_id, sender, date=None, reactions=None):
        self.id = msg_id
        self._sender = sender
        self.sender_id = getattr(sender, "id", sender)
        self.date = date or datetime.now(timezone.utc)
        self.reactions = reactions

    async def get_sender(self):
        return self._sender if not isinstance(self._sender, int) else None


class FakeClient:
    """Мимикрирует те части TelegramClient, которые нужны сборщикам."""

    def __init__(self, participants=(), messages=(), search_cap=None):
        self.participants = list(participants)
        self.messages = list(messages)
        self.search_cap = search_cap  # эмуляция лимита Telegram на один запрос

    def iter_participants(self, entity, search="", filter=None):
        async def gen():
            if filter is not None:
                found = [u for u in self.participants if getattr(u, "participant", None)]
            elif search:
                found = [
                    u for u in self.participants
                    if (u.first_name or "").lower().startswith(search.lower())
                ]
            else:
                found = self.participants
                if self.search_cap is not None:
                    found = found[: self.search_cap]
            for user in found:
                yield user

        return gen()

    def iter_messages(self, entity, limit=None):
        async def gen():
            for message in self.messages[: limit or len(self.messages)]:
                yield message

        return gen()


def context(client, **kwargs):
    collected = []
    entity = type("Chat", (), {"id": 777, "title": "Тестовый чат"})()
    ctx = CollectContext(
        client=client,
        entity=entity,
        limiter=RateLimiter(0),
        emit=collected.append,
        **kwargs,
    )
    return ctx, collected


@unittest.skipIf(User is None, "требуется telethon")
class MembersTest(unittest.TestCase):
    def test_collects_participants_once(self):
        from tg_parser.collectors.members import collect_members

        client = FakeClient([make_user(1, "Anna"), make_user(2, "Boris")])
        ctx, collected = context(client)
        total = asyncio.run(collect_members(ctx))
        self.assertEqual(total, 2)
        self.assertEqual([r.user_id for r in collected], [1, 2])
        self.assertEqual(collected[0].method, "members")
        self.assertEqual(collected[0].source_chat, "Тестовый чат")

    def test_deep_mode_gets_past_the_per_query_cap(self):
        from tg_parser.collectors.members import collect_members

        users = [make_user(1, "Anna"), make_user(2, "Boris"), make_user(3, "Clara")]
        client = FakeClient(users, search_cap=1)  # обычный проход отдаёт только одного

        ctx, collected = context(client, deep=False)
        self.assertEqual(asyncio.run(collect_members(ctx)), 1)

        ctx, collected = context(client, deep=True)
        self.assertEqual(asyncio.run(collect_members(ctx)), 3)
        self.assertEqual(len({r.user_id for r in collected}), 3)

    def test_limit_stops_collection(self):
        from tg_parser.collectors.members import collect_members

        client = FakeClient([make_user(i, f"User{i}") for i in range(10)])
        ctx, collected = context(client, limit=4)
        self.assertEqual(asyncio.run(collect_members(ctx)), 4)

    def test_admin_required_becomes_readable_error(self):
        from telethon.errors import ChatAdminRequiredError

        from tg_parser.collectors.base import CollectorError
        from tg_parser.collectors.members import collect_members

        class Broadcast(FakeClient):
            def iter_participants(self, entity, search="", filter=None):
                async def gen():
                    raise ChatAdminRequiredError(request=None)
                    yield  # pragma: no cover

                return gen()

        ctx, _ = context(Broadcast())
        with self.assertRaises(CollectorError) as caught:
            asyncio.run(collect_members(ctx))
        self.assertIn("администратора", str(caught.exception))

    def test_participant_role_mapping(self):
        from tg_parser.collectors.members import participant_role

        user = make_user(1, "Anna")
        self.assertIsNone(participant_role(user))
        user.participant = ChannelParticipantAdmin(
            user_id=1, admin_rights=None, promoted_by=None, date=None
        )
        self.assertEqual(participant_role(user), "admin")


@unittest.skipIf(User is None, "требуется telethon")
class MessagesTest(unittest.TestCase):
    def test_counts_messages_per_author(self):
        from tg_parser.collectors.messages import collect_from_messages

        anna, boris = make_user(1, "Anna"), make_user(2, "Boris")
        client = FakeClient(messages=[
            FakeMessage(1, anna), FakeMessage(2, anna), FakeMessage(3, boris)
        ])
        ctx, collected = context(client)
        self.assertEqual(asyncio.run(collect_from_messages(ctx)), 2)
        counts = {r.user_id: r.messages_count for r in collected}
        self.assertEqual(counts, {1: 2, 2: 1})

    def test_channel_posts_and_anonymous_admins_are_skipped(self):
        from tg_parser.collectors.messages import collect_from_messages

        client = FakeClient(messages=[FakeMessage(1, -100123), FakeMessage(2, make_user(1, "A"))])
        ctx, collected = context(client)
        self.assertEqual(asyncio.run(collect_from_messages(ctx)), 1)

    def test_since_stops_at_older_messages(self):
        from tg_parser.collectors.messages import collect_from_messages

        now = datetime.now(timezone.utc)
        client = FakeClient(messages=[
            FakeMessage(1, make_user(1, "Anna"), date=now),
            FakeMessage(2, make_user(2, "Boris"), date=now - timedelta(days=40)),
        ])
        ctx, collected = context(client, since=now - timedelta(days=7))
        self.assertEqual(asyncio.run(collect_from_messages(ctx)), 1)
        self.assertEqual(collected[0].user_id, 1)


if __name__ == "__main__":
    unittest.main()
