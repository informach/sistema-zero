import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  type StudioProBuilderClaim,
  type StudioProBuilderJob,
  studioProDigest,
} from '@sistemazero/core/studio'
import {
  legacyPythonRelease,
  providedPythonRelease,
} from '../../core/tests/fixtures/python-provided-release'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'builder-test-secret-at-least-32-characters'
const { advanceStudioBuilder } = await import('../src/server/studio-builder')
afterEach(() => mock.restore())

async function fixture(provided = true, repair = false) {
  const release = provided ? await providedPythonRelease() : legacyPythonRelease()
  const base = await createStudioProRevision({
    version: 2,
    projectId: 'generation-python',
    templateId: 'python-blank',
    files: { 'src/main.py': 'goal = 10\n', 'requirements.txt': '' },
    directories: ['src'],
    assets: '{}',
    assetFiles: {},
    configuration: {
      programmingLanguage: 'python',
      runtime: {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      },
      extensions: [],
      python: {
        entrypoint: 'src/main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: release.manifestSha256,
          requirementsSha256: await studioProDigest(''),
          packages: [],
        },
      },
    },
  })
  const change = {
    baseHash: base.hash,
    summary: 'Adicionar módulo autoral',
    patches: [{ path: 'src/sz_audio.py', before: null, content: 'value = 3\n' }],
  }
  const workingRevision = repair ? (await applyStudioProChange(base, change)).revision : base
  const token = crypto.randomUUID(),
    now = Date.now()
  let job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: base.projectId,
    base,
    objective: 'Ajustar meta',
    model: 'provider/model',
    phase: 'generating',
    version: 1,
    modelCalls: 1,
    validationCalls: 0,
    createdAt: new Date(now).toISOString(),
    deadlineAt: new Date(now + 300_000).toISOString(),
    expiresAt: new Date(now + 600_000).toISOString(),
    leaseUntil: new Date(now + 150_000).toISOString(),
    result: repair
      ? {
          change,
          revisionHash: workingRevision.hash,
          plan: ['Adicionar módulo autoral'],
          evidence: [],
        }
      : null,
    error: null,
    cost: null,
    notes: [],
  }
  const events: string[] = []
  let response: StudioProBuilderClaim = {
    job: structuredClone(job),
    token: null,
    authorization: {
      policy: provided ? { runtimeRelease: release } : {},
      revisionHash: workingRevision.hash,
      executionRevision: 'e'.repeat(64),
      parentOrigin: 'https://kids.test',
    },
  }
  let afterReserve = () => {},
    afterAuthorization = () => {}
  const input: Parameters<typeof advanceStudioBuilder>[0] = {
    actor: { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
    id: job.id,
    projectId: job.projectId,
    parentOrigin: 'https://kids.test',
    pythonRuntime: {
      runtimeUrl: 'https://python.test',
      runtimeToken: 'runtime-test-token',
      languageUrl: 'https://language.test',
      languageToken: 'language-test-token',
      allowLocalHttp: false,
    },
    members: {
      async studioBuilder(_actor, command) {
        events.push(command.operation)
        if (command.operation === 'claim')
          return { status: 200, body: { state: { job: structuredClone(job), token } } }
        if (command.operation === 'authorize-generation') {
          expect(command).toEqual({
            operation: 'authorize-generation',
            id: job.id,
            projectId: job.projectId,
            token,
            version: job.version,
            revisionHash: workingRevision.hash,
          })
          afterAuthorization()
          return { status: 200, body: { state: response } }
        }
        if (command.operation !== 'checkpoint') throw new Error('Unexpected command')
        expect(command.token).toBe(token)
        expect(command.version).toBe(job.version)
        job = {
          ...job,
          phase: command.phase,
          result: command.result,
          error: command.error,
          notes: command.notes,
          version: job.version + 1,
          leaseUntil: null,
        }
        return { status: 200, body: { state: { job, token: null } } }
      },
      async studioAiUsage(_actor, action) {
        events.push(action.operation)
        if (action.operation === 'reserve') {
          afterReserve()
          return {
            status: 200,
            body: {
              reservation: {
                allowed: true,
                source: 'openrouter',
                priceCaps: { prompt: 1, completion: 4, request: 0 },
                expiresAt: job.deadlineAt,
                credits: {
                  dayLimit: 10,
                  dayRemaining: 9,
                  monthLimit: 100,
                  monthRemaining: 99,
                  monthRenewsOn: '2026-11-01',
                },
              },
            },
          }
        }
        if (action.operation === 'dispatch')
          return {
            status: 200,
            body: { dispatch: { source: 'openrouter', apiKey: 'qa-test-key' } },
          }
        return { status: 200, body: { ok: true } }
      },
    },
  }
  const requests: { system: string; context: Record<string, unknown> }[] = []
  spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        events.push('model')
        const body = JSON.parse(String(init?.body))
        requests.push({
          system: body.messages[0].content,
          context: JSON.parse(body.messages[1].content),
        })
        return Response.json({
          id: 'gen-python-test',
          usage: { cost: 0.000003 },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: 'propose',
                  summary: 'Ajustar meta',
                  plan: ['Ajustar meta.'],
                  inspections: [],
                  edits: [
                    {
                      operation: 'replace',
                      path: 'src/main.py',
                      before: await studioProDigest(base.files['src/main.py']!),
                      find: 'goal = 10',
                      content: 'goal = 12',
                    },
                  ],
                }),
              },
            },
          ],
        })
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  return {
    input,
    events,
    requests,
    release,
    workingRevision,
    response(next: unknown) {
      response = JSON.parse(JSON.stringify(next))
    },
    afterReserve(fn: () => void) {
      afterReserve = fn
    },
    afterAuthorization(fn: () => void) {
      afterAuthorization = fn
    },
    snapshot: () => structuredClone(response),
    advance: () => advanceStudioBuilder(input),
  }
}

test.each([
  true,
  false,
])('Python generation uses a fresh mandatory policy after credits (provided=%s)', async (provided) => {
  const f = await fixture(provided)
  const result = await f.advance()
  expect(result?.phase).toBe('validating')
  expect(f.events.indexOf('reserve')).toBeLessThan(f.events.indexOf('authorize-generation'))
  expect(f.events.indexOf('authorize-generation')).toBeLessThan(f.events.indexOf('dispatch'))
  expect(f.requests).toHaveLength(1)
  expect(JSON.stringify(f.requests)).not.toContain('descriptorArtifact')
  expect(JSON.stringify(f.requests)).not.toContain(f.release.manifest.artifacts[0]!.path)
  expect(JSON.stringify(f.requests)).not.toContain('executionRevision')
  const environment = f.requests[0]!.context.environment as {
    providedModules: { importName: string }[]
  }
  expect(environment.providedModules.map((item) => item.importName)).toEqual(
    provided ? ['sz_audio'] : [],
  )
})

test('Python repair authorizes and presents its full working tree rather than the original base', async () => {
  const f = await fixture(true, true)
  const result = await f.advance()
  expect(result?.phase).toBe('validating')
  expect(f.requests[0]?.context.revision).toBe(f.workingRevision.hash)
  expect(f.requests[0]?.context.environment).toMatchObject({
    providedModules: [],
    shadowedProvidedModules: ['sz_audio'],
  })
  expect(result?.result?.change.patches.some((patch) => patch.path === 'src/sz_audio.py')).toBe(
    true,
  )
})

test.each([
  'missing-policy',
  'foreign-release',
  'revision',
  'origin',
  'version',
  'phase',
  'lease',
])('Python generation refuses %s before model dispatch', async (mode) => {
  const f = await fixture(),
    response = f.snapshot()
  if (!response.authorization) throw new Error('Fixture authorization required')
  if (mode === 'missing-policy') {
    const { policy: _policy, ...old } = response.authorization
    f.response({ ...response, authorization: old })
  } else {
    if (mode === 'foreign-release')
      response.authorization.policy = { runtimeRelease: legacyPythonRelease() }
    if (mode === 'revision') response.authorization.revisionHash = 'f'.repeat(64)
    if (mode === 'origin') response.authorization.parentOrigin = 'https://foreign.test'
    if (mode === 'version') response.job.version++
    if (mode === 'phase') response.job.phase = 'cancelled'
    if (mode === 'lease') response.job.leaseUntil = new Date(Date.now() - 1).toISOString()
    f.response(response)
  }
  expect((await f.advance())?.phase).toBe('failed')
  expect(f.events).not.toContain('dispatch')
  expect(f.requests).toEqual([])
})

test.each([
  'reserve',
  'authorization',
])('owner cancellation after %s never sends a model request', async (boundary) => {
  const f = await fixture(),
    controller = new AbortController()
  f.input.signal = controller.signal
  const cancel = () => controller.abort(new DOMException('Retirada', 'AbortError'))
  if (boundary === 'reserve') f.afterReserve(cancel)
  else f.afterAuthorization(cancel)
  await expect(f.advance()).rejects.toThrow('Retirada')
  expect(f.requests).toEqual([])
  expect(f.events).not.toContain('dispatch')
  if (boundary === 'reserve') expect(f.events).not.toContain('authorize-generation')
})
