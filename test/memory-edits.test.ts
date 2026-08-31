import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { insertBlock } from "../src/core/memory/github.js";
import { insertTask } from "../src/core/tools/task-tools.js";

/**
 * Копии настоящих файлов памяти Дома (AI-Creative-OS) — правки проверяем
 * на реальной структуре, а не на выдуманной. Обновлять при смене формата файлов.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name: string): string =>
  fs.readFileSync(path.join(here, "fixtures", name), "utf8");

test("insertBlock: новый канон встаёт выше завершающей курсивной пометки", () => {
  const canon = read("canon.md");
  const result = insertBlock(canon, "- **C-007 · Тест.** Проверочное правило.");

  const lines = result.trimEnd().split("\n");
  const last = lines[lines.length - 1]!;
  assert.ok(last.startsWith("*Пополнять"), `последняя строка: ${last}`);
  assert.ok(result.includes("C-007"));
  assert.ok(result.indexOf("C-007") < result.indexOf("*Пополнять"));
  // Существующие каноны на месте.
  assert.ok(result.includes("C-006"));
});

test("insertBlock: без курсивной пометки блок просто уходит в конец", () => {
  const result = insertBlock("# Журнал\n\n## 2026-08-01\nчто-то было.\n", "## 2026-08-31\nновое.");
  assert.ok(result.trimEnd().endsWith("новое."));
});

test("insertBlock: не портит файл, идущий без завершающего перевода строки", () => {
  const result = insertBlock("# Идеи", "## Идея");
  assert.equal(result, "# Идеи\n\n## Идея\n");
});

test("insertTask: задача встаёт в нужный подраздел приоритета", () => {
  const tasks = read("tasks.md");
  const result = insertTask(tasks, "## 🔴 Высокий приоритет", "Portfolio", "-   [ ] Тестовая задача");

  const lines = result.split("\n");
  const taskIndex = lines.findIndex((l) => l.includes("Тестовая задача"));
  const portfolioIndex = lines.findIndex((l) => l.trim() === "### Portfolio");
  const nextSection = lines.findIndex((l, i) => i > portfolioIndex && l.startsWith("### "));

  assert.ok(taskIndex > portfolioIndex, "задача должна быть ниже заголовка Portfolio");
  assert.ok(taskIndex < nextSection, "задача не должна утечь в следующий раздел");
  // Ничего не потеряли.
  assert.equal(result.split("\n").length, tasks.split("\n").length + 1);
});

test("insertTask: без подраздела задача идёт в конец блока приоритета", () => {
  const tasks = read("tasks.md");
  const result = insertTask(tasks, "## 🟡 Средний приоритет", "", "-   [ ] Средняя задача");

  const lines = result.split("\n");
  const taskIndex = lines.findIndex((l) => l.includes("Средняя задача"));
  const mediumIndex = lines.findIndex((l) => l.trim() === "## 🟡 Средний приоритет");
  const ideasIndex = lines.findIndex((l) => l.trim() === "## 🟢 Идеи");

  assert.ok(taskIndex > mediumIndex && taskIndex < ideasIndex);
});

test("insertTask: несуществующий заголовок оставляет файл нетронутым", () => {
  const tasks = read("tasks.md");
  assert.equal(insertTask(tasks, "## Такого нет", "", "-   [ ] X"), tasks);
});
