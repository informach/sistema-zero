import { describe, expect, test } from 'bun:test'
import {
  handleCoursePublicationMedia,
  type PublicationMediaEndpointDependencies,
} from '../src/server/course-publication-endpoint'

const token = 'course-publication-test-only-token-123456'
const profileHash = 'a'.repeat(64)
const request = (
  overrides: Record<string, string> = {},
  body: unknown = { action: 'execute', task: { kind: 'video', videoId: '123' } },
) =>
  new Request('http://admin.test/api/internal/course-publication/media', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-course-publication-token': token,
      'x-course-environment': 'local',
      'x-course-media-profile': profileHash,
      ...overrides,
    },
    body: JSON.stringify(body),
  })
const dependencies = (
  execute: PublicationMediaEndpointDependencies['execute'],
): PublicationMediaEndpointDependencies => ({
  token,
  environment: 'local',
  profileHash,
  plan: () => ({ tasks: [], voices: {}, profileHash }),
  execute,
})
describe('porta privada de mídia de publicação', () => {
  test('recusa um perfil de destino alterado antes de gerar ou copiar qualquer mídia', async () => {
    let calls = 0
    const response = await handleCoursePublicationMedia(
      request({ 'x-course-media-profile': 'b'.repeat(64) }),
      dependencies(async () => {
        calls++
        return { kind: 'video', videoId: '123' }
      }),
    )
    expect(response.status).toBe(409)
    expect(calls).toBe(0)
  })
  test('recusa token, ambiente, sessão e corpo inválidos antes de chamar o provedor', async () => {
    let calls = 0
    const deps = dependencies(async () => {
      calls++
      return { kind: 'video', videoId: '123' }
    })
    expect(
      (
        await handleCoursePublicationMedia(
          request({ 'x-course-publication-token': '', cookie: 'admin=sim' }),
          deps,
        )
      ).status,
    ).toBe(401)
    expect(
      (await handleCoursePublicationMedia(request({ 'x-course-environment': 'production' }), deps))
        .status,
    ).toBe(401)
    expect(
      (
        await handleCoursePublicationMedia(
          request(
            {},
            {
              action: 'execute',
              task: { kind: 'video', videoId: '../9', url: 'http://evil.test' },
            },
          ),
          deps,
        )
      ).status,
    ).toBe(400)
    // happy-dom strips forbidden request headers during construction. Set the wire header
    // explicitly so the server test receives the intended input in the full UI suite too.
    const oversized = request()
    oversized.headers.set('content-length', '20000000')
    expect((await handleCoursePublicationMedia(oversized, deps)).status).toBe(413)
    expect(
      (await handleCoursePublicationMedia(request(), { ...deps, token: undefined })).status,
    ).toBe(503)
    expect(calls).toBe(0)
  })
  test('resposta identifica o ambiente e não permite cache', async () => {
    const response = await handleCoursePublicationMedia(
      request(),
      dependencies(async () => ({ kind: 'video', videoId: '123' })),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      environment: 'local',
      result: { kind: 'video', videoId: '123' },
    })
  })
  test('não repassa erros privados do provedor', async () => {
    const response = await handleCoursePublicationMedia(
      request(),
      dependencies(async () => {
        throw new Error('secret-token e PDF privado')
      }),
    )
    expect(response.status).toBe(422)
    expect(await response.text()).not.toContain('secret-token')
  })
})
