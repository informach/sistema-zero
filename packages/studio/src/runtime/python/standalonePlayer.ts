import type {
  StudioExecutionIdentity,
  StudioHostAudioPreference,
  StudioRuntimeEvent,
  StudioRuntimeSession,
} from '../types'
import { createPythonConsoleBuffer } from './consoleBuffer'
import { preparePythonFrameSession } from './session'
import { standalonePythonFrameURL } from './standaloneRuntime'
import { loadPythonWebPayload } from './webPayload'

/** Exported games have no account, editor, catalog mutation or service dependency. */
function requireElement<Value extends Element>(selector: string, type: new () => Value): Value {
  const element = document.querySelector(selector)
  if (!(element instanceof type)) throw new Error('O player Python está incompleto.')
  return element
}

/** Trusted runtime consumers observe the same player; callbacks never come from a project payload. */
export interface StandalonePythonPlayerObserver {
  mission?: true
  session?(session: StudioRuntimeSession): void
  event?(event: StudioRuntimeEvent): void
  disposed?(identity: StudioExecutionIdentity | undefined): void
  failed?(error: unknown): void
}

interface StandalonePythonHost {
  hostAudio?(signal: AbortSignal): Promise<StudioHostAudioPreference>
}

async function mount(
  moduleURL: string,
  observer: Readonly<StandalonePythonPlayerObserver>,
  host: Readonly<StandalonePythonHost>,
) {
  const observe = (callback: () => void) => {
    try {
      callback()
    } catch (error) {
      // Observer failures remain visible to the validator/browser without preventing cleanup.
      reportError(error)
    }
  }
  const stage = requireElement('#stage', HTMLElement)
  const title = requireElement('#title', HTMLElement)
  const status = requireElement('#status', HTMLElement)
  const output = requireElement('#output', HTMLElement)
  const start = requireElement('#start', HTMLButtonElement)
  const stop = requireElement('#stop', HTMLButtonElement)
  const capture = requireElement('#capture', HTMLButtonElement)
  const inputForm = requireElement('#input-form', HTMLFormElement)
  const inputLabel = requireElement('#input-label', HTMLLabelElement)
  const input = requireElement('#input', HTMLInputElement)
  const lifetime = new AbortController()
  start.disabled = stop.disabled = capture.disabled = true
  inputForm.hidden = true
  status.textContent = 'Abrindo…'
  const directory = new URL('./', location.href)
  let generation = 0
  let active:
    | { controller: AbortController; session?: StudioRuntimeSession; frame: HTMLIFrameElement }
    | undefined
  let inputRequest: string | undefined
  let scheduled = 0
  const consoleBuffer = createPythonConsoleBuffer()
  const clearInput = () => {
    inputRequest = undefined
    input.value = ''
    inputForm.hidden = true
  }
  function append(stream: 'stdout' | 'stderr', text: string, omittedLines = 0, omittedChars = 0) {
    consoleBuffer.appendBatch({ stream, text, omittedLines, omittedChars })
    if (!scheduled)
      scheduled = requestAnimationFrame(() => {
        scheduled = 0
        output.textContent = consoleBuffer
          .snapshot()
          .map((batch) => `${batch.omittedChars ? '[Saída anterior omitida]\n' : ''}${batch.text}`)
          .join('')
        output.scrollTop = output.scrollHeight
      })
  }
  function dispose() {
    const previous = active
    active = undefined
    ++generation
    clearInput()
    capture.disabled = stop.disabled = true
    if (previous) {
      previous.controller.abort()
      void previous.session?.dispose().catch(() => {})
      previous.frame.remove()
      observe(() => observer.disposed?.(previous.session?.identity))
    }
  }
  window.addEventListener(
    'pagehide',
    () => {
      lifetime.abort()
      dispose()
      if (scheduled) cancelAnimationFrame(scheduled)
    },
    { once: true },
  )
  start.addEventListener(
    'click',
    () => {
      void run()
    },
    { signal: lifetime.signal },
  )
  stop.addEventListener(
    'click',
    () => {
      const expected = generation + 1
      dispose()
      if (!active && generation === expected) status.textContent = 'Parado'
    },
    { signal: lifetime.signal },
  )
  inputForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault()
      const current = active,
        request = inputRequest
      if (!current?.session || !request) return
      const text = input.value
      clearInput()
      void current.session.provideInput(request, { kind: 'line', text }).catch((error: unknown) => {
        if (active === current)
          append('stderr', `${error instanceof Error ? error.message : String(error)}\n`)
      })
    },
    { signal: lifetime.signal },
  )
  capture.addEventListener(
    'click',
    () => {
      const current = active
      if (!current?.session?.captureSnapshot) return
      capture.disabled = true
      void current.session
        .captureSnapshot()
        .then((snapshot) => {
          if (snapshot && active === current) {
            const link = document.createElement('a')
            link.href = snapshot.dataUrl
            link.download = 'jogo.png'
            link.click()
          }
        })
        .catch((error: unknown) => {
          if (active === current)
            append('stderr', `${error instanceof Error ? error.message : String(error)}\n`)
        })
        .finally(() => {
          if (active === current) capture.disabled = false
        })
    },
    { signal: lifetime.signal },
  )

  // Verified once; every restart gets a fresh worker, frame, challenge and identity.
  const hostAudio = await host.hostAudio?.(lifetime.signal)
  lifetime.signal.throwIfAborted()
  const payload = await loadPythonWebPayload(directory, lifetime.signal)
  lifetime.signal.throwIfAborted()
  title.textContent = document.title = payload.name
  const snapshot = payload.snapshot
  const frameURL = standalonePythonFrameURL(
    moduleURL,
    snapshot.configuration.runtime.manifestSha256,
  )
  async function run() {
    if (lifetime.signal.aborted) return
    start.textContent = 'Reiniciar'
    const token = generation + 1
    dispose()
    if (lifetime.signal.aborted || generation !== token) return
    const frame = document.createElement('iframe')
    frame.title = 'Jogo Python'
    stage.append(frame)
    const current: {
      controller: AbortController
      frame: HTMLIFrameElement
      session?: StudioRuntimeSession
    } = {
      controller: new AbortController(),
      frame,
    }
    active = current
    stop.disabled = false
    status.textContent = 'Preparando…'
    consoleBuffer.drain()
    output.textContent = ''
    try {
      const session = await preparePythonFrameSession({
        ...(observer?.mission ? { mission: true } : {}),
        frame,
        frameURL,
        snapshot,
        hostAudio,
        signal: AbortSignal.any([lifetime.signal, current.controller.signal]),
        identity: {
          projectId: snapshot.projectId,
          revision: snapshot.revision,
          runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
          instanceId: crypto.randomUUID(),
          runId: crypto.randomUUID(),
          writerEpoch: null,
        },
      })
      if (active !== current || generation !== token) {
        await session.dispose()
        return
      }
      current.session = session
      session.subscribe((event) => {
        if (active !== current || generation !== token) return
        observe(() => observer.event?.(event))
        if (active !== current || generation !== token) return
        if (event.type === 'console')
          append(event.stream, event.text, event.omittedLines, event.omittedChars)
        else if (event.type === 'state') {
          status.textContent = {
            ready: 'Pronto',
            running: 'Executando',
            'waiting-input': 'Esperando resposta',
            completed: 'Concluído',
            stopped: 'Parado',
            paused: 'Pausado',
          }[event.state]
          if (event.state !== 'waiting-input') clearInput()
        } else if (event.type === 'input-request') {
          inputRequest = event.requestId
          inputLabel.textContent = event.prompt || 'Sua resposta'
          inputForm.hidden = false
          input.focus()
        } else if (event.type === 'failed') {
          append('stderr', `${event.message}\n`)
          dispose()
          if (!active && generation === token + 1) status.textContent = 'Não foi possível executar'
        } else if (event.type === 'diagnostic')
          append('stderr', `${event.path}:${event.line} ${event.message}\n${event.traceback}\n`)
      })
      observe(() => observer.session?.(session))
      if (active !== current || generation !== token) {
        await session.dispose()
        return
      }
      capture.disabled = false
      await session.run()
    } catch (error) {
      if (active !== current || generation !== token) return
      observe(() => observer.failed?.(error))
      if (active !== current || generation !== token) return
      append('stderr', `${error instanceof Error ? error.message : String(error)}\n`)
      dispose()
      if (!active && generation === token + 1) status.textContent = 'Não foi possível executar'
    }
  }
  start.disabled = false
  if (
    snapshot.files.some((file) => file.kind === 'asset' && file.path.toLowerCase().endsWith('.wav'))
  ) {
    start.textContent = 'Jogar'
    status.textContent = 'Clique em Jogar para começar com som'
  } else await run()
}

/** Bootstrap uses the trusted module URL; payloads contain no runtime/source URLs. */
export function startStandalonePythonPlayer(
  moduleURL: string,
  rawObserver: StandalonePythonPlayerObserver = {},
  rawHost: StandalonePythonHost = {},
) {
  const observer = Object.freeze({ ...rawObserver })
  const host = Object.freeze({ ...rawHost })
  let mountGeneration = 0
  function startMount() {
    const generation = ++mountGeneration
    void mount(moduleURL, observer, host).catch((error: unknown) => {
      if (generation !== mountGeneration) return
      try {
        observer.failed?.(error)
      } catch (observerError) {
        reportError(observerError)
      }
      if (generation !== mountGeneration) return
      const status = document.querySelector('#status')
      if (status)
        status.textContent =
          error instanceof Error ? error.message : 'Não foi possível abrir o pacote Python.'
    })
  }
  // BFCache restores the old DOM, but cannot resurrect a stopped worker.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) startMount()
  })
  startMount()
}
