import type { ChatKind, PersonaId } from "../types.js";
import { RICH } from "./rich.js";
import { ARINA } from "./arina.js";

export interface Persona {
  id: PersonaId;
  /** Имя, на которое персона откликается в группе. */
  name: string;
  aliases: string[];
  /** Характер и правила поведения. Канон Дома добавляется отдельно. */
  prompt: string;
  /** Ориентир длины ответа в групповом чате. */
  groupStyleHint: string;
}

export const PERSONAS: Record<PersonaId, Persona> = { rich: RICH, arina: ARINA };

export const getPersona = (id: PersonaId): Persona => PERSONAS[id];

export const defaultPersonaFor = (kind: ChatKind): PersonaId =>
  kind === "group" ? "arina" : "rich";

/** Ассистента позвали по имени: «Арина, посмотри…», «рич?». */
export const isAddressedByName = (text: string, persona: Persona): boolean => {
  const head = text.trim().slice(0, 40).toLowerCase();
  return [persona.name, ...persona.aliases].some((alias) => {
    const a = alias.toLowerCase();
    return head.startsWith(a) || head.includes(`@${a}`);
  });
};
