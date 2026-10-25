import { afterEach, expect, test } from 'bun:test'
import {
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import type { StudioPythonMissionObservation } from '@sistemazero/core/studio/python-mission-observation'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import type { PythonGraphicsReply, PythonWorkerCommand } from './protocol'
import { preparePythonProExecutionSnapshot } from './snapshot'
import { createPythonWorkerSupervisor } from './workerSupervisor'

/** A transport double: real CPython and browser CSP are covered by runtime E2E. */
class Transport extends EventTarget {
  commands: PythonWorkerCommand[] = []
  transfers: Transferable[][] = []
  terminated = 0
  postMessage(command: PythonWorkerCommand, options?: { transfer?: Transferable[] }) {
    this.commands.push(command)
    this.transfers.push(options?.transfer ?? [])
  }
  terminate() {
    this.terminated++
  }
  emit(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const dispose of cleanups.splice(0)) dispose()
})
async function session(
  onEvent?: (event: Record<string, unknown>, stop: () => void) => void,
  graphics?: (
    request: string,
    images: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ) => Promise<PythonGraphicsReply>,
  onActivityResult?: (requestId: string, feedback: StudioPythonActivityFeedback) => void,
  audio?: (request: string) => Promise<string>,
  onMissionResult?: (requestId: string, observation: StudioPythonMissionObservation) => void,
  onSavedFile?: (path: string, bytes: Uint8Array<ArrayBuffer>) => void,
) {
  const project = documentFixture('python', 'pro')
  project.assets = []
  const snapshot = await preparePythonProExecutionSnapshot(project)
  const transport = new Transport()
  const events: Record<string, unknown>[] = []
  let ready = 0
  let releases = 0
  const supervisor = createPythonWorkerSupervisor({
    worker: transport as unknown as Worker,
    snapshot,
    emit: (event) => {
      events.push(event)
      onEvent?.(event, supervisor.stop)
    },
    onReady: () => ready++,
    onRelease: () => releases++,
    ...(onMissionResult ? { mission: true as const, onMissionResult } : {}),
    ...(audio ? { audio } : {}),
    ...(onSavedFile ? { onSavedFile } : {}),
    ...(graphics ? { graphics } : {}),
    ...(onActivityResult
      ? {
          activity: StudioPythonActivitySchema.parse({
            version: 1,
            programmingLanguage: 'python',
            profileId: snapshot.configuration.runtime.profileId,
            instructions: '',
            checks: [
              {
                id: 'output',
                label: 'Saída',
                kind: 'behavior',
                rule: { type: 'consoleContains', text: 'hello' },
              },
            ],
          }),
          onActivityResult,
        }
      : {}),
  })
  cleanups.push(supervisor.stop)
  const boot = () => {
    transport.emit({ type: 'booted', pythonVersion: '3.14.2', pyodideVersion: '314.0.7' })
    transport.emit({ type: 'prepared' })
  }
  return {
    transport,
    events,
    supervisor,
    boot,
    get ready() {
      return ready
    },
    get releases() {
      return releases
    },
  }
}

test('mission observations are opt-in, correlated, single-flight and do not accept verdicts', async () => {
  const disabled = await session()
  disabled.boot()
  disabled.supervisor.run()
  expect(() =>
    disabled.supervisor.observeMission('m1', { type: 'value', path: 'pontos' }),
  ).toThrow()
  const received: StudioPythonMissionObservation[] = []
  const value = await session(undefined, undefined, undefined, undefined, (_id, result) =>
    received.push(result),
  )
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.supervisor.observeMission('m1', { type: 'value', path: 'pontos' })
  expect(value.transport.commands.at(-1)).toEqual({
    type: 'mission-observe',
    requestId: 'm1',
    probe: { type: 'value', path: 'pontos' },
  })
  expect(() => value.supervisor.observeMission('m2', { type: 'value', path: 'pontos' })).toThrow()
  value.transport.emit({
    type: 'mission-result',
    requestId: 'm1',
    observation: { type: 'value', observed: { found: true, value: 3 } },
  })
  expect(received).toEqual([{ type: 'value', observed: { found: true, value: 3 } }])
  expect(value.supervisor.phase).toBe('completed')
  value.supervisor.observeMission('m2', { type: 'value', path: 'pontos' })
  value.transport.emit({
    type: 'mission-result',
    requestId: 'm2',
    observation: { type: 'value', observed: { found: true, value: 3 }, passed: true },
  })
  expect(value.supervisor.phase).toBe('failed')
  expect(received).toHaveLength(1)
})

test('an authorized idle mission function can request input without an entrypoint or REPL operation', async () => {
  const received: StudioPythonMissionObservation[] = []
  const value = await session(undefined, undefined, undefined, undefined, (_id, result) =>
    received.push(result),
  )
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.supervisor.observeMission('function-input', {
    id: 'function',
    type: 'functionReturns',
    name: 'ler',
    args: [[]],
  })
  value.transport.emit({ type: 'input-request', requestId: 'input-1' })
  expect(value.supervisor.phase).toBe('waiting-input')
  expect(() => value.supervisor.provideInput('foreign', { kind: 'line', text: '7' })).toThrow()
  value.supervisor.provideInput('input-1', { kind: 'line', text: '7' })
  value.transport.emit({
    type: 'mission-result',
    requestId: 'function-input',
    observation: { id: 'function', type: 'functionReturns', cases: [{ ok: true, value: 7 }] },
  })
  expect(value.supervisor.phase).toBe('completed')
  expect(received).toHaveLength(1)
  value.supervisor.stop()
  expect(value.transport.terminated).toBe(1)
})

test('a mission request finishing with the program preserves observation ownership, then retires late results', async () => {
  let count = 0
  const value = await session(undefined, undefined, undefined, undefined, () => count++)
  value.boot()
  value.supervisor.run()
  value.supervisor.observeMission('m1', { type: 'value', path: 'pontos' })
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  expect(value.supervisor.phase).toBe('running')
  value.transport.emit({
    type: 'mission-result',
    requestId: 'm1',
    observation: { type: 'value', observed: { found: true, value: 1 } },
  })
  expect(value.supervisor.phase).toBe('completed')
  expect(count).toBe(1)
  value.supervisor.observeMission('m2', { type: 'value', path: 'pontos' })
  value.supervisor.stop()
  value.transport.emit({
    type: 'mission-result',
    requestId: 'm2',
    observation: { type: 'value', observed: { found: true, value: 2 } },
  })
  expect(count).toBe(1)
  expect(value.transport.terminated).toBe(1)
})

test('graphics is opt-in, single-flight and cannot deliver a late response after stop', async () => {
  const event = { type: 'graphics', requestId: 'graphics-1', request: '{}', images: [] }
  const unavailable = await session()
  unavailable.boot()
  unavailable.supervisor.run()
  unavailable.transport.emit(event)
  expect(unavailable.supervisor.phase).toBe('failed')

  let resolve!: (value: string) => void
  let calls = 0
  const active = await session(undefined, () => {
    calls++
    return new Promise((done) => {
      resolve = done
    })
  })
  active.boot()
  active.supervisor.run()
  active.transport.emit(event)
  await Promise.resolve()
  expect(calls).toBe(1)
  active.supervisor.stop()
  resolve('{"events":[],"value":null}')
  await Promise.resolve()
  await Promise.resolve()
  expect(active.transport.commands.some((value) => value.type === 'graphics-response')).toBe(false)
  expect(active.transport.terminated).toBe(1)

  const duplicate = await session(undefined, () => new Promise(() => {}))
  duplicate.boot()
  duplicate.supervisor.run()
  duplicate.transport.emit(event)
  duplicate.transport.emit({ ...event, requestId: 'graphics-2' })
  expect(duplicate.supervisor.phase).toBe('failed')
})

test('audio is serialized, correlated and cannot deliver a late response after stop', async () => {
  const event = {
    type: 'audio',
    requestId: 'audio-1',
    request: JSON.stringify({ version: 1, op: 'stop', id: null }),
  }
  const unavailable = await session()
  unavailable.boot()
  unavailable.supervisor.run()
  unavailable.transport.emit(event)
  expect(unavailable.supervisor.phase).toBe('failed')

  let complete!: (value: string) => void
  let observed = ''
  const active = await session(undefined, undefined, undefined, (request) => {
    observed = request
    return new Promise((resolve) => {
      complete = resolve
    })
  })
  active.boot()
  active.supervisor.run()
  active.transport.emit(event)
  await Promise.resolve()
  expect(observed).toBe(event.request)
  active.supervisor.stop()
  complete('{"version":1,"ok":true}')
  await Promise.resolve()
  await Promise.resolve()
  expect(active.transport.commands.some((command) => command.type === 'audio-response')).toBe(false)
  expect(active.transport.terminated).toBe(1)

  const success = await session(
    undefined,
    undefined,
    undefined,
    async () => '{"version":1,"ok":true}',
  )
  success.boot()
  success.supervisor.run()
  success.transport.emit(event)
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  expect(success.transport.commands.at(-1)).toEqual({
    type: 'audio-response',
    requestId: 'audio-1',
    response: '{"version":1,"ok":true}',
  })
})

test('pending audio refuses duplicate media, graphics, forged completion and input', async () => {
  const event = {
    type: 'audio',
    requestId: 'audio-1',
    request: JSON.stringify({ version: 1, op: 'stop', id: null }),
  }
  for (const forged of [
    { ...event, requestId: 'audio-2' },
    { type: 'graphics', requestId: 'graphics-1', request: '{}', images: [] },
    { type: 'input-request', requestId: 'input-1' },
    { type: 'result', requestId: 'entrypoint', ok: true, text: '' },
  ]) {
    const active = await session(undefined, undefined, undefined, () => new Promise(() => {}))
    active.boot()
    active.supervisor.run()
    active.transport.emit(event)
    active.transport.emit(forged)
    expect(active.supervisor.phase).toBe('failed')
    expect(active.transport.terminated).toBe(1)
  }
})

test('an input or completion forged while rendering cannot change the active operation', async () => {
  for (const forged of [
    { type: 'input-request', requestId: 'input-1' },
    { type: 'result', requestId: 'entrypoint', ok: true, text: '' },
  ]) {
    const value = await session(undefined, () => new Promise(() => {}))
    value.boot()
    value.supervisor.run()
    value.transport.emit({ type: 'graphics', requestId: 'graphics-1', request: '{}', images: [] })
    value.transport.emit(forged)
    expect(value.supervisor.phase).toBe('failed')
    expect(value.transport.terminated).toBe(1)
  }
})

test('state gates and correlation preserve one entrypoint and sequential REPL', async () => {
  const value = await session()
  const { supervisor, transport } = value
  expect(() => supervisor.run()).toThrow()
  value.boot()
  expect(value.ready).toBe(1)
  expect(transport.commands[0]?.type).toBe('prepare')
  supervisor.run()
  expect(() => supervisor.run()).toThrow()
  expect(() => supervisor.evaluate('repl', '1')).toThrow()
  transport.emit({ type: 'input-request', requestId: 'input-1' })
  expect(() => supervisor.provideInput('stale', { kind: 'eof' })).toThrow()
  expect(() => supervisor.provideInput('input-1', { kind: 'line', text: 'x\ny' })).toThrow()
  supervisor.provideInput('input-1', { kind: 'line', text: '' })
  expect(transport.commands.at(-1)).toEqual({
    type: 'input',
    requestId: 'input-1',
    response: { kind: 'line', text: '' },
  })
  transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  expect(supervisor.phase).toBe('completed')
  expect(() => supervisor.run()).toThrow()
  supervisor.evaluate('repl', '1/0')
  transport.emit({
    type: 'result',
    requestId: 'repl',
    ok: false,
    text: 'division by zero',
    traceback: 'trace',
  })
  expect(supervisor.phase).toBe('completed')
  expect(value.events.at(-1)).toMatchObject({
    type: 'repl-result',
    requestId: 'repl',
    status: 'failed',
    text: 'trace',
  })
  supervisor.evaluate('again', '42')
  transport.emit({ type: 'result', requestId: 'again', ok: true, text: '42' })
  expect(value.events.at(-1)).toMatchObject({ type: 'repl-result', text: '42' })
})
test('stop revokes the generation and releases once, before late worker output', async () => {
  const value = await session()
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'input-request', requestId: 'input-1' })
  value.supervisor.stop()
  const count = value.events.length
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.transport.emit({
    type: 'console',
    batches: [{ stream: 'stdout', text: 'late', omittedChars: 0, omittedLines: 0 }],
  })
  value.supervisor.stop()
  expect(value.events.length).toBe(count)
  expect(value.releases).toBe(1)
  expect(value.transport.terminated).toBe(1)
  expect(() => value.supervisor.provideInput('input-1', { kind: 'eof' })).toThrow()
  expect(value.events.at(-1)).toEqual({ type: 'state', state: 'stopped' })
})
test('a forged result cannot select another operation or send persistence commands', async () => {
  for (const forged of [
    { type: 'result', requestId: 'other', ok: true, text: '' },
    { type: 'save-project', projectId: 'other' },
    { type: 'prepared' },
    {
      type: 'console',
      batches: [{ stream: 'stdout', text: 'x'.repeat(9000), omittedChars: 0, omittedLines: 0 }],
    },
  ]) {
    const value = await session()
    value.boot()
    value.supervisor.run()
    value.transport.emit(forged)
    expect(value.supervisor.phase).toBe('failed')
    expect(value.events.at(-1)).toMatchObject({ type: 'failed', code: 'program-error' })
    expect(value.transport.terminated).toBe(1)
  }
})
async function answered(value: Awaited<ReturnType<typeof session>>, requestId: string) {
  value.transport.emit({ type: 'graphics', requestId, request: '{}', images: [] })
  for (let tick = 0; tick < 10; tick++) await Promise.resolve()
  return value.transport.commands.at(-1)
}

test('a game exchanging frames is not counted against the message quota, up to its own ceiling', async () => {
  const value = await session(undefined, () => Promise.resolve('{}'))
  value.boot()
  value.supervisor.run()
  // Ten seconds of a 60 fps game would be 600 frames; well over 256 within one second here.
  for (let frame = 0; frame < 600; frame++)
    expect(await answered(value, `graphics-${frame}`)).toMatchObject({ type: 'graphics-response' })
  expect(value.supervisor.phase).toBe('running')
  // Other messages keep their own budget in the same second.
  for (let i = 0; i < 200; i++) value.transport.emit({ type: 'console', batches: [] })
  expect(value.supervisor.phase).toBe('running')

  const flood = await session(undefined, () => Promise.resolve('{}'))
  flood.boot()
  flood.supervisor.run()
  for (let frame = 0; frame < 2100 && flood.supervisor.phase === 'running'; frame++)
    await answered(flood, `graphics-${frame}`)
  expect(flood.events.at(-1)).toMatchObject({ type: 'failed', code: 'quota-exceeded' })
})

test('pixels come back to the worker as a transferred buffer, within bounds', async () => {
  const pixels = new Uint8Array(4 * 4 * 4).fill(7)
  const value = await session(undefined, () => Promise.resolve({ text: '{}', bytes: pixels }))
  value.boot()
  value.supervisor.run()
  const response = await answered(value, 'graphics-1')
  expect(response).toMatchObject({ type: 'graphics-response', response: '{}' })
  expect((response as { bytes: Uint8Array }).bytes).toBe(pixels)
  expect(value.transport.transfers.at(-1)).toEqual([pixels.buffer])

  // A view on a bigger buffer is copied, so nothing else of the frame is transferred.
  const big = new Uint8Array(64)
  const view = await session(undefined, () =>
    Promise.resolve({ text: '{}', bytes: big.subarray(8, 24) as Uint8Array<ArrayBuffer> }),
  )
  view.boot()
  view.supervisor.run()
  const copied = (await answered(view, 'graphics-1')) as { bytes: Uint8Array }
  expect(copied.bytes.byteLength).toBe(16)
  expect(copied.bytes.buffer).not.toBe(big.buffer)

  const invalid = await session(undefined, () =>
    Promise.resolve({ text: '{}', bytes: 'pixels' as unknown as Uint8Array<ArrayBuffer> }),
  )
  invalid.boot()
  invalid.supervisor.run()
  await answered(invalid, 'graphics-1')
  expect(invalid.supervisor.phase).toBe('failed')
})

test('an uncooperative message flood or output flood is terminated', async () => {
  for (const batches of [
    [],
    Array.from({ length: 8 }, () => ({
      stream: 'stdout',
      text: 'x'.repeat(8000),
      omittedChars: 0,
      omittedLines: 0,
    })),
  ]) {
    const value = await session()
    value.boot()
    value.supervisor.run()
    for (let i = 0; i < 300; i++) value.transport.emit({ type: 'console', batches })
    expect(value.events.at(-1)).toMatchObject({ type: 'failed', code: 'quota-exceeded' })
    expect(value.transport.terminated).toBe(1)
    expect(value.events.filter((event) => event.type === 'console').length).toBeLessThanOrEqual(32)
  }
})
test('an entrypoint error is terminal and its traceback remains a bounded diagnostic', async () => {
  const value = await session()
  value.boot()
  value.supervisor.run()
  value.transport.emit({
    type: 'result',
    requestId: 'entrypoint',
    ok: false,
    text: 'bad',
    traceback: 'trace',
  })
  expect(value.events.slice(-2)).toEqual([
    {
      type: 'diagnostic',
      path: 'src/main.py',
      line: 0,
      column: 0,
      message: 'bad',
      traceback: 'trace',
    },
    { type: 'failed', code: 'program-error', message: 'bad' },
  ])
  expect(value.transport.terminated).toBe(1)
  expect(() => value.supervisor.evaluate('repl', '42')).toThrow()
})

test('synchronous revocation inside callbacks stops the remaining batch and readiness', async () => {
  const value = await session((event, stop) => {
    if (event.type === 'console') stop()
  })
  value.boot()
  value.supervisor.run()
  value.transport.emit({
    type: 'console',
    batches: [
      { stream: 'stdout', text: 'first', omittedChars: 0, omittedLines: 0 },
      { stream: 'stderr', text: 'second', omittedChars: 0, omittedLines: 0 },
    ],
  })
  expect(value.events.slice(-2)).toEqual([
    { type: 'console', stream: 'stdout', text: 'first', omittedChars: 0, omittedLines: 0 },
    { type: 'state', state: 'stopped' },
  ])
  const beforeReady = await session((event, stop) => {
    if (event.type === 'state' && event.state === 'ready') stop()
  })
  beforeReady.boot()
  expect(beforeReady.ready).toBe(0)
})
test('revocation during run, input, or REPL acceptance cannot dispatch more code', async () => {
  for (const operation of ['run', 'input', 'evaluate']) {
    let revoke = false
    const value = await session((event, stop) => {
      if (revoke && event.type === 'state' && event.state === 'running') stop()
    })
    value.boot()
    if (operation !== 'run') value.supervisor.run()
    if (operation === 'input') value.transport.emit({ type: 'input-request', requestId: 'input-1' })
    if (operation === 'evaluate')
      value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
    const count = value.transport.commands.length
    revoke = true
    expect(() => {
      if (operation === 'run') value.supervisor.run()
      else if (operation === 'input') value.supervisor.provideInput('input-1', { kind: 'eof' })
      else value.supervisor.evaluate('repl', '42')
    }).toThrow('interrompida')
    expect(value.transport.commands.length).toBe(count)
    expect(value.transport.terminated).toBe(1)
  }
})
test('revocation at REPL completion suppresses its result', async () => {
  let revoke = false
  const value = await session((event, stop) => {
    if (revoke && event.type === 'state' && event.state === 'completed') stop()
  })
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.supervisor.evaluate('repl', '42')
  revoke = true
  value.transport.emit({ type: 'result', requestId: 'repl', ok: true, text: '42' })
  expect(value.events.at(-1)).toEqual({ type: 'state', state: 'stopped' })
  expect(value.events.some((event) => event.type === 'repl-result')).toBe(false)
})
test('a callback may start the next REPL without losing the previous result', async () => {
  let next: (() => void) | undefined
  const value = await session((event) => {
    if (event.type === 'state' && event.state === 'completed' && next) {
      const begin = next
      next = undefined
      begin()
    }
  })
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.supervisor.evaluate('first', '1')
  next = () => value.supervisor.evaluate('second', '2')
  value.transport.emit({ type: 'result', requestId: 'first', ok: true, text: '1' })
  expect(value.supervisor.phase).toBe('running')
  expect(value.events.at(-1)).toMatchObject({ type: 'repl-result', requestId: 'first', text: '1' })
  value.transport.emit({ type: 'result', requestId: 'second', ok: true, text: '2' })
  expect(value.events.at(-1)).toMatchObject({ type: 'repl-result', requestId: 'second', text: '2' })
})

const feedback = () => ({
  version: 1,
  results: [{ checkId: 'output', kind: 'behavior', passed: true, verifiedBy: 'client' }],
})

test('activity has one host-owned request and keeps a running program alive after formative feedback', async () => {
  const results: unknown[] = []
  const value = await session(undefined, undefined, (requestId, result) =>
    results.push({ requestId, result }),
  )
  expect(() => value.supervisor.checkActivity('check')).toThrow()
  value.boot()
  expect(value.transport.commands[0]).toHaveProperty('activity')
  value.supervisor.run()
  value.supervisor.checkActivity('check')
  expect(value.transport.commands.at(-1)).toEqual({ type: 'activity-check', requestId: 'check' })
  value.transport.emit({ type: 'activity-result', requestId: 'check', feedback: feedback() })
  expect(results).toEqual([{ requestId: 'check', result: feedback() }])
  expect(value.supervisor.phase).toBe('running')
  expect(() => value.supervisor.checkActivity('again')).toThrow()
  value.supervisor.stop()
  value.transport.emit({ type: 'activity-result', requestId: 'check', feedback: feedback() })
  expect(results).toHaveLength(1)
})

test('activity correction after normal completion or a completion race returns to idle', async () => {
  for (const requestBeforeCompletion of [false, true]) {
    const results: unknown[] = []
    const value = await session(undefined, undefined, (_, result) => results.push(result))
    value.boot()
    value.supervisor.run()
    if (requestBeforeCompletion) value.supervisor.checkActivity('check')
    value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
    if (!requestBeforeCompletion) value.supervisor.checkActivity('check')
    expect(value.supervisor.phase).toBe('running')
    value.transport.emit({ type: 'activity-result', requestId: 'check', feedback: feedback() })
    expect(value.supervisor.phase).toBe('completed')
    expect(results).toHaveLength(1)
  }
})

test('activity results reject forged check identity, scope, order, server claims and duplicates', async () => {
  for (const forged of [
    { ...feedback(), results: [] },
    { version: 1, results: [{ ...feedback().results[0], checkId: 'other' }] },
    { version: 1, results: [{ ...feedback().results[0], kind: 'structure' }] },
    { version: 1, results: [{ ...feedback().results[0], verifiedBy: 'server' }] },
    { version: 1, results: [...feedback().results, ...feedback().results] },
  ]) {
    const results: unknown[] = []
    const value = await session(undefined, undefined, (_, result) => results.push(result))
    value.boot()
    value.supervisor.run()
    value.supervisor.checkActivity('check')
    value.transport.emit({ type: 'activity-result', requestId: 'check', feedback: forged })
    expect(value.supervisor.phase).toBe('failed')
    expect(results).toHaveLength(0)
    expect(value.transport.terminated).toBe(1)
  }
  const unsolicited = await session()
  unsolicited.boot()
  unsolicited.supervisor.run()
  expect(() => unsolicited.supervisor.checkActivity('check')).toThrow()
  unsolicited.transport.emit({ type: 'activity-result', requestId: 'check', feedback: feedback() })
  expect(unsolicited.supervisor.phase).toBe('failed')
})

test('revocation while idle activity grading completes suppresses its feedback', async () => {
  let revoke = false
  const results: unknown[] = []
  const value = await session(
    (event, stop) => {
      if (revoke && event.type === 'state' && event.state === 'completed') stop()
    },
    undefined,
    (_, result) => results.push(result),
  )
  value.boot()
  value.supervisor.run()
  value.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  value.supervisor.checkActivity('check')
  revoke = true
  value.transport.emit({ type: 'activity-result', requestId: 'check', feedback: feedback() })
  expect(value.supervisor.phase).toBe('stopped')
  expect(results).toHaveLength(0)
})

test('saved files count while the program runs and right after it ends, never before', async () => {
  const kept: string[] = []
  const saved = (path: string) => ({ type: 'saved-file', path, bytes: new Uint8Array([1]) })
  const early = await session(undefined, undefined, undefined, undefined, undefined, (path) =>
    kept.push(path),
  )
  early.boot()
  early.transport.emit(saved('antes.txt'))
  expect(early.supervisor.phase).toBe('failed')
  expect(kept).toEqual([])

  const live = await session(undefined, undefined, undefined, undefined, undefined, (path) =>
    kept.push(path),
  )
  live.boot()
  live.supervisor.run()
  live.transport.emit(saved('placar.txt'))
  live.transport.emit({ type: 'result', requestId: 'entrypoint', ok: true, text: '' })
  expect(live.supervisor.phase).toBe('completed')
  // The worker's last saves arrive a moment after the result.
  live.transport.emit(saved('recorde.txt'))
  expect(kept).toEqual(['placar.txt', 'recorde.txt'])
  expect(live.supervisor.phase).toBe('completed')
})

test('before a stop, the worker is asked for the saves still in its queue, for a moment only', async () => {
  const live = await session()
  live.boot()
  live.supervisor.run()
  const answered = live.supervisor.flushSaved(1000)
  expect(live.transport.commands.at(-1)).toEqual({ type: 'flush-saved' })
  live.transport.emit({ type: 'saved-flushed' })
  await answered
  // A worker busy in Python does not answer: the stop goes on after the deadline.
  const started = performance.now()
  await live.supervisor.flushSaved(30)
  expect(performance.now() - started).toBeGreaterThanOrEqual(25)
  live.supervisor.stop()
  await live.supervisor.flushSaved(1000)
  expect(live.transport.commands.filter((value) => value.type === 'flush-saved')).toHaveLength(2)
})
