import type { ToolDefinition } from "./index.js";
import { MEMORY_FILE_KEYS, type MemoryFileKey } from "../memory/github.js";

const isMemoryKey = (value: unknown): value is MemoryFileKey =>
  typeof value === "string" && (MEMORY_FILE_KEYS as string[]).includes(value);

/** Дата записи в журнал — в часовом поясе Дома, а не в UTC. */
const today = (timezone: string): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date());

export const memoryTools: ToolDefinition[] = [
  {
    spec: {
      name: "read_memory",
      description:
        "Прочитать файл долговременной памяти Дома (репозиторий AI-Creative-OS). " +
        "Используй, когда нужно свериться с правилами, решениями, задачами или историей — " +
        "не выдумывай содержимое памяти по памяти разговора.",
      input_schema: {
        type: "object",
        properties: {
          file: {
            type: "string",
            enum: MEMORY_FILE_KEYS,
            description: "Какой файл памяти прочитать.",
          },
        },
        required: ["file"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      if (!isMemoryKey(input.file)) throw new Error("Неизвестный файл памяти");
      return await ctx.memory.read(input.file);
    },
  },

  {
    spec: {
      name: "write_journal",
      description:
        "Записать в журнал Дома (journal.md), что сделали и какие решения приняли. " +
        "Вызывай, когда в разговоре появилось решение или результат, который должен пережить эту сессию.",
      input_schema: {
        type: "object",
        properties: {
          entry: {
            type: "string",
            description:
              "Запись в 1–4 предложениях: что сделали, что решили. Инфостиль, без воды.",
          },
        },
        required: ["entry"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const entry = String(input.entry ?? "").trim();
      if (!entry) throw new Error("Пустая запись");
      const block = `## ${today(ctx.timezone)} · ${ctx.message.userName}\n${entry}`;
      const url = await ctx.memory.append(
        "journal",
        block,
        `journal: запись от ${today(ctx.timezone)}`,
      );
      return `Записано в journal.md. ${url}`;
    },
  },

  {
    spec: {
      name: "add_idea",
      description:
        "Добавить идею, концепт или бриф в банк идей Дома (ideas.md). " +
        "Для сырых, но перспективных мыслей — то, к чему стоит вернуться.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Короткое название идеи." },
          body: {
            type: "string",
            description: "Суть идеи: в чём приём, для кого, почему сработает.",
          },
        },
        required: ["title", "body"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const title = String(input.title ?? "").trim();
      const body = String(input.body ?? "").trim();
      if (!title || !body) throw new Error("Нужны и название, и суть идеи");
      const block = `## ${title}\n*${today(ctx.timezone)} · ${ctx.message.userName}*\n\n${body}`;
      const url = await ctx.memory.append("ideas", block, `ideas: ${title}`);
      return `Идея «${title}» записана в ideas.md. ${url}`;
    },
  },

  {
    spec: {
      name: "add_canon",
      description:
        "Зафиксировать новое правило Дома в canon.md. Канон меняет поведение всей будущей работы, " +
        "поэтому вызывай только для действительно сильных, проверенных решений — и только когда " +
        "Тина согласилась это закрепить. Спроси подтверждение, если она этого прямо не сказала.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Название правила в 1–3 слова." },
          rule: {
            type: "string",
            description: "Формулировка правила: одно предложение, императив.",
          },
        },
        required: ["title", "rule"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const title = String(input.title ?? "").trim();
      const rule = String(input.rule ?? "").trim();
      if (!title || !rule) throw new Error("Нужны и название, и формулировка правила");

      // Номер следующего канона считаем от существующих C-XXX, чтобы не было дублей.
      const existing = await ctx.memory.read("canon");
      const numbers = [...existing.matchAll(/C-(\d{3})/g)].map((m) => Number(m[1]));
      const next = String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, "0");

      const block = `- **C-${next} · ${title}.** ${rule}`;
      const url = await ctx.memory.append("canon", block, `canon: C-${next} ${title}`);
      return `Канон C-${next} «${title}» записан в canon.md. ${url}`;
    },
  },
];
