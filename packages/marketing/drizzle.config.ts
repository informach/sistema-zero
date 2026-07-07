import { defineConfig } from 'drizzle-kit'

// Compartilha o MESMO Postgres do monorepo, mas é dono do schema `marketing`
// (isolamento por `pgSchema`). Todo o DDL gerado fica em `marketing.*`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // Só gera/inspeciona o schema `marketing` (dados deste package).
  schemaFilter: ['marketing'],
  // Journal PRÓPRIO por pacote (no schema `drizzle`): o drizzle-kit deduplica por
  // `created_at` numa única tabela; um journal compartilhado faria a migration de um
  // pacote ficar "abaixo da marca d'água" de outro e ser PULADA em silêncio.
  migrations: { table: 'marketing_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
