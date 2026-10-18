import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import type { StudioPythonPublication } from '@sistemazero/core/studio/python-publication'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '#core'
import { projectPublicationId } from '../../core/projectPublication'
import { prepareEditableStudioProject } from '../../state/editableProjectValidation'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { loadProjectById } from '../../state/persistence'
import { registerProjectOperation } from '../../state/projectOperations'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { type ProjectStoreApi, useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import type { StudioShareAdapter } from '../../studio/share'

// bun:test NÃO isola module mocks por arquivo — captura o real ANTES e restaura
// no afterAll (ver BottomPanel.test.tsx). Mockar a captura evita o timeout de
// ~5.5s do iframe oculto sob happy-dom (que nunca executa o script).
const realCover = { ...(await import('../../cover/coverCapture')) }
const indexedDBDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
mock.module('../../cover/coverCapture', () => ({
  captureCoverFromProject: async () => 'data:image/png;base64,FAKECOVER',
}))

afterAll(() => {
  mock.module('../../cover/coverCapture', () => realCover)
  if (indexedDBDescriptor) Object.defineProperty(globalThis, 'indexedDB', indexedDBDescriptor)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

const { ShareDialog } = await import('./ShareDialog')

function seedProject(): void {
  useProjectStore.setState({
    project: createEmptyProject('p1', 'Meu Jogo'),
    isDirty: false,
    saveError: null,
  })
}

function makeAdapter(over: Partial<StudioShareAdapter> = {}): StudioShareAdapter {
  return {
    generateDescription: mock(async () => 'Um jogo de nave que desvia de asteroides.'),
    publish: mock(async () => ({ muralUrl: '/mural?thread=1', playUrl: '/jogar/abc' })),
    ...over,
  }
}

const pubArg = (adapter: StudioShareAdapter) =>
  (adapter.publish as ReturnType<typeof mock>).mock.calls[0]?.[0]

describe('ShareDialog', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    setProjectStorageNamespace('')
  })

  it('Python Classic persists its publication link, reopens history, updates, restores and disables that link', async () => {
    setProjectStorageNamespace(`classic-share-${crypto.randomUUID()}`)
    const scope = captureProjectStorageScope()
    const stores = createStudioStores()
    const { project: initial } = await pythonEnvironmentFixture('classic')
    stores.project.getState().hydrateProject(initial)
    expect(
      stores.project.getState().setPythonFile('main.py', 'print("antes de publicar")\n'),
    ).toBeNull()
    await stores.persistence.save()
    const project = stores.project.getState().project!
    const playId = crypto.randomUUID()
    const publication: StudioPythonPublication = {
      publicationVersion: 2,
      programmingLanguage: 'python',
      kind: 'classic',
      runtime: project.runtime!,
      playId,
      version: 2,
      disabled: false,
      activeRevision: '2'.repeat(64),
      revisions: [1, 2].map((n) => ({
        id: String(n).repeat(64),
        sourceHash: 'a'.repeat(64),
        artifactHash: 'b'.repeat(64),
        createdAt: n * 1000,
        approval: {
          kind: 'python-browser',
          runtime: project.runtime!,
          snapshotSha256: 'c'.repeat(64),
        },
      })),
    }
    const history: NonNullable<StudioShareAdapter['publication']> = {
      get: mock(async () => publication),
      update: mock(async () => ({ ...publication, version: 3 })),
      activate: mock(async (input) => ({
        ...publication,
        version: input.expectedVersion + 1,
        activeRevision: input.revision,
        disabled: input.disabled,
      })),
    }
    const adapter = makeAdapter({
      presetDescription: 'Meu jogo Python.',
      presetCoverUrl: 'https://cover.test/game.png',
      publication: history,
      publish: mock(async () => ({ publicationId: playId, playUrl: `/jogar/${playId}` })),
    })
    const view = render(
      <StudioStoresContext value={stores}>
        <ShareDialog open onClose={() => {}} adapter={adapter} />
      </StudioStoresContext>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa da aventura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByText('Copiar link')
    const loaded = await prepareEditableStudioProject(await loadProjectById(project.id, scope))
    if (!loaded) throw new Error('The published project was not persisted')
    expect(projectPublicationId(loaded)).toBe(playId)
    expect(stores.project.getState().isDirty).toBe(false)
    view.unmount()
    const reopened = createStudioStores()
    reopened.project.getState().hydrateProject(loaded)
    render(
      <StudioStoresContext value={reopened}>
        <ShareDialog open onClose={() => {}} adapter={adapter} />
      </StudioStoresContext>,
    )
    await screen.findByText('Link ativo')
    const sourceBefore = JSON.stringify(reopened.project.getState().project)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar versão atual neste link' }))
    await waitFor(() => expect(history.update).toHaveBeenCalledTimes(1))
    expect((history.update as ReturnType<typeof mock>).mock.calls[0]?.[0]).toMatchObject({
      playId,
      expectedVersion: 2,
      project: { id: project.id, programmingLanguage: 'python', kind: 'classic' },
    })
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Restaurar no link' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar no link' }))
    await waitFor(() => expect(history.activate).toHaveBeenCalledTimes(1))
    expect((history.activate as ReturnType<typeof mock>).mock.calls[0]?.[0]).toMatchObject({
      playId,
      expectedVersion: 3,
      revision: '1'.repeat(64),
      disabled: false,
    })
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Desativar link' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Desativar link' }))
    await screen.findByText('Link desativado')
    expect(JSON.stringify(reopened.project.getState().project)).toBe(sourceBefore)
  })

  it('retries saving a committed publication link without publishing a second time', async () => {
    let saves = 0
    const stores = createStudioStores({
      persistence: {
        load: async () => null,
        save: async () => {
          if (++saves === 1) throw new Error('Disco indisponível')
        },
      },
    })
    const { project: initial } = await pythonEnvironmentFixture('classic')
    stores.project.getState().hydrateProject(initial)
    const playId = crypto.randomUUID()
    const adapter = makeAdapter({
      presetDescription: 'Jogo',
      presetCoverUrl: 'https://cover.test/a.png',
      publish: mock(async () => ({ publicationId: playId, playUrl: `/jogar/${playId}` })),
    })
    render(
      <StudioStoresContext value={stores}>
        <ShareDialog open onClose={() => {}} adapter={adapter} />
      </StudioStoresContext>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa da aventura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByText(/Disco indisponível/)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByText('Copiar link')
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    expect(saves).toBe(2)
    expect(projectPublicationId(stores.project.getState().project!)).toBe(playId)
  })

  it('Pro flushes code, uses a verified cover and keeps one idempotency key after a lost response', async () => {
    const project = {
      ...createEmptyProject('pro-share', 'Arena'),
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: { 'src/main.ts': { kind: 'file' as const, content: 'old' } },
      proMeta: {
        templateId: 'canvas-grid-arena',
        devScript: 'dev',
        assistance: { version: 1 as const, briefing: 'Meu plano' },
      },
    }
    useProjectStore.setState({ project, editingAccess: 'author' })
    let release = () => {}
    const publicationId = crypto.randomUUID()
    const publish = mock(async () => {
      if (publish.mock.calls.length === 1) throw new Error('Resposta perdida')
      return { publicationId, playUrl: `/jogar/${publicationId}` }
    })
    const adapter = makeAdapter({
      publish,
      proVerifiedCover: true,
      presetDescription: 'Proteja a arena.',
    })
    try {
      let api!: ProjectStoreApi
      function Instance() {
        api = useProjectStoreApi()
        return <ShareDialog open onClose={() => {}} adapter={adapter} />
      }
      render(<Instance />)
      release = registerProjectOperation(api, {
        projectId: project.id,
        flush: async () => {
          const current = api.getState().project
          if (!current || current.programmingLanguage === 'python' || current.kind !== 'pro')
            throw new Error('The JavaScript Pro fixture changed')
          api.setState({
            project: {
              ...current,
              tree: { 'src/main.ts': { kind: 'file', content: 'saved code' } },
            },
          })
        },
      })
      await screen.findByDisplayValue('Proteja a arena.')
      fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
      await screen.findByText(/Resposta perdida/)
      fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
      await screen.findByText('Copiar link')
      const calls = (adapter.publish as ReturnType<typeof mock>).mock.calls
      expect(calls[0]?.[0].project.tree['src/main.ts'].content).toBe('saved code')
      expect(calls[0]?.[0].coverDataUrl).toBeNull()
      expect(calls[0]?.[0].requestId).toBe(calls[1]?.[0].requestId)
      expect(useProjectStore.getState().project?.proMeta).toMatchObject({
        publication: { playId: publicationId },
        assistance: { briefing: 'Meu plano' },
      })
    } finally {
      release()
    }
  })

  it('ignores a late publication after a profile changes A→B→A', async () => {
    seedProject()
    setProjectStorageNamespace('share-a')
    let complete!: (value: { playUrl: string }) => void
    const adapter = makeAdapter({
      presetDescription: 'Jogo',
      presetCoverUrl: 'https://cover.test/a.png',
      publish: () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa da aventura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(complete).toBeDefined())
    setProjectStorageNamespace('share-b')
    setProjectStorageNamespace('share-a')
    complete({ playUrl: '/jogar/late' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Copiar link')).toBeNull()
  })

  it('não renderiza nada quando o adapter é null', () => {
    seedProject()
    render(<ShareDialog open onClose={() => {}} adapter={null} />)
    expect(document.body.querySelector('dialog')).toBeNull()
  })

  it('Publicar fica desabilitado até ter título + resumo + capa', async () => {
    seedProject()
    render(<ShareDialog open onClose={() => {}} adapter={makeAdapter()} />)

    // título já vem do nome do projeto; o resumo é preenchido pela IA na abertura.
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    const publish = () => screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement
    // Falta a capa → desabilitado.
    expect(publish().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() => expect(publish().disabled).toBe(false))
  })

  it('gera a capa pelo print e publica com coverDataUrl + título + resumo', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    expect(adapter.generateDescription).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    expect(pubArg(adapter)?.coverDataUrl).toBe('data:image/png;base64,FAKECOVER')
    expect(pubArg(adapter)?.useAdminCover).toBeFalsy()
    expect(pubArg(adapter)?.title).toBe('Meu Jogo')
    expect(pubArg(adapter)?.description).toBe('Um jogo de nave que desvia de asteroides.')
  })

  it('trava a IA em 3 gerações por abertura (automática + cliques)', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    // Geração automática na abertura = 1ª. O botão tem aria-label ESTÁVEL.
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    const btn = () =>
      screen.getByRole('button', { name: 'Gerar resumo com a IA' }) as HTMLButtonElement

    await waitFor(() => expect(btn().disabled).toBe(false)) // auto-gen terminou
    fireEvent.click(btn()) // 2ª
    await waitFor(() => expect(btn().disabled).toBe(false))
    fireEvent.click(btn()) // 3ª → atinge o teto
    await waitFor(() => expect(btn().disabled).toBe(true))

    expect(adapter.generateDescription).toHaveBeenCalledTimes(3)
  })

  it('não mostra título editável quando o host usa título autoritativo', async () => {
    seedProject()
    const adapter = makeAdapter({
      titleEditable: false,
      presetDescription: 'Resumo configurado pelo professor.',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    expect(screen.queryByLabelText('Título')).toBeNull()
    await screen.findByDisplayValue('Resumo configurado pelo professor.')
    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    expect(pubArg(adapter)?.title).toBe('Meu Jogo')
  })

  it('SEM generateDescription (aula) → sem botão de IA; publica com o resumo do admin', async () => {
    seedProject()
    const adapter = makeAdapter({
      generateDescription: undefined,
      titleEditable: false,
      presetDescription: 'Resumo definido pelo professor.',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Resumo definido pelo professor.')
    // Sem IA: o botão "Gerar/Regerar" não existe e a auto-geração não roda.
    expect(screen.queryByRole('button', { name: 'Gerar resumo com a IA' })).toBeNull()
    expect(adapter.generateDescription).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
  })

  it('usa a capa da aventura (preset) → publica com useAdminCover e sem coverDataUrl', async () => {
    seedProject()
    const adapter = makeAdapter({ presetCoverUrl: 'https://cdn.example.com/capa.webp' })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa da aventura' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(pubArg(adapter)?.useAdminCover).toBe(true)
    expect(pubArg(adapter)?.coverDataUrl).toBeNull()
  })
})
