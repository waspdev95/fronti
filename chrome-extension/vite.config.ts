import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any })
  ],
  build: {
    rollupOptions: {
      input: {
        editor: 'editor.html',
        background: 'src/background.ts',
        'iframe-bridge': 'src/iframe-bridge.ts'
      }
    }
  }
});
