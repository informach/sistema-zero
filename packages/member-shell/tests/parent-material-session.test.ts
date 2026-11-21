import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { createMediaModule } = await import('../src/server/media')
const { createShellRoutes } = await import('../src/routes')

const user = {
  id: 'parent-account',
  email: 'parent@example.com',
  role: 'customer',
  status: 'active',
  kids: { kind: 'parent', sessionId: 'parent-session', authenticatedAt: 123 },
}
const media = createMediaModule({
  session: {
    getAccessToken: async () => 'access',
    getRefreshToken: async () => 'refresh',
    verifyAccessToken: async () => ({ ok: true, user }),
  },
  gateway: {},
} as never)

describe('materiais na sessão do responsável', () => {
  test('o responsável baixa anexo da aula após a autorização do Members', async () => {
    const routes = createShellRoutes({
      session: { audience: 'kids' },
      media,
      members: {
        resolveAttachment: async () => ({
          status: 200,
          body: {
            label: 'Material',
            storageRef: 'https://files.example/material.zip',
            fileType: 'application/zip',
          },
        }),
      },
    } as never)
    const response = await routes.attachmentDownload.GET(
      new Request('https://kids.example/api/cursos/pais/aulas/a/anexos/x'),
      {
        params: Promise.resolve({ slug: 'pais', lessonId: 'a', attachmentId: 'x' }),
      },
    )
    expect(response.status).toBe(302)
  })
  test('o responsável continua impedido de usar o guard de uploads do aluno', async () => {
    const response = await media.requireUploadSession(
      new Request('https://kids.example/api/me/avatar', {
        method: 'POST',
        headers: {
          origin: 'https://kids.example',
          host: 'kids.example',
          'x-sz-session': 'parent-session',
        },
      }),
    )
    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(403)
  })
})
