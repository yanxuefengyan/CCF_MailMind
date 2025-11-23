import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/popup': resolve(__dirname, 'src/popup'),
      '@/content': resolve(__dirname, 'src/content'),
      '@/background': resolve(__dirname, 'src/background'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/services': resolve(__dirname, 'src/services'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].chunk.js',
        assetFileNames: '[name].[ext]',
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});