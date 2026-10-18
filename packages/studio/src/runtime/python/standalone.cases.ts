import { afterAll, expect, mock, test } from 'bun:test'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import type { StudioExecutionIdentity, StudioRuntimeEvent, StudioRuntimeSession } from '../types'
import { preparePythonExecutionSnapshot } from './snapshot'

// This fixture runs in its own module realm; mock.module must never replace real runtime tests.
const snapshot = await preparePythonExecutionSnapshot({
  ...documentFixture('python', 'classic'),
  assets: [],
})
const originalURL = location.href
if (!('happyDOM' in window) || !window.happyDOM || typeof window.happyDOM !== 'object')
  throw new Error('Happy DOM is required by this isolated fixture')
const dom = window.happyDOM
if (
  !('setURL' in dom) ||
  typeof dom.setURL !== 'function' ||
  !('settings' in dom) ||
  !dom.settings ||
  typeof dom.settings !== 'object'
)
  throw new Error('Happy DOM lifecycle API is missing')
const settings = dom.settings
if (
  !('disableIframePageLoading' in settings) ||
  typeof settings.disableIframePageLoading !== 'boolean'
)
  throw new Error('Happy DOM iframe settings are missing')
const setURL = dom.setURL.bind(dom)
const originalIframeLoading = settings.disableIframePageLoading
settings.disableIframePageLoading = false
afterAll(() => {
  window.dispatchEvent(new Event('pagehide'))
  settings.disableIframePageLoading = originalIframeLoading
  setURL(originalURL)
})
const sessions: {
  session: StudioRuntimeSession
  disposed: number
  emit(event: StudioRuntimeEvent): void
  signal: AbortSignal
}[] = []
let prepareGate: Promise<void> | undefined
let loaderGate: Promise<void> | undefined
let failNextRun = false
mock.module('./webPayload', () => ({
  loadPythonWebPayload: async () => {
    const gate = loaderGate
    loaderGate = undefined
    await gate
    return { name: 'Meu jogo', snapshot }
  },
}))
mock.module('./session', () => ({
  preparePythonFrameSession: async (
    options: Parameters<typeof import('./session').preparePythonFrameSession>[0],
  ) => {
    const gate = prepareGate
    prepareGate = undefined
    const listeners = new Set<(event: StudioRuntimeEvent) => void>()
    const owned = {
      disposed: 0,
      signal: options.signal,
      emit(event: StudioRuntimeEvent) {
        for (const listener of listeners) listener(event)
      },
      session: {
        identity: options.identity,
        playback: { kind: 'stop-only' as const },
        repl: { kind: 'unavailable' as const },
        subscribe(listener: (event: StudioRuntimeEvent) => void) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        async run() {
          if (failNextRun) {
            failNextRun = false
            throw new Error('Controlled first-run failure')
          }
          owned.emit({ identity: options.identity, sequence: 1, type: 'state', state: 'running' })
        },
        async stop() {},
        async dispose() {
          owned.disposed++
        },
        async provideInput() {},
      },
    }
    sessions.push(owned)
    await gate // Deliberately uncooperative adapter: old resolution must still be fenced by the player.
    return owned.session
  },
}))
const settle = () => Bun.sleep(0)
const transition = (name: string, persisted = true) =>
  window.dispatchEvent(Object.assign(new Event(name), { persisted }))
function button() {
  const element = document.querySelector('#start')
  if (!(element instanceof HTMLButtonElement)) throw new Error('button')
  return element
}
function gate() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function resetPlayerDOM() {
  transition('pagehide')
  setURL('https://static.test/game/index.html')
  document.body.innerHTML =
    '<main id="stage"></main><h1 id="title"></h1><p id="status"></p><pre id="output"></pre><button id="start" disabled>Run</button><button id="stop" disabled>Stop</button><button id="capture" disabled>Capture</button><form id="input-form" hidden><label id="input-label"></label><input id="input"></form>'
  return button()
}

test('back/forward restore disposes the old frame and enables fresh independent restarts', async () => {
  setURL('https://static.test/game/index.html')
  document.body.innerHTML =
    '<main id="stage"></main><h1 id="title"></h1><p id="status"></p><pre id="output"></pre><button id="start" disabled>Run</button><button id="stop" disabled>Stop</button><button id="capture" disabled>Capture</button><form id="input-form" hidden><label id="input-label"></label><input id="input"></form>'
  const { startStandalonePythonPlayer } = await import('./standalonePlayer')
  const observedSessions: StudioRuntimeSession[] = []
  const observedEvents: StudioRuntimeEvent[] = []
  const disposed: (StudioExecutionIdentity | undefined)[] = []
  const observer = {
    session: (session: StudioRuntimeSession) => {
      observedSessions.push(session)
    },
    event: (event: StudioRuntimeEvent) => {
      observedEvents.push(event)
    },
    disposed: (identity: StudioExecutionIdentity | undefined) => {
      disposed.push(identity)
    },
  }
  startStandalonePythonPlayer(
    `https://runtime.test/v1/runtimes/${snapshot.configuration.runtime.manifestSha256}/standalone.mjs`,
    observer,
  )
  observer.event = () => {
    throw new Error('A mutable observer replaced the captured callback')
  }
  await settle()
  expect(sessions).toHaveLength(1)
  transition('pageshow', false)
  await settle()
  expect(sessions).toHaveLength(1)
  transition('pagehide')
  expect(sessions[0]!.signal.aborted).toBe(true)
  expect(document.querySelectorAll('iframe')).toHaveLength(0)
  transition('pageshow')
  expect(button().disabled).toBe(true)
  await settle()
  expect(sessions).toHaveLength(2)
  expect(sessions[0]!.disposed).toBe(1)
  button().click()
  await settle()
  expect(sessions).toHaveLength(3)
  expect(sessions[1]!.disposed).toBe(1)
  expect(document.querySelectorAll('iframe')).toHaveLength(1)
  sessions[1]!.emit({
    identity: sessions[1]!.session.identity,
    sequence: 2,
    type: 'failed',
    code: 'runtime-unavailable',
    message: 'old failure',
  })
  expect(document.querySelector('#status')?.textContent).toBe('Executando')
  expect(observedSessions).toHaveLength(3)
  expect(disposed.filter(Boolean)).toHaveLength(2)
  expect(observedEvents.every((event) => event.type !== 'failed')).toBe(true)
  expect(
    observedEvents.some(
      (event) => event.identity.runId === observedSessions.at(-1)?.identity.runId,
    ),
  ).toBe(true)
})

test('late preparation after BFCache cannot replace or stop the restored execution', async () => {
  const delayed = gate()
  prepareGate = delayed.promise
  button().click()
  await settle()
  const old = sessions.at(-1)!
  transition('pagehide')
  transition('pageshow')
  await settle()
  const current = sessions.at(-1)!
  expect(current).not.toBe(old)
  delayed.release()
  await settle()
  expect(old.disposed).toBe(1)
  expect(current.disposed).toBe(0)
  expect(document.querySelectorAll('iframe')).toHaveLength(1)
  expect(document.querySelector('#status')?.textContent).toBe('Executando')
})

test('a payload finishing after a second restoration cannot start an extra generation', async () => {
  const delayed = gate()
  loaderGate = delayed.promise
  transition('pagehide')
  transition('pageshow')
  await settle()
  const before = sessions.length
  transition('pagehide')
  transition('pageshow')
  await settle()
  expect(sessions).toHaveLength(before + 1)
  delayed.release()
  await settle()
  expect(sessions).toHaveLength(before + 1)
  expect(document.querySelector('#status')?.textContent).toBe('Executando')
  expect(document.querySelectorAll('iframe')).toHaveLength(1)
})

// These independent observer bootstraps run after the single-entry BFCache scenarios.
test('a disposed observer can restart without an obsolete run appending an orphan frame', async () => {
  const start = resetPlayerDOM()
  const before = sessions.length
  let nested = false
  const { startStandalonePythonPlayer } = await import('./standalonePlayer')
  startStandalonePythonPlayer(
    new URL(
      'standalone.mjs',
      `https://runtime.test/v1/runtimes/${snapshot.configuration.runtime.manifestSha256}/`,
    ).href,
    {
      disposed() {
        if (!nested) {
          nested = true
          start.click()
        }
      },
    },
  )
  await settle()
  expect(sessions).toHaveLength(before + 1)
  start.click()
  await settle()
  expect(sessions).toHaveLength(before + 2)
  expect(document.querySelectorAll('iframe')).toHaveLength(1)
  expect(sessions.filter((owned) => owned.disposed === 0)).toHaveLength(1)
  expect(document.querySelector('#status')?.textContent).toBe('Executando')
})

test('a failed observer can restart without the obsolete catch stopping the new generation', async () => {
  const start = resetPlayerDOM()
  const before = sessions.length
  let restarted = false
  failNextRun = true
  const { startStandalonePythonPlayer } = await import('./standalonePlayer')
  startStandalonePythonPlayer(
    new URL(
      'standalone.mjs',
      `https://runtime.test/v1/runtimes/${snapshot.configuration.runtime.manifestSha256}/`,
    ).href,
    {
      failed() {
        if (!restarted) {
          restarted = true
          start.click()
        }
      },
    },
  )
  await settle()
  expect(sessions).toHaveLength(before + 2)
  expect(document.querySelectorAll('iframe')).toHaveLength(1)
  expect(sessions.at(-1)?.disposed).toBe(0)
  expect(document.querySelector('#status')?.textContent).toBe('Executando')
})
