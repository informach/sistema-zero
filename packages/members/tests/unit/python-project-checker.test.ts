import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import type { SectionPythonProjectCheck } from '@sistemazero/core/learning'
import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import {
  PythonMissionValidationReportSchema,
  pythonMissionRecipe,
  verifyPythonMissionRequest,
} from '@sistemazero/core/studio/python-mission-execution'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import type {
  checkStudioPythonRevision,
  StudioPythonRuntimeClientOptions,
  validateStudioPythonRevision,
} from '@sistemazero/core/studio/python-runtime-client'
import { PYTHON_PROJECT_MISSION_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { PythonProjectCheckerService } from '../../src/application/studio/python-project-checker.service'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { controlledPythonValidation } from '../fakes/python-execution-evidence'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function fixture(missions = true) {
  const { project, configuration } = await authoringFixture(
    'python',
    'pro',
    undefined,
    missions ? [PYTHON_PROJECT_MISSION_FEATURE] : [],
  )
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
  const checks = [
    {
      id: 'loop',
      label: 'Repetição',
      programmingLanguage: 'python' as const,
      profileId: project.runtime.profileId,
      rule: { type: 'usesLoop' as const },
    },
  ]
  return { project, policy, checks }
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
async function validationFor(
  options: Parameters<typeof validateStudioPythonRevision>[0],
  usesLoop = false,
  healthy = true,
) {
  return controlledPythonValidation(options, await reportFor(options, usesLoop), healthy)
}
const credentials = { runtimeUrl: 'https://runtime.example', runtimeToken: 's'.repeat(32) }
test('a release without mission execution cannot silently fall back to compiler or browser grading', async () => {
  const { project, policy, checks } = await fixture(false)
  let called = false
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    execute: async () => {
      called = true
      throw new Error('Must not execute an unsupported runtime')
    },
  })
  await expect(
    service.grade({
      userId: 'child',
      accountId: 'account',
      project,
      checks: [
        {
          ...checks[0]!,
          rule: {
            type: 'behavior',
            steps: [],
            expect: { target: { kind: 'console' }, compare: 'contains', value: 'OK' },
          },
        },
      ],
      authorize: async () => ({}),
    }),
  ).rejects.toThrow('Atualize o ambiente Python')
  expect(called).toBe(false)
})

// Unit boundary for hostile/stale authenticated transport. Actual browser execution
// is covered by python-mission-smoke.ts, never inferred from these controlled facts.
async function executedReport(
  options: Parameters<typeof checkStudioPythonRevision>[0],
  output: string,
) {
  const snapshot = await verifyStudioPythonExecutionMetadata(options.snapshot)
  const mission = await verifyPythonMissionRequest(options.mission, snapshot)
  return PythonMissionValidationReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    status: 'passed',
    inspection: await reportFor(options),
    mission: {
      version: 1,
      identity: mission.identity,
      observations: mission.probes.map((probe) => ({
        id: probe.id,
        type: 'behavior',
        initial: { found: true, value: '' },
        final: { found: true, value: output },
      })),
    },
    executions: mission.probes.map((probe) => ({
      id: probe.id,
      report: {
        version: 1,
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
        instanceId: crypto.randomUUID(),
        runId: crypto.randomUUID(),
        recipe: pythonMissionRecipe(probe),
        status: 'passed',
        started: true,
        stopped: true,
        stateBeforeStop: 'completed',
        observedDurationMs: 250,
        stdout: output,
        stderr: '',
        omittedChars: 0,
        errors: [],
        input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
      },
    })),
  })
}

test.each([
  'submetido',
  'outro',
])('execution objectives use actual observed output (%s), never AST or caller pass flags', async (output) => {
  const { project, policy, checks: structure } = await fixture()
  const checks: SectionPythonProjectCheck[] = [
    {
      ...structure[0]!,
      id: 'output',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'console' }, compare: 'contains', value: 'submetido' },
      },
    },
  ]
  let calls = 0
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: async () => {
      throw new Error('A behavioral check must run the program')
    },
    execute: async (options) => {
      calls++
      expect(JSON.stringify(options.mission)).not.toContain('submetido')
      expect(options.structure).toBe(false)
      return executedReport(options, output)
    },
  })
  const result = await service.grade({
    userId: 'child',
    accountId: 'account',
    project,
    checks,
    authorize: async () => ({}),
  })
  expect(calls).toBe(1)
  expect(result.passed).toBe(output === 'submetido')
  expect(result.results[0]).toMatchObject({
    kind: 'execution',
    verifiedBy: 'server',
    passed: output === 'submetido',
  })
})

test.each([
  'revision',
  'omitted',
  'cleanup',
  'hidden-error',
])('invalid execution evidence fails closed: %s', async (change) => {
  const { project, policy, checks: structure } = await fixture()
  const checks: SectionPythonProjectCheck[] = [
    {
      ...structure[0]!,
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'console' }, compare: 'contains', value: 'submetido' },
      },
    },
  ]
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    execute: async (options) => {
      const report = await executedReport(options, 'submetido')
      if (change === 'revision') report.mission!.identity.revision = 'f'.repeat(64)
      if (change === 'omitted') report.mission!.observations = []
      if (change === 'cleanup') report.executions![0]!.report.stopped = false
      if (change === 'hidden-error') {
        report.status = 'failed'
        report.executions![0]!.report.status = 'failed'
        report.executions![0]!.report.errors = ['erro omitido pela observação']
      }
      return report
    },
  })
  await expect(
    service.grade({
      userId: 'child',
      accountId: 'account',
      project,
      checks,
      authorize: async () => ({}),
    }),
  ).rejects.toThrow('indisponível')
})

test('Members materializes the submitted revision, captures ownership and requires execution alongside server structure', async () => {
  const { project, policy, checks } = await fixture()
  let authorized = 0
  let inspected = 0
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: async (options) => {
      inspected++
      expect(options.structure).toBe(true)
      expect(StudioPythonPlaytestRecipeSchema.parse(options.recipe).mission).toBe(true)
      expect(options.owner).toBe(
        createHash('sha256')
          .update(canonicalJson(['account', 'child']))
          .digest('hex'),
      )
      expect(new TextDecoder().decode(await options.read('main.py', options.signal))).toBe(
        'print("submetido")\n',
      )
      await expect(options.read('foreign.py', options.signal)).rejects.toThrow('não pertence')
      return validationFor(options)
    },
  })
  const grade = await service.grade({
    userId: 'child',
    accountId: 'account',
    project,
    checks,
    authorize: async () => {
      authorized++
      return {}
    },
  })
  expect(inspected).toBe(1)
  expect(authorized).toBe(3)
  expect(grade).toMatchObject({
    passed: false,
    results: [{ checkId: 'loop', passed: false, verifiedBy: 'server' }],
  })
})

test('healthy execution and server compilation facts can approve structural concepts', async () => {
  const { project, policy, checks } = await fixture()
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: (options) => validationFor(options, true),
  })
  expect(
    await service.grade({
      userId: 'child',
      accountId: 'account',
      project,
      checks,
      authorize: async () => ({}),
    }),
  ).toMatchObject({
    passed: true,
    results: [{ checkId: 'loop', passed: true, verifiedBy: 'server' }],
  })
})
test('revocation after inspection propagates the contextual denial without accepting a grade', async () => {
  const { project, policy, checks } = await fixture()
  let allowed = true
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: async (options) => {
      const report = await validationFor(options, true)
      allowed = false
      return report
    },
  })
  await expect(
    service.grade({
      userId: 'child',
      accountId: 'account',
      project,
      checks,

      authorize: async () => {
        if (!allowed) throw new AccessDeniedError('Acesso retirado.')
        return {}
      },
    }),
  ).rejects.toThrow('Acesso retirado')
})

test('missing configuration, wrong profiles and incomplete or substituted facts never approve', async () => {
  const { project, policy, checks } = await fixture()
  const input = {
    userId: 'child',
    accountId: 'account',
    project,
    checks,

    authorize: async () => ({}),
  }
  await expect(new PythonProjectCheckerService({}).grade(input)).rejects.toThrow('indisponível')
  let called = false
  const wrongProfile = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: async (options) => {
      called = true
      return validationFor(options)
    },
  })
  await expect(
    wrongProfile.grade({
      ...input,
      checks: checks.map((check) => ({ ...check, profileId: 'other' })),
    }),
  ).rejects.toThrow('perfil')
  expect(called).toBe(false)
  for (const substitute of ['revision', 'structure', 'files'] as const) {
    const service = new PythonProjectCheckerService({
      ...credentials,
      policy,
      validate: async (options) => {
        const report = await validationFor(options, true)
        if (substitute === 'revision') report.inspection.revision = 'f'.repeat(64)
        else if (substitute === 'files') report.inspection.files = []
        else for (const file of report.inspection.files) file.structure = undefined
        return report
      },
    })
    await expect(service.grade(input)).rejects.toThrow('indisponível')
  }
})

test('inputs and owner identity are captured before contextual asynchronous work', async () => {
  const { project, policy, checks } = await fixture()
  let owner = ''
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: async (options) => {
      owner = options.owner
      expect(new TextDecoder().decode(await options.read('main.py', options.signal))).toBe(
        'print("submetido")\n',
      )
      return validationFor(options, true)
    },
  })
  let first = true
  const input = {
    userId: 'child',
    accountId: 'account',
    project,
    checks,

    authorize: async () => {
      if (first) {
        first = false
        input.userId = 'other-child'
        input.accountId = 'other-account'
        project.tree['main.py'] = { kind: 'file', content: 'changed' }
        checks[0]!.rule = { type: 'usesLoop' }
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
  expect(grade).toMatchObject({ passed: true })
})

test('cancellation settles even when initial or final contextual authorization ignores its signal', async () => {
  for (const heldCall of [1, 3]) {
    const { project, policy, checks } = await fixture()
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
    const service = new PythonProjectCheckerService({
      ...credentials,
      policy,
      validate: (options) => validationFor(options, true),
    })
    const outcome = service
      .grade({
        userId: 'child',
        accountId: 'account',
        project,
        checks,
        signal: controller.signal,

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

test('a structural match never approves a program that fails to execute', async () => {
  const { project, policy, checks } = await fixture()
  const service = new PythonProjectCheckerService({
    ...credentials,
    policy,
    validate: (options) => validationFor(options, true, false),
  })
  const grade = await service.grade({
    userId: 'child',
    accountId: 'account',
    project,
    checks,
    authorize: async () => ({}),
  })
  expect(grade.passed).toBe(false)
  expect(grade.results[0]).toMatchObject({ passed: false, kind: 'structure' })
  expect(grade.results[0]?.message).toContain('executar sem erros')
})
