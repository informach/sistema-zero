import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ModuleAnimationSchema } from '@sistemazero/core/course/module-animation'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { modules } from '../../src/infrastructure/persistence/drizzle/schema'

const database = process.env.EDI_ANIMATION_TEST_DATABASE_URL
if (database) {
  const url = new URL(database)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !/^\/edi_animation_test_[a-z0-9_]+$/.test(url.pathname)
  )
    throw new Error('Use apenas um Postgres local descartável edi_animation_test_*.')
}

test.skipIf(!database)(
  'expansão preserva dados e o ORM novo funciona antes e depois da retirada da coluna antiga',
  async () => {
    const sql = postgres(database!, { max: 1, connect_timeout: 5 })
    const fixture = await mkdtemp(join(tmpdir(), 'edi-animation-migrations-'))
    try {
      // A fresh dedicated database is required. Never truncate or replace an existing schema.
      await sql.unsafe('create schema members')
      await sql.unsafe(`create table members.modules (
      id uuid primary key, course_id uuid not null, title text not null, summary text,
      rive_url text, sort_order integer not null default 0,
      created_at timestamptz not null, updated_at timestamptz not null)`)
      const id = randomUUID()
      const courseId = randomUUID()
      const originalUrl = 'https://old.example/course.riv'
      const instant = new Date('2026-10-31T12:00:00Z')
      await sql`insert into members.modules values (${id}, ${courseId}, 'Módulo', 'Resumo', ${originalUrl}, 3, ${instant}, ${instant})`
      const source = fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
      )
      const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8')) as {
        entries: { tag: string; when: number }[]
      }
      const index = journal.entries.findIndex((entry) => entry.tag === '0143_module_animation')
      expect(index).toBeGreaterThan(0)
      const entries = journal.entries.slice(0, index + 1)
      const previous = entries.at(-2)!
      const latest = entries.at(-1)!
      const contraction = journal.entries[index + 1]!
      expect(contraction.tag).toBe('0144_retire_module_rive')
      const digest = async (tag: string) =>
        createHash('sha256')
          .update(await readFile(join(source, `${tag}.sql`)))
          .digest('hex')
      await mkdir(join(fixture, 'meta'))
      await writeFile(join(fixture, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }))
      for (const entry of entries)
        await copyFile(join(source, `${entry.tag}.sql`), join(fixture, `${entry.tag}.sql`))
      // Seed only the existing migration watermark in a fresh local DB, then use the real migrator.
      await sql.unsafe(
        'create schema drizzle; create table drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)',
      )
      await sql`insert into drizzle.members_migrations (hash, created_at) values (${await digest(previous.tag)}, ${previous.when})`
      const db = drizzle(sql)
      const config = {
        migrationsFolder: fixture,
        migrationsTable: 'members_migrations',
        migrationsSchema: 'drizzle',
      }
      await migrate(db, config)
      await migrate(db, config)
      const applied =
        await sql`select hash, created_at from drizzle.members_migrations order by created_at`
      expect(applied).toHaveLength(2)
      expect(applied[1]?.hash).toBe(await digest(latest.tag))
      expect(Number(applied[1]?.created_at)).toBe(latest.when)
      const [expanded] = await sql`select * from members.modules where id = ${id}`
      expect(expanded?.rive_url).toBe(originalUrl)
      expect(expanded?.animation).toBeNull()
      expect(expanded?.title).toBe('Módulo')
      expect(expanded?.sort_order).toBe(3)
      const animation = ModuleAnimationSchema.parse({
        format: 'edi-animation',
        version: 1,
        title: 'Módulo',
        url: 'https://cdn.example/module.edi-animation.json',
        sha256: 'a'.repeat(64),
        bytes: 1000,
        poster: {
          url: 'https://cdn.example/module.png',
          width: 512,
          height: 512,
          sha256: 'b'.repeat(64),
        },
      })
      await db.update(modules).set({ animation }).where(eq(modules.id, id))
      const [beforeRetirement] = await db.select().from(modules).where(eq(modules.id, id))
      expect(beforeRetirement?.animation).toEqual(animation)
      expect(beforeRetirement?.createdAt.toISOString()).toBe(instant.toISOString())
      expect((await sql`select rive_url from members.modules where id = ${id}`)[0]?.rive_url).toBe(
        originalUrl,
      )
      // Apply the generated contraction through the real migrator after the backfill.
      await copyFile(
        join(source, `${contraction.tag}.sql`),
        join(fixture, `${contraction.tag}.sql`),
      )
      await writeFile(
        join(fixture, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: [...entries, contraction] }),
      )
      await migrate(db, config)
      await migrate(db, config)
      const retired =
        await sql`select hash, created_at from drizzle.members_migrations order by created_at`
      expect(retired).toHaveLength(3)
      expect(retired[2]?.hash).toBe(await digest(contraction.tag))
      expect(Number(retired[2]?.created_at)).toBe(contraction.when)
      expect(
        await sql`select 1 from information_schema.columns where table_schema = 'members' and table_name = 'modules' and column_name = 'rive_url'`,
      ).toHaveLength(0)
      const [afterRetirement] = await db.select().from(modules).where(eq(modules.id, id))
      expect(afterRetirement).toEqual(beforeRetirement)
    } finally {
      await sql.end({ timeout: 5 })
      expect(dirname(resolve(fixture))).toBe(resolve(tmpdir()))
      expect(basename(fixture)).toStartWith('edi-animation-migrations-')
      await rm(fixture, { recursive: true, force: true })
    }
  },
)
