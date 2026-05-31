import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL`
// já estará disponível ao rodar `bunx drizzle-kit ...`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/persistence/drizzle/schema.ts',
  out: './src/infrastructure/persistence/drizzle/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
