import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isLibrary = mode === 'library';

  return {
    plugins: [
      react(),
      tailwindcss(),
      isLibrary && dts({
        insertTypesEntry: true,
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['src/main.tsx'],
      }),
      isLibrary && cssInjectedByJsPlugin(),
    ].filter(Boolean),
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: isLibrary ? {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'NexGenPDFViewer',
        fileName: (format) => `nexgen-pdf-viewer.${format === 'es' ? 'js' : 'umd.cjs'}`,
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
      sourcemap: true,
    } : {
      outDir: 'dist',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
