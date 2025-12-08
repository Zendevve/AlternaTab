// src/shared/constants.js
// Shared constants for AlternaTab extension

export const MESSAGE_TYPES = Object.freeze({
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  ACTIVATE_TAB: 'ACTIVATE_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  REQUEST_CONFIG: 'REQUEST_CONFIG',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  RESET_CONFIG: 'RESET_CONFIG',
  CONFIG_UPDATED: 'CONFIG_UPDATED',
  SHOW_ERROR: 'SHOW_ERROR'
});

export const CONFIG_STORAGE_KEY = 'alternaTab.config.v1';

// Premium feature limits
export const LIMITS = Object.freeze({
  FREE_DOMAIN_COLORS: 5,      // Max custom domain colors for free users
  PREMIUM_DOMAIN_COLORS: 999, // Effectively unlimited for premium
});

export const DEFAULT_CONFIG = Object.freeze({
  compactStorageKey: 'alternaTab.compact',
  statusDisplayMs: 4500,
  errorDisplayMs: 6500,
  crossWindowEnabled: true, // NEW: Enable cross-window tabs by default
  domainColors: Object.freeze({
    'github.com': '#1f6feb',
    'youtube.com': '#ff4e45',
    'mail.google.com': '#4285f4',
    'docs.google.com': '#188038',
    'drive.google.com': '#0f9d58',
    'calendar.google.com': '#1a73e8',
    'stackoverflow.com': '#f48024',
    'superuser.com': '#38a1db',
    'serverfault.com': '#ef3b2d',
    'notion.so': '#2f2f2f',
    'twitter.com': '#1da1f2',
    'x.com': '#d7d7d7',
    'chat.openai.com': '#6a4cff',
    'openai.com': '#14a37f',
    'figma.com': '#f24e1e',
    'slack.com': '#611f69',
    'microsoft.com': '#0078d4'
  })
});
