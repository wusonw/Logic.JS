import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    vue(),
    checker({
      typescript: true
    })
  ],
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@logic.js/core': resolve(__dirname, '../packages/core/src'),
      '@logic.js/editor': resolve(__dirname, '../packages/editor/src')
    }
  }
}); 
