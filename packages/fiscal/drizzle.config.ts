import { defineConfig } from 'drizzle-kit'

// Mesmo padrão do catalog/members: schema isolado `fiscal` no Postgres
// compartilhado + journal de migrations PRÓPRIO (tabela por pacote — journal
// compartilhado faz o drizzle-kit PULAR migrations por dedupe de created_at).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  schemaFilter: ['fiscal'],
  migrations: { table: 'fiscal_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
