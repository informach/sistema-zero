import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { SuppressMessageService } from '../../src/application/suppress-message/suppress-message.service'
import { Message } from '../../src/domain/message/message.aggregate'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleMessageRepository } from '../../src/infrastructure/persistence/drizzle/message.repository'
import { messages, outbox } from '../../src/infrastructure/persistence/drizzle/schema'

const databaseUrl = process.env.TEST_DATABASE_URL
if (databaseUrl !== undefined) {
  const parsed = new URL(databaseUrl)
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
    !/_test(?:_|$)/.test(parsed.pathname)
  )
    throw new Error('O teste exige PostgreSQL local descartável com nome _test')
}
const now = new Date('2026-10-24T12:00:00Z')
async function failureOf(task: Promise<unknown>) {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Retirada de mensagem — PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleMessageRepository
  let item: Message
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl!, { max: 3 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'messaging_migrations',
    })
    repository = new DrizzleMessageRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  beforeEach(async () => {
    item = Message.create({
      id: crypto.randomUUID(),
      channel: 'email',
      templateKey: 'recovery-qa',
      recipient: { name: 'QA', email: 'qa@example.test' },
      renderedSubject: 'QA',
      renderedBody: 'QA',
      consumerId: 'payments',
      now,
    })
    await repository.create(item)
  })
  afterEach(async () => {
    await connection.db.delete(outbox).where(eq(outbox.aggregateId, item.id))
    await connection.db.delete(messages).where(eq(messages.id, item.id))
  })
  test('retirada persiste estado e evento uma vez, sem ficar disponível para envio', async () => {
    const service = new SuppressMessageService(repository, { now: () => now })
    expect((await service.execute(item.id, 'payments')).suppressed).toBe(true)
    expect((await service.execute(item.id, 'payments')).suppressed).toBe(true)
    const rows = await connection.db.select().from(outbox).where(eq(outbox.aggregateId, item.id))
    expect(rows.filter((row) => row.eventName === 'message.suppressed')).toHaveLength(1)
    const sendable = await connection.db
      .select()
      .from(messages)
      .where(inArray(messages.status, ['QUEUED', 'SCHEDULED']))
    expect(sendable.some((row) => row.id === item.id)).toBe(false)
  })
  test('claim que preserva versão ainda impede retirada com snapshot antigo', async () => {
    const stale = await repository.findById(item.id)
    const claimed = await repository.claimDueEmail(1, now, 60_000)
    expect(claimed[0]?.id).toBe(item.id)
    expect(claimed[0]?.version).toBe(stale?.version)
    expect(stale?.withdrawQueued(now)).toBe(true)
    expect(await failureOf(repository.withdrawQueued(stale!))).toBeInstanceOf(Error)
    expect((await repository.findById(item.id))?.status).toBe('SENDING')
    const events = await connection.db.select().from(outbox).where(eq(outbox.aggregateId, item.id))
    expect(events.some((row) => row.eventName === 'message.suppressed')).toBe(false)
  })
})
