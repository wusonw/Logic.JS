import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@logic.js/core': resolve(__dirname, '../packages/core/src'),
      '@logic.js/editor': resolve(__dirname, '../packages/editor/src')
    }
  }
}); 
