import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL`
// já estará disponível ao rodar `bunx drizzle-kit ...`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // O schema usa `pgSchema('messaging')` → só gera/inspeciona o schema `messaging`
  // (dados deste package) no Postgres compartilhado `sistemazero`.
  schemaFilter: ['messaging'],
  // Journal PRÓPRIO por pacote (no schema `drizzle`): evita que a dedupe por
  // `created_at` de um journal compartilhado PULE a migration de outro pacote.
  migrations: { table: 'messaging_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
