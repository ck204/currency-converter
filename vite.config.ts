import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/currency-converter/' : '/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        calculator: path.resolve(projectRoot, 'index.html'),
        toBnd: path.resolve(projectRoot, 'quick-bnd/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
});
