import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  STUDIO_PRO_TEMPLATE_IDS,
  type StudioProBuilderClaim,
  type StudioProBuilderCommand,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { StudioPythonBuilderPreviewSchema } from '@sistemazero/core/studio/python-builder-preview'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { controlledPythonBuilderReport } from '../../members/tests/fakes/python-builder-report'
import { pensaKidsJourney } from './pensa-fixtures'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'builder-route-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const actualEnv = env.getEnv()
const { StudioProRuntimeInputError } = await import('../src/server/studio-pro-runtime')
const { createStudioBuilderRoutes } = await import('../src/routes/studio-builder')
beforeEach(() =>
  spyOn(env, 'getEnv').mockReturnValue({
    ...actualEnv,
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'runtime-test-token',
    STUDIO_BUILDER_EXECUTOR_SECRET: 'executor-test-secret-with-32-characters',
    OPENROUTER_STUDIO_BUILDER_MODEL: 'provider/builder',
  }),
)
afterEach(() => mock.restore())

const user = {
  id: crypto.randomUUID(),
  role: 'staff',
  status: 'active',
  activeProfile: { accountId: crypto.randomUUID() },
}
function configurePython() {
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PYTHON_RUNTIME_URL: 'https://python.test',
    STUDIO_PYTHON_RUNTIME_TOKEN: 'private-python-token-with-32-characters',
    STUDIO_PYTHON_LANGUAGE_URL: 'https://language.test',
    STUDIO_PYTHON_LANGUAGE_TOKEN: 'private-language-token-with-32-characters',
  })
}
async function fixture(
  options: {
    templateId?: string
    session?: unknown
    access?: boolean
    level?: string
    finishFails?: boolean
    pensaStatus?: number
    preflightFails?: boolean
    authorization?: StudioProBuilderClaim['authorization']
    authorizationStatus?: number
  } = {},
) {
  const base = await createStudioProRevision({
    projectId: 'route-game',
    templateId: options.templateId ?? 'vanilla-vite',
    devScript: 'dev',
    files: { 'index.html': '<main>Game</main>' },
    directories: [],
    assets: '{}',
    assetFiles: {},
  })
  const job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: base.projectId,
    base,
    objective: 'Adicionar pontuação',
    model: 'provider/builder',
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
    notes: ['PRIVATE TOOL NOTE'],
  }
  const commands: { actor: unknown; command: StudioProBuilderCommand }[] = []
  const members = {
    studioBuilderAvailability: async () => ({ status: 200, body: { available: true } }),
    checkStudioAccess: async () => ({
      status: 200,
      body: { access: { 'estudio-completo': options.access ?? true } },
    }),
    getGamification: async () => ({
      status: 200,
      body: {
        level: { slug: options.level ?? 'god' },
        kidsJourney: options.level === 'noob' ? pensaKidsJourney('noob', []) : pensaKidsJourney(),
      },
    }),
    studioBuilder: async (actor: unknown, command: StudioProBuilderCommand) => {
      commands.push({ actor, command })
      return {
        status:
          command.operation === 'authorize-proposal' ? (options.authorizationStatus ?? 200) : 200,
        body: {
          state: {
            job: { ...job, ...(command.operation === 'cancel' ? { phase: 'cancelled' } : {}) },
            token: null,
            ...(command.operation === 'authorize-proposal'
              ? { authorization: options.authorization }
              : {}),
            binaries: { secret: 'PRIVATE BINARY' },
          },
        },
      }
    },
    studioAiUsage: async () => {
      if (options.finishFails) throw new Error('ledger offline')
      return { status: 200, body: { ok: true } }
    },
    studioBuilderHistory: async () => ({
      status: 200,
      body: { page: { jobs: [studioProBuilderView(job)], nextCursor: null } },
    }),
    pensaTeamCapabilities: async () => ({ status: options.pensaStatus ?? 404, body: null }),
  }
  const route = createStudioBuilderRoutes({
    members,
    preflight: async () => {
      if (options.preflightFails)
        throw new StudioProRuntimeInputError(
          413,
          'Materiais excedem o limite remoto; nenhum crédito consumido.',
        )
    },
    session: {
      getSession: async () => (Object.hasOwn(options, 'session') ? options.session : user),
    },
  } as never).studioBuilder
  const input = {
    operation: 'create',
    kind: 'pro',
    mode: 'code',
    id: job.id,
    objective: job.objective,
    base,
    binaries: {},
  }
  const post = (body: unknown = input, headers: Record<string, string> = {}) =>
    route.POST(
      new Request('https://kids.test/api/studio/zappy/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    )
  return { job, input, commands, post }
}

async function pythonProposal() {
  const options: Parameters<typeof fixture>[0] = {},
    f = await fixture(options)
  configurePython()
  const base = await createStudioProRevision({
      version: 2,
      projectId: f.job.projectId,
      templateId: 'python-blank',
      files: { 'main.py': 'print(1)\n' },
      directories: [],
      assets: '{}',
      assetFiles: {},
      configuration: {
        programmingLanguage: 'python',
        extensions: [],
        runtime: { profileId: 'python-test', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
        python: {
          entrypoint: 'main.py',
          dependencyLock: {
            lockVersion: 1,
            target: 'browser',
            pythonVersion: '3.14.2',
            runtimeManifestSha256: 'a'.repeat(64),
            requirementsSha256: await studioProDigest(''),
            packages: [],
          },
        },
      },
    }),
    change = {
      baseHash: base.hash,
      summary: 'Editar programa',
      patches: [
        {
          path: 'main.py',
          before: await studioProDigest(base.files['main.py']!),
          content: 'print(2)\n',
        },
      ],
    },
    { revision } = await applyStudioProChange(base, change),
    { metadata: snapshot } = await prepareStudioPythonProExecution(revision, {}),
    preview = StudioPythonBuilderPreviewSchema.parse({
      kind: 'python',
      revisionHash: revision.hash,
      reference: {
        kind: 'python-preview',
        version: 1,
        id: 'c'.repeat(64),
        sha256: 'd'.repeat(64),
        projectId: base.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        url: `https://python.test/v1/python-previews/${'c'.repeat(64)}/index.html`,
        expiresAt: Date.now() + 60000,
      },
      validation: {
        profileVersion: 1,
        snapshot,
        report: controlledPythonBuilderReport(snapshot),
        types: {
          version: 1,
          revision: revision.hash,
          executionRevision: snapshot.revision,
          status: 'passed',
          diagnostics: [],
        },
      },
    })
  f.job.base = base
  f.job.phase = 'review'
  f.job.version = 4
  f.job.result = { change, revisionHash: revision.hash, preview, evidence: [], plan: ['Editar'] }
  options.authorization = {
    revisionHash: revision.hash,
    executionRevision: snapshot.revision,
    parentOrigin: 'https://kids.test',
  }
  const input = {
    operation: 'authorize-python-preview',
    id: f.job.id,
    projectId: base.projectId,
    version: f.job.version,
    revisionHash: revision.hash,
    preview: { id: preview.reference.id, sha256: preview.reference.sha256 },
  }
  return { ...f, options, preview, previewInput: input }
}

test('Python preview authorization returns only the canonical reference after a fresh private proposal policy check', async () => {
  const f = await pythonProposal(),
    response = await f.post(f.previewInput)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  const body = await response.text()
  expect(JSON.parse(body)).toEqual({ reference: f.preview.reference })
  expect(body).not.toContain('PRIVATE')
  expect(body).not.toContain('main.py')
  expect(body).not.toContain('private-python-token')
  expect(f.commands.map((item) => item.command.operation)).toEqual(['authorize-proposal'])
  expect(f.commands[0]?.command).toMatchObject({
    purpose: 'preview',
    version: 4,
    preview: f.previewInput.preview,
  })
})

test.each([
  'version',
  'id',
  'sha',
  'parent',
  'origin',
  'expiry',
  'revoked',
] as const)('Python preview refuses swapped or withdrawn %s without exposing a navigation reference', async (mode) => {
  const f = await pythonProposal(),
    input = structuredClone(f.previewInput)
  if (mode === 'version') input.version++
  else if (mode === 'id') input.preview.id = 'f'.repeat(64)
  else if (mode === 'sha') input.preview.sha256 = 'f'.repeat(64)
  else if (mode === 'parent' && f.options.authorization)
    f.options.authorization.parentOrigin = 'https://other.test'
  else if (mode === 'origin')
    f.preview.reference.url = `https://attacker.test/v1/python-previews/${f.preview.reference.id}/index.html`
  else if (mode === 'expiry') f.preview.reference.expiresAt = Date.now() - 1
  else f.options.authorizationStatus = 403
  const response = await f.post(input)
  expect(response.status).toBeGreaterThanOrEqual(400)
  const body = await response.text()
  expect(body).not.toContain('"reference"')
  expect(body).not.toContain('attacker.test')
  expect(f.commands.map((item) => item.command.operation)).toEqual(['authorize-proposal'])
})

test('Python application rechecks current proposal policy independently from the old preview parent', async () => {
  const f = await pythonProposal(),
    input = { ...f.previewInput, operation: 'check-application' }
  Reflect.deleteProperty(input, 'preview')
  if (!f.options.authorization) throw new Error('Expected authorization')
  f.options.authorization.parentOrigin = 'https://other-authorized-host.test'
  expect(await (await f.post(input)).json()).toEqual({ allowed: true })
  expect(f.commands.map((item) => item.command.operation)).toEqual(['get', 'authorize-proposal'])
  expect(f.commands.at(-1)?.command).toMatchObject({ purpose: 'apply' })
  f.options.authorizationStatus = 403
  expect((await (await f.post(input)).json()).allowed).toBe(false)
})

test('a browser cannot supply a preview URL, executor token or private authorization command', async () => {
  const f = await pythonProposal()
  for (const input of [
    { ...f.previewInput, url: 'https://attacker.test' },
    { ...f.previewInput, token: crypto.randomUUID() },
    { ...f.previewInput, operation: 'authorize-proposal', purpose: 'preview' },
  ])
    expect((await f.post(input)).status).toBe(400)
  expect(f.commands).toHaveLength(0)
})

describe('Studio builder browser boundary', () => {
  test('availability is authorized, reports configuration without credentials and never creates work', async () => {
    const f = await fixture()
    const available = await f.post({ operation: 'availability', templateId: 'vanilla-vite' })
    expect(await available.json()).toEqual({ available: true })
    expect((await f.post({ operation: 'availability', templateId: 'unknown-kit' })).status).toBe(
      400,
    )
    expect(f.commands).toHaveLength(0)
    spyOn(env, 'getEnv').mockReturnValue({ ...env.getEnv(), STUDIO_PRO_RUNTIME_TOKEN: undefined })
    const unavailable = await f.post({ operation: 'availability', templateId: 'vanilla-vite' })
    const body = await unavailable.text()
    expect(body).toContain('"available":false')
    expect(body).not.toContain('runtime.test')
    expect(body).not.toContain('TOKEN')
    expect(f.commands).toHaveLength(0)
  })
  test('a incompatibilidade do projeto é recusada antes de criar execução ou reservar créditos', async () => {
    const f = await fixture({ preflightFails: true })
    const response = await f.post()
    expect(response.status).toBe(413)
    expect(f.commands).toHaveLength(0)
    expect(await response.text()).toContain('nenhum crédito')
  })
  test('uma revisão Python não chega ao compilador JavaScript enquanto falta o provider correspondente', async () => {
    const f = await fixture({ preflightFails: true })
    const base = await createStudioProRevision({
      version: 2,
      projectId: f.input.base.projectId,
      templateId: 'python-empty',
      files: { 'main.py': 'print(1)' },
      directories: [],
      assets: '{}',
      assetFiles: {},
      configuration: {
        programmingLanguage: 'python',
        extensions: [],
        runtime: {
          profileId: 'python-browser',
          releaseId: 'python-1',
          manifestSha256: 'a'.repeat(64),
        },
        python: {
          entrypoint: 'main.py',
          dependencyLock: {
            lockVersion: 1,
            target: 'browser',
            pythonVersion: '3.14.2',
            runtimeManifestSha256: 'a'.repeat(64),
            requirementsSha256: await studioProDigest(''),
            packages: [],
          },
        },
      },
    })
    expect((await f.post({ ...f.input, base })).status).toBe(503)
    expect(f.commands).toHaveLength(0)
    spyOn(env, 'getEnv').mockReturnValue({
      ...env.getEnv(),
      STUDIO_PYTHON_RUNTIME_URL: 'https://python.test',
      STUDIO_PYTHON_RUNTIME_TOKEN: 'private-python-token-with-32-characters',
      STUDIO_PYTHON_LANGUAGE_URL: 'https://language.test',
      STUDIO_PYTHON_LANGUAGE_TOKEN: 'private-language-token-with-32-characters',
      STUDIO_PRO_RUNTIME_URL: undefined,
      STUDIO_PRO_RUNTIME_TOKEN: undefined,
    })
    expect(
      await (
        await f.post({
          operation: 'availability',
          templateId: 'python-empty',
          programmingLanguage: 'python',
        })
      ).json(),
    ).toEqual({ available: true })
    expect((await f.post({ ...f.input, base, pensaMissionId: crypto.randomUUID() })).status).toBe(
      400,
    )
    expect(f.commands).toHaveLength(0)
    expect((await f.post({ ...f.input, base })).status).toBe(200)
    expect(f.commands.map((item) => item.command.operation)).toEqual(['create'])
  })
  test('session, active status, support, entitlement, level and origin are checked before creating work', async () => {
    for (const [options, status] of [
      [{ session: null }, 401],
      [{ session: { ...user, status: 'suspended' } }, 403],
      [{ session: { ...user, act: { sub: 'support', mode: 'readonly' } } }, 403],
      [{ access: false }, 403],
      [{ session: { ...user, role: 'student' }, level: 'noob' }, 403],
    ] as const) {
      const f = await fixture(options)
      expect((await f.post()).status).toBe(status)
      expect(f.commands).toHaveLength(0)
    }
    const f = await fixture()
    expect((await f.post(f.input, { origin: 'https://other.test' })).status).toBe(403)
    expect(f.commands).toHaveLength(0)
  })
  test('rejects classic mode, forged model, worker operations, malformed revisions and oversized payloads', async () => {
    const f = await fixture()
    for (const input of [
      { ...f.input, kind: 'classic' },
      { ...f.input, mode: 'blocks' },
      { ...f.input, model: 'untrusted/model' },
      { operation: 'claim', id: f.job.id, projectId: f.job.projectId },
      { operation: 'advance', id: f.job.id, projectId: f.job.projectId },
      { ...f.input, base: { ...f.input.base, hash: 'forged' } },
    ])
      expect((await f.post(input)).status).toBe(400)
    expect((await f.post(f.input, { 'Content-Length': '3000001' })).status).toBe(413)
    expect(f.commands).toHaveLength(0)
  })
  test('pins the server model and actor, returns only the public view', async () => {
    const f = await fixture(),
      response = await f.post()
    expect(response.status).toBe(200)
    expect(f.commands[0]).toMatchObject({
      actor: { accountId: user.activeProfile.accountId, userId: user.id, privileged: true },
      command: {
        operation: 'create',
        model: 'provider/builder',
        parentOrigin: 'https://kids.test',
      },
    })
    const body = (await response.json()) as { job: Record<string, unknown> }
    expect(body.job.baseHash).toBe(f.input.base.hash)
    for (const key of ['base', 'binaries', 'notes', 'token']) expect(body.job[key]).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('PRIVATE')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  test('durable cancellation is returned even if ledger finishing temporarily fails', async () => {
    const f = await fixture({ finishFails: true }),
      log = spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await f.post({ operation: 'cancel', id: f.job.id, projectId: f.job.projectId })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ job: { phase: 'cancelled' } })
    expect(log).toHaveBeenCalledTimes(1)
  })
  test('a Pensa project cannot create a builder job without the authorized project context', async () => {
    const f = await fixture()
    const base = await createStudioProRevision({
      ...f.input.base,
      projectId: `pensa-${crypto.randomUUID().replaceAll('-', '')}`,
    })
    expect((await f.post({ ...f.input, base })).status).toBe(503)
    expect(f.commands).toHaveLength(0)
  })
  test('structured scope reaches Members and client-forged missions or unknown capabilities are rejected', async () => {
    const f = await fixture()
    const request = {
      version: 1 as const,
      intent: 'change' as const,
      scope: 'part' as const,
      criteria: ['Preservar os controles'],
      diagnostic: 'O personagem atravessa a parede.',
    }
    expect((await f.post({ ...f.input, request })).status).toBe(200)
    const created = f.commands.find((item) => item.command.operation === 'create')?.command
    expect(created?.operation === 'create' && created.request).toEqual(request)
    expect(
      (
        await f.post({
          ...f.input,
          request: {
            ...request,
            mission: { id: crypto.randomUUID(), snapshotHash: 'a'.repeat(64), summary: 'Forjada' },
          },
        })
      ).status,
    ).toBe(400)
    expect((await f.post({ ...f.input, request: { ...request, canPublish: true } })).status).toBe(
      400,
    )
  })
  test('history and application checks do not dispatch work or depend on runtime availability', async () => {
    const f = await fixture()
    spyOn(env, 'getEnv').mockReturnValue({
      ...env.getEnv(),
      STUDIO_PRO_RUNTIME_URL: undefined,
      STUDIO_PRO_RUNTIME_TOKEN: undefined,
    })
    const response = await f.post({ operation: 'list', projectId: f.input.base.projectId })
    expect(response.status).toBe(200)
    expect((await response.json()).jobs).toHaveLength(1)
    const check = await f.post({
      operation: 'check-application',
      version: 0,
      revisionHash: 'a'.repeat(64),
      id: f.input.id,
      projectId: f.input.base.projectId,
    })
    expect((await check.json()).allowed).toBe(false)
    expect(f.commands.every((item) => ['get'].includes(item.command.operation))).toBe(true)
  })
  test('owner cleanup remains available after builder access is revoked, while create is denied', async () => {
    const f = await fixture({ access: false, level: 'noob' })
    expect(
      (await f.post({ operation: 'remove-project', projectId: f.input.base.projectId })).status,
    ).toBe(200)
    expect(f.commands.at(-1)?.command).toEqual({
      operation: 'remove-project',
      projectId: f.input.base.projectId,
    })
    expect((await f.post(f.input)).status).toBe(403)
    expect(f.commands).toHaveLength(1)
  })
})

test.each(
  STUDIO_PRO_TEMPLATE_IDS,
)('%s is available for construction without a release flag', async (templateId) => {
  const f = await fixture({ templateId })
  expect(await (await f.post({ operation: 'availability', templateId })).json()).toEqual({
    available: true,
  })
  expect((await f.post()).status).toBe(200)
  expect(f.commands.map((entry) => entry.command.operation)).toEqual(['create'])
})
