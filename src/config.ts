import "dotenv/config";
import { z } from "zod";

const csv = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const schema = z.object({
  // --- Claude ---
  ANTHROPIC_API_KEY: z.string({ error: "не задан — возьми ключ в console.anthropic.com" }).min(1),
  CLAUDE_MODEL: z.string().default("claude-opus-5"),
  CLAUDE_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  CLAUDE_MAX_TOKENS: z.coerce.number().int().positive().default(4000),

  // --- Telegram ---
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // --- WhatsApp (адаптер-заглушка, см. docs/WHATSAPP.md) ---
  WHATSAPP_ENABLED: z.enum(["true", "false"]).default("false"),

  // --- Долговременная память (GitHub) ---
  GITHUB_TOKEN: z.string().optional(),
  MEMORY_REPO: z.string().default("tinaassistants1-jpg/AI-Creative-OS"),
  MEMORY_BRANCH: z.string().default("main"),

  // --- Прочее ---
  DB_PATH: z.string().default("./data/assistant.db"),
  TIMEZONE: z.string().default("Europe/Moscow"),
  ADMIN_IDS: z.string().optional(),
  HISTORY_TURNS: z.coerce.number().int().positive().default(24),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  · ${i.path.join(".") || "env"}: ${i.message}`)
    .join("\n");
  console.error(`Ошибка конфигурации (.env):\n${issues}\n\nОбразец со всеми переменными — в .env.example`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  claude: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.CLAUDE_MODEL,
    effort: env.CLAUDE_EFFORT,
    maxTokens: env.CLAUDE_MAX_TOKENS,
  },
  telegram: {
    enabled: Boolean(env.TELEGRAM_BOT_TOKEN),
    token: env.TELEGRAM_BOT_TOKEN ?? "",
  },
  whatsapp: {
    enabled: env.WHATSAPP_ENABLED === "true",
  },
  memory: {
    /** Запись в память включается только при наличии токена. */
    enabled: Boolean(env.GITHUB_TOKEN),
    token: env.GITHUB_TOKEN ?? "",
    repo: env.MEMORY_REPO,
    branch: env.MEMORY_BRANCH,
  },
  dbPath: env.DB_PATH,
  timezone: env.TIMEZONE,
  adminIds: csv(env.ADMIN_IDS),
  historyTurns: env.HISTORY_TURNS,
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
