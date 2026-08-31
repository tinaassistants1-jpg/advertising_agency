import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { HouseMemory } from "./memory/github.js";
import type { Store } from "./memory/store.js";
import { getPersona } from "./personas/index.js";
import { runTool, toolSpecs, type ToolContext } from "./tools/index.js";
import type { IncomingMessage, PersonaId } from "./types.js";

const log = createLogger("agent");

/** Предохранитель от зацикливания на инструментах. */
const MAX_TOOL_ITERATIONS = 8;

export interface ReplyRequest {
  message: IncomingMessage;
  persona: PersonaId;
  /** Дополнительная инструкция под конкретный повод (разбор картинки, оживление чата). */
  instruction?: string;
  /** id уже записанного в историю текущего сообщения — чтобы не задвоить его. */
  historyBeforeId?: number;
}

export class Agent {
  private readonly client: Anthropic;

  constructor(
    private readonly store: Store,
    private readonly memory: HouseMemory,
  ) {
    this.client = new Anthropic({ apiKey: config.claude.apiKey });
  }

  /**
   * Формирует ответ персоны и сам исполняет вызванные ею инструменты.
   * Возвращает текст для отправки в чат (пустая строка — промолчать).
   */
  async reply(request: ReplyRequest): Promise<string> {
    const { message } = request;
    const system = await this.buildSystem(request);
    const messages = this.buildMessages(request);

    const ctx: ToolContext = {
      memory: this.memory,
      store: this.store,
      message,
      timezone: config.timezone,
    };

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: config.claude.maxTokens,
        output_config: { effort: config.claude.effort },
        system,
        tools: toolSpecs(),
        messages,
      });

      if (response.stop_reason === "refusal") {
        log.warn("Модель отказалась отвечать", response.stop_details);
        return "Не могу ответить на это сообщение.";
      }

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUses.length === 0) {
        return response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
      }

      messages.push({ role: "assistant", content: response.content });

      // Все результаты — одним user-сообщением, иначе модель перестаёт
      // вызывать инструменты параллельно.
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        log.debug(`Инструмент ${use.name}`, use.input);
        const { content, isError } = await runTool(
          use.name,
          (use.input ?? {}) as Record<string, unknown>,
          ctx,
        );
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          content,
          is_error: isError,
        });
      }
      messages.push({ role: "user", content: results });
    }

    log.warn(`Достигнут предел в ${MAX_TOOL_ITERATIONS} итераций инструментов`);
    return "Слишком много шагов с инструментами — сформулируй, пожалуйста, задачу иначе.";
  }

  /**
   * Системный промпт: стабильная часть (персона + канон Дома) идёт первой
   * и кэшируется, изменчивая (контекст чата) — после неё.
   */
  private async buildSystem(request: ReplyRequest): Promise<Anthropic.TextBlockParam[]> {
    const persona = getPersona(request.persona);
    const briefing = await this.memory.briefing();

    const stable = [
      persona.prompt,
      briefing ? `\n---\n\n# Память Дома (актуальный срез)\n\n${briefing}` : "",
      this.memory.canWrite
        ? ""
        : "\n---\n\nЗапись в память сейчас недоступна (нет GITHUB_TOKEN). " +
          "Инструменты записи вызывать не пытайся — вместо этого скажи, что зафиксировать не получится.",
    ]
      .filter(Boolean)
      .join("\n");

    const volatile = this.chatContext(request);

    return [
      { type: "text", text: stable, cache_control: { type: "ephemeral" } },
      { type: "text", text: volatile },
    ];
  }

  private chatContext(request: ReplyRequest): string {
    const { message } = request;
    const persona = getPersona(request.persona);
    const now = new Intl.DateTimeFormat("ru-RU", {
      timeZone: config.timezone,
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    const lines = [
      "# Контекст этого разговора",
      `- Сейчас: ${now} (${config.timezone}).`,
      `- Канал: ${message.channel}.`,
      message.chatKind === "group"
        ? `- Групповой чат «${message.chatTitle}». В группе несколько участников: ` +
          `каждое сообщение помечено именем автора, отвечай тому, кто обратился. ` +
          `Длина ответа: ${persona.groupStyleHint}`
        : `- Личный чат с «${message.userName}».`,
      "- Пишешь в мессенджер: без markdown-заголовков и таблиц, ссылки — обычным текстом.",
    ];

    if (request.instruction) lines.push(`\n# Задача на этот ответ\n${request.instruction}`);

    return lines.join("\n");
  }

  /** История чата + текущее сообщение (с картинками, если они есть). */
  private buildMessages(request: ReplyRequest): Anthropic.MessageParam[] {
    const { message } = request;
    const history = this.store.recentMessages(
      message.chatId,
      config.historyTurns,
      request.historyBeforeId,
    );

    const messages: Anthropic.MessageParam[] = history.map((row) => ({
      role: row.role,
      content:
        row.role === "user" && message.chatKind === "group"
          ? `${row.user_name}: ${row.content}`
          : row.content,
    }));

    const content: Anthropic.ContentBlockParam[] = message.images.map((image) => ({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    }));

    const parts: string[] = [];
    if (message.replyToText) {
      parts.push(`[в ответ на: «${truncate(message.replyToText, 300)}»]`);
    }
    parts.push(message.text || (message.images.length > 0 ? "(без подписи)" : ""));

    const text = parts.filter(Boolean).join("\n");
    content.push({
      type: "text",
      text: message.chatKind === "group" ? `${message.userName}: ${text}` : text,
    });

    messages.push({ role: "user", content });

    // Первый ход в чате может оказаться пустым — API этого не принимает.
    return messages.filter((m) => (Array.isArray(m.content) ? m.content.length > 0 : m.content !== ""));
  }
}

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;
