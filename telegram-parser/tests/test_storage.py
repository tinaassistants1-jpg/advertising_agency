import tempfile
import unittest
from pathlib import Path

from tg_parser.models import UserRecord
from tg_parser.storage import Storage


def record(user_id=1, **kwargs):
    base = dict(
        username=f"user{user_id}",
        first_name="Имя",
        source_chat="Чат",
        source_chat_id=100,
        method="members",
    )
    base.update(kwargs)
    return UserRecord(user_id=user_id, **base)


class StorageTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.storage = Storage(Path(self.tmp.name) / "test.db")

    def tearDown(self):
        self.storage.close()
        self.tmp.cleanup()

    def test_upsert_reports_new_only_once(self):
        self.assertTrue(self.storage.upsert(record(1)))
        self.assertFalse(self.storage.upsert(record(1)))
        self.assertEqual(self.storage.stats()["users"], 1)

    def test_same_user_in_two_chats_is_one_row_with_both_sources(self):
        self.storage.upsert(record(1, source_chat="Чат A", source_chat_id=100))
        self.storage.upsert(record(1, source_chat="Чат B", source_chat_id=200))
        rows = list(self.storage.iter_rows())
        self.assertEqual(len(rows), 1)
        self.assertIn("Чат A", rows[0]["source_chat"])
        self.assertIn("Чат B", rows[0]["source_chat"])

    def test_message_counts_accumulate_per_source(self):
        self.storage.upsert(record(1, method="messages", messages_count=3))
        self.storage.upsert(record(1, method="messages", messages_count=4))
        rows = list(self.storage.iter_rows())
        self.assertEqual(rows[0]["messages_count"], 7)

    def test_profile_update_overwrites_stale_fields(self):
        self.storage.upsert(record(1, username="old"))
        self.storage.upsert(record(1, username="new"))
        self.assertEqual(list(self.storage.iter_rows())[0]["username"], "new")

    def test_known_username_survives_a_sighting_without_one(self):
        self.storage.upsert(record(1, username="tina", phone="+70000000000"))
        self.storage.upsert(record(1, username=None, phone=None, method="messages"))
        row = list(self.storage.iter_rows())[0]
        self.assertEqual(row["username"], "tina")
        self.assertEqual(row["phone"], "+70000000000")

    def test_filter_by_chat_and_method(self):
        self.storage.upsert(record(1, source_chat_id=100, method="members"))
        self.storage.upsert(record(2, source_chat_id=200, method="reactions"))
        self.assertEqual(len(list(self.storage.iter_rows(chat_id=100))), 1)
        self.assertEqual(len(list(self.storage.iter_rows(method="reactions"))), 1)

    def test_full_name_is_composed(self):
        self.storage.upsert(record(1, first_name="Тина", last_name="Ковалёва"))
        self.assertEqual(list(self.storage.iter_rows())[0]["full_name"], "Тина Ковалёва")

    def test_clear_removes_everything(self):
        self.storage.upsert(record(1))
        self.storage.clear()
        self.assertEqual(self.storage.stats()["users"], 0)
        self.assertEqual(self.storage.stats()["sightings"], 0)


if __name__ == "__main__":
    unittest.main()
