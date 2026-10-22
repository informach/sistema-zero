import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import type { StudioPythonStructureFacts } from '@sistemazero/core/studio/python-structure'
import { currentPythonDeployment } from '../../../../core/tests/fixtures/python-provided-release'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../../runtime/python/versions'
import { preparePythonAnalysisSession } from './session'

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  mock.restore()
  if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches)
  else Reflect.deleteProperty(globalThis, 'caches')
})

/** Only iframe navigation and public metadata IO are controlled; channels and host protocol are real. */
async function fixture() {
  const deployment = await currentPythonDeployment()
  const hash = deployment.release.manifestSha256
  const frame = document.createElement('iframe')
  let source = 'about:blank'
  Object.defineProperty(frame, 'isConnected', { value: true })
  Object.defineProperty(frame, 'contentWindow', { value: window })
  Object.defineProperty(frame, 'src', {
    get: () => source,
    set: (value: string) => {
      source = value
    },
  })
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      async keys() {
        return []
      },
      async delete() {
        return false
      },
      async open() {
        throw new Error('Handshake cannot request interpreter bytes')
      },
    },
  })
  let reads = 0
  spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async () => {
        reads++
        return Response.json(deployment)
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  const admission = Promise.withResolvers<{ data: unknown; ports: MessagePort[] }>()
  let transferred = 0
  spyOn(window, 'postMessage').mockImplementation((...args: unknown[]) => {
    const ports = args[2]
    if (
      !Array.isArray(ports) ||
      ports.length !== 2 ||
      !ports.every(
        (port) =>
          port && typeof port.postMessage === 'function' && typeof port.close === 'function',
      )
    )
      throw new Error('Expected both private channels')
    transferred++
    admission.resolve({ data: args[0], ports })
  })
  const owner = new AbortController()
  const pending = preparePythonAnalysisSession({
    frame,
    url: `https://analysis.test/v1/runtimes/${hash}/analysis.html`,
    allowedOrigins: ['https://analysis.test'],
    runtimeManifestSha256: hash,
    signal: owner.signal,
  }).then(
    (session) => ({ session, error: undefined }),
    (error: unknown) => ({ session: undefined, error }),
  )
  cleanups.push(async () => {
    owner.abort()
    const result = await pending
    result.session?.dispose()
    if (transferred) for (const port of (await admission.promise).ports) port.close()
  })
  return {
    frame,
    pending,
    reads: () => reads,
    transferred: () => transferred,
    hello(fields: Record<string, unknown> = { bootResources: 1 }) {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: window,
          data: {
            type: 'python-analysis-ready',
            challenge: new URL(frame.src).hash.slice(1),
            ...fields,
          },
        }),
      )
    },
    async ready(
      fields: Record<string, unknown> = {
        pythonVersion: PYTHON_VERSION,
        pyodideVersion: PYODIDE_VERSION,
      },
    ) {
      const transfer = await Promise.race([
        admission.promise,
        pending.then((outcome) => {
          throw outcome.error ?? new Error('Session settled before transferring its channels')
        }),
      ])
      transfer.ports[0]!.postMessage({ type: 'ready', ...fields })
      return pending
    },
    admission: admission.promise,
  }
}

test('analysis requires the pinned private boot protocol before transferring either channel', async () => {
  for (const fields of [{}, { bootResources: 0 }, { bootResources: 2 }]) {
    const f = await fixture()
    f.hello(fields)
    expect((await f.pending).error).toBeInstanceOf(Error)
    expect(f.transferred()).toBe(0)
    expect(f.reads()).toBe(0)
    expect(f.frame.src).toBe('about:blank')
    mock.restore()
  }
})

test('analysis rejects missing, partial and mismatched effective compiler acknowledgements', async () => {
  for (const fields of [
    {},
    { pythonVersion: PYTHON_VERSION },
    { pyodideVersion: PYODIDE_VERSION },
    { pythonVersion: '3.13.0', pyodideVersion: PYODIDE_VERSION },
    { pythonVersion: PYTHON_VERSION, pyodideVersion: '0.0.0' },
  ]) {
    const f = await fixture()
    f.hello()
    expect((await f.ready(fields)).error).toBeInstanceOf(Error)
    expect(f.transferred()).toBe(1)
    expect(f.frame.src).toBe('about:blank')
    mock.restore()
  }
})

test('the current acknowledgement exposes compilation and keeps compile-only distinct from structural analysis', async () => {
  const f = await fixture()
  f.hello()
  const result = await f.ready()
  if (!result.session) throw result.error
  expect(result.session.interpreter).toEqual({
    pythonVersion: PYTHON_VERSION,
    pyodideVersion: PYODIDE_VERSION,
  })
  const remote = (await f.admission).ports[0]!
  const operations: string[] = []
  const structure: StudioPythonStructureFacts = {
    version: 1,
    nodesVisited: 1,
    usesLoop: false,
    usesConditional: false,
    assignedNames: [],
    definedFunctions: [],
    callTargets: [],
  }
  remote.onmessage = (event: MessageEvent<{ type?: string; id: number; payload: string }>) => {
    if (event.data.type === 'dispose') return
    const request = JSON.parse(event.data.payload)
    operations.push(request.operation)
    remote.postMessage({
      type: 'result',
      id: event.data.id,
      payload: JSON.stringify({
        ok: true,
        compiledBytes: true,
        diagnostics: [],
        ...(request.operation === 'structure' ? { structure } : {}),
      }),
    })
  }
  remote.start()
  const identity = {
    projectId: 'analysis-fixture',
    instanceId: 'one',
    path: 'main.py',
    revision: 'a'.repeat(64),
    generation: 1,
  }
  const bytes = new TextEncoder().encode('print(1)')
  await expect(
    Reflect.apply(result.session.compileBytes, result.session, [identity, bytes, undefined, {}]),
  ).rejects.toThrow('escolha explícita')
  expect(operations).toEqual([])
  const compiled = await result.session.compileBytes(identity, bytes, undefined, {
    structure: false,
  })
  expect(compiled.structure).toBeUndefined()
  const inspected = await result.session.compileBytes(identity, bytes, undefined, {
    structure: true,
  })
  expect(inspected.structure).toEqual(structure)
  expect(operations).toEqual(['compile', 'structure'])
  result.session.dispose()
  expect(result.session.closed).toBe(true)
})

test('analysis refuses an absent or invalid host pin before mounting or reading metadata', async () => {
  for (const pin of [undefined, '', '0'.repeat(63)]) {
    const frame = document.createElement('iframe')
    const result = await Reflect.apply(preparePythonAnalysisSession, undefined, [
      {
        frame,
        url: 'https://analysis.test/analysis.html',
        allowedOrigins: ['https://analysis.test'],
        runtimeManifestSha256: pin,
        signal: new AbortController().signal,
      },
    ]).then(
      () => false,
      () => true,
    )
    expect(result).toBe(true)
    expect(frame.getAttribute('src')).toBeNull()
  }
})
