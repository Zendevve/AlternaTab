import type { CommandId, CommandPack } from "../types/models";
import { BUILT_IN_COMMANDS } from "./commands";

const STORAGE_KEY = "alternatab_command_packs";

const memStore: Record<string, unknown> = {};

function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  return {
    get: async (key?: string | string[] | Record<string, unknown>) => {
      if (!key) return { ...memStore };
      if (typeof key === "string") return { [key]: memStore[key] };
      if (Array.isArray(key)) {
        const res: Record<string, unknown> = {};
        for (const k of key) res[k] = memStore[k];
        return res;
      }
      return { ...memStore };
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(memStore, items);
    },
  } as unknown as chrome.storage.StorageArea;
}

const VALID_COMMAND_IDS = new Set<CommandId>(BUILT_IN_COMMANDS.map((c) => c.id));

export async function loadPacks(): Promise<CommandPack[]> {
  try {
    const data = await getStorage().get(STORAGE_KEY);
    const list = (data as Record<string, unknown>)[STORAGE_KEY] as CommandPack[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function savePacks(packs: CommandPack[]): Promise<void> {
  await getStorage().set({ [STORAGE_KEY]: packs });
}

export async function importPack(json: string): Promise<CommandPack> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Pack must be an object");
  const obj = parsed as Record<string, unknown>;
  const id = obj.id;
  const title = obj.title;
  const commands = obj.commands;
  if (typeof id !== "string" || !/^[a-z0-9_-]+$/.test(id)) throw new Error("Invalid pack id — use 1-20 alphanumerics, dash/underscore");
  if (typeof title !== "string" || title.trim().length === 0) throw new Error("Pack title required");
  if (!Array.isArray(commands)) throw new Error("Pack commands must be an array");
  const aliasSet = new Set<string>();
  for (const c of commands) {
    if (!c || typeof c !== "object") throw new Error("Invalid command entry");
    const entry = c as Record<string, unknown>;
    if (typeof entry.id !== "string" || !VALID_COMMAND_IDS.has(entry.id as CommandId)) throw new Error(`Invalid command id "${entry.id}"`);
    if (typeof entry.title !== "string" || entry.title.trim().length === 0) throw new Error("Command title required");
    if (typeof entry.alias !== "string" || entry.alias.trim().length === 0) throw new Error("Command alias required");
    const alias = (entry.alias as string).toLowerCase();
    if (aliasSet.has(alias)) throw new Error(`Duplicate alias "${entry.alias}"`);
    aliasSet.add(alias);
    if (entry.chain !== undefined) {
      if (!Array.isArray(entry.chain)) throw new Error("chain must be an array");
      for (const cid of entry.chain) {
        if (typeof cid !== "string" || !VALID_COMMAND_IDS.has(cid as CommandId)) throw new Error(`Invalid chain command id "${cid}"`);
      }
    }
  }
  const pack: CommandPack = {
    id: (id as string).toLowerCase(),
    title: (title as string).trim(),
    commands: (commands as CommandPack["commands"]).map((c) => ({
      id: c.id,
      title: c.title.trim(),
      alias: c.alias.trim().toLowerCase(),
      chain: c.chain ? [...c.chain] : undefined,
    })),
  };
  const existing = await loadPacks();
  const idx = existing.findIndex((p) => p.id === pack.id);
  if (idx !== -1) existing[idx] = pack;
  else existing.push(pack);
  await savePacks(existing);
  return pack;
}

export async function exportPack(id: string): Promise<string> {
  const packs = await loadPacks();
  const pack = packs.find((p) => p.id === id.toLowerCase());
  if (!pack) throw new Error("Pack not found");
  return JSON.stringify(pack, null, 2);
}

export async function deletePack(id: string): Promise<void> {
  const packs = await loadPacks();
  const next = packs.filter((p) => p.id !== id.toLowerCase());
  if (next.length === packs.length) throw new Error("Pack not found");
  await savePacks(next);
}
