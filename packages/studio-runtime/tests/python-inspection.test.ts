import { expect, spyOn, test } from 'bun:test'
import {
  type StudioPythonExecutionMetadata,
  studioPythonExecutionRevision,
} from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import { PYTHON_MISSION_LIMITS } from '@sistemazero/core/studio/python-mission-execution'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
} from '@sistemazero/core/studio/python-playtest'
import { sha256 } from '../src/artifacts'
import {
  type PythonInspectionSandbox,
  preparedPythonBrowserOptions,
  pythonInspectionFailurePhase,
  runIsolatedPythonInspection,
  withIsolatedPythonProject,
} from '../src/python-inspection'
import { runIsolatedPythonValidation } from '../src/python-playtest'
import { pythonDistributionFixture } from './python-distribution-fixture'

async function fixture(fixtureOptions: { playtest?: boolean; compressed?: boolean } = {}) {
  const runtime = await pythonDistributionFixture(fixtureOptions)
  const files = new Map([
    [
      'main.py',
      new TextEncoder().encode('\uFEFFimport absent\nraise RuntimeError("must not run")\n'),
    ],
    ['empty.pyi', new Uint8Array(0)],
  ])
  const content = {
    version: 1 as const,
    configuration: {
      runtime: {
        profileId: runtime.deployment.release.profileId,
        releaseId: runtime.deployment.release.releaseId,
        manifestSha256: runtime.deployment.release.manifestSha256,
      },
      extensions: [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1 as const,
          target: 'browser' as const,
          pythonVersion: '3.14.2',
          runtimeManifestSha256: runtime.deployment.release.manifestSha256,
          requirementsSha256: await sha256(new Uint8Array(0)),
          packages: [],
        },
      },
    },
    directories: [],
    files: await Promise.all(
      [...files].map(async ([path, bytes]) => ({
        path,
        kind: 'source' as const,
        byteLength: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
  }
  const snapshot: StudioPythonExecutionMetadata = {
    ...content,
    projectId: 'inspected-game',
    revision: await studioPythonExecutionRevision(content),
  }
  let report = StudioPythonInspectionReportSchema.parse({
    version: 1,
    revision: snapshot.revision,
    runtimeManifestSha256: runtime.deployment.release.manifestSha256,
    pythonVersion: '3.14.2',
    status: 'passed',
    files: snapshot.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      status: 'passed',
      diagnostics: [],
    })),
  })
  const written = new Map<string, string>()
  let created = 0,
    destroyed = 0,
    executed = 0
  let execute: PythonInspectionSandbox['exec'] = async () => ({
    success: true,
    stdout: '',
    stderr: '',
  })
  let cleanup: PythonInspectionSandbox['destroy'] = async () => {}
  const sandbox: PythonInspectionSandbox = {
    async mkdir() {},
    async writeFile(path, content) {
      written.set(
        path,
        typeof content === 'string'
          ? content
          : Buffer.from(await new Response(content).arrayBuffer()).toString('base64'),
      )
    },
    async readFile() {
      return { content: JSON.stringify(report) }
    },
    async exec(command, options) {
      executed++
      expect([
        'node /opt/sz-runtime/python-inspect.mjs',
        ...(fixtureOptions.playtest ? ['node /opt/sz-runtime/python-playtest.mjs'] : []),
      ]).toContain(command)
      return execute(command, options)
    },
    async destroy() {
      destroyed++
      await cleanup()
    },
  }
  const controller = new AbortController()
  const input = {
    structure: false,
    snapshot,
    approvedDeployment: runtime.deployment,
    signal: controller.signal,
    createSandbox() {
      created++
      return sandbox
    },
    async readRuntime(path: string): Promise<ReadableStream<Uint8Array>> {
      return new Blob([runtime.contents.get(path)!]).stream()
    },
    async readProject(path: string): Promise<ReadableStream<Uint8Array>> {
      return new Blob([files.get(path)!]).stream()
    },
  }
  return {
    runtime,
    input,
    sandbox,
    controller,
    written,
    report,
    setReport(next: typeof report) {
      report = next
    },
    setExecute(next: typeof execute) {
      execute = next
    },
    setCleanup(next: typeof cleanup) {
      cleanup = next
    },
    counts: () => ({ created, destroyed, executed }),
  }
}

test('operational failures identify the phase without logging private errors or source', async () => {
  const f = await fixture()
  const failure = new Error('PRIVATE-CREDENTIAL-AND-PROGRAM-MARKER')
  f.sandbox.mkdir = async () => {
    throw failure
  }
  const logged = spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(runIsolatedPythonInspection(f.input)).rejects.toBe(failure)
    expect(pythonInspectionFailurePhase(failure)).toBe('mkdir-runtime')
    expect(logged.mock.calls).toHaveLength(1)
    expect(logged.mock.calls[0]).toEqual([
      '[studio-python] isolated phase failed',
      expect.objectContaining({ phase: 'mkdir-runtime', fileIndex: 0, bytes: 0 }),
    ])
    expect(JSON.stringify(logged.mock.calls)).not.toContain(failure.message)
    expect(f.counts().destroyed).toBe(1)
  } finally {
    logged.mockRestore()
  }
})

test('trusted process diagnostics accept only a fixed phase and never publish stderr', async () => {
  const f = await fixture()
  f.setExecute(async () => ({
    success: false,
    stdout: 'PRIVATE-PROGRAM',
    stderr: 'PRIVATE-CREDENTIAL\nSTUDIO_PYTHON_INSPECTION_PHASE:resources\n',
  }))
  const logged = spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(runIsolatedPythonInspection(f.input)).rejects.toThrow('inspeção Python')
    expect(logged.mock.calls[0]).toEqual([
      '[studio-python] inspection process failed',
      { phase: 'resources' },
    ])
    expect(JSON.stringify(logged.mock.calls)).not.toContain('PRIVATE-')
    expect(f.counts().destroyed).toBe(1)
  } finally {
    logged.mockRestore()
  }
})

test('a rejected SDK command exposes only the trusted process phase, preserving its error', async () => {
  const f = await fixture()
  const error = Object.assign(new Error('PRIVATE-SDK-OUTPUT'), {
    stderr: 'PRIVATE-SOURCE\nSTUDIO_PYTHON_INSPECTION_PHASE:launch\n',
  })
  f.setExecute(async () => {
    throw error
  })
  const logged = spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(runIsolatedPythonInspection(f.input)).rejects.toBe(error)
    expect(pythonInspectionFailurePhase(error)).toBe('inspect-launch')
    expect(logged.mock.calls[0]).toEqual([
      '[studio-python] inspection process failed',
      { phase: 'launch' },
    ])
    expect(JSON.stringify(logged.mock.calls)).not.toContain('PRIVATE-')
    expect(f.counts().destroyed).toBe(1)
  } finally {
    logged.mockRestore()
  }
})

test('a cleanup failure is identified separately and cannot publish a successful report', async () => {
  const f = await fixture()
  const error = new Error('PRIVATE-CLEANUP-DETAIL')
  f.setCleanup(async () => {
    throw error
  })
  await expect(runIsolatedPythonInspection(f.input)).rejects.toBe(error)
  expect(pythonInspectionFailurePhase(error)).toBe('cleanup')
  expect(f.counts().destroyed).toBe(1)
  expect(pythonInspectionFailurePhase(new Error('PRIVATE-UNTRACKED'))).toBeUndefined()
})

test('isolated inspection stages only verified bytes and fixed trusted command, binds report, owns cleanup', async () => {
  const f = await fixture()
  const result = await runIsolatedPythonInspection(f.input)
  expect(result).toEqual(f.report)
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
  const entry = [...f.written].find(([path]) => path.endsWith('/project/main.py'))!
  expect(Buffer.from(entry[1], 'base64').subarray(0, 3)).toEqual(Buffer.from([239, 187, 191]))
  expect(
    [...f.written].filter(([path]) => path.endsWith('python-inspection-options.json')),
  ).toHaveLength(1)
})

test('mission preparation does not expire on the shorter inspection clock', async () => {
  const f = await fixture()
  const expired = new AbortController()
  const reason = new Error('inspection budget expired')
  expired.abort(reason)
  const original = AbortSignal.timeout.bind(AbortSignal)
  const timer = spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) =>
    milliseconds === 120_000 ? expired.signal : original(milliseconds),
  )
  try {
    await expect(
      withIsolatedPythonProject(f.input, async () => 'mission complete', 'mission'),
    ).resolves.toBe('mission complete')
    expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
    await expect(
      withIsolatedPythonProject(f.input, async () => 'inspection complete'),
    ).rejects.toBe(reason)
  } finally {
    timer.mockRestore()
  }
})

test('the mission clock still cancels trusted work and retires its sandbox', async () => {
  const f = await fixture()
  const deadline = new AbortController()
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const original = AbortSignal.timeout.bind(AbortSignal)
  const timer = spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) =>
    milliseconds === PYTHON_MISSION_LIMITS.jobMs ? deadline.signal : original(milliseconds),
  )
  const reason = new Error('mission budget expired')
  try {
    const operation = withIsolatedPythonProject(
      f.input,
      async (project) => {
        started.resolve()
        await project.step(release.promise)
      },
      'mission',
    )
    await started.promise
    deadline.abort(reason)
    release.resolve()
    await expect(operation).rejects.toBe(reason)
    expect(f.counts().destroyed).toBe(1)
  } finally {
    release.resolve()
    timer.mockRestore()
  }
})

test('compressed deployments stage logical files through the real registry while retaining full approval metadata', async () => {
  const f = await fixture({ compressed: true })
  await f.runtime.store()
  const requested: string[] = []
  const options = await withIsolatedPythonProject(
    {
      ...f.input,
      async readRuntime(path, signal) {
        requested.push(path)
        const response = await f.runtime.serve(
          new Request(f.runtime.url + path, { signal }),
          f.runtime.bucket,
        )
        if (!response.ok || !response.body)
          throw new Error(`Registry refused staged file ${path}: ${response.status}`)
        return response.body
      },
    },
    async (project) => preparedPythonBrowserOptions(project),
  )
  expect(requested.some((path) => path.startsWith('_http/'))).toBe(false)
  expect(options.runtimeFiles.map((file) => file.path)).toEqual(requested)
  expect(options.runtimeDeployment.distribution).toEqual(f.runtime.deployment.distribution)
  expect(options.runtimeFiles).toHaveLength(f.runtime.deployment.distribution.files.length - 1)
  expect([...f.written.keys()].some((path) => path.includes('/_http/'))).toBe(false)
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
})

test('failed compilation is a complete report, not an approval or a transport failure', async () => {
  const f = await fixture()
  f.report.status = f.report.files[0].status = 'failed'
  f.report.files[0].diagnostics = [{ message: 'invalid encoding' }]
  expect((await runIsolatedPythonInspection(f.input)).status).toBe('failed')
  expect(f.counts().destroyed).toBe(1)
})

test('explicit structure inspection stages the capability and refuses a compile-only passed report', async () => {
  const f = await fixture()
  await expect(runIsolatedPythonInspection({ ...f.input, structure: true })).rejects.toThrow(
    'incompleta',
  )
  expect(f.counts().destroyed).toBe(1)
  const stored = [...f.written].find(([path]) => path.endsWith('python-inspection-options.json'))!
  expect(JSON.parse(stored[1]).structure).toBe(true)
  const complete = await fixture()
  for (const file of complete.report.files)
    file.structure = {
      version: 1,
      nodesVisited: 1,
      usesLoop: false,
      usesConditional: false,
      assignedNames: [],
      definedFunctions: [],
      callTargets: [],
    }
  const report = await runIsolatedPythonInspection({ ...complete.input, structure: true })
  expect(report.files.every((file) => !!file.structure)).toBe(true)
})

test('modified runtime/project bytes and stale reports cannot yield inspection evidence', async () => {
  for (const kind of ['runtime', 'project', 'report']) {
    const f = await fixture()
    if (kind === 'runtime')
      f.input.readRuntime = async () => new Blob([new Uint8Array([0])]).stream()
    if (kind === 'project')
      f.input.readProject = async () => new Blob([new Uint8Array([0])]).stream()
    if (kind === 'report') f.setReport({ ...f.report, revision: 'f'.repeat(64) })
    await expect(runIsolatedPythonInspection(f.input)).rejects.toThrow()
    expect(f.counts().destroyed).toBe(1)
    expect(f.counts().executed).toBe(kind === 'report' ? 1 : 0)
  }
})

test('forged metadata is denied before creating a container', async () => {
  const f = await fixture()
  f.input.snapshot.revision = 'f'.repeat(64)
  await expect(runIsolatedPythonInspection(f.input)).rejects.toThrow('revisão')
  expect(f.counts()).toEqual({ created: 0, destroyed: 0, executed: 0 })
})

test('cancellation reclaims its container and settles even if the SDK operation never responds', async () => {
  const f = await fixture()
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  f.setExecute(async () => {
    entered()
    return new Promise(() => {})
  })
  const result = runIsolatedPythonInspection(f.input)
  await started
  f.controller.abort(new Error('context changed'))
  await expect(result).rejects.toThrow('context changed')
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
})

test('cancellation during cleanup rejects an otherwise valid late report', async () => {
  const f = await fixture()
  let entered!: () => void, release!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  f.setCleanup(async () => {
    entered()
    await gate
  })
  const result = runIsolatedPythonInspection(f.input)
  await started
  f.controller.abort(new Error('context retired during cleanup'))
  release()
  await expect(result).rejects.toThrow('context retired during cleanup')
  expect(f.counts().destroyed).toBe(1)
})

test('unresponsive cleanup is bounded and never publishes an inspection report', async () => {
  const f = await fixture()
  f.setCleanup(async () => new Promise(() => {}))
  await expect(runIsolatedPythonInspection(f.input)).rejects.toThrow('confirmar o encerramento')
  expect(f.counts().destroyed).toBe(1)
}, 10_000)

test('body ownership survives cancellation between read resolution and await continuation', async () => {
  const f = await fixture()
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  f.input.readRuntime = () => {
    const resolved = Promise.resolve(body)
    void resolved.then(() => queueMicrotask(() => f.controller.abort(new Error('actor changed'))))
    return resolved
  }
  await expect(runIsolatedPythonInspection(f.input)).rejects.toThrow('actor changed')
  expect(cancelled).toBe(1)
  expect(body.locked).toBe(false)
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
})

function executionFixture(snapshot: StudioPythonExecutionMetadata) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse({ version: 1 })
  const report = StudioPythonPlaytestReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
    pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    recipe,
    status: 'passed',
    started: true,
    stopped: true,
    stateBeforeStop: 'completed',
    observedDurationMs: recipe.observeMs,
    stdout: 'executed',
    stderr: '',
    omittedChars: 0,
    errors: [],
    input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
  })
  return { recipe, report }
}

test('full validation compiles then executes in one sandbox and destroys only after both phases', async () => {
  const f = await fixture({ playtest: true })
  const { recipe, report } = executionFixture(f.input.snapshot)
  const commands: { command: string; cwd: string }[] = []
  f.setExecute(async (command, options) => {
    expect(f.counts().destroyed).toBe(0)
    commands.push({ command, cwd: options.cwd })
    return { success: true, stdout: '', stderr: '' }
  })
  const read = f.sandbox.readFile
  f.sandbox.readFile = async (path, options) =>
    path.endsWith('/python-playtest-result.json')
      ? { content: JSON.stringify(report) }
      : read(path, options)
  const result = await runIsolatedPythonValidation({ ...f.input, recipe })
  expect(result.inspection).toEqual(f.report)
  expect(result.execution?.report).toEqual(report)
  expect(commands.map(({ command }) => command)).toEqual([
    'node /opt/sz-runtime/python-inspect.mjs',
    'node /opt/sz-runtime/python-playtest.mjs',
  ])
  expect(new Set(commands.map(({ cwd }) => cwd)).size).toBe(1)
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 2 })
})

test('invalid compilation never starts learner execution, and an unsupported playtest capability fails closed', async () => {
  const invalid = await fixture({ playtest: true })
  invalid.report.status = invalid.report.files[0]!.status = 'failed'
  invalid.report.files[0]!.diagnostics = [{ message: 'return outside function' }]
  const result = await runIsolatedPythonValidation({ ...invalid.input, recipe: { version: 1 } })
  expect(result.inspection.status).toBe('failed')
  expect(result.execution).toBeUndefined()
  expect(invalid.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
  const unsupported = await fixture()
  await expect(
    runIsolatedPythonValidation({ ...unsupported.input, recipe: { version: 1 } }),
  ).rejects.toThrow('execução protegida')
  expect(unsupported.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
})

test('stale execution evidence and altered capture bytes cannot approve the compiled revision', async () => {
  for (const kind of ['revision', 'capture'] as const) {
    const f = await fixture({ playtest: true })
    const { report, recipe } = executionFixture(f.input.snapshot)
    if (kind === 'revision') report.revision = 'f'.repeat(64)
    else
      report.capture = {
        path: 'python-playtest.png',
        sha256: 'f'.repeat(64),
        byteLength: 33,
        width: 1,
        height: 1,
        frameSequence: 1,
      }
    const read = f.sandbox.readFile
    f.sandbox.readFile = async (path, options) => {
      if (path.endsWith('/python-playtest-result.json')) return { content: JSON.stringify(report) }
      if (path.endsWith('/python-playtest.png')) {
        expect(options.encoding).toBe('base64')
        return { content: Buffer.from(new Uint8Array(33)).toString('base64') }
      }
      return read(path, options)
    }
    await expect(runIsolatedPythonValidation({ ...f.input, recipe })).rejects.toThrow()
    expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 2 })
  }
})

test('cancellation during the second phase rejects its late report and destroys the sole owner', async () => {
  const f = await fixture({ playtest: true })
  let entered: () => void = () => {
    throw new Error('Not entered')
  }
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  let release: (value: { success: boolean; stdout: string; stderr: string }) => void = () => {
    throw new Error('Not entered')
  }
  f.setExecute(async (command) => {
    if (command.endsWith('/python-playtest.mjs')) {
      entered()
      return new Promise((resolve) => {
        release = resolve
      })
    }
    return { success: true, stdout: '', stderr: '' }
  })
  const result = runIsolatedPythonValidation({ ...f.input, recipe: { version: 1 } })
  await started
  f.controller.abort(new Error('cancel execution phase'))
  await expect(result).rejects.toThrow('cancel execution phase')
  release({ success: true, stdout: '', stderr: '' })
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 2 })
})

test('a noncooperative trusted phase cannot retain the job after its owner is cancelled', async () => {
  const f = await fixture()
  let entered: () => void = () => {
    throw new Error('Not entered')
  }
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  let release: () => void = () => {
    throw new Error('Not entered')
  }
  const result = withIsolatedPythonProject(f.input, async () => {
    entered()
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return 'late proof'
  })
  await started
  f.controller.abort(new Error('cancel trusted phase'))
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const outcome = await Promise.race([
      result.then(
        () => 'approved',
        () => 'retired',
      ),
      new Promise<string>((resolve) => {
        timeout = setTimeout(() => resolve('still pending'), 250)
      }),
    ])
    expect(outcome).toBe('retired')
    expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
  } finally {
    clearTimeout(timeout)
    release()
  }
  await expect(result).rejects.toThrow('cancel trusted phase')
})

test('a body arriving after cancelled read is reclaimed without starting a job', async () => {
  const f = await fixture()
  let entered!: () => void, release!: (body: ReadableStream<Uint8Array>) => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<ReadableStream<Uint8Array>>((resolve) => {
    release = resolve
  })
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  f.input.readRuntime = () => {
    entered()
    return gate
  }
  const result = runIsolatedPythonInspection(f.input)
  await started
  f.controller.abort(new Error('late input'))
  await expect(result).rejects.toThrow('late input')
  release(body)
  await Promise.resolve()
  await Promise.resolve()
  expect(cancelled).toBe(1)
  expect(body.locked).toBe(false)
  expect(f.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
})
