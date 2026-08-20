import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// Read here (plain Node, not inside the Workers runtime) and handed to the
// test worker as a plain-string binding, since setup files running inside
// Miniflare can't read from disk. The real deploy path (`npm run
// migrate:remote`) applies this same file.
const schemaSql = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf-8')

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: {
          TEST_SCHEMA_SQL: schemaSql,
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/apply-schema.ts'],
  },
})
