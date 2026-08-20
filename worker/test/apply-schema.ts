import { env } from 'cloudflare:workers'

// Setup files run outside per-test-file storage isolation and may run more
// than once — every statement here is CREATE TABLE/INDEX IF NOT EXISTS, so
// re-running is harmless.
//
// Comments are stripped before splitting on ';' rather than after, so an
// ordinary semicolon inside a prose comment can't tear a statement in half.
// Safe here because schema.sql is all DDL with no string literals for '--'
// to hide inside.
const statements = env.TEST_SCHEMA_SQL.split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(statement => statement.trim())
  .filter(Boolean)

for (const statement of statements) {
  await env.DB.prepare(statement).run()
}
