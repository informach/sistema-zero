import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import type { PracticeSession } from '../../src/domain/practice/practice'
import { PracticeNotFoundError } from '../../src/domain/practice/practice'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePracticeRepository } from '../../src/infrastructure/persistence/drizzle/practice.repository'
import { preparePracticeTables } from './practice-fixture'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
describe.skipIf(!url)('practice history Postgres', () => {
  let conn: DbConnection, repo: DrizzlePracticeRepository
  const accountId = randomUUID(),
    userId = randomUUID()
  beforeAll(async () => {
    if (!url) throw new Error('Test database unavailable')
    conn = createDbConnection(url)
    await preparePracticeTables(conn)
    repo = new DrizzlePracticeRepository(conn.db)
  })
  afterAll(async () => {
    if (!conn) return
    await conn.sql`delete from members.practice_sessions where account_id=${accountId}`
    await conn.sql`delete from members.account_deletion_fences where account_id=${accountId}`
    await conn.close()
  })
  const session = (): PracticeSession => ({
    id: randomUUID(),
    userId,
    accountId,
    courseId: randomUUID(),
    courseSlug: 'criador',
    lessonId: randomUUID(),
    blockId: randomUUID(),
    title: 'Loops',
    quiz: {
      kind: 'quiz',
      questions: [
        {
          id: 'q',
          prompt: 'Repete?',
          choices: [
            { id: 'a', label: 'Sim' },
            { id: 'b', label: 'Não' },
          ],
          correctChoiceIds: ['a'],
        },
      ],
    },
    answers: null,
    createdAt: new Date(),
    completedAt: null,
  })
  test('retries persistem uma sessão; submissões paralelas conservam a primeira resposta', async () => {
    const input = session()
    await Promise.all([repo.create(input), repo.create(input)])
    expect((await repo.list(userId, accountId)).filter((row) => row.id === input.id)).toHaveLength(
      1,
    )
    const [a, b] = await Promise.all([
      repo.complete(input.id, userId, accountId, { q: ['a'] }, new Date()),
      repo.complete(input.id, userId, accountId, { q: ['b'] }, new Date()),
    ])
    expect(a?.answers).toEqual(b?.answers)
    expect(a?.completedAt).not.toBeNull()
    expect(await repo.get(input.id, randomUUID(), accountId)).toBeNull()
    const [collision] = await Promise.allSettled([repo.create({ ...input, userId: randomUUID() })])
    expect(collision?.status).toBe('rejected')
    if (collision?.status === 'rejected')
      expect(collision.reason).toBeInstanceOf(PracticeNotFoundError)
  })
  test('a cerca de exclusão impede criar novo histórico', async () => {
    await conn.sql`insert into members.account_deletion_fences(account_id,created_at) values(${accountId},now())`
    const [result] = await Promise.allSettled([repo.create(session())])
    expect(result?.status).toBe('rejected')
    if (result?.status === 'rejected') expect(result.reason).toBeInstanceOf(AccessDeniedError)
  })
})
