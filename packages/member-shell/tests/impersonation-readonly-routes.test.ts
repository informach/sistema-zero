import { describe, expect, mock, test } from 'bun:test'

// `server-only` lanca fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createShellRoutes } = await import('../src/routes')
const { createHubRoutes } = await import('../src/routes/hub')

const IMPERSONATED_USER = {
  id: 'user-1',
  email: 'aluno@example.com',
  firstName: 'Aluno',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
  act: { sub: 'admin-1', email: 'admin@example.com', mode: 'readonly' as const },
}

async function expectReadonly(res: Response) {
  expect(res.status).toBe(403)
  await expect(res.json()).resolves.toMatchObject({
    error: { code: 'IMPERSONATION_READONLY' },
  })
}

describe('sessao de impersonacao somente-leitura', () => {
  test('bloqueia escrita de progresso antes de chamar o members', async () => {
    let calls = 0
    const routes = createShellRoutes({
      session: { getSession: async () => IMPERSONATED_USER },
      members: {
        markLessonComplete: async () => {
          calls++
          return { status: 200, body: { ok: true } }
        },
      },
    } as never)

    const res = await routes.lessonComplete.POST(new Request('https://community.test/api'), {
      params: Promise.resolve({ lessonId: 'lesson-1' }),
    })

    await expectReadonly(res)
    expect(calls).toBe(0)
  })

  test('bloqueia escrita no forum antes de chamar o hub', async () => {
    let calls = 0
    const routes = createHubRoutes({
      session: { getSession: async () => IMPERSONATED_USER },
      hub: {
        createThread: async () => {
          calls++
          return { status: 201, body: { id: 'thread-1', authorId: 'user-1' } }
        },
      },
    } as never)

    const res = await routes.hubChannelThreads.POST(
      new Request('https://community.test/api', {
        method: 'POST',
        body: JSON.stringify({ title: 'Duvida', body: 'Mensagem' }),
      }),
      { params: Promise.resolve({ id: 'channel-1' }) },
    )

    await expectReadonly(res)
    expect(calls).toBe(0)
  })

  test('modo write libera a escrita normal e mantém as validações do handler', async () => {
    let calls = 0
    const routes = createShellRoutes({
      session: {
        getSession: async () => ({
          ...IMPERSONATED_USER,
          act: { ...IMPERSONATED_USER.act, mode: 'write' as const },
        }),
      },
      members: {
        markLessonComplete: async () => {
          calls++
          return { status: 200, body: { ok: true } }
        },
      },
    } as never)

    const res = await routes.lessonComplete.POST(new Request('https://community.test/api'), {
      params: Promise.resolve({ lessonId: 'lesson-1' }),
    })

    expect(res.status).toBe(200)
    expect(calls).toBe(1)
  })

  test('modo write libera exatamente o reenvio mais recente do Estúdio', async () => {
    const projects: unknown[] = []
    const routes = createShellRoutes({
      session: {
        getSession: async () => ({
          ...IMPERSONATED_USER,
          act: { ...IMPERSONATED_USER.act, mode: 'write' as const },
        }),
      },
      members: {
        submitStudioProject: async (_lessonId: string, _blockId: string, project: unknown) => {
          projects.push(project)
          return { status: 200, body: { submittedAt: '2026-08-21T12:00:00.000Z' } }
        },
      },
    } as never)
    const latestProject = { name: 'Dia 1', files: { 'main.js': 'codigo-mais-recente' } }

    const res = await routes.studioSubmit.POST(
      new Request('https://community.test/api', {
        method: 'POST',
        body: JSON.stringify({ project: latestProject }),
      }),
      { params: Promise.resolve({ lessonId: 'lesson-1', blockId: 'studio-1' }) },
    )

    expect(res.status).toBe(200)
    expect(projects).toEqual([latestProject])
  })

  test('troca de senha em write usa o erro específico de credenciais', async () => {
    const routes = createShellRoutes({
      session: {
        getSession: async () => ({
          ...IMPERSONATED_USER,
          act: { ...IMPERSONATED_USER.act, mode: 'write' as const },
        }),
      },
    } as never)

    const res = await routes.authMePassword.POST(
      new Request('https://community.test/api/auth/me/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'atual', newPassword: 'nova-segura-123' }),
      }),
    )

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'IMPERSONATION_CREDENTIALS_FORBIDDEN' },
    })
  })

  test('ativa o modo trocando apenas o access cookie da sessão de impersonação', async () => {
    const saved: unknown[] = []
    const tokens = {
      accessToken: 'access-write',
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      refreshExpiresIn: 3600,
    }
    const routes = createShellRoutes({
      session: {
        getSession: async () => IMPERSONATED_USER,
        getRefreshToken: async () => 'refresh-readonly',
        setAccessCookie: async (value: unknown) => saved.push(value),
      },
      gateway: {
        changeImpersonationMode: async (refreshToken: string, mode: string) => {
          expect(refreshToken).toBe('refresh-readonly')
          expect(mode).toBe('write')
          return { status: 200, body: { tokens } }
        },
      },
    } as never)

    const res = await routes.authImpersonationMode.POST(
      new Request('https://community.test/api/auth/impersonation/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: 'write' }),
      }),
    )

    expect(res.status).toBe(200)
    expect(saved).toEqual([tokens])
    await expect(res.json()).resolves.toEqual({ ok: true, mode: 'write' })
  })

  test('trocar de perfil substitui os cookies e invalida o refresh anterior', async () => {
    const loggedOut: string[] = []
    const saved: unknown[] = []
    const tokens = {
      accessToken: 'access-profile-readonly',
      refreshToken: 'refresh-profile-readonly',
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      refreshExpiresIn: 3600,
    }
    const routes = createShellRoutes({
      session: {
        getRefreshToken: async () => 'refresh-write-anterior',
        setSessionCookies: async (value: unknown) => saved.push(value),
      },
      profiles: {
        select: async () => ({ status: 200, body: { tokens, profile: { id: 'profile-1' } } }),
      },
      gateway: {
        logoutRequest: async (refreshToken: string) => {
          loggedOut.push(refreshToken)
          return true
        },
      },
    } as never)

    const res = await routes.profileSelect.POST(new Request('https://community.test/api'), {
      params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
    })

    expect(res.status).toBe(200)
    expect(saved).toEqual([tokens])
    expect(loggedOut).toEqual(['refresh-write-anterior'])
  })

  test('não limpa os cookies se o Auth não confirmar a revogação da família no logout', async () => {
    let cleared = false
    const routes = createShellRoutes({
      session: {
        getRefreshToken: async () => 'refresh-write-anterior',
        clearSessionCookies: async () => {
          cleared = true
        },
      },
      gateway: { logoutRequest: async () => false },
    } as never)

    const res = await routes.authLogout.POST()

    expect(res.status).toBe(503)
    expect(cleared).toBeFalse()
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'SESSION_REVOKE_FAILED' },
    })
  })

  test('não troca o perfil se não conseguir revogar a sessão write anterior', async () => {
    const saved: unknown[] = []
    const routes = createShellRoutes({
      session: {
        getRefreshToken: async () => 'refresh-write-anterior',
        setSessionCookies: async (value: unknown) => saved.push(value),
      },
      profiles: {
        select: async () => ({
          status: 200,
          body: {
            tokens: {
              accessToken: 'access-profile-readonly',
              refreshToken: 'refresh-profile-readonly',
              tokenType: 'Bearer' as const,
              expiresIn: 900,
              refreshExpiresIn: 3600,
            },
            profile: { id: 'profile-1' },
          },
        }),
      },
      gateway: { logoutRequest: async () => false },
    } as never)

    const res = await routes.profileSelect.POST(new Request('https://community.test/api'), {
      params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
    })

    expect(res.status).toBe(503)
    expect(saved).toEqual([])
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'PROFILE_SESSION_REVOKE_FAILED' },
    })
  })

  test('não sai do perfil se não conseguir revogar a sessão write anterior', async () => {
    const saved: unknown[] = []
    const routes = createShellRoutes({
      session: {
        getRefreshToken: async () => 'refresh-write-anterior',
        setSessionCookies: async (value: unknown) => saved.push(value),
      },
      profiles: {
        exit: async () => ({
          status: 200,
          body: {
            tokens: {
              accessToken: 'access-account-readonly',
              refreshToken: 'refresh-account-readonly',
              tokenType: 'Bearer' as const,
              expiresIn: 900,
              refreshExpiresIn: 3600,
            },
          },
        }),
      },
      gateway: { logoutRequest: async () => false },
    } as never)

    const res = await routes.profileExit.POST(
      new Request('https://community.test/api', {
        method: 'POST',
        body: JSON.stringify({ password: 'segredo' }),
      }),
    )

    expect(res.status).toBe(503)
    expect(saved).toEqual([])
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'PROFILE_SESSION_REVOKE_FAILED' },
    })
  })
})
