import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { createRef, StrictMode } from 'react'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { fakeUseStore } from '../../testing/fakeIdbStore'
import type { StudioHandle } from '../types'

// Real transactional fake storage, isolated from the workspace test module registry.
const databases = new Map<string, Map<IDBValidKey, unknown>>()
function database(store?: { name?: string }) {
  const name = store?.name ?? ''
  let result = databases.get(name)
  if (!result) {
    result = new Map()
    databases.set(name, result)
  }
  return result
}
mock.module('idb-keyval', () => ({
  createStore: (name: string) => fakeUseStore(name),
  get: async (key: IDBValidKey, store?: { name?: string }) => database(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => database(store).get(key)),
  keys: async (store?: { name?: string }) => [...database(store).keys()],
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    database(store).set(key, value)
  },
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) database(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    database(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) database(store).delete(key)
  },
  update: async (
    key: IDBValidKey,
    updater: (value: unknown) => unknown,
    store?: { name?: string },
  ) => {
    database(store).set(key, updater(database(store).get(key)))
  },
}))
const { useProjectStore } = await import('../../state/projectStore')
function ShellProbe() {
  const name = useProjectStore((state) => state.project?.name ?? '')
  return <div data-testid="opening-project">{name}</div>
}
mock.module('../../components/layout/Shell', () => ({ Shell: ShellProbe }))
const thumbs = await import('../../cover/thumbCapture')
mock.module('../../cover/thumbCapture', () => ({
  ...thumbs,
  captureAndStoreProjectThumb: async () => undefined,
}))
const validation = await import('../../state/editableProjectValidation')
const realPrepare = validation.prepareEditableStudioProject
const calls: Array<{ input: unknown; gate: ReturnType<typeof Promise.withResolvers<void>> }> = []
let rejectPreparation = false
mock.module('../../state/editableProjectValidation', () => ({
  prepareEditableStudioProject: async (...args: Parameters<typeof realPrepare>) => {
    const gate = Promise.withResolvers<void>()
    calls.push({ input: args[0], gate })
    await gate.promise
    if (rejectPreparation) throw new Error('trusted preparation failure')
    return realPrepare(...args)
  },
}))
const { StudioEditor } = await import('../StudioEditor')
const { StudioLesson } = await import('../StudioLesson')
const { createLocalPersistenceAdapter } = await import('../../state/projectStore')
const { isProjectOpening } = await import('../../state/projectOpening')
const { getProjectStorageScope } = await import('../../state/projectStorageRuntime')
const { persistProject, loadProjectAssetsById, persistProjectAssets } = await import(
  '../../state/persistence'
)
let sequence = 0
function local() {
  const namespace = `ui-opening-${++sequence}`
  return {
    scope: getProjectStorageScope(namespace),
    adapter: createLocalPersistenceAdapter({ namespace }),
  }
}
async function fixture(language: 'javascript' | 'python', kind: 'classic' | 'pro') {
  const raw = documentFixture(language, kind)
  const project = await realPrepare({
    ...raw,
    assets: raw.assets?.map((asset) => ({ ...asset, name: 'hero', source: 'upload' })),
    coverAssetName: 'hero',
  })
  if (!project) throw new Error('fixture refused')
  return project
}
afterEach(async () => {
  cleanup()
  await act(async () => {
    for (const call of calls) call.gate.resolve()
  })
  calls.length = 0
  rejectPreparation = false
})
for (const language of ['javascript', 'python'] as const)
  for (const kind of ['classic', 'pro'] as const) {
    test(`${language} ${kind}: real Core preparation excludes a closed material transaction through hydration`, async () => {
      const project = await fixture(language, kind)
      const { scope, adapter } = local()
      await persistProject(project, {}, scope)
      const assets = await loadProjectAssetsById(project.id, scope)
      if (!assets) throw new Error('fixture assets missing')
      const handle = createRef<StudioHandle>()
      const settled: string[] = []
      const view = render(
        <StudioEditor
          ref={handle}
          initialProject={project}
          persistence={adapter}
          autoRun={false}
          onProjectOpeningSettled={({ status }) => {
            settled.push(status)
            expect(handle.current?.getProject()?.id).toBe(project.id)
          }}
        />,
      )
      expect(isProjectOpening(scope, project.id)).toBe(true)
      expect(await persistProjectAssets(project.id, assets, scope, assets)).toBe(false)
      expect(handle.current?.getProject()).toBeNull()
      await act(async () => {
        calls.at(-1)?.gate.resolve()
      })
      await waitFor(() => expect(settled).toEqual(['ready']))
      expect(isProjectOpening(scope, project.id)).toBe(false)
      expect(handle.current?.getProject()?.programmingLanguage).toBe(language)
      view.unmount()
      expect(isProjectOpening(scope, project.id)).toBe(false)
    })
  }
test('same-id replacement owns a distinct preparation and stale completion cannot hydrate or settle it', async () => {
  const original = await fixture('python', 'classic')
  const replacement = { ...original, name: 'Replacement' }
  const { scope, adapter } = local()
  const events: string[] = []
  const handle = createRef<StudioHandle>()
  const view = render(
    <StudioEditor
      ref={handle}
      initialProject={original}
      persistence={adapter}
      autoRun={false}
      onProjectOpeningSettled={() => events.push('old')}
    />,
  )
  const old = calls.at(-1)
  view.rerender(
    <StudioEditor
      ref={handle}
      initialProject={replacement}
      persistence={adapter}
      autoRun={false}
      onProjectOpeningSettled={() => events.push('new')}
    />,
  )
  const next = calls.at(-1)
  expect(next).not.toBe(old)
  await act(async () => old?.gate.resolve())
  expect(events).toEqual([])
  expect(handle.current?.getProject()).toBeNull()
  expect(isProjectOpening(scope, original.id)).toBe(true)
  await act(async () => next?.gate.resolve())
  await waitFor(() => expect(events).toEqual(['new']))
  expect(handle.current?.getProject()?.name).toBe('Replacement')
  expect(isProjectOpening(scope, original.id)).toBe(false)
  // Another same-id snapshot settles again, without depending on the onReady id latch.
  view.rerender(
    <StudioEditor
      ref={handle}
      initialProject={{ ...replacement, name: 'Third' }}
      persistence={adapter}
      autoRun={false}
      onProjectOpeningSettled={() => events.push('third')}
    />,
  )
  expect(isProjectOpening(scope, original.id)).toBe(true)
  await act(async () => calls.at(-1)?.gate.resolve())
  await waitFor(() => expect(events).toEqual(['new', 'third']))
  expect(handle.current?.getProject()?.name).toBe('Third')
  expect(isProjectOpening(scope, original.id)).toBe(false)
})
test('blocked lesson settles as policy refusal, with no onReady or storage error', async () => {
  const project = await fixture('javascript', 'classic')
  project.installedExtensions = [{ id: 'game-3d', version: '1.0.0', installedAt: 1 }]
  const { scope, adapter } = local()
  const settled = mock(() => {})
  const error = mock(() => {})
  const ready = mock(() => {})
  render(
    <StudioLesson
      initialProject={project}
      persistence={adapter}
      autoRun={false}
      allowExtensions={['game-2d']}
      onProjectOpeningSettled={settled}
      onError={error}
      onReady={ready}
    />,
  )
  await act(async () => calls.at(-1)?.gate.resolve())
  await waitFor(() =>
    expect(settled).toHaveBeenCalledWith({ projectId: project.id, status: 'blocked' }),
  )
  expect(isProjectOpening(scope, project.id)).toBe(false)
  expect(ready).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
})
test('failed preparation releases its owner and reports its existing error contract', async () => {
  const project = await fixture('python', 'pro')
  const { scope, adapter } = local()
  const settled = mock(() => {})
  const error = mock(() => {})
  rejectPreparation = true
  render(
    <StudioEditor
      initialProject={project}
      persistence={adapter}
      autoRun={false}
      onProjectOpeningSettled={settled}
      onError={error}
    />,
  )
  await act(async () => calls.at(-1)?.gate.resolve())
  await waitFor(() =>
    expect(settled).toHaveBeenCalledWith({ projectId: project.id, status: 'error' }),
  )
  expect(isProjectOpening(scope, project.id)).toBe(false)
  await waitFor(() =>
    expect(error).toHaveBeenCalledWith({
      kind: 'persistence',
      message: 'trusted preparation failure',
    }),
  )
})
test('StrictMode cleanup and unmount release pending owners; late completions have no callback', async () => {
  const project = await fixture('javascript', 'classic')
  const { scope, adapter } = local()
  const settled = mock(() => {})
  const view = render(
    <StrictMode>
      <StudioEditor
        initialProject={project}
        persistence={adapter}
        autoRun={false}
        onProjectOpeningSettled={settled}
      />
    </StrictMode>,
  )
  expect(calls.length).toBe(2)
  expect(isProjectOpening(scope, project.id)).toBe(true)
  view.unmount()
  expect(isProjectOpening(scope, project.id)).toBe(false)
  await act(async () => {
    for (const call of calls) call.gate.resolve()
  })
  expect(settled).not.toHaveBeenCalled()
})
