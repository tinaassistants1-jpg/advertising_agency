/** Каналы, в которых живёт ассистент. WhatsApp пока заглушка — см. docs/WHATSAPP.md. */
export type Channel = "telegram" | "whatsapp";

/** Личный чат или групповой — от этого зависит и персона, и правила ответа. */
export type ChatKind = "private" | "group";

/** Персоны Дома. */
export type PersonaId = "rich" | "arina";

export interface ImageAttachment {
  /** base64 без префикса data: */
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export interface IncomingMessage {
  channel: Channel;
  chatId: string;
  chatKind: ChatKind;
  chatTitle: string;
  messageId: string;
  userId: string;
  userName: string;
  text: string;
  images: ImageAttachment[];
  /** Реплика адресована ассистенту: личка, упоминание, ответ на его сообщение или обращение по имени. */
  addressed: boolean;
  /** Текст сообщения, на которое отвечает пользователь (если это ответ). */
  replyToText?: string;
  date: Date;
}

export interface OutgoingMessage {
  text: string;
  replyToMessageId?: string;
}

/**
 * Единый интерфейс канала. Роутер и агент ничего не знают про Telegram
 * или WhatsApp — новый мессенджер добавляется реализацией этого интерфейса.
 */
export interface ChannelAdapter {
  readonly name: Channel;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(chatId: string, message: OutgoingMessage): Promise<void>;
  /** Сигнал «печатает…», если канал это умеет. */
  indicateTyping?(chatId: string): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
}
