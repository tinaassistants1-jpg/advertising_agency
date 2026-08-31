import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { Agent } from "./core/agent.js";
import { CommunityKeeper } from "./core/community.js";
import { HouseMemory } from "./core/memory/github.js";
import { Store } from "./core/memory/store.js";
import { Router } from "./core/router.js";
import { Scheduler } from "./core/scheduler.js";
import { TelegramAdapter } from "./channels/telegram.js";
import { WhatsAppAdapter } from "./channels/whatsapp.js";
import type { ChannelAdapter } from "./core/types.js";

const log = createLogger("main");

const main = async (): Promise<void> => {
  if (!config.telegram.enabled && !config.whatsapp.enabled) {
    log.error("Не включён ни один канал. Задай TELEGRAM_BOT_TOKEN в .env");
    process.exit(1);
  }

  const store = new Store();
  const memory = new HouseMemory();
  const agent = new Agent(store, memory);
  const router = new Router(store, agent);
  const community = new CommunityKeeper(store, agent, router);
  const scheduler = new Scheduler(store, router, community);

  const adapters: ChannelAdapter[] = [];
  if (config.telegram.enabled) adapters.push(new TelegramAdapter(config.telegram.token));
  if (config.whatsapp.enabled) adapters.push(new WhatsAppAdapter());

  for (const adapter of adapters) {
    router.register(adapter);
    await adapter.start();
  }

  scheduler.start();

  log.info(
    `Ассистент Дома запущен. Каналы: ${adapters.map((a) => a.name).join(", ")}. ` +
      `Память Дома: ${config.memory.repo} (${config.memory.enabled ? "чтение и запись" : "только чтение"}).`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    log.info(`${signal} — останавливаюсь`);
    scheduler.stop();
    for (const adapter of adapters) await adapter.stop();
    store.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

main().catch((error) => {
  log.error("Фатальная ошибка при запуске", error);
  process.exit(1);
});
