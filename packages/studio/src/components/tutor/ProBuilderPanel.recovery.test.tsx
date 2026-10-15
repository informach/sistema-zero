import { afterEach, describe, expect, it } from 'bun:test'
import {
  applyStudioProChange,
  type StudioProBuilderAdapter,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { buildProProject } from '../../core/proProject'
import type { StudioPersistenceAdapter } from '../../persistence/types'
import { loadProjectById, persistProject } from '../../state/persistence'
import { registerProjectPersistence } from '../../state/projectOperations'
import { projectApplicationsKey } from '../../state/projectStorageKeys'
import {
  type ProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { captureProRevision, listProApplications } from '../../state/proRevision'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import ProBuilderPanel from './ProBuilderPanel'

const disposers: Array<() => void> = []

afterEach(() => {
  cleanup()
  for (const dispose of disposers.splice(0).reverse()) dispose()
  setProjectStorageNamespace('')
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function database(): ProjectStorageScope {
  const identity = `builder-recovery-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

async function fixture(options: { autosave?: boolean } = {}) {
  const scope = database()
  const project = buildProProject(
    'builder-recovery',
    'Arena',
    { 'main.ts': { kind: 'file', content: 'export const score = 0' } },
    'dev',
    'vanilla-vite',
  )
  await persistProject(project, {}, scope)
  let fail = false
  const persistence: StudioPersistenceAdapter = {
    localScope: scope,
    scopeIdentity: scope.identity,
    appliesSavesInCallOrder: true,
    load: (id) => loadProjectById(id, scope),
    save: (snapshot) => {
      const target: ProjectStorageScope = fail
        ? {
            ...scope,
            store: (mode, callback) =>
              scope.store(mode, (objectStore) => {
                const put = objectStore.put.bind(objectStore)
                objectStore.put = ((value: unknown, key?: IDBValidKey) => {
                  if (key === projectApplicationsKey(snapshot.id))
                    throw new DOMException('Quota injetada no histórico.', 'QuotaExceededError')
                  return put(value, key)
                }) as typeof objectStore.put
                return callback(objectStore)
              }),
          }
        : scope
      return persistProject(snapshot, {}, target)
    },
  }
  const stores = createStudioStores({ persistence })
  stores.project.getState().hydrateProject((await loadProjectById(project.id, scope))!)
  disposers.push(() => stores.project.setState({ project: null, isDirty: false, saveError: null }))
  if (options.autosave) disposers.push(stores.persistence.attach())
  else disposers.push(registerProjectPersistence(stores.project, persistence))
  disposers.push(() => {
    fail = false
  })
  const base = await captureProRevision(stores.project.getState().project!)
  const change = {
    baseHash: base.hash,
    summary: 'Atualizar os pontos',
    patches: [
      {
        path: 'main.ts',
        before: await studioProDigest(base.files['main.ts']!),
        content: 'export const score = 1',
      },
    ],
  }
  const job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: project.id,
    base,
    objective: 'Atualizar os pontos',
    model: 'provider/model',
    phase: 'review',
    version: 3,
    modelCalls: 1,
    validationCalls: 1,
    createdAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + 300_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    leaseUntil: null,
    result: {
      change,
      revisionHash: (await applyStudioProChange(base, change)).revision.hash,
      plan: ['Atualizar os pontos'],
      evidence: [],
    },
    error: null,
    cost: { source: 'platform', confirmedMicroUsd: 0, uncertain: false },
    notes: [],
  }
  const ready = studioProBuilderView(job)
  const adapter: StudioProBuilderAdapter = {
    create: async () => ready,
    latest: async () => ready,
    advance: async () => ready,
    cancel: async () => ({ ...ready, phase: 'cancelled' }),
  }
  return {
    scope,
    stores,
    projectId: project.id,
    adapter,
    setFailure(value: boolean) {
      fail = value
    },
  }
}

function renderPanel(f: Awaited<ReturnType<typeof fixture>>) {
  return render(
    <StudioStoresContext.Provider value={f.stores}>
      <ProBuilderPanel adapter={f.adapter} projectId={f.projectId} />
    </StudioStoresContext.Provider>,
  )
}

describe('builder persistence recovery', () => {
  it('finishes availability after Consultar estado while the initial check is pending', async () => {
    const f = await fixture()
    const availability = deferred<{ available: boolean }>()
    f.adapter.availability = () => availability.promise
    f.adapter.latest = async () => null
    const ui = renderPanel(f)
    fireEvent.change(ui.getByLabelText('O que vamos construir?'), {
      target: { value: 'Atualizar os pontos' },
    })
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Consultar estado' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(ui.getByRole('button', { name: 'Consultar estado' }))
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Consultar estado' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    await act(async () => availability.resolve({ available: true }))
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Preparar proposta' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
  })

  it('keeps a retry action for a pending undo and saves its existing inverse exactly once', async () => {
    const f = await fixture()
    const ui = renderPanel(f)
    fireEvent.click(await ui.findByRole('button', { name: 'Aplicar alterações' }))
    await waitFor(async () =>
      expect(await listProApplications(f.scope, f.projectId)).toHaveLength(1),
    )
    const undo = await ui.findByRole('button', { name: 'Desfazer alterações' })
    await waitFor(() => expect((undo as HTMLButtonElement).disabled).toBe(false))
    f.setFailure(true)
    fireEvent.click(undo)
    const retry = await ui.findByRole('button', { name: /^Tentar salvar/ })
    await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false))
    const memory = f.stores.project.getState().project
    expect(memory!.tree!['main.ts']).toEqual({ kind: 'file', content: 'export const score = 0' })
    expect(await listProApplications(f.scope, f.projectId)).toHaveLength(1)
    f.setFailure(false)
    fireEvent.click(retry)
    await waitFor(async () =>
      expect(await listProApplications(f.scope, f.projectId)).toHaveLength(2),
    )
    await waitFor(() =>
      expect(Boolean(ui.queryByRole('button', { name: /^Tentar salvar/ }))).toBe(false),
    )
    expect(f.stores.project.getState().project).toBe(memory)
    expect(f.stores.project.getState().isDirty).toBe(false)
    expect((await loadProjectById(f.projectId, f.scope))!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const score = 0',
    })
  })

  it('reconciles a pending receipt when the real autosave confirms, without another panel action', async () => {
    const f = await fixture({ autosave: true })
    f.setFailure(true)
    const ui = renderPanel(f)
    fireEvent.click(await ui.findByRole('button', { name: 'Aplicar alterações' }))
    await ui.findByRole('button', { name: /^Tentar salvar/ })
    await ui.findByText(/Alterações aplicadas na sessão; o salvamento está pendente/)
    expect(await listProApplications(f.scope, f.projectId)).toHaveLength(0)
    expect(f.stores.project.getState().isDirty).toBe(true)
    f.setFailure(false)
    await waitFor(() => expect(f.stores.project.getState().isDirty).toBe(false), { timeout: 3500 })
    expect(await listProApplications(f.scope, f.projectId)).toHaveLength(1)
    await waitFor(() =>
      expect(Boolean(ui.queryByRole('button', { name: /^Tentar salvar/ }))).toBe(false),
    )
    await ui.findByText(/^Alterações aplicadas e salvas neste aparelho/)
    expect(Boolean(ui.queryByText(/salvamento (?:está|continua) pendente/))).toBe(false)
    expect(
      (ui.getByRole('button', { name: 'Aplicar alterações' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('restores a durable receipt after autosave finishes with the panel closed and the project reopens', async () => {
    const f = await fixture({ autosave: true })
    f.setFailure(true)
    const first = renderPanel(f)
    fireEvent.click(await first.findByRole('button', { name: 'Aplicar alterações' }))
    await first.findByRole('button', { name: /^Tentar salvar/ })
    first.unmount()
    f.setFailure(false)
    await waitFor(() => expect(f.stores.project.getState().isDirty).toBe(false), {
      timeout: 3500,
    })
    expect(await listProApplications(f.scope, f.projectId)).toHaveLength(1)
    f.stores.project.getState().hydrateProject((await loadProjectById(f.projectId, f.scope))!)
    const reopened = renderPanel(f)
    await reopened.findByRole('button', { name: 'Desfazer alterações' })
    await waitFor(() =>
      expect(Boolean(reopened.queryByRole('button', { name: /^Tentar salvar/ }))).toBe(false),
    )
    expect(
      (reopened.getByRole('button', { name: 'Aplicar alterações' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
