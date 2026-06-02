import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL` já
// estará disponível ao rodar `bunx drizzle-kit ...`. O schema usa `pgSchema('catalog')`,
// então o DDL gerado fica isolado no schema `catalog` (mesmo Postgres do payments/auth/funnel).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // Só gera/inspeciona o schema `catalog` (dados deste package).
  schemaFilter: ['catalog'],
  // Journal PRÓPRIO por pacote: o drizzle-kit deduplica por `created_at` numa única
  // tabela; se os pacotes compartilham `drizzle.__drizzle_migrations`, a migration
  // de um pacote pode ficar "abaixo da marca d'água" de outro e ser PULADA. Uma
  // tabela por pacote (no schema `drizzle`) isola os journals.
  migrations: { table: 'catalog_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
