import { createLogger } from "../logger.js";
import type { ChannelAdapter, IncomingMessage, OutgoingMessage } from "../core/types.js";

const log = createLogger("whatsapp");

/**
 * Заглушка WhatsApp.
 *
 * Канал заложен в архитектуру, но не реализован — по решению от 2026-08-31
 * первым запускаем Telegram. Групповые чаты WhatsApp официальный Meta Cloud API
 * не поддерживает, поэтому выбор бэкенда (Cloud API против Baileys) —
 * отдельное решение с разными последствиями. Разбор вариантов и что именно
 * нужно дописать в этом файле: docs/WHATSAPP.md.
 *
 * Всё остальное — роутер, персоны, агент, инструменты, планировщик —
 * от канала не зависит и заработает без изменений.
 */
export class WhatsAppAdapter implements ChannelAdapter {
  readonly name = "whatsapp" as const;

  private handler?: (message: IncomingMessage) => Promise<void>;

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    log.warn(
      "WhatsApp-адаптер не реализован: WHATSAPP_ENABLED=true ничего не включает. См. docs/WHATSAPP.md",
    );
  }

  async stop(): Promise<void> {}

  async send(chatId: string, _message: OutgoingMessage): Promise<void> {
    log.warn(`Отправка в WhatsApp (${chatId}) пропущена: адаптер не реализован`);
  }

  /** Точка входа для будущей реализации: превратить событие канала в IncomingMessage и позвать это. */
  protected async dispatch(message: IncomingMessage): Promise<void> {
    if (this.handler) await this.handler(message);
  }
}
