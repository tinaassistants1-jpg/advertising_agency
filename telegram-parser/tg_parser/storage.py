"""Хранилище собранных аккаунтов (SQLite).

Одна запись на user_id + журнал «встреч» (в каком чате и каким методом
аккаунт был найден). Повторный запуск парсера не создаёт дублей.
"""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Iterator

from tg_parser.models import FIELDS, UserRecord

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY,
    username      TEXT,
    first_name    TEXT,
    last_name     TEXT,
    phone         TEXT,
    lang_code     TEXT,
    is_bot        INTEGER DEFAULT 0,
    is_premium    INTEGER DEFAULT 0,
    is_verified   INTEGER DEFAULT 0,
    is_scam       INTEGER DEFAULT 0,
    is_fake       INTEGER DEFAULT 0,
    is_deleted    INTEGER DEFAULT 0,
    is_contact    INTEGER DEFAULT 0,
    restricted    INTEGER DEFAULT 0,
    last_seen     TEXT,
    last_online   TEXT,
    first_collected_at TEXT,
    collected_at  TEXT
);

CREATE TABLE IF NOT EXISTS sightings (
    user_id       INTEGER NOT NULL,
    source_chat   TEXT NOT NULL,
    source_chat_id INTEGER,
    method        TEXT NOT NULL,
    role          TEXT,
    messages_count INTEGER DEFAULT 0,
    collected_at  TEXT,
    PRIMARY KEY (user_id, source_chat_id, method),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sightings_chat ON sightings(source_chat_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
"""

_USER_COLUMNS = [
    "user_id", "username", "first_name", "last_name", "phone", "lang_code",
    "is_bot", "is_premium", "is_verified", "is_scam", "is_fake", "is_deleted",
    "is_contact", "restricted", "last_seen", "last_online",
]

# Эти поля не всегда приходят вместе с профилем (например, телефон виден
# не всегда). Пустое значение при повторной встрече не должно затирать
# то, что мы уже знаем, — отсюда COALESCE.
_NULLABLE_COLUMNS = {
    "username", "first_name", "last_name", "phone", "lang_code", "last_seen", "last_online",
}


class Storage:
    """Тонкая обёртка над SQLite. Используется как контекстный менеджер."""

    def __init__(self, path: str | Path = "data/accounts.db") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def __enter__(self) -> "Storage":
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()

    def close(self) -> None:
        self.conn.commit()
        self.conn.close()

    # --- запись -------------------------------------------------------

    def upsert(self, record: UserRecord) -> bool:
        """Сохраняет аккаунт. Возвращает True, если он встретился впервые."""
        cur = self.conn.execute("SELECT 1 FROM users WHERE user_id = ?", (record.user_id,))
        is_new = cur.fetchone() is None

        values = [getattr(record, column) for column in _USER_COLUMNS]
        placeholders = ", ".join("?" for _ in _USER_COLUMNS)
        updates = ", ".join(
            f"{c}=COALESCE(excluded.{c}, users.{c})" if c in _NULLABLE_COLUMNS
            else f"{c}=excluded.{c}"
            for c in _USER_COLUMNS[1:]
        )
        self.conn.execute(
            f"""
            INSERT INTO users ({", ".join(_USER_COLUMNS)}, first_collected_at, collected_at)
            VALUES ({placeholders}, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET {updates}, collected_at=excluded.collected_at
            """,
            [*values, record.collected_at, record.collected_at],
        )
        self.conn.execute(
            """
            INSERT INTO sightings
                (user_id, source_chat, source_chat_id, method, role, messages_count, collected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, source_chat_id, method) DO UPDATE SET
                messages_count = sightings.messages_count + excluded.messages_count,
                role = COALESCE(excluded.role, sightings.role),
                collected_at = excluded.collected_at
            """,
            (
                record.user_id,
                record.source_chat,
                record.source_chat_id or 0,
                record.method,
                record.role,
                record.messages_count,
                record.collected_at,
            ),
        )
        return is_new

    def commit(self) -> None:
        self.conn.commit()

    # --- чтение -------------------------------------------------------

    def iter_rows(
        self,
        *,
        chat_id: int | None = None,
        method: str | None = None,
    ) -> Iterator[dict[str, Any]]:
        """Плоские строки «аккаунт + агрегированные источники» для экспорта."""
        where, params = [], []
        if chat_id is not None:
            where.append("s.source_chat_id = ?")
            params.append(chat_id)
        if method:
            where.append("s.method = ?")
            params.append(method)
        clause = f"WHERE {' AND '.join(where)}" if where else ""

        query = f"""
            SELECT u.*,
                   GROUP_CONCAT(DISTINCT s.source_chat) AS source_chat,
                   MAX(s.source_chat_id)               AS source_chat_id,
                   GROUP_CONCAT(DISTINCT s.method)     AS method,
                   GROUP_CONCAT(DISTINCT s.role)       AS role,
                   COALESCE(SUM(s.messages_count), 0)  AS messages_count
            FROM users u
            JOIN sightings s ON s.user_id = u.user_id
            {clause}
            GROUP BY u.user_id
            ORDER BY messages_count DESC, u.user_id
        """
        for row in self.conn.execute(query, params):
            data = dict(row)
            data["full_name"] = " ".join(
                p for p in (data.get("first_name"), data.get("last_name")) if p
            ).strip()
            yield {name: data.get(name) for name in FIELDS}

    def stats(self) -> dict[str, Any]:
        def scalar(sql: str) -> int:
            with closing(self.conn.execute(sql)) as cur:
                return int(cur.fetchone()[0] or 0)

        by_chat = [
            dict(row)
            for row in self.conn.execute(
                """
                SELECT source_chat, source_chat_id, method, COUNT(*) AS n
                FROM sightings GROUP BY source_chat_id, method ORDER BY n DESC
                """
            )
        ]
        return {
            "users": scalar("SELECT COUNT(*) FROM users"),
            "with_username": scalar(
                "SELECT COUNT(*) FROM users WHERE username IS NOT NULL AND username != ''"
            ),
            "with_phone": scalar(
                "SELECT COUNT(*) FROM users WHERE phone IS NOT NULL AND phone != ''"
            ),
            "bots": scalar("SELECT COUNT(*) FROM users WHERE is_bot = 1"),
            "premium": scalar("SELECT COUNT(*) FROM users WHERE is_premium = 1"),
            "deleted": scalar("SELECT COUNT(*) FROM users WHERE is_deleted = 1"),
            "sightings": scalar("SELECT COUNT(*) FROM sightings"),
            "by_source": by_chat,
        }

    def clear(self) -> None:
        """Полная очистка базы. Вызывающий обязан спросить подтверждение."""
        self.conn.executescript("DELETE FROM sightings; DELETE FROM users;")
        self.conn.commit()
