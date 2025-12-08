// src/shared/utils.js
// Shared utilities for AlternaTab extension

import { DEFAULT_CONFIG } from './constants.js';

/**
 * Normalize a domain key by extracting hostname and removing www prefix.
 * @param {string} value - Raw domain input (e.g., "https://www.github.com/repo")
 * @returns {string} Normalized domain (e.g., "github.com")
 */
export function normalizeDomainKey(value) {
  if (!value || typeof value !== 'string') return '';
  let input = value.trim().toLowerCase();
  if (!input) return '';
  if (!input.includes('://')) {
    input = `https://${input}`;
  }
  try {
    const { hostname } = new URL(input);
    if (!hostname) return '';
    return hostname.replace(/^www\./, '');
  } catch (_) {
    return value.trim().toLowerCase();
  }
}

/**
 * Extract domain from a full URL.
 * @param {string} url - Full URL
 * @returns {string} Domain without www prefix
 */
export function extractDomain(url) {
  if (!url) return '';
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

/**
 * Sanitize a domain color map by normalizing all keys.
 * @param {Object} map - Object with domain keys and color values
 * @returns {Object} Sanitized map with normalized domain keys
 */
export function sanitizeDomainMap(map) {
  const result = {};
  if (!map || typeof map !== 'object') return result;
  for (const [rawKey, color] of Object.entries(map)) {
    const key = normalizeDomainKey(rawKey);
    if (!key) continue;
    result[key] = color;
  }
  return result;
}

/**
 * Create a fresh copy of the default configuration.
 * @returns {Object} Cloned default config
 */
export function cloneDefaultConfig() {
  return {
    compactStorageKey: DEFAULT_CONFIG.compactStorageKey,
    statusDisplayMs: DEFAULT_CONFIG.statusDisplayMs,
    errorDisplayMs: DEFAULT_CONFIG.errorDisplayMs,
    crossWindowEnabled: DEFAULT_CONFIG.crossWindowEnabled,
    domainColors: { ...DEFAULT_CONFIG.domainColors }
  };
}

/**
 * Merge configuration overrides into a base config.
 * @param {Object} base - Base configuration object
 * @param {Object} overrides - Override values to merge
 * @returns {Object} Merged configuration
 */
export function mergeConfig(base, overrides) {
  const merged = { ...base };
  if (!overrides || typeof overrides !== 'object') return merged;

  if (typeof overrides.compactStorageKey === 'string' && overrides.compactStorageKey.trim()) {
    merged.compactStorageKey = overrides.compactStorageKey.trim();
  }
  if (typeof overrides.statusDisplayMs === 'number' && overrides.statusDisplayMs > 0) {
    merged.statusDisplayMs = overrides.statusDisplayMs;
  }
  if (typeof overrides.errorDisplayMs === 'number' && overrides.errorDisplayMs > 0) {
    merged.errorDisplayMs = overrides.errorDisplayMs;
  }
  if (typeof overrides.crossWindowEnabled === 'boolean') {
    merged.crossWindowEnabled = overrides.crossWindowEnabled;
  }
  if (overrides.domainColors && typeof overrides.domainColors === 'object') {
    const sanitized = sanitizeDomainMap(overrides.domainColors);
    merged.domainColors = { ...merged.domainColors, ...sanitized };
  }

  return merged;
}

/**
 * Calculate a score for tab sorting priority.
 * Higher score = higher priority in the list.
 * @param {Object} tab - Tab object
 * @returns {number} Priority score
 */
export function scoreForTab(tab) {
  let score = 0;
  if (tab.active) score += 1_000_000;
  if (tab.pinned) score += 20_000;
  if (tab.audible) score += 50_000;
  if (tab.mutedInfo && tab.mutedInfo.muted) score += 5_000;
  if (tab.discarded) score -= 10_000;
  return score;
}

/**
 * Sanitize config object for safe emission to content scripts.
 * @param {Object} config - Configuration object
 * @returns {Object} Sanitized config
 */
export function sanitizeConfigForEmit(config) {
  return {
    compactStorageKey: config.compactStorageKey,
    statusDisplayMs: config.statusDisplayMs,
    errorDisplayMs: config.errorDisplayMs,
    crossWindowEnabled: config.crossWindowEnabled,
    domainColors: sanitizeDomainMap(config.domainColors)
  };
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Shorten a string to a maximum length with ellipsis.
 * @param {string} s - String to shorten
 * @param {number} n - Maximum length
 * @returns {string} Shortened string
 */
export function shorten(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
