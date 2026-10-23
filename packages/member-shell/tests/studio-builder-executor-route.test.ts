import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { createStudioProRevision, type StudioProBuilderJob } from '@sistemazero/core/studio'

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
  async function fixture() {
    const inputs: unknown[] = []
    const base = await createStudioProRevision({
      projectId: payload.projectId,
      templateId: 'vanilla-vite',
      devScript: 'dev',
      files: { 'index.html': '<main>Game</main>' },
      directories: [],
      assets: '{}',
      assetFiles: {},
    })
    const job: StudioProBuilderJob = {
      id: payload.id,
      projectId: payload.projectId,
      base,
      objective: 'Editar jogo',
      model: 'qa/model',
      phase: 'queued',
      version: 0,
      modelCalls: 0,
      validationCalls: 0,
      createdAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 300000).toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      leaseUntil: null,
      result: null,
      error: null,
      cost: null,
      notes: [],
    }
    const commands: string[] = []
    const handler = createStudioBuilderExecutorRoutes({
      members: {
        async studioBuilder(_actor, command) {
          commands.push(command.operation)
          return { status: 200, body: { state: { job, token: null } } }
        },
        async studioAiUsage() {
          throw new Error('Unexpected ledger mutation')
        },
      },
      advance: async (input) => {
        inputs.push(input)
        return null
      },
    }).studioBuilderExecutor.POST
    return {
      inputs,
      job,
      commands,
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
    const f = await fixture()
    for (const auth of ['', 'Bearer wrong', `Bearer ${secret.slice(0, -1)}X`])
      expect((await f.post(payload, auth)).status).toBe(401)
    expect(f.inputs).toHaveLength(0)
  })
  test('valid delivery preserves persisted context and returns no private job data', async () => {
    const f = await fixture(),
      response = await f.post()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ ok: true })
    expect(f.inputs).toMatchObject([
      { ...payload, runtimeUrl: 'https://runtime.test', runtimeToken: 'private-runtime-token' },
    ])
  })
  test('rejects excess fields, non-origin URLs and oversized payloads before execution', async () => {
    const f = await fixture()
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
    const f = await fixture()
    expect((await f.post()).status).toBe(503)
    expect(f.inputs).toHaveLength(0)
  })
  test('a missing provider leaves the queued language job untouched before lease claim', async () => {
    const f = await fixture()
    spyOn(env, 'getEnv').mockReturnValue({ ...env.getEnv(), STUDIO_PRO_RUNTIME_TOKEN: undefined })
    expect((await f.post()).status).toBe(503)
    expect(f.inputs).toHaveLength(0)
    expect(f.commands).toEqual(['get'])
    expect(f.job.phase).toBe('queued')
    expect(f.job.version).toBe(0)
  })
  test('Python uses its own services when the JavaScript runtime is absent', async () => {
    const f = await fixture()
    f.job.base = await createStudioProRevision({
      version: 2,
      projectId: payload.projectId,
      templateId: 'python-blank',
      files: { 'main.py': 'print(1)' },
      directories: [],
      assets: '{}',
      assetFiles: {},
      configuration: {
        programmingLanguage: 'python',
        runtime: { profileId: 'python-test', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
        extensions: [],
        python: {
          entrypoint: 'main.py',
          dependencyLock: {
            lockVersion: 1,
            target: 'browser',
            pythonVersion: '3.14.2',
            runtimeManifestSha256: 'a'.repeat(64),
            requirementsSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            packages: [],
          },
        },
      },
    })
    spyOn(env, 'getEnv').mockReturnValue({
      ...env.getEnv(),
      STUDIO_PRO_RUNTIME_URL: undefined,
      STUDIO_PRO_RUNTIME_TOKEN: undefined,
      STUDIO_PYTHON_RUNTIME_URL: 'https://python.test',
      STUDIO_PYTHON_RUNTIME_TOKEN: 'private-python-token-with-32-characters',
      STUDIO_PYTHON_LANGUAGE_URL: 'https://language.test',
      STUDIO_PYTHON_LANGUAGE_TOKEN: 'private-language-token-with-32-characters',
    })
    expect((await f.post()).status).toBe(200)
    expect(f.inputs).toMatchObject([
      {
        pythonRuntime: { runtimeUrl: 'https://python.test', languageUrl: 'https://language.test' },
      },
    ])
    expect(f.commands).toEqual(['get'])
  })
})
