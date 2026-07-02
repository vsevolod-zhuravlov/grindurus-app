import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const bossApiTarget =
  process.env.BOSS_API_TARGET ||
  process.env.VITE_BOSS_API_TARGET ||
  'https://boss.localhost'

// https://vitejs.dev/config/
export default defineConfig({
  // Served at https://app.grindurus.xyz/ (custom domain, root path).
  base: '/',
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream'],
    }),
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: bossApiTarget,
        changeOrigin: true,
        secure: false,
        timeout: 0,
        proxyTimeout: 0,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Official devnet RPC — TLS cert on api.devnet.solana.com is expired; browser blocks it directly.
      '/solana-devnet-rpc': {
        target: 'https://api.devnet.solana.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/solana-devnet-rpc/, ''),
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('/d3-')) return 'recharts'
          if (id.includes('@xyflow')) return 'xyflow'
          if (id.includes('lightweight-charts')) return 'lightweight-charts'
        },
      },
    },
  },
})
