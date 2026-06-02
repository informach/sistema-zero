import { defineConfig } from 'drizzle-kit'

// `bun` carrega o `.env` automaticamente, então `process.env.DATABASE_URL` já
// estará disponível ao rodar `bunx drizzle-kit ...`. O schema usa `pgSchema('funil')`,
// então o DDL gerado fica isolado no schema `funil` (sem colidir com o payments,
// que compartilha o MESMO Postgres).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  // Só gera/inspeciona o schema `funil` (dados deste package).
  schemaFilter: ['funil'],
  // Journal PRÓPRIO por pacote (no schema `drizzle`): evita que a dedupe por
  // `created_at` de um journal compartilhado PULE a migration de outro pacote.
  migrations: { table: 'funil_migrations' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
