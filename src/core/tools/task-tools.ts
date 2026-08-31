import type { ToolDefinition } from "./index.js";

const PRIORITY_HEADINGS: Record<string, string> = {
  high: "## 🔴 Высокий приоритет",
  medium: "## 🟡 Средний приоритет",
  idea: "## 🟢 Идеи",
};

export const taskTools: ToolDefinition[] = [
  {
    spec: {
      name: "add_task",
      description:
        "Добавить задачу в tasks.md — список задач Дома. Вызывай, когда в разговоре " +
        "прозвучало «надо сделать», «не забыть», «займись».",
      input_schema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Формулировка задачи в повелительном наклонении: «Доработать кейс NORĐ».",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "idea"],
            description: "Приоритет. По умолчанию medium.",
          },
          section: {
            type: "string",
            description:
              "Необязательный подраздел внутри приоритета (например «Portfolio», «Infrastructure»). " +
              "Если такого нет — задача ляжет прямо под заголовок приоритета.",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const text = String(input.text ?? "").trim();
      if (!text) throw new Error("Пустая задача");

      const priority = String(input.priority ?? "medium");
      const heading = PRIORITY_HEADINGS[priority] ?? PRIORITY_HEADINGS.medium!;
      const section = input.section ? String(input.section).trim() : "";

      const current = await ctx.memory.read("tasks");
      const updated = insertTask(current, heading, section, `-   [ ] ${text}`);
      if (updated === current) throw new Error("Не нашёл, куда вставить задачу в tasks.md");

      const url = await ctx.memory.writeFile("tasks", updated, `tasks: ${text}`);
      return `Задача добавлена в tasks.md${section ? ` → ${section}` : ""}. ${url}`;
    },
  },

  {
    spec: {
      name: "list_tasks",
      description:
        "Показать актуальные задачи Дома из tasks.md. Вызывай на вопросы вида " +
        "«что в работе», «какие задачи», «что осталось».",
      input_schema: {
        type: "object",
        properties: {
          only_open: {
            type: "boolean",
            description: "Только незакрытые задачи (по умолчанию true).",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const content = await ctx.memory.read("tasks");
      if (input.only_open === false) return content;

      const open = content
        .split("\n")
        .filter((line) => line.startsWith("#") || /\[\s\]/.test(line))
        .join("\n");
      return open.trim() || "Открытых задач нет.";
    },
  },

  {
    spec: {
      name: "complete_task",
      description:
        "Отметить задачу в tasks.md выполненной. Ищет задачу по фрагменту текста — " +
        "передавай достаточно слов, чтобы совпадение было однозначным.",
      input_schema: {
        type: "object",
        properties: {
          match: {
            type: "string",
            description: "Фрагмент текста задачи, например «кейс NORĐ».",
          },
        },
        required: ["match"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const needle = String(input.match ?? "").trim().toLowerCase();
      if (!needle) throw new Error("Нужен фрагмент текста задачи");

      const lines = (await ctx.memory.read("tasks")).split("\n");
      const hits = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /\[\s\]/.test(line) && line.toLowerCase().includes(needle));

      if (hits.length === 0) return `Открытой задачи со словами «${needle}» не нашёл.`;
      if (hits.length > 1) {
        const list = hits.map(({ line }) => line.trim()).join("\n");
        return `Под «${needle}» подходит несколько задач — уточни, какая:\n${list}`;
      }

      const hit = hits[0]!;
      lines[hit.index] = hit.line.replace(/\[\s\]/, "[x]");
      const url = await ctx.memory.writeFile(
        "tasks",
        lines.join("\n"),
        `tasks: закрыта — ${hit.line.replace(/^[-\s*]*\[\s\]\s*/, "").trim()}`,
      );
      return `Отмечено выполненным: ${hit.line.replace(/^[-\s*]*\[\s\]\s*/, "").trim()}. ${url}`;
    },
  },
];

/**
 * Вставляет строку задачи под нужный заголовок (и подраздел внутри него),
 * сохраняя структуру tasks.md. Возвращает исходный текст, если заголовка нет.
 */
export const insertTask = (
  content: string,
  heading: string,
  section: string,
  taskLine: string,
): string => {
  const lines = content.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) return content;

  // Границы блока приоритета — до следующего заголовка того же уровня.
  let blockEnd = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith("## ")) {
      blockEnd = i;
      break;
    }
  }

  let anchor = headingIndex;
  if (section) {
    const sectionIndex = lines.findIndex(
      (line, i) =>
        i > headingIndex &&
        i < blockEnd &&
        line.startsWith("### ") &&
        line.slice(4).trim().toLowerCase() === section.toLowerCase(),
    );
    if (sectionIndex !== -1) {
      anchor = sectionIndex;
      for (let i = sectionIndex + 1; i < blockEnd; i++) {
        if (lines[i]!.startsWith("### ")) {
          blockEnd = i;
          break;
        }
      }
    }
  }

  // Ставим задачу после последней непустой строки блока.
  let insertAt = anchor + 1;
  for (let i = anchor + 1; i < blockEnd; i++) {
    if (lines[i]!.trim() !== "") insertAt = i + 1;
  }

  lines.splice(insertAt, 0, taskLine);
  return lines.join("\n");
};
