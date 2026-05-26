import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function getManifest() {
  const manifest = readJsonFile("src/manifest.json");
  return manifest;
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: getManifest,
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
