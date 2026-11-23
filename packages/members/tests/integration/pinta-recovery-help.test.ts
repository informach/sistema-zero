import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const TOKEN = 'pinta-recovery-help-token'
const PATH = 'http://localhost/members/internal/teacher-threads/pinta-recovery-help'
const STAFF = '99999999-9999-4999-8999-999999999999'

function report(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'retained-recovery',
    profile: 'perfil-local',
    requestedAt: '2026-11-23T17:03:00.000Z',
    operations: [
      {
        opId: '0b7c8d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e',
        drawings: [
          { id: 'vila-1', name: 'Vila' },
          { id: 'apagado', name: null },
        ],
      },
    ],
    ...overrides,
  }
}

function kid() {
  return { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const }
}

function send(
  env: ReturnType<typeof buildApp>,
  body: unknown,
  headers: Record<string, string> = { 'x-internal-token': TOKEN, 'x-consumer-id': 'member-shell' },
) {
  return env.app.handle(
    new Request(PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )
}

describe('Ajuda do Pinta: a conversa de recuperação sem aula', () => {
  test('abre a conversa do próprio perfil e o pedido seguinte entra nela, mesmo resolvida', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const actor = kid()
    const first = await send(env, { ...actor, payload: report() })
    expect(first.status).toBe(200)
    const { threadId } = (await first.json()) as { threadId: string }

    const thread = env.teacherThreadsRepo.threads.find((t) => t.id === threadId)
    expect(thread).toMatchObject({
      userId: actor.userId,
      accountId: actor.accountId,
      audience: 'kids',
      contextType: 'pinta_recovery',
      courseId: null,
      lessonId: null,
      title: 'Ajuda do Pinta: recuperação de desenhos',
      workflowStatus: 'waiting_teacher',
    })
    const [message] = env.teacherThreadsRepo.messages.filter((m) => m.threadId === threadId)
    expect(message).toMatchObject({ authorRole: 'student', authorId: actor.userId })
    expect(message?.helpContext ?? null).toBeNull()
    for (const piece of [
      'Ajuda do Pinta: recuperação de desenhos',
      'Perfil no aparelho: perfil-local',
      '1. Edição 0b7c8d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e: Vila (vila-1), apagado (sem nome)',
      '2026-11-23T17:03:00.000Z',
    ])
      expect(message?.body).toContain(piece)

    await env.teacherThreadsRepo.setWorkflowStatus(threadId, 'resolved')
    const again = await send(env, { ...actor, payload: report() })
    expect(((await again.json()) as { threadId: string }).threadId).toBe(threadId)
    expect(env.teacherThreadsRepo.threads.filter((t) => t.userId === actor.userId)).toHaveLength(1)
    expect(env.teacherThreadsRepo.messages.filter((m) => m.threadId === threadId)).toHaveLength(2)
    expect(env.teacherThreadsRepo.threads.find((t) => t.id === threadId)?.workflowStatus).toBe(
      'waiting_teacher',
    )

    // A equipe encontra a conversa sem aula na caixa de recados, filtrando pelo assunto novo.
    const list = await env.app.handle(
      new Request('http://localhost/members/admin/teacher-threads?context=pinta_recovery', {
        headers: { 'x-internal-token': TOKEN, 'x-auth-user-id': STAFF },
      }),
    )
    expect(list.status).toBe(200)
    const threads = (await list.json()) as { threads?: { id: string }[] } | { id: string }[]
    const ids = (Array.isArray(threads) ? threads : (threads.threads ?? [])).map((t) => t.id)
    expect(ids).toContain(threadId)

    // E a criança vê a mesma conversa nos recados dela.
    const mine = await env.app.handle(
      new Request(`http://localhost/members/teacher-threads/${threadId}?audience=kids`, {
        headers: { 'x-internal-token': TOKEN, 'x-auth-user-id': actor.userId },
      }),
    )
    expect(mine.status).toBe(200)
  })

  test('cada perfil tem a sua conversa: o pedido nunca escreve na conversa de outro', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const one = kid()
    const other = { ...kid(), accountId: one.accountId }
    const a = (await (await send(env, { ...one, payload: report() })).json()) as {
      threadId: string
    }
    const b = (await (await send(env, { ...other, payload: report() })).json()) as {
      threadId: string
    }
    expect(a.threadId).not.toBe(b.threadId)
    expect(env.teacherThreadsRepo.threads.find((t) => t.id === b.threadId)?.userId).toBe(
      other.userId,
    )
  })

  test('recusa quem não é o member-shell com o token interno', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const body = { ...kid(), payload: report() }
    const statuses = [
      (await send(env, body, { 'x-consumer-id': 'member-shell' })).status,
      (await send(env, body, { 'x-internal-token': 'outro', 'x-consumer-id': 'member-shell' }))
        .status,
      (await send(env, body, { 'x-internal-token': TOKEN, 'x-consumer-id': 'hub' })).status,
    ]
    for (const status of statuses) expect([401, 403]).toContain(status)
    // Sem o token configurado a rota não existe, nem fora de produção.
    expect((await send(buildApp(), body)).status).toBe(404)
    expect(env.teacherThreadsRepo.threads).toHaveLength(0)
  })

  test('recusa ator inválido: adulto em nome de outra conta e perfil sem conta responsável', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const adult = { userId: randomUUID(), accountId: randomUUID(), audience: 'adult' }
    expect((await send(env, { ...adult, payload: report() })).status).toBe(422)
    const orphan = { userId: randomUUID(), audience: 'kids' }
    expect((await send(env, { ...orphan, payload: report() })).status).toBe(422)
    expect(env.teacherThreadsRepo.threads).toHaveLength(0)
  })

  test('recusa pedido grande demais ou malformado sem abrir conversa', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const drawings = Array.from({ length: 41 }, (_, i) => ({ id: `d-${i}`, name: 'x' }))
    const operations = Array.from({ length: 21 }, () => ({ opId: randomUUID(), drawings: [] }))
    const split = [0, 1].map(() => ({ opId: randomUUID(), drawings: drawings.slice(0, 21) }))
    for (const payload of [
      report({ operations: [{ opId: randomUUID(), drawings }] }),
      report({ operations }),
      report({ operations: split }),
      report({ operations: [] }),
      report({ profile: 'x'.repeat(81) }),
      report({
        operations: [{ opId: randomUUID(), drawings: [{ id: 'a', name: 'n'.repeat(121) }] }],
      }),
      report({ operations: [{ opId: 'nao-e-uuid', drawings: [] }] }),
      report({ bytes: 'AAAA' }),
    ]) {
      const response = await send(env, { ...kid(), payload })
      expect(response.status).toBe(400)
    }
    expect(env.teacherThreadsRepo.threads).toHaveLength(0)
  })

  test('o maior pedido aceito cabe no recado', async () => {
    const env = buildApp({ internalToken: TOKEN })
    const operations = Array.from({ length: 20 }, (_, op) => ({
      opId: randomUUID(),
      drawings: Array.from({ length: 2 }, (_, i) => ({
        id: `${'d'.repeat(60)}-${op}-${i}`.slice(0, 64),
        name: 'n'.repeat(120),
      })),
    }))
    const response = await send(env, {
      ...kid(),
      payload: report({ profile: `adult:${'a'.repeat(74)}`, operations }),
    })
    expect(response.status).toBe(200)
    expect(env.teacherThreadsRepo.messages[0]!.body.length).toBeLessThanOrEqual(8000)
  })
})
