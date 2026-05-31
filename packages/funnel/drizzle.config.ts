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
  // Só gera/inspeciona o schema `funil` (dados deste package). O journal de
  // migrations do drizzle-kit fica no schema `drizzle` padrão (forward-only,
  // por-pasta, baseado em hash → conviver com o do payments é seguro).
  schemaFilter: ['funil'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
