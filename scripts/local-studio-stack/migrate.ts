#!/usr/bin/env bun
/**
 * Aplica as migrations Drizzle de um pacote num banco LOCAL novo.
 *
 * Usa os mesmos arquivos e o mesmo journal (`drizzle.<pacote>_migrations`, colunas
 * hash/created_at) do `drizzle-kit migrate`, mas com UMA transação por migration — o
 * mesmo método de `packages/members/tests/db/kids-journey-database.ts`. Num banco
 * vazio o `drizzle-kit migrate` aplica tudo numa transação só e falha no Postgres
 * ("unsafe use of new value ... of enum type": valor de enum criado e usado na mesma
 * transação), além de engolir o erro atrás do spinner no Windows.
 *
 * Uso: DATABASE_URL=... bun scripts/local-studio-stack/migrate.ts <auth|catalog|members>
 */
import { join } from 'node:path'

const pkg = process.argv[2]
if (!pkg || !/^[a-z-]+$/.test(pkg)) {
  console.error('uso: migrate.ts <pacote>')
  process.exit(1)
}
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL ausente')

const root = join(import.meta.dir, '..', '..')
const pkgDir = join(root, 'packages', pkg)
const folder = join(pkgDir, 'src/infrastructure/persistence/drizzle/migrations')
// Resolve as dependências a partir do pacote (a raiz do monorepo não as declara).
const load = (spec: string) => import(Bun.resolveSync(spec, pkgDir))
const { readMigrationFiles } = await load('drizzle-orm/migrator')
const postgres = (await load('postgres')).default

type Migration = { folderMillis: number; hash: string; sql: string[] }
const table = `${pkg.replace(/-/g, '_')}_migrations`
const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
  await sql`create schema if not exists drizzle`
  await sql.unsafe(
    `create table if not exists drizzle.${table} (id serial primary key, hash text not null, created_at bigint)`,
  )
  const rows: { hash: string; created_at: string }[] = await sql.unsafe(
    `select hash, created_at from drizzle.${table}`,
  )
  const applied = new Map(rows.map((r) => [Number(r.created_at), r.hash]))
  let count = 0
  for (const migration of readMigrationFiles({ migrationsFolder: folder }) as Migration[]) {
    const known = applied.get(migration.folderMillis)
    if (known !== undefined) {
      if (known !== migration.hash) {
        throw new Error(`${pkg}: histórico divergente em ${migration.folderMillis}`)
      }
      continue
    }
    await sql.begin(async (tx: typeof sql) => {
      for (const statement of migration.sql) if (statement.trim()) await tx.unsafe(statement)
      await tx.unsafe(`insert into drizzle.${table} (hash, created_at) values ($1, $2)`, [
        migration.hash,
        migration.folderMillis,
      ])
    })
    count++
  }
  console.log(`✓ ${pkg}: ${count} migration(s) aplicada(s) (${applied.size} já existiam)`)
} finally {
  await sql.end()
}
