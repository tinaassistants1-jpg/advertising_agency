"""Выгрузка результатов: CSV, JSON, JSONL, XLSX, TXT."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Iterable

from tg_parser.models import FIELDS

FORMATS = ("csv", "json", "jsonl", "xlsx", "txt")


class ExportError(RuntimeError):
    pass


def export(rows: Iterable[dict[str, Any]], path: str | Path, fmt: str | None = None) -> int:
    """Пишет строки в файл, возвращает количество записей."""
    out = Path(path)
    fmt = (fmt or out.suffix.lstrip(".") or "csv").lower()
    if fmt not in FORMATS:
        raise ExportError(f"Неизвестный формат: {fmt}. Доступно: {', '.join(FORMATS)}")
    out.parent.mkdir(parents=True, exist_ok=True)

    writer = {
        "csv": _write_csv,
        "json": _write_json,
        "jsonl": _write_jsonl,
        "xlsx": _write_xlsx,
        "txt": _write_txt,
    }[fmt]
    return writer(list(rows), out)


def _write_csv(rows: list[dict[str, Any]], out: Path) -> int:
    # utf-8-sig — чтобы Excel корректно открывал кириллицу.
    with out.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def _write_json(rows: list[dict[str, Any]], out: Path) -> int:
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(rows)


def _write_jsonl(rows: list[dict[str, Any]], out: Path) -> int:
    with out.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return len(rows)


def _write_txt(rows: list[dict[str, Any]], out: Path) -> int:
    """Только @username — удобно для импорта в другие инструменты."""
    lines = [f"@{row['username']}" for row in rows if row.get("username")]
    out.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return len(lines)


def _write_xlsx(rows: list[dict[str, Any]], out: Path) -> int:
    try:
        from openpyxl import Workbook
    except ImportError as exc:  # pragma: no cover - зависит от окружения
        raise ExportError("Для формата xlsx нужен openpyxl: pip install openpyxl") from exc

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "accounts"
    sheet.append(FIELDS)
    for row in rows:
        sheet.append([_cell(row.get(name)) for name in FIELDS])
    sheet.freeze_panes = "A2"
    workbook.save(out)
    return len(rows)


def _cell(value: Any) -> Any:
    if isinstance(value, bool):
        return int(value)
    if value is None or isinstance(value, (int, float, str)):
        return value
    return str(value)
