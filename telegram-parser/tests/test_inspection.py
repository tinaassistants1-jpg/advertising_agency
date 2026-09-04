"""Разведка целей: рекомендации режимов и сводка."""

import tempfile
import unittest
from pathlib import Path

from tg_parser.exporters import export
from tg_parser.inspection import REPORT_FIELDS, explain, recommend_modes, summarize
from tg_parser.utils import invite_hash, read_targets_file


def report(**kwargs):
    row = {name: None for name in REPORT_FIELDS}
    row.update(status="ok", type="канал", members_available=False, reactions="все")
    row.update(kwargs)
    return row


class RecommendTest(unittest.TestCase):
    def test_open_member_list_is_used_first(self):
        modes = recommend_modes(report(type="супергруппа", members_available=True))
        self.assertEqual(modes[0], "members")

    def test_channel_without_members_falls_back_to_public_traces(self):
        modes = recommend_modes(report(type="канал", linked_chat_id=500))
        self.assertNotIn("members", modes)
        self.assertIn("comments", modes)
        self.assertIn("reactions", modes)

    def test_channel_without_comments_or_reactions_leaves_messages(self):
        modes = recommend_modes(report(type="канал", reactions="выключены"))
        self.assertEqual(modes, ["messages"])

    def test_explanation_names_the_telegram_limitation(self):
        self.assertIn("закрыты", explain(report(type="канал")))
        self.assertIn("открыт", explain(report(members_available=True)))


class SummaryTest(unittest.TestCase):
    def test_counts_and_reach(self):
        rows = [
            report(target="a", type="супергруппа", members_available=True, participants=1000),
            report(target="b", type="канал", participants=500, linked_chat_id=7),
            report(target="c", status="нет доступа", type="приватный"),
        ]
        text = summarize(rows)
        self.assertIn("Проверено целей: 3, доступно: 2, недоступно: 1", text)
        self.assertIn("1 500", text)
        self.assertIn("список участников открыт: 1", text)
        self.assertIn("есть чат обсуждений (режим comments): 1", text)


class TargetsFileTest(unittest.TestCase):
    def test_reads_comments_blanks_and_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "targets.txt"
            path.write_text(
                "# психологи\nhttps://t.me/a\n\nhttps://t.me/b  # заметка\nhttps://t.me/a\n",
                encoding="utf-8",
            )
            self.assertEqual(read_targets_file(path), ["https://t.me/a", "https://t.me/b"])

    def test_invite_hash_detection(self):
        self.assertEqual(invite_hash("https://t.me/+u3entMe8z304OTFi"), "u3entMe8z304OTFi")
        self.assertEqual(invite_hash("t.me/joinchat/AbC-1_x"), "AbC-1_x")
        self.assertIsNone(invite_hash("https://t.me/mir_kpt"))


class ReportExportTest(unittest.TestCase):
    def test_report_exports_with_its_own_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "report.csv"
            export([report(target="a", title="Чат")], out, fields=REPORT_FIELDS)
            header = out.read_text(encoding="utf-8-sig").splitlines()[0]
            self.assertEqual(header.split(","), REPORT_FIELDS)


if __name__ == "__main__":
    unittest.main()
