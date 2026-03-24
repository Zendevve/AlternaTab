import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        launcher: resolve(__dirname, 'launcher.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: (assetInfo: any) => {
          if (assetInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
