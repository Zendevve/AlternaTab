export interface UserSettings {
  maxVisible: number;
  activationMode: "hold" | "toggle";
  theme: "auto" | "light" | "dark";
  cardLayout: "grid" | "list";
  showWindowBadge: boolean;
}

export interface MRUEntry {
  tabId: number;
  windowId: number;
  lastActive: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  maxVisible: 9,
  activationMode: "hold",
  theme: "auto",
  cardLayout: "grid",
  showWindowBadge: true,
};

let memoryStore: Record<string, any> = {};

export function resetMemoryStore(): void {
  memoryStore = {};
}

export class StorageManager {
  private static isChromeStorageAvailable(): boolean {
    return typeof chrome !== "undefined" && chrome.storage !== undefined;
  }

  static async getSettings(): Promise<UserSettings> {
    if (this.isChromeStorageAvailable() && chrome.storage.sync) {
      return new Promise((resolve) => {
        chrome.storage.sync.get("user_settings", (result) => {
          if (chrome.runtime.lastError || !result.user_settings) {
            resolve({ ...DEFAULT_SETTINGS });
          } else {
            resolve({ ...DEFAULT_SETTINGS, ...result.user_settings });
          }
        });
      });
    } else {
      const data = memoryStore["user_settings"];
      return data ? { ...DEFAULT_SETTINGS, ...data } : { ...DEFAULT_SETTINGS };
    }
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    if (this.isChromeStorageAvailable() && chrome.storage.sync) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.sync.set({ user_settings: settings }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      memoryStore["user_settings"] = { ...settings };
    }
  }

  static async getMRUHistory(isIncognito: boolean): Promise<MRUEntry[]> {
    const key = isIncognito ? "incognito_mru_history" : "mru_history";
    if (this.isChromeStorageAvailable()) {
      if (isIncognito) {
        if (!chrome.storage.session) {
          const data = memoryStore[key];
          return data ? [...data] : [];
        }
        return new Promise((resolve) => {
          chrome.storage.session.get(key, (result) => {
            if (chrome.runtime.lastError || !result[key]) {
              resolve([]);
            } else {
              resolve(result[key]);
            }
          });
        });
      } else {
        return new Promise((resolve) => {
          chrome.storage.local.get(key, (result) => {
            if (chrome.runtime.lastError || !result[key]) {
              resolve([]);
            } else {
              resolve(result[key]);
            }
          });
        });
      }
    } else {
      const data = memoryStore[key];
      return data ? [...data] : [];
    }
  }

  static async saveMRUHistory(history: MRUEntry[], isIncognito: boolean): Promise<void> {
    const key = isIncognito ? "incognito_mru_history" : "mru_history";
    if (this.isChromeStorageAvailable()) {
      if (isIncognito) {
        if (!chrome.storage.session) {
          memoryStore[key] = [...history];
          return;
        }
        return new Promise<void>((resolve, reject) => {
          chrome.storage.session.set({ [key]: history }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } else {
        return new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({ [key]: history }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
    } else {
      memoryStore[key] = [...history];
    }
  }
}
