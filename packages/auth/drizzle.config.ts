import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL` já
// estará disponível ao rodar `bunx drizzle-kit ...`. O schema usa `pgSchema('auth')`,
// então o DDL gerado fica isolado no schema `auth` (mesmo Postgres do payments/funnel).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // Só gera/inspeciona o schema `auth` (dados deste package). O journal de
  // migrations do drizzle-kit fica no schema `drizzle` padrão (forward-only,
  // por-pasta, baseado em hash → conviver com payments/funnel é seguro).
  schemaFilter: ['auth'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
