import { Cron } from "croner";
import type { ToolDefinition } from "./index.js";

/** Человекочитаемое время в поясе Дома. */
const formatLocal = (iso: string, timezone: string): string =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export const reminderTools: ToolDefinition[] = [
  {
    spec: {
      name: "schedule_reminder",
      description:
        "Поставить напоминание в этот же чат — разовое (укажи at) или повторяющееся (укажи cron). " +
        "Вызывай на «напомни мне», «через час», «каждый понедельник». " +
        "Относительное время («через 2 часа») пересчитывай сам в конкретную дату по часовому поясу Дома.",
      input_schema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Текст напоминания — то, что ассистент напишет в чат, когда придёт время.",
          },
          at: {
            type: "string",
            description:
              "Разовое напоминание: дата и время в ISO 8601 со смещением, например 2026-09-01T10:00:00+03:00.",
          },
          cron: {
            type: "string",
            description:
              "Повторяющееся напоминание: cron-выражение из 5 полей в часовом поясе Дома, " +
              "например «0 10 * * 1» — каждый понедельник в 10:00.",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const text = String(input.text ?? "").trim();
      if (!text) throw new Error("Пустой текст напоминания");

      const at = input.at ? String(input.at).trim() : "";
      const cron = input.cron ? String(input.cron).trim() : "";
      if (!at && !cron) throw new Error("Нужно указать либо at, либо cron");
      if (at && cron) throw new Error("Укажи что-то одно: at или cron");

      if (cron) {
        // Проверяем выражение до записи, чтобы не поставить мёртвое напоминание.
        try {
          new Cron(cron, { timezone: ctx.timezone, paused: true });
        } catch {
          throw new Error(`Не понимаю cron-выражение «${cron}»`);
        }
        const id = ctx.store.addReminder({
          chatId: ctx.message.chatId,
          channel: ctx.message.channel,
          text,
          dueAt: null,
          cron,
          createdBy: ctx.message.userName,
        });
        return `Повторяющееся напоминание #${id} поставлено: «${text}» по расписанию ${cron} (${ctx.timezone}).`;
      }

      const due = new Date(at);
      if (Number.isNaN(due.getTime())) throw new Error(`Не понимаю дату «${at}»`);
      if (due.getTime() <= Date.now()) throw new Error("Указанное время уже прошло");

      const id = ctx.store.addReminder({
        chatId: ctx.message.chatId,
        channel: ctx.message.channel,
        text,
        dueAt: due.toISOString(),
        cron: null,
        createdBy: ctx.message.userName,
      });
      return `Напоминание #${id} поставлено на ${formatLocal(due.toISOString(), ctx.timezone)}: «${text}».`;
    },
  },

  {
    spec: {
      name: "list_reminders",
      description: "Показать активные напоминания этого чата.",
      input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
    async run(_input, ctx) {
      const rows = ctx.store.listReminders(ctx.message.chatId);
      if (rows.length === 0) return "Активных напоминаний в этом чате нет.";
      return rows
        .map((r) => {
          const when = r.cron
            ? `по расписанию ${r.cron}`
            : `на ${formatLocal(r.due_at!, ctx.timezone)}`;
          return `#${r.id} — «${r.text}» ${when}`;
        })
        .join("\n");
    },
  },

  {
    spec: {
      name: "cancel_reminder",
      description: "Отменить напоминание этого чата по его номеру из list_reminders.",
      input_schema: {
        type: "object",
        properties: { id: { type: "integer", description: "Номер напоминания." } },
        required: ["id"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const id = Number(input.id);
      if (!Number.isInteger(id)) throw new Error("Нужен числовой номер напоминания");
      const ok = ctx.store.cancelReminder(ctx.message.chatId, id);
      return ok ? `Напоминание #${id} отменено.` : `Напоминания #${id} в этом чате нет.`;
    },
  },
];
