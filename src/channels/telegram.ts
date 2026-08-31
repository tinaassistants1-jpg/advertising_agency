import { Bot, type Context } from "grammy";
import { createLogger } from "../logger.js";
import type {
  ChannelAdapter,
  ImageAttachment,
  IncomingMessage,
  OutgoingMessage,
} from "../core/types.js";

const log = createLogger("telegram");

/** Лимит одного сообщения в Telegram. */
const MAX_MESSAGE_LENGTH = 4096;
/** Больше этого не тянем в модель — Telegram отдаёт фото до 20 МБ. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class TelegramAdapter implements ChannelAdapter {
  readonly name = "telegram" as const;

  private readonly bot: Bot;
  private handler?: (message: IncomingMessage) => Promise<void>;
  private botUsername = "";

  constructor(token: string) {
    this.bot = new Bot(token);
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const me = await this.bot.api.getMe();
    this.botUsername = me.username;

    this.bot.on("message", async (ctx) => {
      try {
        const message = await this.toIncoming(ctx);
        if (message && this.handler) await this.handler(message);
      } catch (error) {
        log.error("Не удалось обработать апдейт", error);
      }
    });

    this.bot.catch((error) => log.error("Ошибка grammY", error));

    // start() резолвится только при остановке бота — не ждём его здесь.
    void this.bot.start({
      allowed_updates: ["message"],
      onStart: () => log.info(`Telegram-бот @${this.botUsername} запущен`),
    });
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  async send(chatId: string, message: OutgoingMessage): Promise<void> {
    const chunks = splitMessage(message.text, MAX_MESSAGE_LENGTH);
    for (const [index, chunk] of chunks.entries()) {
      await this.bot.api.sendMessage(chatId, chunk, {
        // Ответом помечаем только первый кусок, дальше — просто продолжение.
        ...(index === 0 && message.replyToMessageId
          ? { reply_parameters: { message_id: Number(message.replyToMessageId) } }
          : {}),
      });
    }
  }

  async indicateTyping(chatId: string): Promise<void> {
    try {
      await this.bot.api.sendChatAction(chatId, "typing");
    } catch {
      // Индикатор — не повод ронять ответ.
    }
  }

  /** Отправка без входящего сообщения — для напоминаний и постов Арины. */
  async post(chatId: string, text: string): Promise<void> {
    await this.send(chatId, { text });
  }

  private async toIncoming(ctx: Context): Promise<IncomingMessage | null> {
    const msg = ctx.message;
    if (!msg || !ctx.from || ctx.from.is_bot) return null;

    const chatKind = msg.chat.type === "private" ? "private" : "group";
    const text = msg.text ?? msg.caption ?? "";

    const chatTitle =
      msg.chat.type === "private"
        ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ")
        : ((msg.chat as { title?: string }).title ?? "");

    const mentioned = this.botUsername
      ? text.toLowerCase().includes(`@${this.botUsername.toLowerCase()}`)
      : false;
    const repliedToBot = msg.reply_to_message?.from?.username === this.botUsername;

    const replyText =
      msg.reply_to_message?.text ?? msg.reply_to_message?.caption ?? undefined;

    return {
      channel: this.name,
      chatId: String(msg.chat.id),
      chatKind,
      chatTitle,
      messageId: String(msg.message_id),
      userId: String(ctx.from.id),
      userName:
        [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") ||
        ctx.from.username ||
        `user${ctx.from.id}`,
      text,
      images: await this.collectImages(ctx),
      addressed: chatKind === "private" || mentioned || repliedToBot,
      ...(replyText ? { replyToText: replyText } : {}),
      date: new Date(msg.date * 1000),
    };
  }

  /** Берём самый крупный вариант фото, который влезает в лимит. */
  private async collectImages(ctx: Context): Promise<ImageAttachment[]> {
    const photos = ctx.message?.photo;
    if (!photos || photos.length === 0) return [];

    const candidates = [...photos].sort(
      (a, b) => (b.file_size ?? 0) - (a.file_size ?? 0),
    );
    const chosen = candidates.find((p) => (p.file_size ?? 0) <= MAX_IMAGE_BYTES) ?? photos[0];
    if (!chosen) return [];

    try {
      const file = await ctx.api.getFile(chosen.file_id);
      if (!file.file_path) return [];

      const url = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        log.warn(`Фото ${buffer.byteLength} байт — слишком большое, пропускаю`);
        return [];
      }

      return [{ base64: buffer.toString("base64"), mediaType: mediaTypeFor(file.file_path) }];
    } catch (error) {
      log.warn("Не удалось скачать фото", error);
      return [];
    }
  }
}

const mediaTypeFor = (filePath: string): ImageAttachment["mediaType"] => {
  const ext = filePath.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
};

/** Режем длинный ответ по абзацам, а не посреди слова. */
export const splitMessage = (text: string, limit: number): string[] => {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const cut = Math.max(
      window.lastIndexOf("\n\n"),
      window.lastIndexOf("\n"),
      window.lastIndexOf(" "),
    );
    const at = cut > limit * 0.5 ? cut : limit;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
};
