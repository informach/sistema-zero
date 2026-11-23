import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { DrizzleTeacherThreadRepository } from '../../src/infrastructure/persistence/drizzle/teacher-thread.repository'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

const target = optInKidsJourneyDatabase('PINTA_RECOVERY_HELP_TEST_DATABASE_URL')
const path = '/members/internal/teacher-threads/pinta-recovery-help'
const token = 'local-pinta-recovery-help-token'
const gateway = { 'x-internal-token': token, 'x-consumer-id': 'member-shell' }
const report = (drawings = 1) => ({
  kind: 'retained-recovery',
  profile: 'perfil-local',
  requestedAt: new Date().toISOString(),
  operations: [
    {
      opId: randomUUID(),
      drawings: Array.from({ length: drawings }, (_, i) => ({
        id: `d-${i}`,
        name: `Desenho ${i}`,
      })),
    },
  ],
})

describe.skipIf(!target)('Ajuda do Pinta na composição real do Members com PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof openKidsJourneyTestDatabase>>
  let port = 0
  let stop: (() => Promise<void>) | null = null
  beforeAll(async () => {
    db = await openKidsJourneyTestDatabase(target!)
    const socket = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response(null) })
    port = socket.port!
    await socket.stop(true)
    const app = await createApplication(
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: target,
        HOST: '127.0.0.1',
        PORT: String(port),
        GATEWAY_HMAC_SECRET: 'local-verified-upstream-fixture',
        INTERNAL_API_TOKEN: token,
      }),
    )
    await app.start()
    stop = () => app.stop()
  }, 60_000)
  afterAll(async () => {
    await stop?.()
    await db?.close()
  })

  const send = (body: unknown, headers: Record<string, string> = gateway) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })

  test('a migração aceita o assunto novo e a conversa é uma por perfil, sem aula', async () => {
    const actor = { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' }
    const first = await send({ ...actor, payload: report() })
    expect(first.status).toBe(200)
    const { threadId } = (await first.json()) as { threadId: string }
    const repo = new DrizzleTeacherThreadRepository(db.db)
    await repo.setWorkflowStatus(threadId, 'resolved')
    const second = await send({ ...actor, payload: report(2) })
    expect(((await second.json()) as { threadId: string }).threadId).toBe(threadId)

    const rows = await db.sql<{ id: string; context_type: string; workflow_status: string }[]>`
      select id, context_type, workflow_status, course_id, lesson_id
        from members.teacher_threads where user_id = ${actor.userId}`
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      context_type: 'pinta_recovery',
      workflow_status: 'waiting_teacher',
      course_id: null,
      lesson_id: null,
    })
    const page = await repo.listMessages(threadId)
    expect(page.messages.map((m) => m.authorRole)).toEqual(['student', 'student'])
    expect(page.messages[1]?.body).toContain('Desenho 1 (d-1)')

    // A caixa da equipe lista a conversa sem aula, filtrada pelo assunto ou não.
    const staffUserId = randomUUID()
    const filtered = await repo.listForAdmin({
      staffUserId,
      contextType: 'pinta_recovery',
      userIds: [actor.userId],
      limit: 10,
      offset: 0,
    })
    expect(filtered.map((t) => t.id)).toEqual([threadId])
    expect(filtered[0]).toMatchObject({ courseTitle: null, unread: true, messageCount: 2 })
    const all = await repo.listForAdmin({
      staffUserId,
      userIds: [actor.accountId],
      limit: 10,
      offset: 0,
    })
    expect(all.map((t) => t.id)).toEqual([threadId])
  })

  test('recusas não gravam nada no banco', async () => {
    const actor = { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' }
    const refused = [
      await send({ ...actor, payload: report() }, { 'x-consumer-id': 'member-shell' }),
      await send(
        { ...actor, payload: report() },
        { 'x-internal-token': token, 'x-consumer-id': 'hub' },
      ),
      await send({ ...actor, audience: 'adult', payload: report() }),
      await send({ ...actor, payload: report(41) }),
    ]
    expect(refused.map((r) => r.status)).toEqual([401, 401, 422, 400])
    const [row] = await db.sql<{ count: number }[]>`
      select count(*)::int as count from members.teacher_threads where user_id = ${actor.userId}`
    expect(row?.count).toBe(0)
  })
})
