import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../../config.js";
import type { Channel, ChatKind, PersonaId } from "../types.js";

export interface ChatRow {
  chat_id: string;
  channel: Channel;
  kind: ChatKind;
  title: string;
  persona: PersonaId;
  /** Арина сама поддерживает активность в этой группе. */
  community_mode: 0 | 1;
  created_at: string;
}

export interface MessageRow {
  id: number;
  chat_id: string;
  role: "user" | "assistant";
  user_name: string;
  content: string;
  created_at: string;
}

export interface ReminderRow {
  id: number;
  chat_id: string;
  channel: Channel;
  text: string;
  /** ISO-время разового напоминания, либо null для повторяющегося. */
  due_at: string | null;
  /** cron-выражение для повторяющегося, либо null. */
  cron: string | null;
  created_by: string;
  fired: 0 | 1;
  created_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chats (
  chat_id        TEXT PRIMARY KEY,
  channel        TEXT NOT NULL,
  kind           TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  persona        TEXT NOT NULL,
  community_mode INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    TEXT NOT NULL,
  role       TEXT NOT NULL,
  user_name  TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);

CREATE TABLE IF NOT EXISTS reminders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    TEXT NOT NULL,
  channel    TEXT NOT NULL,
  text       TEXT NOT NULL,
  due_at     TEXT,
  cron       TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  fired      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(fired, due_at);

CREATE TABLE IF NOT EXISTS community_state (
  chat_id          TEXT PRIMARY KEY,
  last_human_at    TEXT,
  last_bot_post_at TEXT
);
`;

/**
 * Локальное состояние ассистента: история диалогов, настройки чатов,
 * напоминания. Долговременная память Дома живёт не здесь, а в GitHub
 * (см. github.ts) — эта база нужна, чтобы ассистент помнил ход разговора.
 */
export class Store {
  private readonly db: Database.Database;

  constructor(dbPath: string = config.dbPath) {
    const dir = path.dirname(dbPath);
    if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  // --- чаты ---

  getChat(chatId: string): ChatRow | undefined {
    return this.db.prepare("SELECT * FROM chats WHERE chat_id = ?").get(chatId) as
      | ChatRow
      | undefined;
  }

  /** Регистрирует чат при первом контакте. Персона по умолчанию зависит от типа чата. */
  ensureChat(params: {
    chatId: string;
    channel: Channel;
    kind: ChatKind;
    title: string;
  }): ChatRow {
    const existing = this.getChat(params.chatId);
    if (existing) {
      if (params.title && params.title !== existing.title) {
        this.db
          .prepare("UPDATE chats SET title = ? WHERE chat_id = ?")
          .run(params.title, params.chatId);
        return { ...existing, title: params.title };
      }
      return existing;
    }

    const persona: PersonaId = params.kind === "group" ? "arina" : "rich";
    this.db
      .prepare(
        `INSERT INTO chats (chat_id, channel, kind, title, persona, community_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.chatId,
        params.channel,
        params.kind,
        params.title,
        persona,
        params.kind === "group" ? 1 : 0,
        new Date().toISOString(),
      );
    return this.getChat(params.chatId)!;
  }

  setPersona(chatId: string, persona: PersonaId): void {
    this.db.prepare("UPDATE chats SET persona = ? WHERE chat_id = ?").run(persona, chatId);
  }

  setCommunityMode(chatId: string, on: boolean): void {
    this.db
      .prepare("UPDATE chats SET community_mode = ? WHERE chat_id = ?")
      .run(on ? 1 : 0, chatId);
  }

  /** Группы, где Арина сама поддерживает активность. */
  listCommunityChats(): ChatRow[] {
    return this.db
      .prepare("SELECT * FROM chats WHERE community_mode = 1 AND kind = 'group'")
      .all() as ChatRow[];
  }

  // --- история ---

  /** Возвращает id записи — по нему можно исключить её из истории. */
  addMessage(params: {
    chatId: string;
    role: "user" | "assistant";
    userName: string;
    content: string;
  }): number {
    const info = this.db
      .prepare(
        `INSERT INTO messages (chat_id, role, user_name, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        params.chatId,
        params.role,
        params.userName,
        params.content,
        new Date().toISOString(),
      );
    return Number(info.lastInsertRowid);
  }

  /**
   * Последние N сообщений чата в хронологическом порядке.
   * `beforeId` исключает текущий ход: он передаётся модели отдельно,
   * вместе с картинками, и не должен приехать ещё и из истории.
   */
  recentMessages(chatId: string, limit: number, beforeId?: number): MessageRow[] {
    const rows =
      beforeId === undefined
        ? (this.db
            .prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?")
            .all(chatId, limit) as MessageRow[])
        : (this.db
            .prepare(
              "SELECT * FROM messages WHERE chat_id = ? AND id < ? ORDER BY id DESC LIMIT ?",
            )
            .all(chatId, beforeId, limit) as MessageRow[]);
    return rows.reverse();
  }

  clearHistory(chatId: string): void {
    this.db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chatId);
  }

  // --- напоминания ---

  addReminder(params: {
    chatId: string;
    channel: Channel;
    text: string;
    dueAt: string | null;
    cron: string | null;
    createdBy: string;
  }): number {
    const info = this.db
      .prepare(
        `INSERT INTO reminders (chat_id, channel, text, due_at, cron, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.chatId,
        params.channel,
        params.text,
        params.dueAt,
        params.cron,
        params.createdBy,
        new Date().toISOString(),
      );
    return Number(info.lastInsertRowid);
  }

  /** Разовые напоминания, срок которых наступил. */
  dueReminders(now: Date = new Date()): ReminderRow[] {
    return this.db
      .prepare(
        "SELECT * FROM reminders WHERE fired = 0 AND cron IS NULL AND due_at IS NOT NULL AND due_at <= ?",
      )
      .all(now.toISOString()) as ReminderRow[];
  }

  activeCronReminders(): ReminderRow[] {
    return this.db
      .prepare("SELECT * FROM reminders WHERE fired = 0 AND cron IS NOT NULL")
      .all() as ReminderRow[];
  }

  listReminders(chatId: string): ReminderRow[] {
    return this.db
      .prepare("SELECT * FROM reminders WHERE chat_id = ? AND fired = 0 ORDER BY id")
      .all(chatId) as ReminderRow[];
  }

  markReminderFired(id: number): void {
    this.db.prepare("UPDATE reminders SET fired = 1 WHERE id = ?").run(id);
  }

  cancelReminder(chatId: string, id: number): boolean {
    const info = this.db
      .prepare("UPDATE reminders SET fired = 1 WHERE id = ? AND chat_id = ?")
      .run(id, chatId);
    return info.changes > 0;
  }

  // --- состояние комьюнити ---

  touchHumanActivity(chatId: string): void {
    this.db
      .prepare(
        `INSERT INTO community_state (chat_id, last_human_at) VALUES (?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET last_human_at = excluded.last_human_at`,
      )
      .run(chatId, new Date().toISOString());
  }

  touchBotPost(chatId: string): void {
    this.db
      .prepare(
        `INSERT INTO community_state (chat_id, last_bot_post_at) VALUES (?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET last_bot_post_at = excluded.last_bot_post_at`,
      )
      .run(chatId, new Date().toISOString());
  }

  communityState(chatId: string): { lastHumanAt: Date | null; lastBotPostAt: Date | null } {
    const row = this.db
      .prepare("SELECT last_human_at, last_bot_post_at FROM community_state WHERE chat_id = ?")
      .get(chatId) as { last_human_at: string | null; last_bot_post_at: string | null } | undefined;
    return {
      lastHumanAt: row?.last_human_at ? new Date(row.last_human_at) : null,
      lastBotPostAt: row?.last_bot_post_at ? new Date(row.last_bot_post_at) : null,
    };
  }

  close(): void {
    this.db.close();
  }
}
