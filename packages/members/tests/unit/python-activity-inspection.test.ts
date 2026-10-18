import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import type { StudioPythonRuntimeClientOptions } from '@sistemazero/core/studio/python-runtime-client'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { PythonActivityInspectionService } from '../../src/application/studio/python-activity-inspection.service'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function fixture() {
  const { project, configuration } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Fixture Python Pro inválida.')
  project.tree['main.py'] = { kind: 'file', content: 'print("submetido")\n' }
  project.python.entrypoint = 'main.py'
  const catalog = await createStudioRuntimeCatalog(configuration.catalog)
  const policy = await createStudioRuntimePolicy(
    configuration,
    createStudioRuntimeHosts(catalog, [
      { runtime: project.runtime, origin: 'https://runtime.example' },
    ]),
  )
  const activity = {
    version: 1,
    programmingLanguage: 'python',
    profileId: project.runtime.profileId,
    instructions: '',
    passingScore: 70,
    checks: [
      { id: 'loop', label: 'Repetição', kind: 'structure', rule: { type: 'usesLoop' }, weight: 2 },
      {
        id: 'out',
        label: 'Saída',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'submetido' },
      },
    ],
  }
  return { project, policy, activity }
}

// Controlled compiler transport: real CPython/SDK is qualified separately.
// Every report still crosses the production exact-revision/facts verifiers.
async function reportFor(options: StudioPythonRuntimeClientOptions, usesLoop = false) {
  const snapshot = await verifyStudioPythonExecutionMetadata(options.snapshot)
  return StudioPythonInspectionReportSchema.parse({
    version: 1,
    revision: snapshot.revision,
    runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
    pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
    status: 'passed',
    files: snapshot.files
      .filter((file) => file.kind === 'source' && /\.pyi?$/.test(file.path))
      .map((file) => ({
        path: file.path,
        sha256: file.sha256,
        status: 'passed',
        diagnostics: [],
        structure: {
          version: 1,
          nodesVisited: 1,
          usesLoop,
          usesConditional: false,
          assignedNames: [],
          definedFunctions: [],
          callTargets: [],
        },
      })),
  })
}
const credentials = { runtimeUrl: 'https://runtime.example', runtimeToken: 's'.repeat(32) }

test('Members materializes the submitted revision and ignores client-reported structure', async () => {
  const { project, policy, activity } = await fixture()
  let authorized = 0
  let inspected = 0
  const service = new PythonActivityInspectionService({
    ...credentials,
    policy,
    inspect: async (options) => {
      inspected++
      expect(options.structure).toBe(true)
      expect(options.owner).toBe(
        createHash('sha256')
          .update(canonicalJson(['account', 'child']))
          .digest('hex'),
      )
      expect(new TextDecoder().decode(await options.read('main.py', options.signal))).toBe(
        'print("submetido")\n',
      )
      await expect(options.read('foreign.py', options.signal)).rejects.toThrow('não pertence')
      return reportFor(options)
    },
  })
  const grade = await service.grade({
    userId: 'child',
    accountId: 'account',
    project,
    activity,
    clientResults: [
      { checkId: 'loop', passed: true },
      { checkId: 'out', passed: true },
    ],
    authorize: async () => {
      authorized++
      return {}
    },
  })
  expect(inspected).toBe(1)
  expect(authorized).toBe(3)
  expect(grade).toMatchObject({
    score: 33,
    passed: false,
    results: [
      { checkId: 'loop', passed: false, verifiedBy: 'server' },
      { checkId: 'out', passed: true, verifiedBy: 'client' },
    ],
  })
})

test('server compilation facts can approve structure, while missing browser behavior still fails its check', async () => {
  const { project, policy, activity } = await fixture()
  const service = new PythonActivityInspectionService({
    ...credentials,
    policy,
    inspect: (options) => reportFor(options, true),
  })
  const grade = await service.grade({
    userId: 'child',
    accountId: 'account',
    project,
    activity,
    clientResults: [],
    authorize: async () => ({}),
  })
  expect(grade).toMatchObject({
    score: 67,
    passed: false,
    results: [
      { passed: true, verifiedBy: 'server' },
      { passed: false, verifiedBy: 'client' },
    ],
  })
})

test('revocation after inspection propagates the contextual denial without accepting a grade', async () => {
  const { project, policy, activity } = await fixture()
  let allowed = true
  const service = new PythonActivityInspectionService({
    ...credentials,
    policy,
    inspect: async (options) => {
      const report = await reportFor(options, true)
      allowed = false
      return report
    },
  })
  await expect(
    service.grade({
      userId: 'child',
      accountId: 'account',
      project,
      activity,
      clientResults: [],
      authorize: async () => {
        if (!allowed) throw new AccessDeniedError('Acesso retirado.')
        return {}
      },
    }),
  ).rejects.toThrow('Acesso retirado')
})

test('missing configuration, wrong profiles and incomplete or substituted facts never approve', async () => {
  const { project, policy, activity } = await fixture()
  const input = {
    userId: 'child',
    accountId: 'account',
    project,
    activity,
    clientResults: [],
    authorize: async () => ({}),
  }
  await expect(new PythonActivityInspectionService({}).grade(input)).rejects.toThrow('indisponível')
  let called = false
  const wrongProfile = new PythonActivityInspectionService({
    ...credentials,
    policy,
    inspect: async (options) => {
      called = true
      return reportFor(options)
    },
  })
  await expect(
    wrongProfile.grade({ ...input, activity: { ...activity, profileId: 'other' } }),
  ).rejects.toThrow('perfil')
  expect(called).toBe(false)
  for (const substitute of ['revision', 'structure', 'files'] as const) {
    const service = new PythonActivityInspectionService({
      ...credentials,
      policy,
      inspect: async (options) => {
        const report = await reportFor(options, true)
        if (substitute === 'revision') report.revision = 'f'.repeat(64)
        else if (substitute === 'files') report.files = []
        else for (const file of report.files) file.structure = undefined
        return report
      },
    })
    await expect(service.grade(input)).rejects.toThrow('indisponível')
  }
})

test('inputs and owner identity are captured before contextual asynchronous work', async () => {
  const { project, policy, activity } = await fixture()
  let owner = ''
  const service = new PythonActivityInspectionService({
    ...credentials,
    policy,
    inspect: async (options) => {
      owner = options.owner
      expect(new TextDecoder().decode(await options.read('main.py', options.signal))).toBe(
        'print("submetido")\n',
      )
      return reportFor(options, true)
    },
  })
  let first = true
  const input = {
    userId: 'child',
    accountId: 'account',
    project,
    activity,
    clientResults: [{ checkId: 'out', passed: false }],
    authorize: async () => {
      if (first) {
        first = false
        input.userId = 'other-child'
        input.accountId = 'other-account'
        project.tree['main.py'] = { kind: 'file', content: 'changed' }
        activity.checks[0]!.weight = 100
        input.clientResults[0]!.passed = true
      }
      return {}
    },
  }
  const grade = await service.grade(input)
  expect(owner).toBe(
    createHash('sha256')
      .update(canonicalJson(['account', 'child']))
      .digest('hex'),
  )
  expect(grade).toMatchObject({ score: 67, passed: false })
})

test('cancellation settles even when initial or final contextual authorization ignores its signal', async () => {
  for (const heldCall of [1, 3]) {
    const { project, policy, activity } = await fixture()
    const controller = new AbortController()
    let enter!: () => void
    const entered = new Promise<void>((resolve) => {
      enter = resolve
    })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const service = new PythonActivityInspectionService({
      ...credentials,
      policy,
      inspect: (options) => reportFor(options, true),
    })
    const outcome = service
      .grade({
        userId: 'child',
        accountId: 'account',
        project,
        activity,
        signal: controller.signal,
        clientResults: [],
        authorize: async () => {
          if (++calls === heldCall) {
            enter()
            await gate
          }
          return {}
        },
      })
      .then(
        () => 'approved',
        () => 'rejected',
      )
    await entered
    controller.abort(new DOMException('Operação retirada.', 'AbortError'))
    try {
      const settled = await Promise.race([
        outcome,
        new Promise<string>((resolve) => setTimeout(() => resolve('still-pending'), 100)),
      ])
      expect(settled).toBe('rejected')
    } finally {
      release()
      await outcome
    }
  }
})
