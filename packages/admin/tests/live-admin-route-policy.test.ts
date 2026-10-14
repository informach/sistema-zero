import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { adminLiveUpstream } = await import('../src/lib/live-admin-route-policy')
const { createAdminLiveHandler } = await import('../src/server/live-admin-proxy')

const ID = '11111111-1111-4111-8111-111111111111'
const none = new URLSearchParams()
const path = (method: string, value: string, search = none) =>
  adminLiveUpstream(method, value.split('/'), search)?.path ?? null

describe('BFF das oficinas no painel: a lista do que passa', () => {
  test('as rotas dos cursos ao vivo passam', () => {
    expect(path('GET', 'catalog')).toBe('/members/admin/live/catalog')
    expect(path('POST', `courses/${ID}/cohorts`)).toBe(`/members/admin/live/courses/${ID}/cohorts`)
    expect(path('GET', `lessons/${ID}/teacher-notes`)).toBe(
      `/members/admin/live/lessons/${ID}/teacher-notes`,
    )
    // O que já existia para as turmas continua.
    expect(path('PATCH', `cohorts/${ID}`)).not.toBeNull()
    expect(path('GET', `cohorts/${ID}/enrollments`)).not.toBeNull()
    expect(path('POST', `cohorts/${ID}/enrollments`)).not.toBeNull()
    expect(path('POST', `enrollments/${ID}/assign`)).not.toBeNull()
    expect(path('POST', `sessions/${ID}/recording/publish`)).not.toBeNull()
    expect(path('POST', `sessions/${ID}/occurrences`)).not.toBeNull()
    expect(path('POST', `workspaces/${ID}/return`)).not.toBeNull()
  })

  test('o roteiro antigo saiu, e a gravação do Vimeo nunca passa por aqui', () => {
    expect(path('POST', 'programs')).toBeNull()
    expect(path('PATCH', `programs/${ID}`)).toBeNull()
    expect(path('POST', `programs/${ID}/cohorts`)).toBeNull()
    expect(path('GET', 'templates')).toBeNull()
    expect(path('POST', 'templates')).toBeNull()
    // A chave do arquivo e o registro do vídeo são da rota dedicada (sessão estrita).
    expect(path('GET', `occurrences/${ID}/recording/source`)).toBeNull()
    expect(path('PUT', `occurrences/${ID}/recording/vimeo`)).toBeNull()
    expect(path('POST', `occurrences/${ID}/recording/vimeo`)).toBeNull()
    // Forma de caminho e método fora da lista.
    expect(path('GET', `courses/${ID}/cohorts`)).toBeNull()
    expect(path('POST', 'courses/nao-e-uuid/cohorts')).toBeNull()
    expect(path('DELETE', `cohorts/${ID}`)).toBeNull()
    expect(adminLiveUpstream('GET', ['catalog', '..'], none)).toBeNull()
  })

  test('o catálogo leva só a plataforma e a página, já conferidas', () => {
    const query = (search: string) =>
      adminLiveUpstream('GET', ['catalog'], new URLSearchParams(search))?.query
    expect(query(`audience=kids&cursor=${ID}&limit=20`)).toEqual({
      audience: 'kids',
      cursor: ID,
      limit: '20',
    })
    expect(query('audience=adult')).toEqual({ audience: 'adult' })
    expect(query('audience=todas&cursor=x&limit=500&deviceId=y')).toEqual({})
    expect(
      adminLiveUpstream('GET', ['cohorts', ID, 'enrollments'], new URLSearchParams('audience=kids'))
        ?.query,
    ).toEqual({})
  })
})

describe('BFF das oficinas no painel: o handler', () => {
  const context = (value: string) => ({ params: Promise.resolve({ path: value.split('/') }) })

  test('repassa a plataforma ao members e devolve o corpo', async () => {
    const calls: { path: string; opts: unknown }[] = []
    const handler = createAdminLiveHandler({
      session: async () => ({ active: true }),
      gatewayFetch: async (upstream, opts) => {
        calls.push({ path: upstream, opts })
        return { status: 200, body: { cohorts: [] } }
      },
    })
    const response = await handler(
      new Request('http://admin.local/api/admin/live/catalog?audience=kids'),
      context('catalog'),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ cohorts: [] })
    expect(calls).toEqual([
      {
        path: '/members/admin/live/catalog',
        opts: { method: 'GET', body: undefined, query: { audience: 'kids' } },
      },
    ])
  })

  test('caminho fora da lista, sessão ausente, corpo grande e servidor fora', async () => {
    let called = 0
    const make = (status: number, active = true) =>
      createAdminLiveHandler({
        session: async () => (active ? { active: true } : null),
        gatewayFetch: async () => {
          called += 1
          return { status, body: { error: { code: 'X', message: 'Recado do members.' } } }
        },
      })
    const post = (body: string) =>
      new Request(`http://admin.local/api/admin/live/courses/${ID}/cohorts`, {
        method: 'POST',
        body,
      })
    expect((await make(200)(new Request('http://admin.local/x'), context('programs'))).status).toBe(
      404,
    )
    expect((await make(200, false)(post('{}'), context(`courses/${ID}/cohorts`))).status).toBe(401)
    const big = await make(200)(
      post(JSON.stringify({ x: 'a'.repeat(300_000) })),
      context(`courses/${ID}/cohorts`),
    )
    expect(big.status).toBe(413)
    expect(called).toBe(0)
    const refused = await make(409)(post('{}'), context(`courses/${ID}/cohorts`))
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: { code: 'X', message: 'Recado do members.' } })
    const down = await make(502)(post('{}'), context(`courses/${ID}/cohorts`))
    expect(down.status).toBe(502)
    expect((await down.json()).error.code).toBe('LIVE_UNAVAILABLE')
  })
})
