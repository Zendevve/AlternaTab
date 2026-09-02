import path from "node:path";
import solid from "vite-plugin-solid";
import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    plugins: [solid()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 120,
    },
  }),
  manifest: {
    name: "AlternaTab NextGen",
    description:
      "Ultra-fast, keyboard-first tab switching, search, organization, and tab lifecycle management",
    version: "1.0.0",
    permissions: ["tabs", "storage", "sessions", "tabGroups", "commands", "history", "downloads", "bookmarks"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["assets/*"],
        matches: ["<all_urls>"],
      },
    ],
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
    action: {
      default_title: "AlternaTab NextGen",
    },
    commands: {
      "toggle-overlay": {
        suggested_key: {
          default: "Alt+Q",
          mac: "Command+Shift+K",
        },
        description: "Open or toggle the tab search HUD",
      },
    },
  },
});
