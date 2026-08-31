import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { Agent } from "./agent.js";
import type { Store } from "./memory/store.js";
import type { Router } from "./router.js";
import type { IncomingMessage } from "./types.js";

const log = createLogger("community");

/** Часы, когда Арине уместно писать в чат (по часовому поясу Дома). */
const ACTIVE_HOURS = { from: 10, to: 21 };
/** Чат считается затихшим после этого времени без сообщений. */
const SILENCE_HOURS = 20;
/** Между собственными постами Арины — не чаще. */
const MIN_HOURS_BETWEEN_POSTS = 22;

/** Рубрики по дням недели: чат оживляет конкретика, а не «как дела». */
const RUBRICS: Record<number, string> = {
  1: "Приём недели: разбери один конкретный визуальный приём из fashion или beauty — как он устроен и где его применить.",
  2: "Вопрос к участникам о их текущей работе: что сейчас в производстве, где затык.",
  3: "Наблюдение из индустрии: свежий сдвиг в fashion & beauty и что он значит для практики.",
  4: "Разбор ошибки: типичная ошибка в кампании или съёмке и как её снять.",
  5: "Итог недели: что стоит забрать с собой, плюс один вопрос участникам.",
  6: "Референс: сильная работа уровня Pentagram / Collins / The Row / Loewe / Aesop и почему она работает.",
  0: "Тихая тема на выходные: вкус, насмотренность, что пересматривали.",
};

/**
 * Арина как комьюнити-менеджер: если группа затихла — начинает разговор сама.
 * Пишет редко и по делу; лучше промолчать, чем сгенерировать пустой пост.
 */
export class CommunityKeeper {
  constructor(
    private readonly store: Store,
    private readonly agent: Agent,
    private readonly router: Router,
  ) {}

  /** Вызывается планировщиком раз в час. */
  async tick(now: Date = new Date()): Promise<void> {
    const hour = hourInTimezone(now, config.timezone);
    if (hour < ACTIVE_HOURS.from || hour >= ACTIVE_HOURS.to) return;

    for (const chat of this.store.listCommunityChats()) {
      try {
        await this.tickChat(chat.chat_id, chat.title, chat.channel, now);
      } catch (error) {
        log.error(`Не удалось оживить чат ${chat.chat_id}`, error);
      }
    }
  }

  private async tickChat(
    chatId: string,
    chatTitle: string,
    channel: "telegram" | "whatsapp",
    now: Date,
  ): Promise<void> {
    const state = this.store.communityState(chatId);

    if (state.lastBotPostAt && hoursSince(state.lastBotPostAt, now) < MIN_HOURS_BETWEEN_POSTS) {
      return;
    }
    if (state.lastHumanAt && hoursSince(state.lastHumanAt, now) < SILENCE_HOURS) return;

    const adapter = this.router.getChannel(channel);
    if (!adapter) return;

    const weekday = weekdayInTimezone(now, config.timezone);
    const rubric = RUBRICS[weekday] ?? RUBRICS[3]!;

    // Синтетическое «сообщение»: агент работает с ним как с обычным поводом ответить.
    const trigger: IncomingMessage = {
      channel,
      chatId,
      chatKind: "group",
      chatTitle,
      messageId: "",
      userId: "system",
      userName: "Система",
      text: "Чат затих — пора начать разговор.",
      images: [],
      addressed: true,
      date: now,
    };

    const text = await this.agent.reply({
      message: trigger,
      persona: "arina",
      instruction:
        `Чат молчит больше ${SILENCE_HOURS} часов. Начни разговор сама — одним сообщением.\n` +
        `Рубрика на сегодня: ${rubric}\n\n` +
        "Требования: 2–4 предложения, конкретика вместо общих слов, в конце — вопрос, " +
        "на который участнику легко ответить с ходу. Не здоровайся, не пиши «поднимаю чат» " +
        "и не объясняй, зачем ты пишешь. Посмотри историю чата и не повторяй недавнюю тему. " +
        "Если сказать по делу нечего — ответь ровно одним словом: ПРОПУСК.",
    });

    const trimmed = text.trim();
    if (!trimmed || trimmed.toUpperCase().startsWith("ПРОПУСК")) {
      log.debug(`Чат ${chatId}: Арина решила промолчать`);
      return;
    }

    await adapter.send(chatId, { text: trimmed });
    this.store.addMessage({
      chatId,
      role: "assistant",
      userName: "Арина",
      content: trimmed,
    });
    this.store.touchBotPost(chatId);
    log.info(`Чат ${chatId}: опубликован пост для поддержания активности`);
  }
}

const hoursSince = (date: Date, now: Date): number =>
  (now.getTime() - date.getTime()) / 3_600_000;

const hourInTimezone = (date: Date, timezone: string): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hour12: false }).format(
      date,
    ),
  );

const weekdayInTimezone = (date: Date, timezone: string): number => {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    date,
  );
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
};
