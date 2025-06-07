import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LogicCore',
      fileName: 'index',
      formats: ['es', 'umd']
    }
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      outDir: 'dist'
    })
  ]
}); 
