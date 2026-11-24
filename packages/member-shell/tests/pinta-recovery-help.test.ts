import { describe, expect, mock, test } from 'bun:test'
import type { PintaRecoveryHelpReport } from '@sistemazero/pinta'

mock.module('server-only', () => ({}))
const { createPintaRecoveryHelpRoutes } = await import('../src/routes/pinta-recovery-help')
const { pintaRecoveryHelpFor, PINTA_RECOVERY_HELP_ENDPOINT } = await import(
  '../src/lib/pinta-recovery-help'
)

const userId = '11111111-1111-4111-8111-111111111111'
const accountId = '22222222-2222-4222-8222-222222222222'
const sessionId = '55555555-5555-4555-8555-555555555555'
const threadId = '66666666-6666-4666-8666-666666666666'
const base: PintaRecoveryHelpReport = {
  kind: 'retained-recovery',
  profile: userId,
  requestedAt: '2026-11-23T17:03:00.000Z',
  operations: [
    {
      opId: '0b7c8d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e',
      drawings: [{ id: 'vila-1', name: 'Vila' }],
    },
  ],
}
const report = (overrides: Record<string, unknown> = {}) => ({ ...base, ...overrides })

type User = Record<string, unknown>
const student: User = {
  id: userId,
  status: 'active',
  role: 'customer',
  activeProfile: { accountId },
  kids: { kind: 'student', sessionId },
}

function fixture(
  user: User,
  upstream: { status: number; body: unknown } = { status: 200, body: { threadId } },
) {
  const calls: { path: string; body: unknown }[] = []
  const routes = createPintaRecoveryHelpRoutes({
    session: {
      audience: 'kids',
      getAccessToken: async () => 'local-verified',
      getRefreshToken: async () => 'local-renewal',
      verifyAccessToken: async () => ({ ok: true, user }),
    } as never,
    gateway: {
      refreshSession: async () => ({ state: 'unavailable' }),
      gatewayFetchHmac: async (path: string, opts: { body?: unknown } = {}) => {
        calls.push({ path, body: opts.body })
        return upstream
      },
    } as never,
  })
  const post = (body: unknown, headers: Record<string, string> = { 'x-sz-session': sessionId }) =>
    routes.pintaRecoveryHelp.POST(
      new Request('http://kids.local/api/pinta/recovery-help', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    )
  return { calls, post }
}

describe('BFF do Preciso de ajuda do Pinta', () => {
  test('o aluno ativo abre a conversa dele: o ator vem da sessão, nunca do corpo', async () => {
    const { calls, post } = fixture(student)
    const response = await post({ ...report(), userId: 'outro' })
    // Campo a mais no pedido é recusado: o corpo não carrega identidade.
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(0)

    const ok = await post(report())
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ threadId })
    expect(calls).toEqual([
      {
        path: '/members/internal/teacher-threads/pinta-recovery-help',
        body: { userId, accountId, audience: 'kids', payload: report() },
      },
    ])
  })

  test('recusa pais, conta inativa, perfil sem conta responsável e suporte em modo leitura', async () => {
    const refused: [User, number][] = [
      [{ ...student, kids: { kind: 'parent', sessionId } }, 403],
      [{ ...student, status: 'inactive' }, 403],
      [{ ...student, activeProfile: undefined }, 403],
      // Perfil sem a conta responsável: o ator não fecha e nada é chamado.
      [{ ...student, activeProfile: {} }, 401],
      [{ ...student, act: { sub: 'suporte', mode: 'readonly' } }, 403],
    ]
    for (const [user, status] of refused) {
      const { calls, post } = fixture(user)
      expect((await post(report())).status).toBe(status)
      expect(calls).toHaveLength(0)
    }
    // A escrita exige a sessão que abriu a página (outra aba com outro perfil não escreve).
    const { calls, post } = fixture(student)
    expect((await post(report(), {})).status).toBe(409)
    expect(calls).toHaveLength(0)
  })

  test('recusa o pedido sobre o armazenamento de OUTRO perfil, grande demais ou malformado', async () => {
    const { calls, post } = fixture(student)
    const drawings = Array.from({ length: 41 }, (_, i) => ({ id: `d-${i}`, name: null }))
    expect((await post(report({ profile: 'outro-perfil' }))).status).toBe(403)
    for (const body of [
      report({ operations: [{ opId: '0b7c8d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e', drawings }] }),
      report({ operations: [] }),
      report({ kind: 'outra-coisa' }),
      'texto solto',
    ])
      expect((await post(body)).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  test('uma recusa do Members chega como erro, sem inventar conversa', async () => {
    const { post } = fixture(student, { status: 429, body: null })
    expect((await post(report())).status).toBe(429)
    const wrong = fixture(student, { status: 200, body: { threadId: 'nao-e-uuid' } })
    expect((await wrong.post(report())).status).toBe(502)
  })
})

describe('o host liga o canal de recados no Pinta', () => {
  test('sem a conta do Pinta deste aluno não há canal (o botão não aparece)', () => {
    expect(pintaRecoveryHelpFor(null)).toBeNull()
  })

  test('com a conta, manda o pedido ao BFF e devolve a conversa nos recados', async () => {
    const sent: { input: string; init: RequestInit }[] = []
    const help = pintaRecoveryHelpFor(accountId, async (input, init) => {
      sent.push({ input, init })
      return Response.json({ threadId })
    })
    expect(help).not.toBeNull()
    const where = await help!.send(base)
    expect(where).toEqual({ label: 'nos seus recados', href: `/recados/${threadId}` })
    expect(sent[0]?.input).toBe(PINTA_RECOVERY_HELP_ENDPOINT)
    expect(sent[0]?.init.method).toBe('POST')
    expect(JSON.parse(String(sent[0]?.init.body))).toEqual(report())

    const failing = pintaRecoveryHelpFor(accountId, async () => new Response(null, { status: 503 }))
    let failed = false
    try {
      await failing!.send(base)
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })
})
