import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'

const getSession = mock()
const checkStudioAccessReadonly = mock()
const getGamificationReadonly = mock()
const getLesson = mock()

// A rota é uma fronteira HTTP; isolamos somente os adaptadores de sessão e do Members.
// A política, a leitura do Request e as respostas são as implementações reais.
mock.module('@/server/session', () => ({ getSession }))
mock.module('@/server/members', () => ({
  checkStudioAccessReadonly,
  getGamificationReadonly,
  getLesson,
}))

const { POST } = await import('../src/app/api/studio/pro-runtime/build/route')

const profileSession = {
  id: 'profile-1',
  role: 'student',
  activeProfile: { accountId: 'account-1', name: 'Ana' },
}

const studioAvailable = { status: 200, body: { access: { 'estudio-completo': true } } }
const gamificationPro = { status: 200, body: { level: { slug: 'god' } } }
const proProject = {
  id: 'projeto-1',
  name: 'Atividade Pro',
  kind: 'pro' as const,
  mode: 'code' as const,
  tree: { 'index.html': { kind: 'file' as const, content: '<main>Oi</main>' } },
  proMeta: { templateId: 'vanilla-js', devScript: 'dev' },
}

function request(body: unknown = {}) {
  return new Request('https://kids.test/api/studio/pro-runtime/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  getSession.mockReset()
  checkStudioAccessReadonly.mockReset()
  getGamificationReadonly.mockReset()
  getLesson.mockReset()
  checkStudioAccessReadonly.mockResolvedValue(studioAvailable)
  getGamificationReadonly.mockResolvedValue(gamificationPro)
})

describe('POST /api/studio/pro-runtime/build', () => {
  test('recusa quem não está autenticado antes de consultar os serviços internos', async () => {
    getSession.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(checkStudioAccessReadonly).not.toHaveBeenCalled()
    expect(getGamificationReadonly).not.toHaveBeenCalled()
  })

  test('exige uma sessão de perfil antes de ler a atividade', async () => {
    getSession.mockResolvedValue({ id: 'account-1', role: 'student' })
    expect((await POST(request())).status).toBe(403)
    expect(getLesson).not.toHaveBeenCalled()
  })

  test('falha fechada quando a aula não confirma o acesso do perfil', async () => {
    getSession.mockResolvedValue(profileSession)
    getLesson.mockResolvedValue({ status: 503, body: null })

    const response = await POST(
      request({
        courseSlug: 'curso-1',
        lessonId: 'lesson-1',
        blockId: 'block-1',
        project: proProject,
      }),
    )

    expect(response.status).toBe(403)
  })

  test('rejeita corpo inválido sem consultar a aula', async () => {
    getSession.mockResolvedValue(profileSession)

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(getLesson).not.toHaveBeenCalled()
  })

  test('libera a atividade Pro matriculada antes da Lenda, mesmo sem o Estúdio livre', async () => {
    const originalUrl = process.env.STUDIO_PRO_RUNTIME_URL
    const originalToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
    const runtimeFetch = Object.assign(
      async () =>
        Response.json({ ok: true, html: '<main>Pronto</main>', output: '', durationMs: 12 }),
      {
        preconnect: (
          _url: string | URL,
          _options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean },
        ) => {},
      },
    ) satisfies typeof fetch
    const upstreamFetch = spyOn(globalThis, 'fetch').mockImplementation(runtimeFetch)
    try {
      process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test'
      process.env.STUDIO_PRO_RUNTIME_TOKEN = 'token-de-teste'
      getSession.mockResolvedValue(profileSession)
      checkStudioAccessReadonly.mockResolvedValue({ status: 200, body: { access: {} } })
      getGamificationReadonly.mockResolvedValue({ status: 200, body: { level: { slug: 'noob' } } })
      getLesson.mockResolvedValue({
        status: 200,
        body: {
          blocks: [{ id: 'block-1', kind: 'studio', content: { initialProject: proProject } }],
        },
      })

      const response = await POST(
        request({
          courseSlug: 'curso-1',
          lessonId: 'lesson-1',
          blockId: 'block-1',
          project: proProject,
        }),
      )

      expect(response.status).toBe(200)
      expect(upstreamFetch).toHaveBeenCalledTimes(1)
    } finally {
      upstreamFetch.mockRestore()
      if (originalUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
      else process.env.STUDIO_PRO_RUNTIME_URL = originalUrl
      if (originalToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
      else process.env.STUDIO_PRO_RUNTIME_TOKEN = originalToken
    }
  })

  test('preserva 413 do runtime para o editor explicar que o projeto excedeu a cota', async () => {
    const originalUrl = process.env.STUDIO_PRO_RUNTIME_URL
    const originalToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
    const runtimeFailureFetch = Object.assign(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: 'OUTPUT_TOO_LARGE',
            message: 'Projeto grande demais.',
          }),
          { status: 413 },
        ),
      {
        preconnect: (
          _url: string | URL,
          _options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean },
        ) => {},
      },
    ) satisfies typeof fetch
    const upstreamFetch = spyOn(globalThis, 'fetch').mockImplementation(runtimeFailureFetch)
    try {
      process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test'
      process.env.STUDIO_PRO_RUNTIME_TOKEN = 'token-de-teste'
      getSession.mockResolvedValue(profileSession)
      getLesson.mockResolvedValue({
        status: 200,
        body: {
          blocks: [{ id: 'block-1', kind: 'studio', content: { initialProject: proProject } }],
        },
      })

      const response = await POST(
        request({
          courseSlug: 'curso-1',
          lessonId: 'lesson-1',
          blockId: 'block-1',
          project: proProject,
        }),
      )

      expect(response.status).toBe(413)
      expect(upstreamFetch).toHaveBeenCalledTimes(1)
    } finally {
      upstreamFetch.mockRestore()
      if (originalUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
      else process.env.STUDIO_PRO_RUNTIME_URL = originalUrl
      if (originalToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
      else process.env.STUDIO_PRO_RUNTIME_TOKEN = originalToken
    }
  })
})
