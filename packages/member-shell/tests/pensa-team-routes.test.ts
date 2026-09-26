import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { createPensaRoutes } = await import('../src/routes/pensa')

/**
 * As rotas da EQUIPE do Pensa no BFF (26/09/2026): o corpo do join é validado aqui, a
 * impersonação somente-leitura barra toda escrita antes do gateway, o `me` passa no DELETE
 * de membro, e os 403/404/409 do members atravessam com a mensagem inteira (a janela da
 * criança mostra `error.message`).
 */
const STUDENT = {
  id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
  role: 'student',
  status: 'active',
}
const PROJECT = '7d3c1f4e-2b6a-4c8d-9e0f-1a2b3c4d5e6f'
const OTHER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

function deps(overrides: Record<string, unknown> = {}, session: Record<string, unknown> = STUDENT) {
  return {
    session: { getSession: async () => session },
    members: {
      getGamification: async () => ({ status: 200, body: { level: { slug: 'hacker' } } }),
      ...overrides,
    },
  } as unknown as Parameters<typeof createPensaRoutes>[0]
}

const params = <T extends Record<string, string>>(values: T) => ({
  params: Promise.resolve(values),
})
const json = async (response: Response) => (await response.json()) as any

describe('equipe do Pensa no BFF', () => {
  test('join valida o corpo (400) e repassa o código como a criança digitou', async () => {
    const seen: unknown[] = []
    const routes = createPensaRoutes(
      deps({
        pensaJoinProject: async (body: unknown) => {
          seen.push(body)
          return { status: 200, body: { project: { id: PROJECT } } }
        },
      }),
    )
    const bad = await routes.pensaJoin.POST(
      new Request('https://kids.test/api/pensa/projects/join', {
        method: 'POST',
        body: JSON.stringify({ code: 'ab' }),
      }),
    )
    expect(bad.status).toBe(400)
    const ok = await routes.pensaJoin.POST(
      new Request('https://kids.test/api/pensa/projects/join', {
        method: 'POST',
        body: JSON.stringify({ code: ' zap-7k3q m2 ' }),
      }),
    )
    expect(ok.status).toBe(200)
    expect(seen).toEqual([{ code: 'zap-7k3q m2' }])
  })

  test('os 403/404/409 do members atravessam com a mensagem inteira', async () => {
    const routes = createPensaRoutes(
      deps({
        pensaJoinProject: async () => ({
          status: 404,
          body: {
            error: {
              code: 'PENSA_INVITE_INVALID',
              message: 'Esse código não abriu nenhum plano. Confira com quem te chamou.',
            },
          },
        }),
        pensaShareProject: async () => ({
          status: 403,
          body: {
            error: { code: 'PENSA_NOT_OWNER', message: 'Só quem criou o plano pode fazer isso.' },
          },
        }),
      }),
    )
    const invalid = await routes.pensaJoin.POST(
      new Request('https://kids.test/api/pensa/projects/join', {
        method: 'POST',
        body: JSON.stringify({ code: 'ZAP-000000' }),
      }),
    )
    expect(invalid.status).toBe(404)
    expect((await json(invalid)).error.message).toContain('Confira com quem te chamou')
    const notOwner = await routes.pensaShare.POST(
      new Request('https://kids.test'),
      params({ projectId: PROJECT }),
    )
    expect(notOwner.status).toBe(403)
    expect((await json(notOwner)).error.code).toBe('PENSA_NOT_OWNER')
  })

  test('tirar um membro aceita `me` e um uuid; recusa qualquer outra coisa sem chamar o gateway', async () => {
    const seen: string[] = []
    const routes = createPensaRoutes(
      deps({
        pensaRemoveProjectMember: async (_project: string, profile: string) => {
          seen.push(profile)
          return { status: 200, body: { ok: true } }
        },
      }),
    )
    expect(
      (
        await routes.pensaMember.DELETE(
          new Request('https://kids.test'),
          params({ projectId: PROJECT, profileId: 'me' }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await routes.pensaMember.DELETE(
          new Request('https://kids.test'),
          params({ projectId: PROJECT, profileId: OTHER }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await routes.pensaMember.DELETE(
          new Request('https://kids.test'),
          params({ projectId: PROJECT, profileId: 'alguem' }),
        )
      ).status,
    ).toBe(404)
    expect(seen).toEqual(['me', OTHER])
  })

  test('a lista da equipe é leitura (sem portão de escrita); id inválido é 404', async () => {
    const routes = createPensaRoutes(
      deps({
        pensaListProjectMembers: async () => ({
          status: 200,
          body: { role: 'owner', members: [] },
        }),
      }),
    )
    const ok = await routes.pensaMembers.GET(
      new Request('https://kids.test'),
      params({ projectId: PROJECT }),
    )
    expect(ok.status).toBe(200)
    expect((await json(ok)).role).toBe('owner')
    const bad = await routes.pensaMembers.GET(
      new Request('https://kids.test'),
      params({ projectId: 'x' }),
    )
    expect(bad.status).toBe(404)
  })

  test('a impersonação somente-leitura barra join, gerar/desligar código e tirar membro antes do gateway', async () => {
    let mutated = false
    const touch = async () => {
      mutated = true
      return { status: 200, body: { ok: true } }
    }
    const routes = createPensaRoutes(
      deps(
        {
          pensaJoinProject: touch,
          pensaShareProject: touch,
          pensaUnshareProject: touch,
          pensaRemoveProjectMember: touch,
        },
        { ...STUDENT, act: { mode: 'readonly' } },
      ),
    )
    const attempts = [
      routes.pensaJoin.POST(
        new Request('https://kids.test', {
          method: 'POST',
          body: JSON.stringify({ code: 'ZAP-7K3QM2' }),
        }),
      ),
      routes.pensaShare.POST(new Request('https://kids.test'), params({ projectId: PROJECT })),
      routes.pensaShare.DELETE(new Request('https://kids.test'), params({ projectId: PROJECT })),
      routes.pensaMember.DELETE(
        new Request('https://kids.test'),
        params({ projectId: PROJECT, profileId: 'me' }),
      ),
    ]
    for (const attempt of attempts) expect((await attempt).status).toBe(403)
    expect(mutated).toBe(false)
  })
})
