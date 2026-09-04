import unittest

from tg_parser.filters import Filters


def row(**kwargs):
    base = dict(
        user_id=1, username="tina", first_name="Тина", last_name=None, phone=None,
        is_bot=False, is_deleted=False, is_scam=False, is_fake=False,
        is_premium=False, last_seen="recently", messages_count=0,
    )
    base.update(kwargs)
    return base


class FiltersTest(unittest.TestCase):
    def test_bots_and_deleted_dropped_by_default(self):
        f = Filters()
        self.assertFalse(f.match(row(is_bot=True)))
        self.assertFalse(f.match(row(is_deleted=True)))
        self.assertTrue(f.match(row()))

    def test_bots_kept_when_requested(self):
        self.assertTrue(Filters(skip_bots=False).match(row(is_bot=True)))

    def test_requires_username_and_phone(self):
        self.assertFalse(Filters(only_with_username=True).match(row(username=None)))
        self.assertFalse(Filters(only_with_phone=True).match(row(phone=None)))
        self.assertTrue(Filters(only_with_phone=True).match(row(phone="+70000000000")))

    def test_last_seen_recency_is_ordered(self):
        f = Filters(max_last_seen="recently")
        self.assertTrue(f.match(row(last_seen="online")))
        self.assertTrue(f.match(row(last_seen="recently")))
        self.assertFalse(f.match(row(last_seen="last_month")))
        self.assertFalse(f.match(row(last_seen=None)))

    def test_name_pattern_searches_all_name_fields(self):
        f = Filters(name_pattern="ковал")
        self.assertTrue(f.match(row(last_name="Ковалёва")))
        self.assertFalse(f.match(row(first_name="Анна", username="anna", last_name=None)))

    def test_min_messages(self):
        f = Filters(min_messages=5)
        self.assertFalse(f.match(row(messages_count=4)))
        self.assertTrue(f.match(row(messages_count=5)))

    def test_scam_dropped_only_when_asked(self):
        self.assertTrue(Filters().match(row(is_scam=True)))
        self.assertFalse(Filters(skip_scam=True).match(row(is_fake=True)))

    def test_apply_is_lazy_and_filters(self):
        rows = [row(user_id=1), row(user_id=2, is_bot=True)]
        self.assertEqual([r["user_id"] for r in Filters().apply(rows)], [1])

    def test_unknown_last_seen_rejected(self):
        with self.assertRaises(ValueError):
            Filters(max_last_seen="вчера")


if __name__ == "__main__":
    unittest.main()
