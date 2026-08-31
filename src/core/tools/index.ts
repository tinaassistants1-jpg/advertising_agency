import type Anthropic from "@anthropic-ai/sdk";
import type { HouseMemory } from "../memory/github.js";
import type { Store } from "../memory/store.js";
import type { IncomingMessage } from "../types.js";
import { memoryTools } from "./memory-tools.js";
import { taskTools } from "./task-tools.js";
import { reminderTools } from "./reminder-tools.js";

/** Всё, что инструменту может понадобиться для работы. */
export interface ToolContext {
  memory: HouseMemory;
  store: Store;
  message: IncomingMessage;
  timezone: string;
}

export interface ToolDefinition {
  spec: Anthropic.Tool;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

/**
 * Порядок фиксирован: набор инструментов входит в кэшируемый префикс запроса,
 * и его перестановка сбрасывала бы prompt cache.
 */
const ALL_TOOLS: ToolDefinition[] = [...memoryTools, ...taskTools, ...reminderTools];

export const toolSpecs = (): Anthropic.Tool[] => ALL_TOOLS.map((t) => t.spec);

export const runTool = async (
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ content: string; isError: boolean }> => {
  const tool = ALL_TOOLS.find((t) => t.spec.name === name);
  if (!tool) return { content: `Неизвестный инструмент: ${name}`, isError: true };

  try {
    return { content: await tool.run(input, ctx), isError: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { content: `Ошибка «${name}»: ${reason}`, isError: true };
  }
};
