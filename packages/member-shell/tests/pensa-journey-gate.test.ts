import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { createPensaRoutes } = await import('../src/routes/pensa')
const pensaAiSource = await Bun.file(new URL('../src/routes/pensa-ai.ts', import.meta.url)).text()

const STUDENT = {
  id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
  role: 'student',
  status: 'active',
}

function deps(level: string, overrides: Record<string, unknown> = {}) {
  return {
    session: { getSession: async () => STUDENT },
    members: {
      getGamification: async () => ({ status: 200, body: { level: { slug: level } } }),
      ...overrides,
    },
  } as unknown as Parameters<typeof createPensaRoutes>[0]
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error?: { code?: string } }).error?.code
}

describe('portão de carreira do BFF do Pensa', () => {
  test('bloqueia escrita abaixo de Inventor antes de tocar a mutação', async () => {
    let mutated = false
    const routes = createPensaRoutes(
      deps('coder', {
        pensaCreateProject: async () => {
          mutated = true
          return { status: 200, body: {} }
        },
      }),
    )
    const response = await routes.pensaProjects.POST(
      new Request('https://kids.test/api/pensa/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Meu jogo' }),
      }),
    )
    expect(response.status).toBe(403)
    expect(await errorCode(response)).toBe('CAREER_LEVEL_REQUIRED')
    expect(mutated).toBe(false)
  })

  test('libera escrita a partir de Inventor', async () => {
    const routes = createPensaRoutes(
      deps('hacker', {
        pensaCreateProject: async () => ({ status: 200, body: { id: 'projeto-1' } }),
      }),
    )
    const response = await routes.pensaProjects.POST(
      new Request('https://kids.test/api/pensa/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Meu jogo' }),
      }),
    )
    expect(response.status).toBe(200)
  })

  test('chat e geração de IA reaplicam o mesmo guard antes do trabalho', () => {
    expect(pensaAiSource.match(/await hasAiAppsLevel\(members, user\.role\)/g)).toHaveLength(2)
    expect(pensaAiSource.match(/CAREER_LEVEL_REQUIRED/g)).toHaveLength(2)
  })
})
