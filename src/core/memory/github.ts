import { Octokit } from "@octokit/rest";
import { config } from "../../config.js";
import { createLogger } from "../../logger.js";

const log = createLogger("memory");

/** Файлы памяти Дома, доступные ассистенту. Ключ — то, что видит модель. */
export const MEMORY_FILES = {
  readme: "README.md",
  canon: "canon.md",
  journal: "journal.md",
  ideas: "ideas.md",
  tasks: "tasks.md",
  decisions: "decisions.md",
  glossary: "glossary.md",
  architecture: "architecture.md",
  atlas: "atlas.md",
  rich: "rich.md",
} as const;

export type MemoryFileKey = keyof typeof MEMORY_FILES;

export const MEMORY_FILE_KEYS = Object.keys(MEMORY_FILES) as MemoryFileKey[];

interface CachedFile {
  content: string;
  sha: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Долговременная память Дома — markdown-файлы в репозитории AI-Creative-OS.
 * Читаем всегда, пишем — только если задан GITHUB_TOKEN.
 */
export class HouseMemory {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly cache = new Map<MemoryFileKey, CachedFile>();

  constructor() {
    const [owner, repo] = config.memory.repo.split("/");
    if (!owner || !repo) {
      throw new Error(`MEMORY_REPO должен быть в формате owner/repo, получено: ${config.memory.repo}`);
    }
    this.owner = owner;
    this.repo = repo;
    this.branch = config.memory.branch;
    this.octokit = new Octokit(
      config.memory.token ? { auth: config.memory.token } : {},
    );
  }

  get canWrite(): boolean {
    return config.memory.enabled;
  }

  private async fetch(key: MemoryFileKey): Promise<CachedFile> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

    const response = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: MEMORY_FILES[key],
      ref: this.branch,
    });

    const data = response.data;
    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`${MEMORY_FILES[key]} — не файл`);
    }

    const file: CachedFile = {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
      fetchedAt: Date.now(),
    };
    this.cache.set(key, file);
    return file;
  }

  async read(key: MemoryFileKey): Promise<string> {
    return (await this.fetch(key)).content;
  }

  /**
   * Полностью перезаписывает файл памяти. Нужен там, где правка не сводится
   * к дописыванию в конец (вставка задачи в раздел, закрытие чекбокса).
   * Возвращает URL коммита.
   */
  async writeFile(key: MemoryFileKey, content: string, commitMessage: string): Promise<string> {
    if (!this.canWrite) {
      throw new Error("Запись в память выключена: не задан GITHUB_TOKEN");
    }

    // Свежий sha обязателен: иначе GitHub отклонит запись поверх чужих правок.
    this.cache.delete(key);
    const current = await this.fetch(key);

    const response = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: MEMORY_FILES[key],
      message: commitMessage,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha: current.sha,
      branch: this.branch,
    });

    this.cache.delete(key);
    log.info(`Перезаписан ${MEMORY_FILES[key]}: ${commitMessage}`);
    return response.data.commit.html_url ?? "";
  }

  /**
   * Дописывает блок в конец файла памяти и коммитит.
   * Возвращает URL коммита, чтобы ассистент мог сослаться на него в чате.
   */
  async append(key: MemoryFileKey, block: string, commitMessage: string): Promise<string> {
    if (!this.canWrite) {
      throw new Error("Запись в память выключена: не задан GITHUB_TOKEN");
    }

    // Всегда берём свежую версию перед записью — иначе перетрём чужие правки.
    this.cache.delete(key);
    const current = await this.fetch(key);
    const updated = insertBlock(current.content, block.trim());

    const response = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: MEMORY_FILES[key],
      message: commitMessage,
      content: Buffer.from(updated, "utf8").toString("base64"),
      sha: current.sha,
      branch: this.branch,
    });

    this.cache.delete(key);
    const url = response.data.commit.html_url ?? "";
    log.info(`Записано в ${MEMORY_FILES[key]}: ${commitMessage}`);
    return url;
  }

  /**
   * Компактный срез памяти для системного промпта: правила Дома и
   * последние записи журнала. Ошибка чтения не должна валить ответ в чате.
   */
  async briefing(): Promise<string> {
    const parts: string[] = [];
    for (const key of ["canon", "journal"] as const) {
      try {
        const text = await this.read(key);
        parts.push(`### ${MEMORY_FILES[key]}\n${tail(text, 3000)}`);
      } catch (error) {
        log.warn(`Не удалось прочитать ${MEMORY_FILES[key]}`, error);
      }
    }
    return parts.join("\n\n");
  }
}

/**
 * Дописывает блок в конец файла, но выше завершающей курсивной пометки
 * (вроде «*Пополнять по мере…*»), чтобы она оставалась последней строкой.
 */
export const insertBlock = (content: string, block: string): string => {
  const lines = content.replace(/\s+$/, "").split("\n");
  let insertAt = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? "").trim();
    if (line === "") continue;
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) insertAt = i;
    break;
  }

  const head = lines.slice(0, insertAt).join("\n").replace(/\s+$/, "");
  const tailLines = lines.slice(insertAt).join("\n").trim();

  const withBlock = `${head}\n\n${block}`;
  return tailLines ? `${withBlock}\n\n${tailLines}\n` : `${withBlock}\n`;
};

/** Хвост длинного файла — журнал растёт вниз, свежее важнее. */
const tail = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `…\n${text.slice(-maxChars)}`;
