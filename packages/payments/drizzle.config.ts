import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL`
// já estará disponível ao rodar `bunx drizzle-kit ...`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  // O schema usa `pgSchema('payments')` → só gera/inspeciona o schema `payments`
  // (dados deste package) no Postgres compartilhado `sistemazero`. O journal do
  // drizzle-kit fica no schema `drizzle` (por-pasta, por-hash → coexiste com funil/auth).
  schemaFilter: ['payments'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
