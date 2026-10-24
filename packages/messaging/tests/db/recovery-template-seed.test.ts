import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { seedRecoveryTemplates } from '../../scripts/recovery-template-seed'
import { seeds } from '../../scripts/seed-templates'
import { Template } from '../../src/domain/template/template.aggregate'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { messageTemplates } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleTemplateRepository } from '../../src/infrastructure/persistence/drizzle/template.repository'

const url = process.env.TEST_DATABASE_URL
if (
  url &&
  (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname) ||
    !/_test(?:_|$)/.test(new URL(url).pathname))
)
  throw new Error('O teste exige PostgreSQL QA local')
const now = new Date('2026-10-24T12:00:00Z')
const keys = seeds.filter((seed) => seed.key.startsWith('recovery-')).map((seed) => seed.key)
describe.skipIf(!url)('Seed restrito de regularização — PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleTemplateRepository
  let extras: string[] = []
  let ownsNamespace = false
  beforeAll(async () => {
    connection = createDbConnection(url!, { max: 2 })
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations`,
      migrationsSchema: 'drizzle',
      migrationsTable: 'messaging_migrations',
    })
    repository = new DrizzleTemplateRepository(connection.db)
    const existing = await connection.db
      .select({ id: messageTemplates.id })
      .from(messageTemplates)
      .where(inArray(messageTemplates.key, [...keys, 'subscription-charge-failed']))
    if (existing.length) throw new Error('QA seed namespace must be empty')
    ownsNamespace = true
  })
  afterEach(async () => {
    if (!ownsNamespace) return
    const owned = await connection.db
      .select({ id: messageTemplates.id })
      .from(messageTemplates)
      .where(inArray(messageTemplates.key, [...keys, 'subscription-charge-failed']))
    const ids = [...extras, ...owned.map((item) => item.id)]
    if (ids.length)
      await connection.db.delete(messageTemplates).where(inArray(messageTemplates.id, ids))
    extras = []
  })
  afterAll(async () => connection?.close())
  test('preview não escreve; apply cria só oito, repete sem mudar versões e preserva template alheio', async () => {
    const protectedTemplate = Template.create({
      id: crypto.randomUUID(),
      key: 'qa-protected-template',
      channel: 'email',
      name: 'QA',
      body: 'Preservar',
      subject: 'QA',
      now,
    })
    await repository.create(protectedTemplate)
    extras.push(protectedTemplate.id)
    const preview = await seedRecoveryTemplates(repository, seeds, {
      apply: false,
      retireLegacy: false,
      now,
    })
    expect(preview.ready).toBe(false)
    expect(preview.templates.every((item) => !item.exists)).toBe(true)
    expect((await repository.list({ limit: 100, offset: 0 })).total).toBe(1)
    const applied = await seedRecoveryTemplates(repository, seeds, {
      apply: true,
      retireLegacy: false,
      now,
    })
    expect(applied.ready).toBe(true)
    const before = (await repository.list({ limit: 100, offset: 0 })).items.map((item) => ({
      id: item.id,
      state: item.state,
    }))
    const replay = await seedRecoveryTemplates(repository, seeds, {
      apply: true,
      retireLegacy: false,
      now,
    })
    expect(replay.templates.every((item) => item.action === 'UNCHANGED')).toBe(true)
    expect(
      (await repository.list({ limit: 100, offset: 0 })).items.map((item) => ({
        id: item.id,
        state: item.state,
      })),
    ).toEqual(before)
    expect((await repository.findById(protectedTemplate.id))?.state.body).toBe('Preservar')
  })
  test('preserva desativação intencional do novo e aposenta antigos só em apply explícito', async () => {
    await seedRecoveryTemplates(repository, seeds, { apply: true, retireLegacy: false, now })
    const disabled = await repository.findByChannelAndKey('email', 'recovery-kids-initial')
    if (!disabled) throw new Error('Missing QA template')
    disabled.update({ active: false, body: 'Texto antigo QA' }, now)
    await repository.update(disabled)
    for (const channel of ['email', 'whatsapp'] as const)
      await repository.create(
        Template.create({
          id: crypto.randomUUID(),
          key: 'subscription-charge-failed',
          channel,
          name: 'Legado QA',
          body: 'Histórico QA',
          subject: channel === 'email' ? 'QA' : undefined,
          now,
        }),
      )
    expect(
      (
        await seedRecoveryTemplates(repository, seeds, { apply: false, retireLegacy: true, now })
      ).legacy.every((item) => item.active),
    ).toBe(true)
    const applied = await seedRecoveryTemplates(repository, seeds, {
      apply: true,
      retireLegacy: true,
      now,
    })
    expect(applied.ready).toBe(false)
    expect(applied.templates.find((item) => item.key === 'recovery-kids-initial')?.active).toBe(
      false,
    )
    expect(applied.templates.every((item) => item.current)).toBe(true)
    expect(applied.legacy.every((item) => item.exists && !item.active)).toBe(true)
    expect(
      (await repository.findByChannelAndKey('email', 'subscription-charge-failed'))?.state.body,
    ).toBe('Histórico QA')
  })
  test('catálogo incompleto ou com chave extra é recusado antes de escrever', async () => {
    for (const catalog of [
      seeds.filter((seed) => seed.key !== keys[0]),
      [...seeds, { key: 'recovery-unknown', channel: 'email' as const, name: 'QA', body: 'QA' }],
    ]) {
      let error: unknown
      try {
        await seedRecoveryTemplates(repository, catalog, { apply: true, retireLegacy: true, now })
      } catch (cause) {
        error = cause
      }
      expect(error).toBeInstanceOf(Error)
    }
    expect((await repository.list({ limit: 100, offset: 0 })).total).toBe(0)
  })
})
