import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NOTE: In Docker, values are provided via process.env (docker-compose environment:).
  // loadEnv() reads from .env files, so we merge both to ensure container overrides work.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const getEnv = (key) => process.env[key] ?? fileEnv[key];

  const rawBase = getEnv('VITE_API_URL');
  const proxyTarget = getEnv('VITE_API_PROXY_TARGET') || rawBase || 'http://localhost:3000';
  const target = String(proxyTarget).replace(/\/+$/, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['dash.lmntea.fun'],
      proxy: {
        // Frontend code calls '/api/*' when VITE_API_URL is not set.
        // Proxy keeps everything same-origin in dev, avoiding CORS issues.
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@base-ui')) {
                return 'vendor-baseui';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setupTests.js'],
    },
  };
});
