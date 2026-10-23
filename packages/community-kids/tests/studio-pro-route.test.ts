import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'

const getSession = mock()
const checkStudioAccessReadonly = mock()
const getGamificationReadonly = mock()
const getLesson = mock()
const openLessonStudio = mock()

// A rota é uma fronteira HTTP; isolamos somente os adaptadores de sessão e do Members.
// A política, a leitura do Request e as respostas são as implementações reais.
mock.module('@/server/session', () => ({ getSession }))
mock.module('@/server/members', () => ({
  checkStudioAccessReadonly,
  getGamificationReadonly,
  getLesson,
  openLessonStudio,
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
  openLessonStudio.mockReset()
  openLessonStudio.mockResolvedValue({
    status: 200,
    body: {
      blockId: 'block-1',
      bound: true,
      lessonId: 'lesson-1',
      configuration: { initialProject: proProject },
    },
  })
  checkStudioAccessReadonly.mockResolvedValue(studioAvailable)
  getGamificationReadonly.mockResolvedValue(gamificationPro)
})

describe('POST /api/studio/pro-runtime/build', () => {
  test('a bound read-only lesson baseline does not grant compilation', async () => {
    getSession.mockResolvedValue(profileSession)
    getLesson.mockResolvedValue({
      status: 200,
      body: { blocks: [{ id: 'block-1', kind: 'studio' }] },
    })
    openLessonStudio.mockResolvedValue({
      status: 200,
      body: {
        blockId: 'block-1',
        lessonId: 'lesson-1',
        bound: true,
        readOnly: true,
        configuration: { initialProject: proProject },
      },
    })
    expect(
      (
        await POST(
          request({
            courseSlug: 'curso',
            lessonId: 'lesson-1',
            blockId: 'block-1',
            project: proProject,
          }),
        )
      ).status,
    ).toBe(403)
  })
  test('a proposed lesson baseline cannot grant Pro execution before admission', async () => {
    getSession.mockResolvedValue(profileSession)
    getLesson.mockResolvedValue({
      status: 200,
      body: { blocks: [{ id: 'block-1', kind: 'studio' }] },
    })
    openLessonStudio.mockResolvedValue({
      status: 200,
      body: {
        blockId: 'block-1',
        lessonId: 'lesson-1',
        bound: false,
        configuration: { initialProject: proProject },
      },
    })
    const response = await POST(
      request({
        context: 'lesson',
        courseSlug: 'curso',
        lessonId: 'lesson-1',
        blockId: 'block-1',
        project: proProject,
      }),
    )
    expect(response.status).toBe(403)
  })
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
        Response.json({
          ok: true,
          artifact: {
            id: 'a'.repeat(64),
            url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
            sha256: 'b'.repeat(64),
            expiresAt: Date.now() + 60_000,
          },
          output: '',
          durationMs: 12,
        }),
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
          // The published seed changed; the learner still compiles with the original binding.
          blocks: [
            { id: 'block-1', kind: 'studio', content: { initialProject: { kind: 'classic' } } },
          ],
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
