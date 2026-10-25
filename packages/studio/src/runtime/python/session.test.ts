import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import type { StudioRuntimeSession } from '../types'
import type { PythonFrameCommand, PythonFrameInitialization } from './frameProtocol'
import { preparePythonFrameSession } from './session'
import { preparePythonExecutionSnapshot } from './snapshot'
import { pythonWebBytesSha256 } from './webFiles'

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  mock.restore()
  if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches)
  else Reflect.deleteProperty(globalThis, 'caches')
})
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
type FramePort = Pick<MessagePort, 'postMessage' | 'close'>
const isFramePort = (value: unknown): value is FramePort =>
  typeof value === 'object' &&
  value !== null &&
  'postMessage' in value &&
  typeof value.postMessage === 'function' &&
  'close' in value &&
  typeof value.close === 'function'

async function fixture(mission = false) {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const original = environment.catalog.releases[0]
  if (!original) throw new Error('Missing inert release')
  const bytes = new TextEncoder().encode('inert public bytes')
  const digest = await pythonWebBytesSha256(bytes)
  const distribution = StudioPythonDistributionSchema.parse({
    version: 1,
    pythonVersion: '3.14.2',
    pyodideVersion: '314.0.7',
    features: [],
    providedModules: [],
    previewHostAudioVersion: 1,
    files: [
      'frame.html',
      'frame.mjs',
      'worker.mjs',
      'pyodide.mjs',
      'pyodide.asm.mjs',
      'pyodide.asm.wasm',
      'python_stdlib.zip',
      'pyodide-lock.json',
      'LICENSE-pyodide.txt',
      'LICENSE-python.txt',
      'SOURCES.txt',
    ].map((path) => ({ path, bytes: bytes.length, sha256: digest })),
  })
  const release = await createStudioRuntimeRelease({
    ...original.manifest,
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  const snapshot = await preparePythonExecutionSnapshot(project)
  snapshot.configuration.runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  snapshot.configuration.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
  const identity = {
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    writerEpoch: null,
    runtimeManifestSha256: release.manifestSha256,
  }
  const frame = document.createElement('iframe')
  // DOM navigation is the controlled boundary. Happy DOM deliberately disables
  // iframe loading; session, metadata validation and MessageChannels stay real.
  const child = window
  let source = 'about:blank'
  let closed!: () => void
  const closure = new Promise<void>((resolve) => {
    closed = resolve
  })
  Object.defineProperty(frame, 'isConnected', { value: true })
  Object.defineProperty(frame, 'contentWindow', { value: child })
  Object.defineProperty(frame, 'src', {
    get: () => source,
    set: (value: string) => {
      source = value
      if (value === 'about:blank') closed()
    },
  })
  const scope = new AbortController()
  const calls: { url: string; signal: AbortSignal | undefined }[] = []
  const transfers: { data: unknown; ports: FramePort[] }[] = []
  const transferErrors: Error[] = []
  let admitted!: () => void
  const admission = new Promise<void>((resolve) => {
    admitted = resolve
  })
  let opens = 0,
    settled = false
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
        opens++
        throw new Error('No byte cache should open during negotiation')
      },
    },
  })
  let complete!: (response: Response) => void
  let deny!: (reason: unknown) => void
  const response = new Promise<Response>((resolve, reject) => {
    complete = resolve
    deny = reject
  })
  spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        calls.push({ url: String(url), signal: init?.signal ?? undefined })
        return response
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  spyOn(child, 'postMessage').mockImplementation((...args: unknown[]) => {
    const ports = args[2]
    if (!Array.isArray(ports) || !ports.every(isFramePort)) {
      const error = new Error('Expected transferred MessagePort capabilities')
      transferErrors.push(error)
      throw error
    }
    transfers.push({ data: args[0], ports })
    admitted()
  })
  const preparation = preparePythonFrameSession({
    ...(mission ? { mission: true } : {}),
    frame,
    frameURL: new URL(`https://runtime.test/v1/runtimes/${release.manifestSha256}/frame.html`),
    identity,
    snapshot,
    signal: scope.signal,
  }).then(
    (session) => {
      settled = true
      return { session, error: undefined }
    },
    (error: unknown) => {
      settled = true
      return { session: undefined, error }
    },
  )
  cleanups.push(async () => {
    scope.abort()
    complete(Response.json({ release, distribution }))
    const outcome = await preparation
    await outcome.session?.dispose()
    await closure
    for (const transfer of transfers) for (const port of transfer.ports) port.close()
    frame.remove()
  })
  return {
    frame,
    scope,
    calls,
    transfers,
    preparation,
    duplicate: () =>
      preparePythonFrameSession({
        frame,
        frameURL: new URL(`https://runtime.test/v1/runtimes/${release.manifestSha256}/frame.html`),
        identity,
        snapshot,
        signal: scope.signal,
      }),
    admitted: () =>
      Promise.race([
        admission,
        preparation.then((outcome) => {
          throw new AggregateError(
            [...transferErrors, outcome.error],
            'Session ended before admission',
          )
        }),
      ]),
    opens: () => opens,
    settled: () => settled,
    complete: (value = Response.json({ release, distribution })) => complete(value),
    deny,
    hello(
      boot = true,
      origin = 'null',
      challenge = new URL(frame.src).hash.slice(1),
      source: Window | null = child,
    ) {
      window.dispatchEvent(
        new MessageEvent('message', {
          source,
          origin,
          data: {
            type: 'python-frame-ready',
            protocol: 1,
            challenge,
            ...(boot ? { bootResources: 1 } : {}),
          },
        }),
      )
    },
    async prepared(): Promise<StudioRuntimeSession> {
      const transfer = transfers[0]
      if (!transfer?.data || typeof transfer.data !== 'object' || !('challenge' in transfer.data))
        throw new Error('Missing admitted frame initialization')
      const channel = transfer.ports[0]
      if (!channel) throw new Error('Missing frame channel')
      const common = { protocol: 1, challenge: transfer.data.challenge, identity }
      channel.postMessage({
        ...common,
        sequence: 1,
        type: 'event',
        event: { type: 'state', state: 'ready' },
      })
      channel.postMessage({ ...common, sequence: 2, type: 'prepared' })
      const result = await preparation
      if (!result.session) throw result.error
      return result.session
    },
  }
}

test('mission reads use the authenticated generation and are rejected after disposal', async () => {
  const value = await fixture(true)
  value.complete()
  value.hello()
  await value.admitted()
  const initialization = value.transfers[0]!.data as PythonFrameInitialization
  const remote = value.transfers[0]!.ports[0] as MessagePort
  expect(initialization.mission).toBe(true)
  let sequence = 2
  const emit = (body: Record<string, unknown>) =>
    remote.postMessage({
      ...body,
      protocol: 1,
      challenge: initialization.challenge,
      identity: initialization.identity,
      sequence: ++sequence,
    })
  remote.onmessage = (event: MessageEvent<PythonFrameCommand>) => {
    const command = event.data
    if (command.type === 'run') emit({ type: 'event', event: { type: 'state', state: 'running' } })
    if (command.type === 'mission-observe')
      emit({
        type: 'mission-result',
        requestId: command.requestId,
        result: { observation: { type: 'value', observed: { found: true, value: 8 } } },
      })
    emit({ type: 'ack', commandId: command.commandId, ok: true })
  }
  remote.start()
  const session = await value.prepared()
  await session.run()
  if (!session.observePythonMission) throw new Error('Missing mission read capability')
  expect(await session.observePythonMission({ type: 'value', path: 'pontos' })).toEqual({
    observation: { type: 'value', observed: { found: true, value: 8 } },
  })
  await session.dispose()
  await expect(session.observePythonMission({ type: 'value', path: 'pontos' })).rejects.toThrow()
})

test('routes audio over the authenticated session channel and correlates its response', async () => {
  const value = await fixture()
  value.complete()
  value.hello()
  await value.admitted()
  const transfer = value.transfers[0]!
  const initialization = transfer.data as PythonFrameInitialization
  const remote = transfer.ports[0] as MessagePort
  let sequence = 2
  const emit = (body: Record<string, unknown>) =>
    remote.postMessage({
      ...body,
      protocol: 1,
      challenge: initialization.challenge,
      identity: initialization.identity,
      sequence: ++sequence,
    })
  let received!: (value: Extract<PythonFrameCommand, { type: 'audio-response' }>) => void
  const response = new Promise<Extract<PythonFrameCommand, { type: 'audio-response' }>>(
    (resolve) => {
      received = resolve
    },
  )
  remote.onmessage = (event: MessageEvent<PythonFrameCommand>) => {
    const command = event.data
    if (command.type === 'run') emit({ type: 'event', event: { type: 'state', state: 'running' } })
    if (command.type === 'audio-response') received(command)
    emit({ type: 'ack', commandId: command.commandId, ok: true })
  }
  remote.start()
  const session = await value.prepared()
  await session.run()
  emit({
    type: 'audio-request',
    requestId: 'audio-1',
    request: '{"version":1,"op":"stop","id":null}',
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      response,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Missing correlated audio response')), 1500)
      }),
    ])
    expect(result.requestId).toBe('audio-1')
    expect(JSON.parse(result.response)).toEqual({ version: 1, ok: true })
  } finally {
    clearTimeout(timer)
  }
})

test('prepares pinned public metadata in parallel but transfers nothing before a valid frame hello', async () => {
  const f = await fixture()
  await tick()
  expect(f.calls).toHaveLength(1)
  expect(f.calls[0]?.url).toContain('/v1/runtime-deployments/')
  expect(f.transfers).toEqual([])
  expect(f.opens()).toBe(0)
  expect(f.settled()).toBe(false)
  f.complete()
  await tick()
  expect(f.transfers).toEqual([])
  f.hello()
  await f.admitted()
  expect(f.transfers).toHaveLength(1)
  expect(f.transfers[0]?.ports).toHaveLength(2)
  expect(f.opens()).toBe(0)
  await f.prepared()
})

test('a hello without the current boot protocol is refused before any channel transfer', async () => {
  const f = await fixture()
  f.complete()
  f.hello(false)
  const result = await f.preparation
  expect(result.error).toMatchObject({ reasonCode: 'python-frame-failed' })
  expect(f.transfers).toEqual([])
  expect(f.opens()).toBe(0)
  expect(f.frame.src).toBe('about:blank')
})

test('metadata failure only fails a session after its valid hello negotiates boot resources', async () => {
  const f = await fixture()
  await tick()
  f.deny(new Error('Metadata offline'))
  await tick()
  expect(f.settled()).toBe(false)
  f.hello()
  const result = await f.preparation
  expect(result.error).toMatchObject({ reasonCode: 'python-frame-failed' })
  expect(f.transfers).toEqual([])
  expect(f.opens()).toBe(0)
  expect(f.frame.src).toBe('about:blank')
})

test('completed metadata never authorizes a forged origin, challenge or source', async () => {
  const f = await fixture()
  f.complete()
  f.hello(true, 'https://attacker.test')
  f.hello(true, 'null', '0'.repeat(64))
  f.hello(true, 'null', new URL(f.frame.src).hash.slice(1), null)
  await tick()
  expect(f.transfers).toEqual([])
  expect(f.settled()).toBe(false)
  f.hello()
  await f.admitted()
  await f.prepared()
})

for (const hello of [false, true]) {
  test(`withdrawal ${hello ? 'during' : 'before'} the hello retires late metadata without a channel or cache`, async () => {
    const f = await fixture()
    await tick()
    expect(f.calls).toHaveLength(1)
    if (hello) f.hello()
    f.scope.abort(new DOMException('Owner withdrew', 'AbortError'))
    expect((await f.preparation).error).toMatchObject({ name: 'AbortError' })
    let cancelled = 0
    f.complete(
      new Response(
        new ReadableStream({
          pull() {},
          cancel() {
            cancelled++
          },
        }),
      ),
    )
    await tick()
    expect(f.calls[0]?.signal?.aborted).toBe(true)
    expect(cancelled).toBe(1)
    expect(f.transfers).toEqual([])
    expect(f.opens()).toBe(0)
  })
}

test('an occupied iframe rejects another owner before starting another metadata request', async () => {
  const f = await fixture()
  await tick()
  await expect(f.duplicate()).rejects.toMatchObject({ reasonCode: 'frame-in-use' })
  expect(f.calls).toHaveLength(1)
  expect(f.transfers).toEqual([])
})
