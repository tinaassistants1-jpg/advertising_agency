import { Cron } from "croner";
import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { CommunityKeeper } from "./community.js";
import type { Store } from "./memory/store.js";
import type { Router } from "./router.js";

const log = createLogger("scheduler");

/**
 * Два расписания: минутная проверка разовых напоминаний и часовой обход
 * групп, за которыми присматривает Арина. Повторяющиеся напоминания
 * получают собственную cron-задачу.
 */
export class Scheduler {
  private readonly jobs: Cron[] = [];
  /** id повторяющихся напоминаний, для которых уже создана cron-задача. */
  private readonly scheduled = new Map<number, Cron>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly community: CommunityKeeper,
  ) {}

  start(): void {
    this.jobs.push(
      new Cron("* * * * *", { timezone: config.timezone }, () => {
        void this.fireDueReminders();
        // Напоминания, созданные в разговоре, подхватываем без перезапуска.
        this.syncCronReminders();
      }),
    );

    this.jobs.push(
      new Cron("0 * * * *", { timezone: config.timezone }, () => {
        void this.community.tick().catch((error) => log.error("Ошибка обхода групп", error));
      }),
    );

    this.syncCronReminders();

    log.info(`Планировщик запущен (${config.timezone})`);
  }

  stop(): void {
    for (const job of this.jobs) job.stop();
    for (const job of this.scheduled.values()) job.stop();
    this.jobs.length = 0;
    this.scheduled.clear();
  }

  /**
   * Приводит набор cron-задач в соответствие с базой: поднимает новые
   * повторяющиеся напоминания и снимает отменённые.
   */
  private syncCronReminders(): void {
    const active = this.store.activeCronReminders();
    const activeIds = new Set(active.map((r) => r.id));

    for (const [id, job] of this.scheduled) {
      if (!activeIds.has(id)) {
        job.stop();
        this.scheduled.delete(id);
      }
    }

    for (const reminder of active) {
      if (!this.scheduled.has(reminder.id)) {
        this.scheduleCronReminder(reminder.id, reminder.cron!);
      }
    }
  }

  private async fireDueReminders(): Promise<void> {
    for (const reminder of this.store.dueReminders()) {
      try {
        await this.deliver(reminder.channel, reminder.chat_id, reminder.text);
        this.store.markReminderFired(reminder.id);
      } catch (error) {
        log.error(`Не удалось отправить напоминание #${reminder.id}`, error);
      }
    }
  }

  private scheduleCronReminder(id: number, expression: string): void {
    try {
      const job = new Cron(expression, { timezone: config.timezone }, () => {
        void (async () => {
          // Текст перечитываем из базы: отменённое напоминание не должно выстрелить.
          const current = this.store.activeCronReminders().find((r) => r.id === id);
          if (!current) return;
          try {
            await this.deliver(current.channel, current.chat_id, current.text);
          } catch (error) {
            log.error(`Не удалось отправить напоминание #${id}`, error);
          }
        })();
      });
      this.scheduled.set(id, job);
      log.debug(`Повторяющееся напоминание #${id} поставлено на ${expression}`);
    } catch (error) {
      log.error(`Некорректное cron-выражение у напоминания #${id}: ${expression}`, error);
    }
  }

  private async deliver(channel: string, chatId: string, text: string): Promise<void> {
    const adapter = this.router.getChannel(channel);
    if (!adapter) {
      log.warn(`Канал ${channel} недоступен, напоминание не отправлено`);
      return;
    }
    await adapter.send(chatId, { text: `⏰ ${text}` });
    this.store.addMessage({
      chatId,
      role: "assistant",
      userName: "Напоминание",
      content: text,
    });
  }
}
