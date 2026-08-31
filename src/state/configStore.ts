import { loadStoredConfig, resetStoredConfig, saveStoredConfig } from "../background/storage";
import type { ExtensionConfig } from "../types/models";
import { DEFAULT_CONFIG } from "../utils/validation";

class ConfigStore {
  private config: ExtensionConfig = { ...DEFAULT_CONFIG };
  private initialized = false;

  async init(): Promise<ExtensionConfig> {
    this.config = await loadStoredConfig();
    this.initialized = true;
    return this.config;
  }

  get(): ExtensionConfig {
    return this.config;
  }

  async update(partial: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
    this.config = await saveStoredConfig(partial);
    return this.config;
  }

  async reset(): Promise<ExtensionConfig> {
    this.config = await resetStoredConfig();
    return this.config;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const configStore = new ConfigStore();
