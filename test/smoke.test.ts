import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { splitMessage } from "../src/channels/telegram.js";
import { Store } from "../src/core/memory/store.js";
import { isAddressedByName, getPersona } from "../src/core/personas/index.js";

const tmpDb = (): string =>
  path.join(fs.mkdtempSync(path.join(os.tmpdir(), "assistant-")), "test.db");

test("splitMessage: короткий текст не режется", () => {
  assert.deepEqual(splitMessage("привет", 4096), ["привет"]);
});

test("splitMessage: длинный текст режется по границам абзацев и влезает в лимит", () => {
  const text = Array.from({ length: 60 }, (_, i) => `Абзац номер ${i}.`).join("\n\n");
  const chunks = splitMessage(text, 200);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.length <= 200, `кусок длиной ${chunk.length}`);
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
});

test("splitMessage: текст без пробелов режется жёстко, но не теряется", () => {
  const text = "я".repeat(500);
  const chunks = splitMessage(text, 100);
  assert.equal(chunks.join(""), text);
  for (const chunk of chunks) assert.ok(chunk.length <= 100);
});

test("isAddressedByName: обращение по имени распознаётся, упоминание в середине — нет", () => {
  const arina = getPersona("arina");
  assert.ok(isAddressedByName("Арина, посмотри макет", arina));
  assert.ok(isAddressedByName("@arina глянь", arina));
  assert.ok(!isAddressedByName("мы вчера обсуждали это с командой и решили", arina));
});

test("Store: чат регистрируется с персоной по типу чата", () => {
  const store = new Store(tmpDb());

  const group = store.ensureChat({
    chatId: "-100",
    channel: "telegram",
    kind: "group",
    title: "Маркетинг",
  });
  assert.equal(group.persona, "arina");
  assert.equal(group.community_mode, 1);

  const dm = store.ensureChat({
    chatId: "42",
    channel: "telegram",
    kind: "private",
    title: "Тина",
  });
  assert.equal(dm.persona, "rich");
  assert.equal(dm.community_mode, 0);

  store.setPersona("42", "arina");
  assert.equal(store.getChat("42")?.persona, "arina");
  store.close();
});

test("Store: история возвращается в хронологическом порядке и обрезается лимитом", () => {
  const store = new Store(tmpDb());
  store.ensureChat({ chatId: "1", channel: "telegram", kind: "private", title: "т" });

  for (let i = 0; i < 10; i++) {
    store.addMessage({ chatId: "1", role: "user", userName: "Тина", content: `msg ${i}` });
  }

  const recent = store.recentMessages("1", 3);
  assert.deepEqual(
    recent.map((r) => r.content),
    ["msg 7", "msg 8", "msg 9"],
  );

  store.clearHistory("1");
  assert.equal(store.recentMessages("1", 10).length, 0);
  store.close();
});

test("Store: разовое напоминание срабатывает только по наступлении срока", () => {
  const store = new Store(tmpDb());
  const future = new Date(Date.now() + 60_000).toISOString();
  const id = store.addReminder({
    chatId: "1",
    channel: "telegram",
    text: "созвон",
    dueAt: future,
    cron: null,
    createdBy: "Тина",
  });

  assert.equal(store.dueReminders(new Date()).length, 0);
  assert.equal(store.dueReminders(new Date(Date.now() + 120_000)).length, 1);
  assert.equal(store.listReminders("1").length, 1);

  assert.ok(store.cancelReminder("1", id));
  assert.equal(store.listReminders("1").length, 0);
  assert.equal(store.dueReminders(new Date(Date.now() + 120_000)).length, 0);
  store.close();
});

test("Store: чужое напоминание отменить нельзя", () => {
  const store = new Store(tmpDb());
  const id = store.addReminder({
    chatId: "1",
    channel: "telegram",
    text: "созвон",
    dueAt: new Date(Date.now() + 60_000).toISOString(),
    cron: null,
    createdBy: "Тина",
  });
  assert.equal(store.cancelReminder("999", id), false);
  assert.equal(store.listReminders("1").length, 1);
  store.close();
});

test("Store: состояние комьюнити отслеживает активность людей и постов", () => {
  const store = new Store(tmpDb());
  assert.deepEqual(store.communityState("1"), { lastHumanAt: null, lastBotPostAt: null });

  store.touchHumanActivity("1");
  assert.ok(store.communityState("1").lastHumanAt instanceof Date);
  assert.equal(store.communityState("1").lastBotPostAt, null);

  store.touchBotPost("1");
  assert.ok(store.communityState("1").lastBotPostAt instanceof Date);
  store.close();
});

test("Store: beforeId исключает текущий ход из истории", () => {
  const store = new Store(tmpDb());
  store.ensureChat({ chatId: "1", channel: "telegram", kind: "private", title: "т" });

  store.addMessage({ chatId: "1", role: "user", userName: "Тина", content: "первое" });
  store.addMessage({ chatId: "1", role: "assistant", userName: "Рич", content: "ответ" });
  const currentId = store.addMessage({
    chatId: "1",
    role: "user",
    userName: "Тина",
    content: "текущее",
  });

  const history = store.recentMessages("1", 10, currentId);
  assert.deepEqual(
    history.map((r) => r.content),
    ["первое", "ответ"],
    "текущее сообщение не должно попадать в историю — оно уходит отдельным ходом",
  );
  assert.equal(store.recentMessages("1", 10).length, 3);
  store.close();
});
