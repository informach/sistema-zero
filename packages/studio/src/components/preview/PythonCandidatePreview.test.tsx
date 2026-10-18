import { afterEach, expect, test } from 'bun:test'
import type { StudioProBuilderAdapter } from '@sistemazero/core/studio/pro-builder'
import type { StudioPythonPreviewReference } from '@sistemazero/core/studio/python-preview'
import { act, cleanup, render, screen } from '@testing-library/react'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { setProjectStorageNamespace } from '../../state/projectStorageRuntime'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import {
  StudioProCandidatePreviewProvider,
  useProCandidatePreview,
} from '../../studio/pro-candidate-preview'
import { StudioRuntimeEnvironmentProvider } from '../../studio/runtime-environment'
import { StudioTutorProvider } from '../../studio/tutor'
import { PythonProPreview } from './PythonCandidatePreview'

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
})
async function fixture(authorize?: StudioProBuilderAdapter['authorizePythonPreview']) {
  const f = await pythonEnvironmentFixture('pro'),
    stores = createStudioStores({ persistence: 'none' }),
    lifetime = new AbortController()
  stores.project.setState({ project: f.project, editingAccess: 'author' })
  const reference = {
      kind: 'python-preview' as const,
      version: 1 as const,
      id: 'a'.repeat(64),
      projectId: f.project.id,
      revision: 'b'.repeat(64),
      runtimeManifestSha256: f.project.runtime.manifestSha256,
      sha256: 'c'.repeat(64),
      url: `https://python.test/v1/python-previews/${'a'.repeat(64)}/index.html`,
      expiresAt: Date.now() + 60000,
    },
    input = {
      kind: 'python' as const,
      jobId: crypto.randomUUID(),
      projectId: f.project.id,
      version: 4,
      revisionHash: 'd'.repeat(64),
      reference,
    }
  let api!: ReturnType<typeof useProCandidatePreview>,
    calls = 0
  const builder: StudioProBuilderAdapter = {
    create: async () => {
      throw new Error('Unexpected create')
    },
    latest: async () => null,
    cancel: async () => null,
    authorizePythonPreview: async (...args) => {
      calls++
      return authorize ? authorize(...args) : structuredClone(reference)
    },
  }
  function Probe() {
    api = useProCandidatePreview()
    return api.candidate ? <PythonProPreview /> : null
  }
  const view = render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={{ ...f.environment, signal: lifetime.signal }}>
        <StudioTutorProvider
          value={{
            adapter: {
              builder,
              loadHistory: async () => ({ messages: [], nextCursor: null }),
              deleteHistory: async () => {},
              ask: async () => {
                throw new Error('Unexpected inference')
              },
              feedback: async () => {},
            },
          }}
        >
          <StudioProCandidatePreviewProvider>
            <Probe />
          </StudioProCandidatePreviewProvider>
        </StudioTutorProvider>
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  await act(async () => {
    expect(api.show(input)).toBe(true)
  })
  return {
    f,
    stores,
    lifetime,
    view,
    api: () => api,
    calls: () => calls,
    reference,
    input,
    frame: () => view.container.querySelector<HTMLIFrameElement>('iframe[title="Proposta Python"]'),
  }
}

test('Python proposal uses a fresh authorized service reference and waits for the trusted execution acknowledgement', async () => {
  const f = await fixture(),
    frame = f.frame()
  expect(frame).not.toBeNull()
  if (!frame) throw new Error('Frame missing')
  expect(frame.getAttribute('sandbox')).toBe(
    'allow-scripts allow-same-origin allow-downloads allow-forms',
  )
  expect(frame.hasAttribute('credentialless')).toBe(true)
  expect(f.calls()).toBe(1)
  expect(f.api().candidate?.status).toBe('loading')
  frame.dispatchEvent(new Event('load'))
  expect(f.api().candidate?.status).toBe('loading')
  const session = new URLSearchParams(new URL(frame.src).hash.slice(1)).get(
      'studio-preview-session',
    ),
    data = {
      type: 'studio-python-preview',
      version: 1,
      previewId: f.reference.id,
      session,
      status: 'ready',
    }
  for (const event of [
    new MessageEvent('message', {
      source: frame.contentWindow,
      origin: 'https://attacker.test',
      data,
    }),
    new MessageEvent('message', { source: window, origin: 'https://python.test', data }),
    new MessageEvent('message', {
      source: frame.contentWindow,
      origin: 'https://python.test',
      data: { ...data, session: crypto.randomUUID() },
    }),
  ])
    act(() => window.dispatchEvent(event))
  expect(f.api().candidate?.status).toBe('loading')
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: 'https://python.test',
        data,
      }),
    ),
  )
  expect(f.api().candidate?.status).toBe('ready')
  expect(f.calls()).toBe(1)
  expect(f.stores.project.getState().project).toBe(f.f.project)
  expect(f.stores.project.getState().isDirty).toBe(false)
  act(() => f.api().close())
  expect(frame.isConnected).toBe(false)
})

test('a late authorization cannot revive the candidate after an A to B to A project transition', async () => {
  const pending = Promise.withResolvers<StudioPythonPreviewReference>()
  const f = await fixture(() => pending.promise)
  expect(f.frame()).toBeNull()
  act(() => {
    f.stores.project.setState({ project: { ...f.f.project, id: 'other' } })
    f.stores.project.setState({ project: f.f.project })
  })
  await act(async () => pending.resolve(f.reference))
  expect(f.api().candidate).toBeNull()
  expect(f.frame()).toBeNull()
})

test.each([
  'profile',
  'readonly',
  'host',
] as const)('%s withdrawal synchronously removes the running preview', async (mode) => {
  const f = await fixture(),
    frame = f.frame()
  expect(frame?.isConnected).toBe(true)
  act(() => {
    if (mode === 'profile') {
      setProjectStorageNamespace('other')
      setProjectStorageNamespace('')
    } else if (mode === 'readonly') f.stores.project.setState({ editingAccess: 'observer' })
    else f.lifetime.abort()
    expect(frame?.isConnected).toBe(false)
  })
})

test('a swapped service reference is rejected without navigating a frame', async () => {
  const pending = Promise.withResolvers<StudioPythonPreviewReference>(),
    f = await fixture(() => pending.promise)
  await act(async () => pending.resolve({ ...f.reference, sha256: 'e'.repeat(64) }))
  expect(f.frame()).toBeNull()
  expect(f.api().candidate?.status).toBe('unavailable')
  expect(screen.getByRole('status').textContent).toContain('Não foi possível')
})
