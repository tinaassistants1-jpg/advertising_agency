import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { Agent } from "./agent.js";
import type { Store } from "./memory/store.js";
import { getPersona, isAddressedByName } from "./personas/index.js";
import type { ChannelAdapter, IncomingMessage, PersonaId } from "./types.js";

const log = createLogger("router");

const HELP = `Я — ассистент Дома Maison Tina Riich.

В личном чате отвечаю на всё. В группе — когда обратились ко мне по имени, ответили на моё сообщение или упомянули через @.

Команды:
/help — эта справка
/persona rich|arina — сменить персону чата
/community on|off — Арина сама поддерживает активность в группе (только для групп)
/reset — забыть историю этого разговора
/status — текущие настройки чата

Присланный кадр или макет разберу по канонам Дома. Скажешь «запиши» или «напомни» — зафиксирую в память и поставлю напоминание.`;

/**
 * Решает, отвечать ли на сообщение, какой персоной, и связывает
 * канал с агентом. Вся логика «когда молчать» — здесь.
 */
export class Router {
  private readonly channels = new Map<string, ChannelAdapter>();

  constructor(
    private readonly store: Store,
    private readonly agent: Agent,
  ) {}

  register(adapter: ChannelAdapter): void {
    this.channels.set(adapter.name, adapter);
    adapter.onMessage((message) => this.handle(message, adapter));
  }

  getChannel(name: string): ChannelAdapter | undefined {
    return this.channels.get(name);
  }

  async handle(message: IncomingMessage, adapter: ChannelAdapter): Promise<void> {
    const chat = this.store.ensureChat({
      chatId: message.chatId,
      channel: message.channel,
      kind: message.chatKind,
      title: message.chatTitle,
    });

    if (message.chatKind === "group") this.store.touchHumanActivity(message.chatId);

    const command = this.parseCommand(message.text);
    if (command) {
      const reply = this.runCommand(command.name, command.args, message);
      if (reply) await adapter.send(message.chatId, { text: reply, replyToMessageId: message.messageId });
      return;
    }

    if (!message.text && message.images.length === 0) return;

    const persona = getPersona(chat.persona);
    const addressed =
      message.chatKind === "private" ||
      message.addressed ||
      isAddressedByName(message.text, persona);

    // В группе пишем в историю всё, чтобы понимать контекст,
    // но отвечаем только когда обратились.
    const userMessageId = this.store.addMessage({
      chatId: message.chatId,
      role: "user",
      userName: message.userName,
      content: message.text || "(изображение)",
    });

    if (!addressed) return;

    try {
      await adapter.indicateTyping?.(message.chatId);
      const text = await this.agent.reply({
        message,
        persona: chat.persona,
        historyBeforeId: userMessageId,
      });
      if (!text) return;

      this.store.addMessage({
        chatId: message.chatId,
        role: "assistant",
        userName: persona.name,
        content: text,
      });
      await adapter.send(message.chatId, { text, replyToMessageId: message.messageId });
      if (message.chatKind === "group") this.store.touchBotPost(message.chatId);
    } catch (error) {
      log.error(`Ошибка обработки сообщения в чате ${message.chatId}`, error);
      await adapter.send(message.chatId, {
        text: "Не получилось ответить — что-то сломалось на моей стороне. Попробуй ещё раз через минуту.",
        replyToMessageId: message.messageId,
      });
    }
  }

  private parseCommand(text: string): { name: string; args: string[] } | null {
    const match = /^\/([a-z_]+)(?:@\S+)?\s*(.*)$/is.exec(text.trim());
    if (!match) return null;
    return {
      name: match[1]!.toLowerCase(),
      args: (match[2] ?? "").split(/\s+/).filter(Boolean),
    };
  }

  private runCommand(name: string, args: string[], message: IncomingMessage): string {
    const chat = this.store.getChat(message.chatId);

    switch (name) {
      case "start":
      case "help":
        return HELP;

      case "persona": {
        if (!this.isAdmin(message)) return "Менять персону может только администратор Дома.";
        const value = (args[0] ?? "").toLowerCase();
        if (value !== "rich" && value !== "arina") {
          return "Укажи персону: /persona rich или /persona arina";
        }
        this.store.setPersona(message.chatId, value as PersonaId);
        return `Персона чата: ${getPersona(value as PersonaId).name}.`;
      }

      case "community": {
        if (message.chatKind !== "group") return "Режим комьюнити работает только в групповых чатах.";
        if (!this.isAdmin(message)) return "Включать режим комьюнити может только администратор Дома.";
        const value = (args[0] ?? "").toLowerCase();
        if (value !== "on" && value !== "off") return "Укажи: /community on или /community off";
        this.store.setCommunityMode(message.chatId, value === "on");
        return value === "on"
          ? "Режим комьюнити включён — буду сама поддерживать активность, когда чат затихает."
          : "Режим комьюнити выключен — пишу только когда обращаются.";
      }

      case "reset":
        this.store.clearHistory(message.chatId);
        return "История этого разговора забыта. Память Дома в репозитории не тронута.";

      case "status": {
        if (!chat) return "Чат ещё не зарегистрирован.";
        const persona = getPersona(chat.persona);
        return [
          `Чат: ${chat.kind === "group" ? `группа «${chat.title}»` : "личный"}`,
          `Персона: ${persona.name}`,
          `Режим комьюнити: ${chat.community_mode ? "включён" : "выключен"}`,
          `Запись в память Дома: ${config.memory.enabled ? "включена" : "выключена"}`,
          `Модель: ${config.claude.model} (effort: ${config.claude.effort})`,
        ].join("\n");
      }

      default:
        return "";
    }
  }

  /**
   * Администраторы Дома заданы в ADMIN_IDS. Если список пуст —
   * настройками может управлять любой (удобно на старте, но лучше заполнить).
   */
  private isAdmin(message: IncomingMessage): boolean {
    return config.adminIds.length === 0 || config.adminIds.includes(message.userId);
  }
}
