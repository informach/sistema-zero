import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL` já
// estará disponível ao rodar `bunx drizzle-kit ...`. O schema usa `pgSchema('auth')`,
// então o DDL gerado fica isolado no schema `auth` (mesmo Postgres do payments/funnel).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // Só gera/inspeciona o schema `auth` (dados deste package).
  schemaFilter: ['auth'],
  // Journal PRÓPRIO por pacote: o drizzle-kit deduplica por `created_at` numa única
  // tabela; se os 3 pacotes compartilham `drizzle.__drizzle_migrations`, a migration
  // de um pacote pode ficar "abaixo da marca d'água" de outro e ser PULADA. Uma
  // tabela por pacote (no schema `drizzle`) isola os journals.
  migrations: { table: 'auth_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
