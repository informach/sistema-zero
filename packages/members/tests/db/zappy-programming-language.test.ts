import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import journal from '../../src/infrastructure/persistence/drizzle/migrations/meta/_journal.json'
import { DrizzleZappyRepository } from '../../src/infrastructure/persistence/drizzle/zappy.repository'

const url = process.env.ZAPPY_QA_DATABASE_URL
if (
  url &&
  (!/^\/studio_test_zappy_\d+$/.test(new URL(url).pathname) ||
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
)
  throw new Error(
    'ZAPPY_QA_DATABASE_URL must name an owned local disposable studio_test_zappy_* database.',
  )
const connection = url ? createDbConnection(url, { max: 2 }) : null
const db = () => {
  if (!connection) throw new Error('Missing disposable Zappy database')
  return connection
}
const migrations = resolve(
  import.meta.dir,
  '../../src/infrastructure/persistence/drizzle/migrations',
)
const userId = crypto.randomUUID(),
  accountId = crypto.randomUUID(),
  conversationId = crypto.randomUUID()
const legacyQuestion = crypto.randomUUID(),
  legacyAnswer = crypto.randomUUID()
const legacyText = 'Conversa JavaScript preservada antes da migração.'
let time = Date.now()
const window = () => {
  time += 1000
  const now = new Date(time)
  return {
    now,
    expiresAt: new Date(time + 30 * 86400000),
    processingUntil: new Date(time + 120000),
  }
}

describe.skipIf(!url)('Zappy programming language in the real repository and migrations', () => {
  beforeAll(async () => {
    const boundary = journal.entries.find((entry) => entry.tag === '0135_freezing_madripoor')
    if (!boundary) throw new Error('Zappy migration boundary not found')
    // Historical deployments committed enum additions before their later uses.
    // Bootstrap those exact committed statements, as the existing Studio DB suite does;
    // the actual Drizzle migrator below then upgrades a populated pre-0135 database.
    await db().sql`create schema drizzle`
    await db()
      .sql`create table drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)`
    for (const migration of readMigrationFiles({ migrationsFolder: migrations }).filter(
      (migration) => migration.folderMillis < boundary.when,
    )) {
      for (const statement of migration.sql) if (statement.trim()) await db().sql.unsafe(statement)
      await db()
        .sql`insert into drizzle.members_migrations (hash,created_at) values (${migration.hash},${migration.folderMillis})`
    }
    const now = new Date(time).toISOString()
    await db()
      .sql`insert into members.zappy_conversations (id,user_id,account_id,project_id,created_at,updated_at,expires_at) values (${conversationId},${userId},${accountId},'legacy.game',${now},${now},${new Date(time + 30 * 86400000).toISOString()})`
    await db()
      .sql`insert into members.zappy_messages (id,conversation_id,role,content,created_at) values (${legacyQuestion},${conversationId},'user','Como funciona meu jogo JavaScript?',${now})`
    await db()
      .sql`insert into members.zappy_messages (id,conversation_id,reply_to_id,role,content,response,created_at) values (${legacyAnswer},${conversationId},${legacyQuestion},'assistant',${legacyText},${JSON.stringify({ text: legacyText, scope: 'concept', blockReferences: [] })}::jsonb,${now})`
    await migrate(db().db, { migrationsFolder: migrations, migrationsTable: 'members_migrations' })
    await migrate(db().db, { migrationsFolder: migrations, migrationsTable: 'members_migrations' })
  }, 120000)
  afterAll(async () => {
    await connection?.close()
  })

  test('additive migration preserves legacy source/answers and defaults both roles to JavaScript', async () => {
    const rows = await db()
      .sql`select programming_language,content,response from members.zappy_messages where conversation_id=${conversationId} order by role`
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.programming_language)).toEqual(['javascript', 'javascript'])
    expect(rows[0]?.content).toBe(legacyText)
    const repository = new DrizzleZappyRepository(db().db)
    const page = await repository.history(
      userId,
      'legacy.game',
      new Date(time),
      new Date(time + 30 * 86400000),
    )
    expect(page.messages.find((message) => message.role === 'assistant')?.response).toMatchObject({
      programmingLanguage: 'javascript',
      text: legacyText,
    })
    const sql = await readFile(resolve(migrations, '0135_freezing_madripoor.sql'), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) {
      expect(statement).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i)
      expect(statement.trim()).not.toMatch(/^DELETE\b/i)
    }
  })

  test('Python questions, answers, replay and memory retain their language and reject cross-language reuse', async () => {
    const repository = new DrizzleZappyRepository(db().db)
    const projectId = '_game',
      clientMessageId = crypto.randomUUID()
    const request = {
      userId,
      accountId,
      projectId,
      clientMessageId,
      question: 'Explique este programa Python.',
      programmingLanguage: 'python' as const,
    }
    const reserved = await repository.reserveQuestion({ ...request, ...window() })
    expect(reserved.created).toBe(true)
    if (!reserved.questionId) throw new Error('Question ID required')
    const response = {
      id: crypto.randomUUID(),
      text: 'Observe a ordem dos comandos.',
      kind: 'pro' as const,
      programmingLanguage: 'python' as const,
      scope: 'concept' as const,
      blockReferences: [],
      createdAt: new Date(time).toISOString(),
    }
    await rejects(
      repository.completeQuestion({
        userId,
        projectId,
        questionId: reserved.questionId,
        response: { ...response, programmingLanguage: 'javascript' },
        latencyMs: 1,
        ...window(),
      }),
      { code: 'ZAPPY_CONTEXT_CONFLICT' },
    )
    const saved = await repository.completeQuestion({
      userId,
      projectId,
      questionId: reserved.questionId,
      response,
      latencyMs: 10,
      ...window(),
    })
    expect(saved.programmingLanguage).toBe('python')
    const replay = await repository.reserveQuestion({ ...request, ...window() })
    expect(replay.created).toBe(false)
    expect(replay.response?.id).toBe(saved.id)
    expect(replay.response?.programmingLanguage).toBe('python')
    await rejects(
      repository.reserveQuestion({ ...request, programmingLanguage: 'javascript', ...window() }),
      { code: 'ZAPPY_CONTEXT_CONFLICT' },
    )
    const next = await repository.reserveQuestion({
      ...request,
      clientMessageId: crypto.randomUUID(),
      question: 'Como continuo?',
      ...window(),
    })
    expect(next.recentMessages?.map((message) => message.programmingLanguage)).toEqual([
      'python',
      'python',
    ])
    expect(next.recentMessages?.map((message) => message.role)).toEqual(['user', 'assistant'])
    const page = await repository.history(
      userId,
      projectId,
      new Date(time),
      new Date(time + 30 * 86400000),
    )
    expect(
      page.messages.find((message) => message.role === 'assistant')?.response?.programmingLanguage,
    ).toBe('python')
    expect(
      (
        await repository.history(
          crypto.randomUUID(),
          projectId,
          new Date(time),
          new Date(time + 30 * 86400000),
        )
      ).messages,
    ).toEqual([])
  })

  test('database language constraint rejects unsupported modes without changing existing messages', async () => {
    await rejects(
      async () =>
        await db()
          .sql`insert into members.zappy_messages (id,conversation_id,role,programming_language,content,created_at) values (${crypto.randomUUID()},${conversationId},'user','ruby','invalid',${new Date(time).toISOString()})`,
      { code: '23514' },
    )
    const rows = await db()
      .sql`select count(*)::integer as count from members.zappy_messages where conversation_id=${conversationId}`
    expect(rows[0]?.count).toBe(2)
  })
})
