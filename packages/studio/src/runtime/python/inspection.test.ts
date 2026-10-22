import { expect, test } from 'bun:test'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import type { PythonAnalysisSession } from '../../python/language/session'
import type { PythonByteCompilation } from '../../python/language/types'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { inspectPythonSnapshot } from './inspection'
import { preparePythonExecutionSnapshot } from './snapshot'
import { PYODIDE_VERSION, PYTHON_VERSION } from './versions'
import { pythonWebBytesSha256 } from './webFiles'

async function fixture() {
  const snapshot = await preparePythonExecutionSnapshot({
    ...documentFixture('python', 'pro'),
    assets: [],
  })
  let opened = 0,
    disposed = 0
  const calls: { bytes: Uint8Array; path: string }[] = []
  const result = (identity: PythonByteCompilation['identity']): PythonByteCompilation => ({
    identity: { ...identity },
    diagnostics: [],
  })
  let compile: PythonAnalysisSession['compileBytes'] = async (identity) => result(identity)
  let interpreter: PythonAnalysisSession['interpreter'] = {
    pythonVersion: PYTHON_VERSION,
    pyodideVersion: PYODIDE_VERSION,
  }
  let beforeOpen = async () => {}
  const createSession = async (_signal: AbortSignal): Promise<PythonAnalysisSession> => {
    opened++
    await beforeOpen()
    return {
      get closed() {
        return disposed > 0
      },
      interpreter,
      compileBytes: (identity, bytes, signal, options) => {
        calls.push({ path: identity.path, bytes: bytes.slice() })
        return compile(identity, bytes, signal, options)
      },
      async parse() {
        throw new Error('Inspection must compile original bytes, not parse Unicode')
      },
      async render() {
        throw new Error('Inspection cannot render or execute author code')
      },
      dispose() {
        disposed++
      },
    }
  }
  return {
    snapshot,
    createSession,
    calls,
    result,
    setCompile(handler: typeof compile) {
      compile = handler
    },
    setInterpreter(value: typeof interpreter) {
      interpreter = value
    },
    beforeOpen(handler: typeof beforeOpen) {
      beforeOpen = handler
    },
    counts: () => ({ opened, disposed }),
  }
}

test('structure is explicitly requested, preserved for all modules and cannot silently fall back to compile-only', async () => {
  const f = await fixture()
  const structure = {
    version: 1 as const,
    nodesVisited: 1,
    usesLoop: false,
    usesConditional: false,
    assignedNames: [],
    definedFunctions: [],
    callTargets: [],
  }
  const requests: boolean[] = []
  f.setCompile(async (identity, _bytes, _signal, options) => {
    requests.push(options.structure)
    return { ...f.result(identity), structure }
  })
  const report = await inspectPythonSnapshot({
    snapshot: f.snapshot,
    signal: new AbortController().signal,
    structure: true,
    createSession: f.createSession,
  })
  expect(requests).toEqual([true, true])
  expect(report.files.every((file) => file.structure?.nodesVisited === 1)).toBe(true)
  const legacy = await fixture()
  await expect(
    inspectPythonSnapshot({
      snapshot: legacy.snapshot,
      signal: new AbortController().signal,
      structure: true,
      createSession: legacy.createSession,
    }),
  ).rejects.toThrow('estrutura completa')
  expect(legacy.counts()).toEqual({ opened: 1, disposed: 1 })
})

test('inspection captures verified buffers, asks actual compilation for every Python module and owns disposal', async () => {
  const f = await fixture()
  const original = structuredClone(f.snapshot)
  const pending = inspectPythonSnapshot({
    structure: false,
    snapshot: f.snapshot,
    signal: new AbortController().signal,
    createSession: f.createSession,
  })
  f.snapshot.files.find((file) => file.path.endsWith('main.py'))!.bytes.fill(0)
  const report = await pending
  expect(report.status).toBe('passed')
  expect(report.revision).toBe(original.revision)
  expect(report.files.map((file) => file.path)).toEqual(['src/helper.py', 'src/main.py'])
  expect(f.calls.find((call) => call.path.endsWith('main.py'))!.bytes).toEqual(
    original.files.find((file) => file.path.endsWith('main.py'))!.bytes,
  )
  expect(f.counts()).toEqual({ opened: 1, disposed: 1 })
})

test('inspection refuses an omitted structure mode before opening its compiler', async () => {
  const f = await fixture()
  await expect(
    Reflect.apply(inspectPythonSnapshot, undefined, [
      {
        snapshot: f.snapshot,
        signal: new AbortController().signal,
        createSession: f.createSession,
      },
    ]),
  ).rejects.toThrow('escolha explícita')
  expect(f.counts()).toEqual({ opened: 0, disposed: 0 })
})

test('a compilation diagnostic fails the aggregate while preserving the complete file report', async () => {
  const f = await fixture()
  f.setCompile(async (identity) =>
    identity.path.endsWith('main.py')
      ? {
          ...f.result(identity),
          diagnostics: [{ kind: 'syntax', message: 'return outside function' }],
        }
      : f.result(identity),
  )
  const report = await inspectPythonSnapshot({
    structure: false,
    snapshot: f.snapshot,
    signal: new AbortController().signal,
    createSession: f.createSession,
  })
  expect(report.status).toBe('failed')
  expect(report.files.map((file) => file.status)).toEqual(['passed', 'failed'])
  expect(f.counts()).toEqual({ opened: 1, disposed: 1 })
})

test('forged content or revision is refused before opening any analysis worker', async () => {
  for (const kind of ['bytes', 'revision', 'version']) {
    const f = await fixture()
    if (kind === 'bytes') f.snapshot.files.find((file) => file.bytes.byteLength > 0)!.bytes.fill(0)
    else if (kind === 'revision') f.snapshot.revision = 'f'.repeat(64)
    else f.snapshot.configuration.python.dependencyLock.pythonVersion = '3.13.0'
    await expect(
      inspectPythonSnapshot({
        structure: false,
        snapshot: f.snapshot,
        signal: new AbortController().signal,
        createSession: f.createSession,
      }),
    ).rejects.toThrow()
    expect(f.counts()).toEqual({ opened: 0, disposed: 0 })
  }
})

test('wrong-document analysis cannot become compilation evidence and still disposes its worker', async () => {
  const f = await fixture()
  f.setCompile(async (identity) => f.result({ ...identity, revision: 'f'.repeat(64) }))
  await expect(
    inspectPythonSnapshot({
      structure: false,
      snapshot: f.snapshot,
      signal: new AbortController().signal,
      createSession: f.createSession,
    }),
  ).rejects.toThrow('não corresponde')
  expect(f.counts()).toEqual({ opened: 1, disposed: 1 })
})

for (const phase of ['opening', 'parsing'] as const)
  test(`cancelled ${phase} cannot return a late report and reclaims the owned session`, async () => {
    const f = await fixture()
    let entered!: () => void, release!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    if (phase === 'opening')
      f.beforeOpen(async () => {
        entered()
        await gate
      })
    else
      f.setCompile(async (identity) => {
        entered()
        await gate
        return f.result(identity)
      })
    const controller = new AbortController()
    const pending = inspectPythonSnapshot({
      structure: false,
      snapshot: f.snapshot,
      signal: controller.signal,
      createSession: f.createSession,
    })
    await started
    controller.abort(new Error('context changed'))
    release()
    await expect(pending).rejects.toThrow('context changed')
    expect(f.counts()).toEqual({ opened: 1, disposed: 1 })
  })

test('inspection requires effective compiler versions even for otherwise valid reports', async () => {
  for (const interpreter of [
    { pythonVersion: '3.13.0', pyodideVersion: PYODIDE_VERSION },
    { pythonVersion: PYTHON_VERSION, pyodideVersion: '0.0.0' },
  ]) {
    const f = await fixture()
    f.setInterpreter(interpreter)
    await expect(
      inspectPythonSnapshot({
        structure: false,
        snapshot: f.snapshot,
        signal: new AbortController().signal,
        createSession: f.createSession,
      }),
    ).rejects.toThrow('versão efetiva')
    expect(f.calls).toHaveLength(0)
    expect(f.counts()).toEqual({ opened: 1, disposed: 1 })
  }
})

test('oversized Python modules reject before opening a compiler', async () => {
  const f = await fixture()
  const main = f.snapshot.files.find((file) => file.path.endsWith('main.py'))!
  main.bytes = new Uint8Array(1024 * 1024 + 1).fill(32)
  main.sha256 = await pythonWebBytesSha256(main.bytes)
  f.snapshot.revision = await studioPythonExecutionRevision({
    version: f.snapshot.version,
    configuration: f.snapshot.configuration,
    directories: f.snapshot.directories,
    files: f.snapshot.files.map(({ bytes, ...file }) => ({
      ...file,
      byteLength: bytes.byteLength,
    })),
  })
  await expect(
    inspectPythonSnapshot({
      structure: false,
      snapshot: f.snapshot,
      signal: new AbortController().signal,
      createSession: f.createSession,
    }),
  ).rejects.toThrow('limite de compilação')
  expect(f.counts()).toEqual({ opened: 0, disposed: 0 })
})
