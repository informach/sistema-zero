import { defineConfig } from 'drizzle-kit'

// Schema isolado `arquipelago` no Postgres compartilhado + journal de migrations PRÓPRIO
// (mesmo padrão do referrals/members: journal compartilhado faz o drizzle-kit pular migrations).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  schemaFilter: ['arquipelago'],
  migrations: { table: 'arquipelago_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
