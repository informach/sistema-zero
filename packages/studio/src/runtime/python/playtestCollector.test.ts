import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { verifyStudioPythonPlaytestCapture } from '@sistemazero/core/studio/python-playtest'
import type { StudioRuntimeEvent, StudioRuntimeSession, StudioRuntimeSnapshot } from '../types'
import { createPythonPlaytestCollector } from './playtestCollector'

let now = 0
const clock = spyOn(performance, 'now').mockImplementation(() => now)
afterEach(() => {
  now = 0
})
// These are controlled session/lifecycle tests, not qualification of a Python interpreter.
type EventPayload<Event = StudioRuntimeEvent> = Event extends StudioRuntimeEvent
  ? Omit<Event, 'identity' | 'sequence'>
  : never

function fixture(recipe: unknown = { version: 1, observeMs: 250 }) {
  let stopped = 0,
    disposed = 0,
    retired = 0,
    sequence = 0
  const collector = createPythonPlaytestCollector(recipe, () => {
    retired++
    collector.observer.disposed?.(session.identity)
    return true
  })
  const session: StudioRuntimeSession = {
    identity: {
      projectId: 'game',
      revision: 'a'.repeat(64),
      runtimeManifestSha256: 'b'.repeat(64),
      runId: crypto.randomUUID(),
      instanceId: crypto.randomUUID(),
      writerEpoch: null,
    },
    playback: { kind: 'stop-only' },
    repl: { kind: 'unavailable' },
    run: async () => {},
    subscribe: () => () => {},
    stop: async () => {
      stopped++
      event({ type: 'state', state: 'stopped' })
    },
    dispose: async () => {
      disposed++
    },
    provideInput: async () => {},
    captureSnapshot: async () => null,
  }
  function event(value: EventPayload) {
    collector.observer.event?.({
      ...value,
      identity: session.identity,
      sequence: ++sequence,
    })
  }
  collector.observer.session?.(session)
  event({ type: 'state', state: 'running' })
  return { collector, session, event, counts: () => ({ stopped, disposed, retired }) }
}

test('mission observations opt in, preserve identity through awaits and skip unused PNG capture', async () => {
  const ordinary = fixture()
  expect(() => ordinary.collector.output()).toThrow('não está disponível')
  await expect(ordinary.collector.observe({ type: 'value', path: 'pontos' })).rejects.toThrow(
    'não está disponível',
  )
  const f = fixture({ version: 1, mission: true, capture: false, observeMs: 250 })
  let captures = 0
  f.session.captureSnapshot = async () => {
    captures++
    throw new Error('Mission checks must not allocate PNG captures')
  }
  f.session.observePythonMission = async () => ({
    observation: { type: 'value', observed: { found: true, value: 10 } },
  })
  expect(await f.collector.observe({ type: 'value', path: 'pontos' })).toMatchObject({
    observation: { observed: { value: 10 } },
  })
  f.event({
    type: 'console',
    stream: 'stdout',
    text: 'real-output',
    omittedChars: 0,
    omittedLines: 0,
  })
  expect(f.collector.output().stdout).toBe('real-output')
  now = 250
  const result = await f.collector.finish()
  expect(result.report.status).toBe('passed')
  expect(result.report.capture).toBeUndefined()
  expect(captures).toBe(0)
  expect(f.counts()).toEqual({ stopped: 1, disposed: 1, retired: 1 })
  await expect(f.collector.observe({ type: 'value', path: 'pontos' })).rejects.toThrow(
    'não está disponível',
  )
})

test('a mission observation cannot settle after its session is retired, and program errors remain failed evidence', async () => {
  const f = fixture({ version: 1, mission: true, capture: false, observeMs: 250 })
  const gate = Promise.withResolvers<{
    observation: { type: 'value'; observed: { found: true; value: number } }
  }>()
  f.session.observePythonMission = () => gate.promise
  const pending = f.collector.observe({ type: 'value', path: 'pontos' })
  f.collector.programFailure('O programa excedeu o prazo da observação.')
  now = 250
  const result = await f.collector.finish()
  gate.resolve({ observation: { type: 'value', observed: { found: true, value: 10 } } })
  await expect(pending).rejects.toThrow('geração mudou')
  expect(result.report.status).toBe('failed')
  expect(result.report.errors).toContain('O programa excedeu o prazo da observação.')
  expect(result.report.stopped).toBe(true)
})

test('collector waits for actual stop/dispose, captures the same run, and preserves recipe input', async () => {
  const recipe = {
    version: 1,
    observeMs: 250,
    stdin: [''],
    keys: ['ArrowLeft'],
    requireGraphics: true,
  }
  const { collector, session, event, counts } = fixture(recipe)
  recipe.stdin[0] = 'mutated'
  const submitted: unknown[] = []
  session.provideInput = async (requestId, response) => {
    submitted.push({ requestId, response })
  }
  event({ type: 'input-request', requestId: 'input-1', prompt: 'Nome?' })
  await collector.submitNextLine()
  expect(submitted).toEqual([{ requestId: 'input-1', response: { kind: 'line', text: '' } }])
  collector.dispatched('key', 0)
  const image: StudioRuntimeSnapshot = {
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
    width: 1,
    height: 1,
    frameSequence: 1,
    identity: { ...session.identity },
  }
  session.captureSnapshot = async () => image
  let releaseStop: () => void = () => {
    throw new Error('Not entered')
  }
  const stopped = new Promise<void>((resolve) => {
    releaseStop = resolve
  })
  session.stop = () => stopped
  now = 250
  const finish = collector.finish()
  await expect(collector.finish()).rejects.toThrow('encerrável')
  expect(collector.view().finished).toBe(false)
  releaseStop()
  const result = await finish
  expect(result.report.status).toBe('passed')
  expect(result.report.stopped).toBe(true)
  expect(counts()).toEqual({ stopped: 0, disposed: 1, retired: 1 })
  expect(result.report.recipe.stdin).toEqual([''])
  expect(result.report.capture?.frameSequence).toBe(1)
  await verifyStudioPythonPlaytestCapture(
    result.report.capture,
    Uint8Array.from(atob(image.dataUrl.slice(22)), (char) => char.charCodeAt(0)),
  )
})

test('explicit program failure and foreign capture cannot skip cleanup or approve execution', async () => {
  const { collector, session, event, counts } = fixture({
    version: 1,
    observeMs: 250,
    requireGraphics: true,
  })
  session.captureSnapshot = async () => ({
    dataUrl: '',
    width: 1,
    height: 1,
    frameSequence: 1,
    identity: { ...session.identity, runId: crypto.randomUUID() },
  })
  event({ type: 'failed', code: 'program-error', message: 'ImportError' })
  now = 250
  const { report } = await collector.finish()
  expect(report.status).toBe('failed')
  expect(report.errors.join(' ')).toContain('ImportError')
  expect(report.errors.join(' ')).toContain('outra sessão')
  expect(report.capture).toBeUndefined()
  expect(counts()).toEqual({ stopped: 1, disposed: 1, retired: 1 })
})

test('stale identities and sequence replays do not change bounded observation', async () => {
  const { collector, session, event } = fixture()
  collector.observer.event?.({
    type: 'failed',
    message: 'foreign',
    code: 'program-error',
    identity: { ...session.identity, instanceId: crypto.randomUUID() },
    sequence: 999,
  })
  collector.observer.event?.({
    type: 'failed',
    message: 'replayed',
    code: 'program-error',
    identity: session.identity,
    sequence: 1,
  })
  event({
    type: 'console',
    stream: 'stdout',
    text: 'x'.repeat(20_000),
    omittedChars: 4,
    omittedLines: 0,
  })
  event({
    type: 'console',
    stream: 'stderr',
    text: 'deliberate warning',
    omittedChars: 0,
    omittedLines: 0,
  })
  now = 250
  const { report } = await collector.finish()
  expect(report.status).toBe('passed')
  expect(report.stdout.length).toBe(16_000)
  expect(report.omittedChars).toBe(4004)
  expect(report.stderr).toBe('deliberate warning')
})

test('a rejected stop still disposes and retires the frame and cannot confirm success', async () => {
  const { collector, session, counts } = fixture()
  session.stop = async () => {
    throw new Error('stop failed')
  }
  now = 250
  const { report } = await collector.finish()
  expect(report.status).toBe('failed')
  expect(report.stopped).toBe(false)
  expect(report.errors).toContain('stop failed')
  expect(counts()).toEqual({ stopped: 0, disposed: 1, retired: 1 })
})

test('unexpected disposal, restart and incomplete observation cannot approve a validation', async () => {
  const { collector, session, counts } = fixture()
  collector.observer.disposed?.(session.identity)
  collector.observer.session?.(session)
  const { report } = await collector.finish()
  expect(report.status).toBe('failed')
  expect(report.errors.join(' ')).toContain('descartada')
  expect(report.errors.join(' ')).toContain('reiniciar')
  expect(report.errors.join(' ')).toContain('observação')
  expect(counts().retired).toBe(1)
})

test('input in flight at retirement cannot become a late successful recipe completion', async () => {
  const { collector, session, event } = fixture({ version: 1, observeMs: 250, stdin: ['hello'] })
  let release: () => void = () => {
    throw new Error('Not entered')
  }
  session.provideInput = () =>
    new Promise<void>((resolve) => {
      release = resolve
    })
  event({ type: 'input-request', requestId: 'input-1', prompt: '' })
  const delivery = collector.submitNextLine()
  now = 250
  const { report } = await collector.finish()
  release()
  await expect(delivery).rejects.toThrow('mudou')
  expect(report.status).toBe('failed')
  expect(report.input.stdinSubmitted).toBe(0)
  expect(report.errors.join(' ')).toContain('trânsito')
})

// Restore the process clock once this module's tests have all completed.

afterAll(() => {
  clock.mockRestore()
})
