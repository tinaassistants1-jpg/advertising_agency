import unittest
from datetime import datetime, timezone

from tg_parser.models import UserRecord, describe_status
from tg_parser.utils import TargetError, chunked, normalize_target, parse_since


class FakeStatus:
    def __init__(self, name, was_online=None):
        self.__class__ = type(name, (FakeStatus,), {})
        self.was_online = was_online


class TargetTest(unittest.TestCase):
    def test_accepts_username_link_and_id(self):
        self.assertEqual(normalize_target("@durov"), "@durov")
        self.assertEqual(normalize_target("durov"), "@durov")
        self.assertEqual(normalize_target("https://t.me/durov"), "@durov")
        self.assertEqual(normalize_target("t.me/durov/123"), "@durov")
        self.assertEqual(normalize_target("-1001234567890"), -1001234567890)

    def test_private_invite_link_is_rejected_with_hint(self):
        for link in ("https://t.me/+AbCdEf", "https://t.me/joinchat/AbCdEf"):
            with self.assertRaises(TargetError):
                normalize_target(link)

    def test_empty_target_rejected(self):
        with self.assertRaises(TargetError):
            normalize_target("   ")


class SinceTest(unittest.TestCase):
    def test_relative_and_absolute(self):
        self.assertIsNone(parse_since(None))
        now = datetime.now(timezone.utc)
        self.assertLess((now - parse_since("24h")).total_seconds() - 86400, 5)
        self.assertEqual(parse_since("2026-01-31").year, 2026)

    def test_absolute_gets_utc_tzinfo(self):
        self.assertEqual(parse_since("2026-01-31").tzinfo, timezone.utc)

    def test_garbage_rejected(self):
        with self.assertRaises(TargetError):
            parse_since("позавчера")


class StatusTest(unittest.TestCase):
    def test_offline_returns_exact_time(self):
        moment = datetime(2026, 1, 1, tzinfo=timezone.utc)
        label, exact = describe_status(FakeStatus("UserStatusOffline", moment))
        self.assertEqual(label, "offline")
        self.assertEqual(exact, moment.isoformat())

    def test_coarse_categories(self):
        self.assertEqual(describe_status(FakeStatus("UserStatusRecently"))[0], "recently")
        self.assertEqual(describe_status(FakeStatus("UserStatusEmpty"))[0], "long_ago")
        self.assertEqual(describe_status(None), (None, None))


class RecordTest(unittest.TestCase):
    def test_row_has_all_columns_and_derived_fields(self):
        record = UserRecord(user_id=7, first_name="Тина", last_name="Ковалёва", username="tk")
        row = record.to_row()
        self.assertEqual(row["full_name"], "Тина Ковалёва")
        self.assertEqual(record.link, "https://t.me/tk")
        self.assertEqual(UserRecord(user_id=7).link, "tg://user?id=7")

    def test_chunked(self):
        self.assertEqual(list(chunked([1, 2, 3, 4, 5], 2)), [[1, 2], [3, 4], [5]])


if __name__ == "__main__":
    unittest.main()
