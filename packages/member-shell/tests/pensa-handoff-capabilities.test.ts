import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
const { createPensaRoutes } = await import('../src/routes/pensa')

const TASK = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e07'
const CHILD = { id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010', role: 'student', status: 'active' }
const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})

function handoff(destination: 'studio' | 'pinta') {
  return {
    task: {
      id: TASK,
      title: 'Desenhar o gato',
      summary: null,
      destination,
      position: 0,
      guide: { contractVersion: 2, steps: [], criteria: [] },
      context:
        destination === 'studio'
          ? { kind: 'studio', dimension: '2d', blockIds: ['sz_g2d_setup_stage'] }
          : { kind: 'pinta', assetId: 'gato', artKind: 'sprite' },
    },
    project: { id: 'project', name: 'Gato' },
    cycle: { id: 'cycle', number: 1, goal: null },
    capability: { owned: true, blockedReason: null },
  }
}

function routes(overrides: Record<string, unknown>, destination: 'studio' | 'pinta' = 'pinta') {
  return createPensaRoutes({
    session: { getSession: async () => CHILD },
    members: {
      pensaGetTaskHandoff: async () => ({ status: 200, body: handoff(destination) }),
      pensaJourneyGet: async () => ({ status: 200, body: { studioAuthoring: 'blocks' } }),
      getGamificationReadonly: async () => ({ status: 200, body: { level: { slug: 'hacker' } } }),
      getStudioUnlocksReadonly: async () => ({
        status: 200,
        body: { blocks: ['sz_g2d_setup_stage'] },
      }),
      checkCreativeToolsAccessReadonly: async () => ({
        status: 200,
        body: { access: { 'estudio-completo': true, pinta: true, molda: true } },
      }),
      ...overrides,
    },
  } as unknown as Parameters<typeof createPensaRoutes>[0])
}

const get = (r: ReturnType<typeof routes>) =>
  r.pensaTaskHandoff.GET(new Request(`https://kids.test/api/pensa/tasks/${TASK}/handoff`), {
    params: Promise.resolve({ taskId: TASK }),
  })

describe('handoff: falha de LEITURA não tranca o guia (M6)', () => {
  test('a converted mission opens with Pro capability even if its original block service is unavailable', async () => {
    const unlocks = mock(async () => {
      throw new Error('offline')
    })
    const res = await get(
      routes(
        {
          pensaJourneyGet: async () => ({ status: 200, body: { studioAuthoring: 'code' } }),
          getGamificationReadonly: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
          getStudioUnlocksReadonly: unlocks,
        },
        'studio',
      ),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).capability.owned).toBe(true)
    expect(unlocks).not.toHaveBeenCalled()
  })
  test('gamificação fora do ar → 503 recuperável, nunca "recursos mudaram"', async () => {
    const res = await get(
      routes({ getGamificationReadonly: async () => ({ status: 502, body: null }) }),
    )
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error: { message: string }; capability?: unknown }
    expect(body.error.message).toContain('Tente de novo')
    expect(body.capability).toBeUndefined()
  })

  test('as capacidades não chegaram → 503', async () => {
    const res = await get(
      routes({ checkCreativeToolsAccessReadonly: async () => ({ status: 500, body: null }) }),
    )
    expect(res.status).toBe(503)
  })

  test('a leitura que LANÇA também é 503, e vai ao log pelo nome', async () => {
    const error = spyOn(console, 'error').mockImplementation(() => undefined)
    restorers.push(() => error.mockRestore())
    const res = await get(
      routes({
        getStudioUnlocksReadonly: async () => {
          throw new TypeError('fetch failed')
        },
      }),
    )
    expect(res.status).toBe(503)
    expect(JSON.stringify(error.mock.calls)).toContain('"name":"TypeError"')
  })

  test('a recusa REAL (sem o produto) continua bloqueando, com a frase de sempre', async () => {
    const res = await get(
      routes({
        checkCreativeToolsAccessReadonly: async () => ({
          status: 200,
          body: { access: { 'estudio-completo': true, pinta: false, molda: false } },
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { capability: { owned: boolean; blockedReason: string } }
    expect(body.capability.owned).toBe(false)
    expect(body.capability.blockedReason).toContain('Os recursos desta missão mudaram')
  })

  test('com tudo em ordem, a missão abre', async () => {
    const res = await get(routes({}, 'studio'))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { capability: { owned: boolean } }).capability.owned).toBe(true)
  })
})
