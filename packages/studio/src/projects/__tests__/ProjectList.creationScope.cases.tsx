import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { STUDIO_PRO_TEMPLATE_IDS } from '@sistemazero/core/studio/pro-templates'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Project } from '#core'
import {
  failNextFakeIdbWrite,
  fakeIdbWrites,
  fakeUseStore,
  holdNextFakeIdbWrite,
  resetFakeIdb,
} from '../../testing/fakeIdbStore'

// Persistência de verdade, com o IndexedDB transacional do harness: cada perfil
// tem um Map separado, e um commit pode ser mantido em voo sem usar sleeps.
const databases = new Map<string, Map<IDBValidKey, unknown>>()
function kvOf(store?: { name?: string }): Map<IDBValidKey, unknown> {
  const name = store?.name ?? ''
  let values = databases.get(name)
  if (!values) {
    values = new Map()
    databases.set(name, values)
  }
  return values
}
mock.module('idb-keyval', () => ({
  createStore: (name: string) => fakeUseStore(name),
  get: async (key: IDBValidKey, store?: { name?: string }) => kvOf(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => kvOf(store).get(key)),
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    kvOf(store).set(key, value)
  },
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) kvOf(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    kvOf(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kvOf(store).delete(key)
  },
  update: async (
    key: IDBValidKey,
    updater: (previous: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const values = kvOf(store)
    values.set(key, updater(values.get(key)))
  },
}))

const { buildProProject, t } = await import('#core')
const templates = await import('../../components/code/pro-templates')
const { createProjectStore, useProjectStore } = await import('../../state/projectStore')
const { captureProjectStorageScope, getProjectStorageScope } = await import(
  '../../state/projectStorageRuntime'
)
const { listAllProjects, loadProjectById, setStorageNamespace, setStudioCloudMirror } =
  await import('../../state/persistence')
const { ProjectList } = await import('../ProjectList')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function proFixture(id: string, name: string): Project {
  return {
    ...buildProProject(
      id,
      name,
      { 'src/main.ts': { kind: 'file', content: 'export const ready = true' } },
      'dev',
      'canvas-survival',
    ),
    assets: [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image',
        source: 'library',
        proPath: 'public/assets/hero.png',
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      },
    ],
  }
}

const restoreSpies: Array<() => void> = []
function slowTemplate() {
  const gate = deferred<void>()
  const started = deferred<void>()
  let project: Project | undefined
  const spy = spyOn(templates, 'createProProject').mockImplementation(async (id, name) => {
    project = proFixture(id, name)
    started.resolve()
    await gate.promise
    return project
  })
  restoreSpies.push(() => spy.mockRestore())
  return { gate, started, spy, project: () => project }
}

beforeEach(() => {
  resetFakeIdb()
  setStorageNamespace('creation-a')
})
afterEach(() => {
  cleanup()
  for (const restore of restoreSpies.splice(0)) restore()
  setStudioCloudMirror(null)
  setStorageNamespace('')
  databases.clear()
  resetFakeIdb()
})

describe('criação — escopo capturado antes da factory assíncrona', () => {
  for (const returnToA of [false, true]) {
    it(`descarta o template após troca ${returnToA ? 'A → B → A' : 'A → B'}`, async () => {
      const loader = slowTemplate()
      const store = createProjectStore()
      const result = store.getState().createProProject('Arena', 'canvas-survival')
      const outcome = result.then(
        () => null,
        (error: unknown) => error,
      )
      await loader.started.promise
      setStorageNamespace('creation-b')
      if (returnToA) setStorageNamespace('creation-a')
      loader.gate.resolve()
      expect(String(await outcome)).toContain('O perfil mudou durante a criação')
      expect(fakeIdbWrites()).toHaveLength(0)
      expect(await listAllProjects(getProjectStorageScope('creation-a'))).toEqual([])
      expect(await listAllProjects(getProjectStorageScope('creation-b'))).toEqual([])
    })
  }

  it('preserva o epoch ao reaplicar o mesmo namespace e persiste árvore e assets juntos', async () => {
    const loader = slowTemplate()
    const captured = captureProjectStorageScope()
    const result = createProjectStore().getState().createProProject('Arena', 'canvas-survival')
    await loader.started.promise
    setStorageNamespace('  creation-a  ')
    loader.gate.resolve()
    const project = await result
    expect(captureProjectStorageScope()).toBe(captured)
    const saved = await loadProjectById(project.id, captured)
    expect(saved?.tree).toEqual(project.tree)
    expect(saved?.assets).toEqual(project.assets)
    expect(fakeIdbWrites()).toHaveLength(1)
    expect(fakeIdbWrites()[0]?.outcome).toBe('complete')
  })

  it('não grava nada quando o carregamento falha; nova tentativa pode concluir', async () => {
    const loader = slowTemplate()
    const store = createProjectStore()
    const result = store.getState().createProProject('Arena', 'canvas-survival')
    const outcome = result.then(
      () => null,
      (error: unknown) => error,
    )
    await loader.started.promise
    loader.gate.reject(new Error('chunk indisponível'))
    expect(String(await outcome)).toContain('chunk indisponível')
    expect(fakeIdbWrites()).toHaveLength(0)
    loader.spy.mockImplementation(async (id, name) => proFixture(id, name))
    const retry = await store.getState().createProProject('Arena', 'canvas-survival')
    expect((await listAllProjects()).map((project) => project.id)).toEqual([retry.id])
  })
})

describe('criação — troca de perfil com commit já em voo', () => {
  for (const kind of ['basic', 'pro'] as const) {
    for (const returnToA of [false, true]) {
      it(`${kind}: termina somente em A e recusa sucesso obsoleto após ${returnToA ? 'A → B → A' : 'A → B'}`, async () => {
        if (kind === 'pro') {
          const spy = spyOn(templates, 'createProProject').mockImplementation(async (id, name) =>
            proFixture(id, name),
          )
          restoreSpies.push(() => spy.mockRestore())
        }
        const captured = captureProjectStorageScope()
        const hold = holdNextFakeIdbWrite()
        const store = createProjectStore()
        const pending =
          kind === 'pro'
            ? store.getState().createProProject('Arena', 'canvas-survival')
            : store.getState().createProject('Arena')
        const outcome = pending.then(
          () => null,
          (error: unknown) => error,
        )
        try {
          await waitFor(() => expect(fakeIdbWrites()).toHaveLength(1))
          expect(fakeIdbWrites()[0]?.outcome).toBe('pending')
          setStorageNamespace('creation-b')
          if (returnToA) setStorageNamespace('creation-a')
        } finally {
          hold.release()
        }
        expect(String(await outcome)).toContain('O perfil mudou durante a criação')
        expect(fakeIdbWrites().map((write) => write.db)).toEqual([captured.identity])
        expect(await listAllProjects(captured)).toHaveLength(1)
        expect(await listAllProjects(getProjectStorageScope('creation-b'))).toEqual([])
      })
    }
  }

  it('quota aborta todas as partições; retry salva exatamente um projeto completo', async () => {
    const loader = slowTemplate()
    loader.spy.mockImplementation(async (id, name) => proFixture(id, name))
    const store = createProjectStore()
    failNextFakeIdbWrite(new DOMException('Sem espaço', 'QuotaExceededError'))
    await expect(store.getState().createProProject('Arena', 'canvas-survival')).rejects.toThrow(
      'Sem espaço',
    )
    expect(await listAllProjects()).toEqual([])
    expect([...databases.values()].flatMap((values) => [...values.keys()])).toEqual([])
    const retry = await store.getState().createProProject('Arena', 'canvas-survival')
    expect((await listAllProjects()).map((project) => project.id)).toEqual([retry.id])
    const saved = await loadProjectById(retry.id)
    expect(saved?.tree).toEqual(retry.tree)
    expect(saved?.assets).toEqual(retry.assets)
    expect(fakeIdbWrites().map((write) => write.outcome)).toEqual(['aborted', 'complete'])
  })
})

async function openCreation(onOpenProject: (id: string) => void, pro = true) {
  const view = render(<ProjectList professional onOpenProject={onOpenProject} theme="light" />)
  await screen.findByText(t('projects.empty'))
  fireEvent.click(screen.getByRole('button', { name: '+ Novo projeto' }))
  if (pro) fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
  return view
}

describe('ProjectList — conclusão assíncrona só navega na tela e no epoch originais', () => {
  it('captura antes do import da store: troca síncrona após clique impede até a factory', async () => {
    const loader = slowTemplate()
    const onOpen = mock((_id: string) => {})
    await openCreation(onOpen)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
      setStorageNamespace('creation-b')
      setStorageNamespace('creation-a')
    })
    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: t('projects.newModal.create') })
          .hasAttribute('disabled'),
      ).toBe(false)
    })
    expect(loader.spy).not.toHaveBeenCalled()
    expect(fakeIdbWrites()).toHaveLength(0)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('não fecha o modal nem navega após A → B → A durante carregamento', async () => {
    const loader = slowTemplate()
    const onOpen = mock((_id: string) => {})
    await openCreation(onOpen)
    fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
    await loader.started.promise
    await act(async () => {
      setStorageNamespace('creation-b')
      setStorageNamespace('creation-a')
      loader.gate.resolve()
    })
    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: t('projects.newModal.create') })
          .hasAttribute('disabled'),
      ).toBe(false)
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(fakeIdbWrites()).toHaveLength(0)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('revalida após uma criação bem-sucedida, antes de navegar, mesmo em A → B → A', async () => {
    const onOpen = mock((_id: string) => {})
    await openCreation(onOpen, false)
    const original = useProjectStore.getState().createProject
    const saved = deferred<void>()
    const completion = deferred<void>()
    useProjectStore.setState({
      createProject: async (...args) => {
        const project = await original(...args)
        saved.resolve()
        // Segura só a entrega do resultado: a store já confirmou seu próprio epoch.
        await completion.promise
        return project
      },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
      await saved.promise
      await act(async () => {
        setStorageNamespace('creation-b')
        setStorageNamespace('creation-a')
        completion.resolve()
        expect(await listAllProjects(getProjectStorageScope('creation-a'))).toHaveLength(1)
        expect(await listAllProjects(getProjectStorageScope('creation-b'))).toEqual([])
      })
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(onOpen).not.toHaveBeenCalled()
    } finally {
      completion.resolve()
      useProjectStore.setState({ createProject: original })
    }
  })

  it('desmontagem durante commit permite terminar em A, sem navegar ou afetar a tela nova', async () => {
    const onOpen = mock((_id: string) => {})
    const view = await openCreation(onOpen, false)
    const original = useProjectStore.getState().createProject
    const finished = deferred<void>()
    useProjectStore.setState({
      createProject: async (...args) => {
        try {
          return await original(...args)
        } finally {
          finished.resolve()
        }
      },
    })
    const hold = holdNextFakeIdbWrite()
    try {
      fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
      await waitFor(() => expect(fakeIdbWrites()).toHaveLength(1))
      view.unmount()
      hold.release()
      await act(async () => await finished.promise)
      expect(await listAllProjects()).toHaveLength(1)
      expect(onOpen).not.toHaveBeenCalled()
    } finally {
      hold.release()
      useProjectStore.setState({ createProject: original })
    }
  })

  it('falha de quota mantém o modal; retry navega uma única vez após gravar', async () => {
    const navigated = deferred<void>()
    const onOpen = mock((_id: string) => navigated.resolve())
    await openCreation(onOpen, false)
    failNextFakeIdbWrite(new DOMException('Sem espaço', 'QuotaExceededError'))
    fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(onOpen).not.toHaveBeenCalled()
    expect(await listAllProjects()).toEqual([])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
      await navigated.promise
    })
    // Aguarda a atualização incremental do card, drenando a notificação da gravação.
    await screen.findByRole('button', { name: /^Abrir projeto / })
    expect(onOpen).toHaveBeenCalledTimes(1)
    const projects = await listAllProjects()
    expect(projects).toHaveLength(1)
    const savedProject = projects[0]
    if (!savedProject) throw new Error('O retry não persistiu o projeto')
    expect(onOpen).toHaveBeenCalledWith(savedProject.id)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

it('offers the complete Pro catalog without host release configuration', async () => {
  render(<ProjectList professional onOpenProject={() => {}} theme="light" />)
  await screen.findByText(t('projects.empty'))
  fireEvent.click(screen.getByRole('button', { name: '+ Novo projeto' }))
  fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
  expect(
    within(screen.getByRole('dialog'))
      .getAllByRole('option')
      .map((element) => (element as HTMLOptionElement).value),
  ).toEqual(STUDIO_PRO_TEMPLATE_IDS)
})

it('revoking Pro access during a factory prevents persistence and navigation', async () => {
  const loader = slowTemplate()
  const onOpen = mock((_id: string) => {})
  const view = render(<ProjectList professional onOpenProject={onOpen} theme="light" />)
  await screen.findByText(t('projects.empty'))
  fireEvent.click(screen.getByRole('button', { name: '+ Novo projeto' }))
  fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
  fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
  await loader.started.promise
  view.rerender(<ProjectList professional={false} onOpenProject={onOpen} theme="light" />)
  await act(async () => loader.gate.resolve())
  await waitFor(() => expect(screen.queryByText('Criando…')).toBeNull())
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(fakeIdbWrites()).toHaveLength(0)
  expect(onOpen).not.toHaveBeenCalled()
})

for (const change of ['profile', 'environment', 'pro-access'] as const) {
  it(`Python creation revalidates ${change} after fresh discovery, before persistence`, async () => {
    const { pythonEnvironmentFixture } = await import('../../state/fixtures/pythonEnvironment')
    const fixture = await pythonEnvironmentFixture('pro')
    const context = {
      catalog: fixture.environment.catalog,
      runtime: fixture.project.runtime,
      releaseStatus: 'active' as const,
    }
    const gate = deferred<typeof context>()
    const started = deferred<void>()
    const environments = [
      {
        key: fixture.project.runtime.manifestSha256,
        label: 'Python',
        kind: 'pro' as const,
        context,
      },
    ]
    const pythonCreation = {
      environments,
      prepare: async () => {
        started.resolve()
        return gate.promise
      },
    }
    const onOpen = mock((_id: string) => {})
    const view = render(
      <ProjectList
        professional
        pythonCreation={pythonCreation}
        onOpenProject={onOpen}
        theme="light"
      />,
    )
    await screen.findByText(t('projects.empty'))
    fireEvent.click(screen.getByRole('button', { name: '+ Novo projeto' }))
    fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
    fireEvent.click(screen.getByRole('radio', { name: /^Python$/ }))
    fireEvent.click(screen.getByRole('button', { name: t('projects.newModal.create') }))
    await started.promise
    if (change === 'profile') {
      setStorageNamespace('creation-b')
      setStorageNamespace('creation-a')
    } else
      view.rerender(
        <ProjectList
          professional={change !== 'pro-access'}
          pythonCreation={
            change === 'environment' ? { ...pythonCreation, environments: [] } : pythonCreation
          }
          onOpenProject={onOpen}
          theme="light"
        />,
      )
    await act(async () => gate.resolve(context))
    await waitFor(() => expect(screen.queryByText('Criando…')).toBeNull())
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(fakeIdbWrites()).toHaveLength(0)
    expect(onOpen).not.toHaveBeenCalled()
  })
}
