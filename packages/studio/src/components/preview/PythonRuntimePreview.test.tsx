import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { portableAudioAsset } from '../../../../../experiments/studio-python-runtime/audioFixtures'
import { createPythonConsoleBuffer } from '../../runtime/python/consoleBuffer'
import { createStudioRuntimeRegistry } from '../../runtime/registry'
import type {
  StudioHostAudioPreference,
  StudioRuntimeEvent,
  StudioRuntimeInput,
  StudioRuntimeSession,
} from '../../runtime/types'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { StudioExecutionProvider } from '../../studio/observation'
import { StudioRuntimeEnvironmentProvider } from '../../studio/runtime-environment'
import { PythonEditorPreview } from './PythonEditorPreview'
import { PythonRuntimePreview } from './PythonRuntimePreview'

afterEach(cleanup)

async function fixture(kind: 'classic' | 'pro' = 'classic') {
  const { project, environment } = await pythonEnvironmentFixture(kind)
  const audioPreferences: StudioHostAudioPreference[] = []
  const runMutes: boolean[] = []
  const sessions: {
    session: StudioRuntimeSession
    emit(event: StudioRuntimeEvent): void
    disposed: boolean
  }[] = []
  const inputs: StudioRuntimeInput[] = []
  let runs = 0
  environment.access = () => ({
    releaseStatus: 'active',
    hostOperations: [{ capability: 'execute', state: 'available' }],
    grantedCapabilities: ['execute'],
    grantedExtensionIds: [],
    curation: null,
  })
  environment.registry = createStudioRuntimeRegistry([
    {
      id: 'preview-fixture',
      profileId: project.runtime.profileId,
      programmingLanguage: 'python',
      kinds: ['classic', 'pro'],
      load: async () => ({
        id: 'preview-fixture',
        prepare: async ({ identity, hostAudio }) => {
          if (hostAudio) audioPreferences.push(hostAudio)
          const callbacks = new Set<(event: StudioRuntimeEvent) => void>()
          const entry = {
            disposed: false,
            emit(event: StudioRuntimeEvent) {
              for (const callback of callbacks) callback(event)
            },
            session: null as StudioRuntimeSession | null,
          }
          const session: StudioRuntimeSession = {
            identity,
            playback: { kind: 'stop-only' },
            repl: { kind: 'unavailable' },
            run: async () => {
              runMutes.push(hostAudio?.getMuted() ?? false)
              runs++
              entry.emit({ type: 'state', state: 'running', identity, sequence: 1 })
            },
            stop: async () => {},
            dispose: async () => {
              entry.disposed = true
              callbacks.clear()
            },
            subscribe: (listener) => {
              callbacks.add(listener)
              return () => {
                callbacks.delete(listener)
              }
            },
            provideInput: async (_request, response) => {
              inputs.push(response)
              entry.emit({ type: 'state', state: 'running', identity, sequence: 3 })
            },
          }
          entry.session = session
          sessions.push({
            get disposed() {
              return entry.disposed
            },
            session,
            emit: entry.emit,
          })
          return session
        },
      }),
    },
  ])
  return { project, environment, sessions, inputs, audioPreferences, runMutes, runs: () => runs }
}

test.each([
  'classic',
  'pro',
] as const)('%s Python preview applies current host mute without remount/run', async (kind) => {
  const f = await fixture(kind)
  const content = (muted: boolean) => (
    <PythonRuntimePreview
      project={f.project}
      environment={f.environment}
      canExecute
      muted={muted}
    />
  )
  const view = render(content(true))
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByText('Executando')
  expect(f.runMutes).toEqual([true])
  const frame = view.container.querySelector('iframe'),
    preference = f.audioPreferences[0]
  if (!preference) throw new Error('Preference missing')
  const changes: boolean[] = []
  preference.subscribe(() => {
    changes.push(preference.getMuted())
  })
  view.rerender(content(false))
  expect(changes).toEqual([false])
  expect(view.container.querySelector('iframe')).toBe(frame)
  expect(f.runs()).toBe(1)
})

test.each([
  'classic',
  'pro',
] as const)('%s editor uses the existing execution.muted preference', async (kind) => {
  const f = await fixture(kind),
    stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject(f.project)
  const content = (muted: boolean) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={f.environment}>
        <StudioExecutionProvider
          value={{ editingAccess: 'author', autoRun: true, requireIsolatedPreview: false, muted }}
        >
          <PythonEditorPreview />
        </StudioExecutionProvider>
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(content(true))
  await screen.findByText('Executando')
  expect(f.runMutes).toEqual([true])
  const preference = f.audioPreferences[0]
  if (!preference) throw new Error('Preference missing')
  view.rerender(content(false))
  expect(preference.getMuted()).toBe(false)
  expect(f.runs()).toBe(1)
})

test('the real controls run, answer input, distinguish edited source and restart in StrictMode', async () => {
  const f = await fixture()
  if (f.project.kind !== 'classic') throw new Error('Fixture')
  const content = (project = f.project) => (
    <StrictMode>
      <PythonRuntimePreview project={project} environment={f.environment} canExecute />
    </StrictMode>
  )
  const rendered = render(content())
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByText('Executando')
  expect(f.runs()).toBe(1)
  expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1)
  const first = f.sessions[0]!
  act(() =>
    first.emit({
      type: 'input-request',
      requestId: 'name',
      prompt: 'Seu nome?',
      identity: first.session.identity,
      sequence: 2,
    }),
  )
  fireEvent.change(await screen.findByLabelText('Seu nome?'), { target: { value: 'Ana' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(f.inputs).toEqual([{ kind: 'line', text: 'Ana' }]))
  rendered.rerender(content({ ...f.project, name: 'Novo título' }))
  expect(screen.queryByText(/Seu código mudou/)).toBeNull()
  rendered.rerender(
    content({ ...f.project, files: { ...f.project.files, 'main.py': 'print(2)\n' } }),
  )
  await screen.findByText(/Seu código mudou/)
  expect(f.runs()).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
  await waitFor(() => expect(f.runs()).toBe(2))
  expect(first.disposed).toBe(true)
  expect(f.sessions[1]!.session.identity.revision).not.toBe(first.session.identity.revision)
  expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Parar' }))
  await screen.findByText('Parado')
  await waitFor(() => expect(rendered.container.querySelectorAll('iframe')).toHaveLength(0))
})

test('audio projects keep autoRun idle until the child clicks Executar', async () => {
  const f = await fixture()
  f.project.assets = [portableAudioAsset()]
  const rendered = render(
    <PythonRuntimePreview project={f.project} environment={f.environment} canExecute autoRun />,
  )
  await act(async () => {})
  expect(screen.getByRole('button', { name: 'Executar' }).hasAttribute('disabled')).toBe(false)
  expect(screen.queryByText('Executando')).toBeNull()
  expect(f.runs()).toBe(0)
  expect(rendered.container.querySelector('iframe')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByText('Executando')
  expect(f.runs()).toBe(1)
})

test('a new writer or observer revokes the mounted execution without an automatic restart', async () => {
  const f = await fixture()
  const content = (epoch: number, allowed = true) => (
    <PythonRuntimePreview
      project={f.project}
      environment={f.environment}
      canExecute={allowed}
      writerEpoch={epoch}
    />
  )
  const rendered = render(content(1))
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByText('Executando')
  rendered.rerender(content(2))
  await screen.findByText('Parado')
  expect(f.runs()).toBe(1)
  expect(f.sessions[0]!.disposed).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await waitFor(() => expect(f.runs()).toBe(2))
  rendered.rerender(content(2, false))
  await screen.findByText('Parado')
  expect(screen.getByRole('button', { name: 'Executar' }).hasAttribute('disabled')).toBe(true)
  await waitFor(() => expect(rendered.container.querySelectorAll('iframe')).toHaveLength(0))
})

test('Run captures synchronous editor flushes and never falls back to a closed project', async () => {
  const f = await fixture()
  let current: typeof f.project | null = f.project
  const rendered = render(
    <PythonRuntimePreview
      project={f.project}
      environment={f.environment}
      canExecute
      currentProject={() => current}
      beforeRun={() => {
        current = null
      }}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByRole('alert')
  expect(f.runs()).toBe(0)
  expect(rendered.container.querySelectorAll('iframe')).toHaveLength(0)
})

test('a rejected input from an old run cannot show an error over the restarted game', async () => {
  const f = await fixture()
  render(<PythonRuntimePreview project={f.project} environment={f.environment} canExecute />)
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
  await screen.findByText('Executando')
  const first = f.sessions[0]!
  let reject!: (error: Error) => void
  let calls = 0
  const pending = new Promise<void>((_resolve, no) => {
    reject = no
  })
  first.session.provideInput = () => {
    calls++
    return pending
  }
  act(() =>
    first.emit({
      type: 'input-request',
      requestId: 'late',
      prompt: 'Resposta',
      identity: first.session.identity,
      sequence: 2,
    }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(calls).toBe(1))
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
  await waitFor(() => expect(f.runs()).toBe(2))
  await act(async () => {
    reject(new Error('old input failure'))
    await pending.catch(() => {})
  })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByText('Executando')).toBeTruthy()
})

test('the editor exposes console omission while preserving the retained output', async () => {
  const f = await fixture()
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject(f.project)
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={f.environment}>
        <PythonEditorPreview />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  await screen.findByText('Executando')
  const first = f.sessions[0]!
  const buffer = createPythonConsoleBuffer()
  buffer.append('stdout', 'x'.repeat(100_000))
  act(() => {
    for (const [index, batch] of buffer.drain().entries())
      first.emit({
        ...batch,
        type: 'console',
        identity: first.session.identity,
        sequence: index + 2,
      })
  })
  const logs = stores.logs.getState().entries
  expect(logs[0]?.kind).toBe('warn')
  expect(logs[0]?.text).toContain('36864 caracteres')
  expect(
    logs
      .filter((entry) => entry.kind === 'log')
      .map((entry) => entry.text)
      .join(''),
  ).toBe('x'.repeat(100_000 - 36_864))
})
