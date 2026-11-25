import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import type { StudioPythonPublication } from '@sistemazero/core/studio/python-publication'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('Python Classic persists its publication link, reopens history, restores and disables that link', async () => {
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
    await screen.findByText('Copiar link de jogar')
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
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Restaurar no link' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar no link' }))
    await waitFor(() => expect(history.activate).toHaveBeenCalledTimes(1))
    expect((history.activate as ReturnType<typeof mock>).mock.calls[0]?.[0]).toMatchObject({
      playId,
      expectedVersion: 2,
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
    await screen.findByText('Copiar link de jogar')
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
      await screen.findByText('Copiar link de jogar')
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
    expect(screen.queryByText('Copiar link de jogar')).toBeNull()
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

  it('com onPublished, fecha e deixa o host comemorar; com showPublishedScreen, mostra o link', async () => {
    for (const showPublishedScreen of [false, true]) {
      seedProject()
      const onPublished = mock(() => {})
      const onClose = mock(() => {})
      const adapter = makeAdapter({ onPublished, showPublishedScreen })
      render(<ShareDialog open onClose={onClose} adapter={adapter} />)
      await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
      fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
      const publicar = () => screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement
      await waitFor(() => expect(publicar().disabled).toBe(false))
      fireEvent.click(publicar())
      await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1))
      if (showPublishedScreen) {
        await screen.findByText('Copiar link de jogar')
        expect(onClose).not.toHaveBeenCalled()
      } else {
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(screen.queryByText('Copiar link de jogar')).toBeNull()
      }
      cleanup()
    }
  })

  it('trava a IA em 3 gerações por abertura (automática + cliques)', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    // Geração automática na abertura = 1ª. O botão tem aria-label ESTÁVEL.
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    const btn = () =>
      screen.getByRole('button', { name: 'Gerar resumo com o Zappy' }) as HTMLButtonElement

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
    expect(screen.queryByRole('button', { name: 'Gerar resumo com o Zappy' })).toBeNull()
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

describe('ShareDialog: republicar atualiza o post do projeto', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    setProjectStorageNamespace('')
  })
  const published = {
    published: true,
    playId: '11111111-1111-4111-8111-111111111111',
    title: 'Nave no Mural',
    description: 'A descrição que está no Mural.',
    coverUrl: 'https://cover.test/now.png',
    history: false,
  }

  it('preserva o resumo escrito enquanto consulta um projeto ainda sem post', async () => {
    seedProject()
    let answer!: (value: { published: false }) => void
    const adapter = makeAdapter({
      status: () =>
        new Promise((done) => {
          answer = done
        }),
      presetCoverUrl: 'https://cover.test/qa.png',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Resumo do projeto' }), {
      target: { value: 'O cenário que eu desenhei.' },
    })
    await act(async () => answer({ published: false }))
    expect(
      (screen.getByRole('textbox', { name: 'Resumo do projeto' }) as HTMLTextAreaElement).value,
    ).toBe('O cenário que eu desenhei.')
    expect(adapter.generateDescription).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa da aventura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(adapter.publish).toHaveBeenCalledTimes(1))
    expect(pubArg(adapter)).toMatchObject({ description: 'O cenário que eu desenhei.' })
  })

  it('a consulta atrasada do post conserva o título e resumo já editados', async () => {
    seedProject()
    let answer!: (value: typeof published & { unchanged: boolean }) => void
    const adapter = makeAdapter({
      status: () =>
        new Promise((done) => {
          answer = done
        }),
      publish: mock(async () => ({ playUrl: '/jogar/x', updated: true })),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), {
      target: { value: 'Minha ilha nova' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Resumo do projeto' }), {
      target: { value: 'Mudei as peças da ilha.' },
    })
    await act(async () => answer({ ...published, unchanged: false }))
    await screen.findByText('Atualizar no Mural dos Criadores')
    expect((screen.getByRole('textbox', { name: 'Título' }) as HTMLInputElement).value).toBe(
      'Minha ilha nova',
    )
    expect(
      (screen.getByRole('textbox', { name: 'Resumo do projeto' }) as HTMLTextAreaElement).value,
    ).toBe('Mudei as peças da ilha.')
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(adapter.publish).toHaveBeenCalledTimes(1))
    expect(pubArg(adapter)).toMatchObject({
      title: 'Minha ilha nova',
      description: 'Mudei as peças da ilha.',
      keepCover: true,
    })
  })

  it('abre com o post de agora, mantém a capa e manda keepCover ao atualizar', async () => {
    seedProject()
    const status = mock(async () => ({ ...published, unchanged: false }))
    const adapter = makeAdapter({
      status,
      publish: mock(async () => ({ playUrl: '/jogar/x', updated: true })),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    await screen.findByText('Atualizar no Mural dos Criadores')
    expect((status.mock.calls[0] as unknown[])[0]).toMatchObject({ compare: true })
    expect(
      (screen.getByRole('textbox', { name: 'Resumo do projeto' }) as HTMLTextAreaElement).value,
    ).toBe('A descrição que está no Mural.')
    expect(screen.getByText('Usando a capa que o post já tem.')).toBeTruthy()
    // A descrição já existe: a IA não rascunha outra.
    expect(adapter.generateDescription).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await screen.findByText('Seu jogo foi atualizado! 🎉')
    expect(pubArg(adapter)).toMatchObject({ keepCover: true, coverDataUrl: null })
    expect(pubArg(adapter).asNewPost).toBeUndefined()
  })

  it('a capa escolhida enquanto o status carrega não é trocada pela do post', async () => {
    seedProject()
    let answer!: (value: typeof published & { unchanged: boolean }) => void
    const adapter = makeAdapter({
      status: () =>
        new Promise((done) => {
          answer = done
        }),
      publish: mock(async () => ({ playUrl: '/jogar/x', updated: true })),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() => expect(document.querySelector('img[src^="data:image/png"]')).toBeTruthy())
    answer({ ...published, unchanged: false })
    await screen.findByText('Atualizar no Mural dos Criadores')
    expect(screen.queryByText('Usando a capa que o post já tem.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(adapter.publish).toHaveBeenCalledTimes(1))
    expect(pubArg(adapter)).toMatchObject({ coverDataUrl: 'data:image/png;base64,FAKECOVER' })
    expect(pubArg(adapter).keepCover).toBeUndefined()
  })

  it('jogo igual ao do Mural: avisa e não deixa atualizar', async () => {
    seedProject()
    const adapter = makeAdapter({
      status: mock(async () => ({ ...published, unchanged: true })),
      unchangedMessage: 'Envie a nova versão à equipe para atualizar no Mural.',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    await screen.findByText('Envie a nova versão à equipe para atualizar no Mural.')
    expect((screen.getByRole('button', { name: 'Atualizar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('"Publicar como jogo novo" fica escondido e volta ao fluxo de publicar', async () => {
    seedProject()
    const adapter = makeAdapter({
      allowNewPost: true,
      status: mock(async () => ({ ...published, unchanged: true })),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    await screen.findByText('Outras formas de publicar')
    fireEvent.click(screen.getByRole('checkbox', { name: /Publicar como jogo novo/ }))
    await screen.findByText('Compartilhar no Mural dos Criadores')
    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(adapter.publish).toHaveBeenCalledTimes(1))
    expect(pubArg(adapter)).toMatchObject({ asNewPost: true })
    expect(pubArg(adapter).keepCover).toBeUndefined()
  })

  it('sem post ainda, o diálogo é o de publicar e não mostra a opção escondida', async () => {
    seedProject()
    const adapter = makeAdapter({
      allowNewPost: true,
      status: mock(async () => ({ published: false })),
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)
    await screen.findByText('Compartilhar no Mural dos Criadores')
    await waitFor(() => expect(adapter.generateDescription).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Outras formas de publicar')).toBeNull()
  })
})
