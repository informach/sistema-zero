import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'builder-route-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const actual = env.getEnv()
const { createStudioBuilderExecutorRoutes } = await import('../src/routes/studio-builder-executor')
const secret = 'exclusive-service-secret-with-32-characters'
beforeEach(() =>
  spyOn(env, 'getEnv').mockReturnValue({
    ...actual,
    STUDIO_BUILDER_EXECUTOR_SECRET: secret,
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'private-runtime-token',
  }),
)
afterEach(() => mock.restore())

describe('service-only Studio builder executor', () => {
  const payload = {
    id: crypto.randomUUID(),
    projectId: 'game',
    parentOrigin: 'https://kids.test',
    actor: { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
  }
  function fixture() {
    const inputs: unknown[] = []
    const handler = createStudioBuilderExecutorRoutes({
      members: {} as never,
      advance: async (input) => {
        inputs.push(input)
        return null
      },
    }).studioBuilderExecutor.POST
    return {
      inputs,
      post: (body: unknown = payload, authorization = `Bearer ${secret}`) =>
        handler(
          new Request('https://kids.test/api/internal/studio-builder/execute', {
            method: 'POST',
            headers: { authorization, cookie: 'session=browser-session' },
            body: JSON.stringify(body),
          }),
        ),
    }
  }
  test('cookies and a wrong or missing service secret never authorize dispatch', async () => {
    const f = fixture()
    for (const auth of ['', 'Bearer wrong', `Bearer ${secret.slice(0, -1)}X`])
      expect((await f.post(payload, auth)).status).toBe(401)
    expect(f.inputs).toHaveLength(0)
  })
  test('valid delivery preserves persisted context and returns no private job data', async () => {
    const f = fixture(),
      response = await f.post()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ ok: true })
    expect(f.inputs).toMatchObject([
      { ...payload, runtimeUrl: 'https://runtime.test', runtimeToken: 'private-runtime-token' },
    ])
  })
  test('rejects excess fields, non-origin URLs and oversized payloads before execution', async () => {
    const f = fixture()
    for (const body of [
      { ...payload, objective: 'client supplied' },
      { ...payload, parentOrigin: 'https://kids.test/path' },
      { ...payload, parentOrigin: 'file:///tmp' },
      { ...payload, projectId: 'x'.repeat(5000) },
    ])
      expect((await f.post(body)).status).toBe(400)
    expect(f.inputs).toHaveLength(0)
  })
  test('fails closed when the executor configuration is absent', async () => {
    spyOn(env, 'getEnv').mockReturnValue({
      ...env.getEnv(),
      STUDIO_BUILDER_EXECUTOR_SECRET: undefined,
    })
    const f = fixture()
    expect((await f.post()).status).toBe(503)
    expect(f.inputs).toHaveLength(0)
  })
})
