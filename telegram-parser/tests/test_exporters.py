import csv
import json
import tempfile
import unittest
from pathlib import Path

from tg_parser.exporters import ExportError, export
from tg_parser.models import FIELDS


def rows():
    return [
        {**{f: None for f in FIELDS}, "user_id": 1, "username": "tina", "first_name": "Тина"},
        {**{f: None for f in FIELDS}, "user_id": 2, "username": None, "first_name": "Аноним"},
    ]


class ExportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_csv_has_header_and_utf8_bom_for_excel(self):
        out = self.dir / "a.csv"
        self.assertEqual(export(rows(), out), 2)
        self.assertTrue(out.read_bytes().startswith(b"\xef\xbb\xbf"))
        with out.open(encoding="utf-8-sig", newline="") as handle:
            data = list(csv.DictReader(handle))
        self.assertEqual(data[0]["username"], "tina")
        self.assertEqual(list(data[0]), FIELDS)

    def test_json_roundtrip_keeps_cyrillic(self):
        out = self.dir / "a.json"
        export(rows(), out)
        data = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(data[0]["first_name"], "Тина")

    def test_jsonl_line_per_record(self):
        out = self.dir / "a.jsonl"
        export(rows(), out)
        self.assertEqual(len(out.read_text(encoding="utf-8").strip().splitlines()), 2)

    def test_txt_keeps_only_usernames(self):
        out = self.dir / "a.txt"
        self.assertEqual(export(rows(), out), 1)
        self.assertEqual(out.read_text(encoding="utf-8").strip(), "@tina")

    def test_format_taken_from_extension_and_can_be_overridden(self):
        out = self.dir / "a.dat"
        export(rows(), out, "json")
        self.assertTrue(out.read_text(encoding="utf-8").startswith("["))

    def test_unknown_format_rejected(self):
        with self.assertRaises(ExportError):
            export(rows(), self.dir / "a.pdf")

    def test_creates_missing_directories(self):
        out = self.dir / "deep" / "nested" / "a.csv"
        export(rows(), out)
        self.assertTrue(out.exists())


if __name__ == "__main__":
    unittest.main()
