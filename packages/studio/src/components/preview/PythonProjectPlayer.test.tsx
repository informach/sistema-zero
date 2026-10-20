import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { portableAudioAsset } from '../../../../../experiments/studio-python-runtime/audioFixtures'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import * as publicEnvironment from '../../runtime/publicEnvironment'
import { PYTHON_CONSOLE_LIMITS } from '../../runtime/python/protocol'
import { createStudioRuntimeRegistry } from '../../runtime/registry'
import type {
  StudioExecutionIdentity,
  StudioHostAudioPreference,
  StudioRuntimeEvent,
} from '../../runtime/types'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { PythonProjectPlayer } from './PythonProjectPlayer'

type EventPayload<T = StudioRuntimeEvent> = T extends StudioRuntimeEvent
  ? Omit<T, 'identity' | 'sequence'>
  : never

afterEach(() => {
  cleanup()
  mock.restore()
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

async function setup() {
  const f = await pythonEnvironmentFixture('pro')
  const listeners = new Set<(event: StudioRuntimeEvent) => void>()
  let identity: StudioExecutionIdentity | undefined
  let sequence = 0
  let hostAudio: StudioHostAudioPreference | undefined
  const runMutes: boolean[] = []
  let disposed = 0
  let inputs = 0
  let inputHandler = async () => {}
  let disposeHandler = async () => {}
  const emit = (payload: EventPayload) => {
    if (!identity) throw new Error('No prepared session')
    for (const listener of [...listeners]) listener({ ...payload, identity, sequence: ++sequence })
  }
  const environment: StudioRuntimeEnvironment = {
    ...f.environment,
    access: () => ({
      releaseStatus: 'active',
      grantedCapabilities: ['execute'],
      grantedExtensionIds: [],
      hostOperations: [{ capability: 'execute', state: 'available' }],
      curation: { pythonLevel: 3 },
    }),
    registry: createStudioRuntimeRegistry([
      {
        id: 'inert-public-test',
        profileId: f.project.runtime.profileId,
        programmingLanguage: 'python',
        kinds: ['pro'],
        async load() {
          return {
            id: 'inert-public-test',
            async prepare(input) {
              hostAudio = input.hostAudio
              identity = input.identity
              return {
                identity,
                playback: { kind: 'stop-only' },
                repl: { kind: 'unavailable' },
                async run() {
                  runMutes.push(hostAudio?.getMuted() ?? false)
                  emit({ type: 'state', state: 'running' })
                },
                subscribe(listener) {
                  listeners.add(listener)
                  return () => {
                    listeners.delete(listener)
                  }
                },
                async stop() {},
                async dispose() {
                  disposed++
                  await disposeHandler()
                },
                async provideInput() {
                  inputs++
                  await inputHandler()
                },
              }
            },
          }
        },
      },
    ]),
  }
  const published = {
    programmingLanguage: 'python' as const,
    playId: crypto.randomUUID(),
    revision: 'a'.repeat(64),
  }
  const request = async () => {
    throw new Error('Unit surface supplies inert environment, not a browser runtime')
  }
  return {
    ...f,
    environment,
    published,
    request,
    emit,
    hostAudio: () => hostAudio,
    runMutes,
    disposed: () => disposed,
    inputs: () => inputs,
    inputHandler: (handler: typeof inputHandler) => {
      inputHandler = handler
    },
    disposeHandler: (handler: typeof disposeHandler) => {
      disposeHandler = handler
    },
  }
}

test('public Python host prop controls pending/new session audio without replacing its game frame', async () => {
  const f = await setup()
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const content = (muted: boolean) => (
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      muted={muted}
    />
  )
  const view = render(content(true))
  await waitFor(() => expect(f.runMutes).toEqual([true]))
  const frame = view.container.querySelector('iframe'),
    preference = f.hostAudio()
  if (!preference) throw new Error('Preference not forwarded')
  const values: boolean[] = []
  preference.subscribe(() => {
    values.push(preference.getMuted())
  })
  view.rerender(content(false))
  expect(values).toEqual([false])
  expect(view.container.querySelector('iframe')).toBe(frame)
  expect(f.runMutes).toHaveLength(1)
})

test('Python public surface exposes the actual game iframe ref, ready event and tears it down on failure', async () => {
  const f = await setup()
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const ref = { current: null as HTMLIFrameElement | null }
  let ready = 0,
    errors = 0
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      ref={ref}
      onReady={() => {
        ready++
      }}
      onError={() => {
        errors++
      }}
    />,
  )
  await waitFor(() => expect(ready).toBe(1))
  expect(ref.current).toBe(view.container.querySelector('iframe'))
  expect(ref.current?.title).toBe(f.project.name)
  await act(async () => {
    f.emit({ type: 'failed', code: 'program-error', message: 'Teste interrompido' })
  })
  expect(screen.getByRole('alert').textContent).toContain('Teste interrompido')
  await waitFor(() => expect(view.container.querySelector('iframe') === null).toBe(true))
  expect(ref.current).toBeNull()
  expect(errors).toBe(1)
})

test('published Python with audio waits for an explicit Jogar without opening an execution', async () => {
  const f = await setup()
  f.project.assets = [portableAudioAsset()]
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  let ready = 0
  const rendered = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      onReady={() => {
        ready++
      }}
    />,
  )
  const play = await screen.findByRole('button', { name: /^Jogar$/ })
  expect(rendered.container.querySelector('iframe')).toBeNull()
  expect(ready).toBe(0)
  fireEvent.click(play)
  await waitFor(() => expect(ready).toBe(1))
  expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /^Jogar$/ })).toBeNull()
})

test('print-only output survives completion and renders text as text, without authoring tools', async () => {
  const f = await setup()
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const before = structuredClone(f.project)
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
    />,
  )
  await waitFor(() => expect(view.container.querySelector('iframe') !== null).toBe(true))
  await act(async () => {
    f.emit({
      type: 'console',
      stream: 'stdout',
      text: 'Oi\n<script>bad()</script>',
      omittedChars: 0,
      omittedLines: 0,
    })
    f.emit({
      type: 'console',
      stream: 'stderr',
      text: '\naviso\n',
      omittedChars: 0,
      omittedLines: 0,
    })
    f.emit({ type: 'state', state: 'completed' })
  })
  expect(screen.getByRole('log', { name: 'Saída do jogo' }).textContent).toBe(
    'Oi\n<script>bad()</script>\naviso\n',
  )
  expect(view.container.querySelector('script') === null).toBe(true)
  expect(view.container.querySelector('form') === null).toBe(true)
  expect(view.container.querySelector('.monaco-editor') === null).toBe(true)
  expect(f.project).toEqual(before)
})

test('a textual game shows instructions, accepts an answer and preserves its final result', async () => {
  const f = await setup()
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
    />,
  )
  await waitFor(() => expect(view.container.querySelector('iframe') !== null).toBe(true))
  await act(async () => {
    f.emit({
      type: 'console',
      stream: 'stdout',
      text: 'Pensei num número.\n',
      omittedChars: 0,
      omittedLines: 0,
    })
    f.emit({ type: 'input-request', requestId: 'guess', prompt: 'Seu palpite' })
  })
  expect(screen.getByRole('log').textContent).toBe('Pensei num número.\n')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '42' } })
  fireEvent.submit(view.container.querySelector('form')!)
  await waitFor(() => expect(f.inputs()).toBe(1))
  await act(async () => {
    f.emit({
      type: 'console',
      stream: 'stdout',
      text: 'Você ganhou!\n',
      omittedChars: 0,
      omittedLines: 0,
    })
    f.emit({ type: 'state', state: 'completed' })
  })
  expect(screen.getByRole('log').textContent).toBe('Pensei num número.\nVocê ganhou!\n')
  expect(view.container.querySelector('form') === null).toBe(true)
})

test('output is bounded, reports upstream and local omissions, and a new revision clears old output', async () => {
  const f = await setup()
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
    />,
  )
  await waitFor(() => expect(view.container.querySelector('iframe') !== null).toBe(true))
  await act(async () => {
    f.emit({
      type: 'console',
      stream: 'stdout',
      text: 'x'.repeat(PYTHON_CONSOLE_LIMITS.retainedChars * 2),
      omittedChars: 17,
      omittedLines: 2,
    })
    f.emit({ type: 'state', state: 'completed' })
  })
  const kept = screen.getByRole('log').textContent!.length
  expect(kept).toBeLessThanOrEqual(PYTHON_CONSOLE_LIMITS.retainedChars)
  expect(screen.getByText(/mensagens antigas foram omitidas/).textContent).toContain(
    String(PYTHON_CONSOLE_LIMITS.retainedChars * 2 - kept + 17),
  )
  const oldFrame = view.container.querySelector('iframe')
  view.rerender(
    <PythonProjectPlayer
      project={f.project}
      published={{ ...f.published, revision: 'b'.repeat(64) }}
      pythonRuntimeRequest={f.request}
    />,
  )
  await waitFor(() => expect(screen.queryByRole('log') === null).toBe(true))
  await waitFor(() =>
    expect(
      view.container.querySelector('iframe') !== null &&
        view.container.querySelector('iframe') !== oldFrame,
    ).toBe(true),
  )
  await act(async () => {
    f.emit({
      type: 'console',
      stream: 'stdout',
      text: 'Nova partida',
      omittedChars: 0,
      omittedLines: 0,
    })
    f.emit({ type: 'state', state: 'completed' })
  })
  expect(screen.getByRole('log').textContent).toBe('Nova partida')
})

test('late environment preparation cannot mount or report ready after switching publication', async () => {
  const f = await setup()
  const pending = deferred<StudioRuntimeEnvironment>()
  const factory = spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment')
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValue(f.environment)
  let ready = 0
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      onReady={() => {
        ready++
      }}
    />,
  )
  await waitFor(() => expect(factory).toHaveBeenCalledTimes(1))
  view.rerender(
    <PythonProjectPlayer
      project={f.project}
      published={{ ...f.published, revision: 'b'.repeat(64) }}
      pythonRuntimeRequest={f.request}
      onReady={() => {
        ready++
      }}
    />,
  )
  await waitFor(() => expect(ready).toBe(1))
  const frame = view.container.querySelector('iframe')
  await act(async () => {
    pending.resolve(f.environment)
    await pending.promise
  })
  expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
  expect(view.container.querySelector('iframe')).toBe(frame)
  expect(ready).toBe(1)
})

test('delayed disposal of the old generation never clears the new game iframe ref', async () => {
  const f = await setup()
  const cleanupGate = deferred<void>()
  f.disposeHandler(() => cleanupGate.promise)
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  const ref = { current: null as HTMLIFrameElement | null }
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      ref={ref}
    />,
  )
  await waitFor(() => expect(ref.current).not.toBeNull())
  const oldFrame = ref.current
  view.rerender(
    <PythonProjectPlayer
      project={f.project}
      published={{ ...f.published, revision: 'b'.repeat(64) }}
      pythonRuntimeRequest={f.request}
      ref={ref}
    />,
  )
  await waitFor(() => expect(ref.current).not.toBeNull())
  expect(ref.current).not.toBe(oldFrame)
  const currentFrame = ref.current
  await act(async () => {
    cleanupGate.resolve()
    await cleanupGate.promise
  })
  expect(ref.current).toBe(currentFrame)
  expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
})

test('input submission is single-flight and late rejection after unmount does not notify the next page', async () => {
  const f = await setup()
  const response = deferred<void>()
  f.inputHandler(() => response.promise)
  spyOn(publicEnvironment, 'createPublicPythonRuntimeEnvironment').mockResolvedValue(f.environment)
  let errors = 0
  const view = render(
    <PythonProjectPlayer
      project={f.project}
      published={f.published}
      pythonRuntimeRequest={f.request}
      onError={() => {
        errors++
      }}
    />,
  )
  await waitFor(() => expect(view.container.querySelector('iframe')).not.toBeNull())
  await act(async () => {
    f.emit({ type: 'input-request', requestId: 'question-1', prompt: 'Seu nome' })
  })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ana' } })
  const form = view.container.querySelector('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => expect(f.inputs()).toBe(1))
  view.unmount()
  await act(async () => {
    response.reject(new Error('Old input failed'))
    await response.promise.catch(() => {})
  })
  expect(errors).toBe(0)
})
