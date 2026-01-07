
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relative to the index.html for GH Pages
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
