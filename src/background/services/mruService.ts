import { logger } from '../../shared/logger';

export type PersistedMRUState = {
  orderedTabIds: number[];
  updatedAt: number;
};

const STORAGE_KEY = 'mru_state_v2';
const MAX_MRU_SIZE = 500;

class MRUService {
  private state: PersistedMRUState = {
    orderedTabIds: [],
    updatedAt: Date.now()
  };

  public async hydrate(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY] as PersistedMRUState | undefined;

      if (stored && Array.isArray(stored.orderedTabIds)) {
        this.state = stored;
      }
    } catch (error) {
      logger.warn('Failed to hydrate MRU from storage:', error);
    }
  }

  private async persist(): Promise<void> {
    try {
      this.state.updatedAt = Date.now();
      await chrome.storage.local.set({ [STORAGE_KEY]: this.state });
    } catch (error) {
      logger.warn('Failed to persist MRU to storage:', error);
    }
  }

  public async touch(tabId: number): Promise<void> {
    this.state.orderedTabIds = this.state.orderedTabIds.filter(id => id !== tabId);
    this.state.orderedTabIds.unshift(tabId);

    if (this.state.orderedTabIds.length > MAX_MRU_SIZE) {
      this.state.orderedTabIds = this.state.orderedTabIds.slice(0, MAX_MRU_SIZE);
    }

    await this.persist();
  }

  public async remove(tabId: number): Promise<void> {
    const before = this.state.orderedTabIds.length;
    this.state.orderedTabIds = this.state.orderedTabIds.filter(id => id !== tabId);

    if (this.state.orderedTabIds.length !== before) {
      await this.persist();
    }
  }

  public rank(tabId: number): number {
    const index = this.state.orderedTabIds.indexOf(tabId);
    return index !== -1 ? index : this.state.orderedTabIds.length;
  }

  public getOrderedIds(): number[] {
    return [...this.state.orderedTabIds];
  }

  public async pruneAgainstOpenTabs(openTabIds: number[]): Promise<void> {
    const validIds = new Set(openTabIds);
    const beforeCount = this.state.orderedTabIds.length;

    this.state.orderedTabIds = this.state.orderedTabIds.filter(id => validIds.has(id));

    if (this.state.orderedTabIds.length !== beforeCount) {
      await this.persist();
    }
  }
}

export const mruService = new MRUService();
