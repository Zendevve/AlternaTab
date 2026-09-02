import type { ExtensionConfig, KeyboardProfile, SearchScope, ThemeVariant } from "../types/models";

export const DEFAULT_CONFIG: ExtensionConfig = {
  version: "1.0.0",
  hotkey: "Alt+Q",
  keyboardProfile: "standard",
  theme: "dark",
  blurRadiusPx: 12,
  showDomainAccents: true,
  domainColors: {},
  searchScopeDefault: "all",
  frecencyHalfLifeMinutes: 180,
  maxRenderedItems: 40,
  closeOnBlur: true,
  enableVimMode: false,
  defaultSearchEngine: "google",
  customSearchTemplate: "",
  enableMruCycle: false,
};
const VALID_KEYBOARD_PROFILES: Record<KeyboardProfile, true> = {
  standard: true,
  vim: true,
  emacs: true,
};

const VALID_THEMES: Record<ThemeVariant, true> = {
  light: true,
  dark: true,
  oled: true,
  system: true,
};

const VALID_SCOPES: Record<string, true> = {
  all: true,
  window: true,
  "tabs-only": true,
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function validateConfig(candidate: unknown): {
  valid: boolean;
  errors: string[];
  config: ExtensionConfig;
} {
  const errors: string[] = [];
  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["Config must be an object"], config: { ...DEFAULT_CONFIG } };
  }

  const raw = candidate as Record<string, unknown>;
  const resolved: ExtensionConfig = { ...DEFAULT_CONFIG };

  if (typeof raw.version === "string" && raw.version.trim().length > 0) {
    resolved.version = raw.version.trim();
  }

  if (typeof raw.hotkey === "string" && raw.hotkey.trim().length > 0) {
    resolved.hotkey = raw.hotkey.trim();
  }

  if (
    typeof raw.keyboardProfile === "string" &&
    VALID_KEYBOARD_PROFILES[raw.keyboardProfile as KeyboardProfile]
  ) {
    resolved.keyboardProfile = raw.keyboardProfile as KeyboardProfile;
  } else if (raw.keyboardProfile !== undefined) {
    errors.push("Invalid keyboard profile");
  }

  if (typeof raw.theme === "string" && VALID_THEMES[raw.theme as ThemeVariant]) {
    resolved.theme = raw.theme as ThemeVariant;
  } else if (raw.theme !== undefined) {
    errors.push("Invalid theme variant");
  }

  if (typeof raw.blurRadiusPx === "number" && !Number.isNaN(raw.blurRadiusPx)) {
    if (raw.blurRadiusPx < 0 || raw.blurRadiusPx > 24) {
      errors.push("blurRadiusPx must be between 0 and 24");
    } else {
      resolved.blurRadiusPx = Math.round(raw.blurRadiusPx);
    }
  }

  if (typeof raw.showDomainAccents === "boolean") {
    resolved.showDomainAccents = raw.showDomainAccents;
  }

  if (
    raw.domainColors &&
    typeof raw.domainColors === "object" &&
    !Array.isArray(raw.domainColors)
  ) {
    const validatedColors: Record<string, string> = {};
    for (const [domain, color] of Object.entries(raw.domainColors as Record<string, unknown>)) {
      if (typeof color === "string" && (HEX_COLOR_REGEX.test(color) || color.startsWith("rgb"))) {
        validatedColors[domain.toLowerCase()] = color;
      }
    }
    resolved.domainColors = validatedColors;
  }

  if (
    typeof raw.searchScopeDefault === "string" &&
    VALID_SCOPES[raw.searchScopeDefault as SearchScope]
  ) {
    resolved.searchScopeDefault = raw.searchScopeDefault as "all" | "window" | "tabs-only";
  } else if (raw.searchScopeDefault !== undefined) {
    errors.push("Invalid searchScopeDefault");
  }

  if (
    typeof raw.frecencyHalfLifeMinutes === "number" &&
    !Number.isNaN(raw.frecencyHalfLifeMinutes)
  ) {
    if (raw.frecencyHalfLifeMinutes <= 0) {
      errors.push("frecencyHalfLifeMinutes must be > 0");
    } else {
      resolved.frecencyHalfLifeMinutes = raw.frecencyHalfLifeMinutes;
    }
  }

  if (typeof raw.maxRenderedItems === "number" && !Number.isNaN(raw.maxRenderedItems)) {
    if (raw.maxRenderedItems < 1 || raw.maxRenderedItems > 200) {
      errors.push("maxRenderedItems must be between 1 and 200");
    } else {
      resolved.maxRenderedItems = Math.round(raw.maxRenderedItems);
    }
  }

  if (typeof raw.closeOnBlur === "boolean") {
    resolved.closeOnBlur = raw.closeOnBlur;
  }

  if (typeof raw.enableVimMode === "boolean") {
    resolved.enableVimMode = raw.enableVimMode;
    if (resolved.enableVimMode && resolved.keyboardProfile === "standard") {
      resolved.keyboardProfile = "vim";
    }
  }

  if (typeof raw.defaultSearchEngine === "string") {
    if (["google", "duckduckgo", "bing", "custom"].includes(raw.defaultSearchEngine)) {
      resolved.defaultSearchEngine = raw.defaultSearchEngine as ExtensionConfig["defaultSearchEngine"];
    } else {
      resolved.defaultSearchEngine = "google";
    }
  }

  if (typeof raw.customSearchTemplate === "string") {
    const tpl = raw.customSearchTemplate.trim();
    if (tpl === "" || tpl.includes("{q}")) {
      resolved.customSearchTemplate = tpl;
    } else {
      errors.push("customSearchTemplate must contain {q}");
    }
  }

  if (typeof raw.enableMruCycle === "boolean") {
    resolved.enableMruCycle = raw.enableMruCycle;
  }

  return {
    valid: errors.length === 0,
    errors,
    config: resolved,
  };
}
