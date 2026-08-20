import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // worker/ has its own vitest-pool-workers setup (cloudflare:test
    // bindings this jsdom env can't resolve) and is tested separately via
    // `cd worker && npm test`.
    exclude: ['**/node_modules/**', 'worker/**'],
  },
})
