import { getTabIdentityKey, loadTabStats, updateTabActivationStat } from "../background/storage";
import type { PersistedTabStats } from "../types/models";

class SessionStore {
  private statsCache: Map<string, PersistedTabStats> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    const raw = await loadTabStats();
    this.statsCache = new Map(Object.entries(raw));
    this.initialized = true;
  }

  getStats(url: string): PersistedTabStats {
    const key = getTabIdentityKey(url);
    const existing = this.statsCache.get(key);
    if (existing) return existing;
    return {
      identityKey: key,
      activationCount: 0,
      lastActivatedAt: 0,
    };
  }

  async recordActivation(
    url: string,
  ): Promise<{ activationCount: number; lastActivatedAt: number }> {
    const result = await updateTabActivationStat(url);
    const key = getTabIdentityKey(url);
    this.statsCache.set(key, {
      identityKey: key,
      activationCount: result.activationCount,
      lastActivatedAt: result.lastActivatedAt,
    });
    return result;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const sessionStore = new SessionStore();
