import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageRecipe } from '@sistemazero/core/studio/pinta-image'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { fakeUseStore } from '../../../testing/fakeIdbStore'

/**
 * Modal "Trazer do Pinta" (fluxo pull) + o botão no AssetsPanel.
 *
 * Arquivo à parte (molde do AssetsPanelEditDrawing.test.tsx): precisa do mock de
 * idb-keyval — o registry de module mocks é global, cada arquivo carrega o seu.
 */
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
const kvOf = (store?: { name?: string }): KV => {
  const key = store?.name ?? ''
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
  }
  return kv
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => fakeUseStore(dbName),
  get: async (key: IDBValidKey, store?: { name?: string }) => kvOf(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => kvOf(store).get(key)),
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
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const { createEmptyProject } = await import('#core')
const { setPersonalAssetsNamespace } = await import('../../../asset-library/personal')
const { releaseDrawingSyncProfile } = await import('../../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../../state/persistence')
const { useProjectStore } = await import('../../../state/projectStore')
const { StudioPintaLibraryProvider } = await import('../../../studio/pinta-library')
type PintaLibraryAdapter = import('../../../studio/pinta-library').StudioPintaLibraryAdapter
type DrawingSummary = import('../../../studio/pinta-library').StudioPintaDrawingSummary
const { AssetsPanel } = await import('../AssetsPanel')
const { filterPintaDrawings, PintaImportDialog } = await import('../PintaImportDialog')
const { documentFixture } = await import('../../../state/fixtures/projectDocuments')
const { refinePythonProjectDocument } = await import('../../../state/pythonProjectValidation')
const { addPintaCreationToProject } = await import('../addCreationToProject')

const PNG = 'data:image/png;base64,AAAA'
const PORTABLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const portableBytes = Buffer.from(PORTABLE_PNG.split(',')[1]!, 'base64')
function portableImage(recipe: PintaImageRecipe) {
  return {
    dataUrl: PORTABLE_PNG,
    derivation: {
      recipe: structuredClone(recipe),
      provenance: {
        sourceSha256: 'a'.repeat(64),
        dependencies:
          recipe.selection.kind === 'tilemap'
            ? [{ drawingId: 'tileset', sha256: 'c'.repeat(64) }]
            : [],
      },
      output: {
        mime: 'image/png' as const,
        width: 1,
        height: 1,
        bytes: portableBytes.length,
        sha256: createHash('sha256').update(portableBytes).digest('hex'),
      },
    },
  }
}
const SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>')}`

const DRAWINGS: DrawingSummary[] = [
  {
    id: 'd1',
    name: 'dragao-pintado',
    role: 'sprite',
    style: 'pixel',
    updatedAt: 2,
    thumbDataUrl: PNG,
  },
  {
    id: 'd2',
    name: 'ceu-azul',
    role: 'background',
    style: 'vector',
    updatedAt: 1,
    thumbDataUrl: null,
    projectName: 'meu-jogo',
  },
]

function fakeAdapter(
  overrides: Partial<PintaLibraryAdapter> = {},
): PintaLibraryAdapter & { importCalls: string[] } {
  const importCalls: string[] = []
  return {
    importCalls,
    list: async () => DRAWINGS,
    import: async (id: string) => {
      importCalls.push(id)
      const drawing = DRAWINGS.find((d) => d.id === id)
      if (!drawing) return { ok: false as const, error: 'sumiu', code: 'not-found' as const }
      return {
        ok: true as const,
        asset: { id: drawing.id, name: drawing.name, dataUrl: PNG, width: 8, height: 8 },
      }
    },
    ...overrides,
  }
}

function pythonAdapter(overrides: Partial<PintaLibraryAdapter> = {}): PintaLibraryAdapter {
  return fakeAdapter({
    list: async () => [
      {
        ...DRAWINGS[0]!,
        imageSelection: {
          kind: 'frame',
          width: 1,
          height: 1,
          animations: [{ id: 'andar', name: 'andar', frameCount: 2 }],
        },
      },
    ],
    previewImage: async (recipe) => portableImage(recipe),
    import: async (id, options) => {
      if (!options?.image) throw new Error('Explicit recipe required')
      const image = portableImage(options.image.recipe)
      return {
        ok: true,
        asset: {
          id,
          name: 'dragao-pintado',
          dataUrl: image.dataUrl,
          pintaImage: image.derivation,
          width: 1,
          height: 1,
        },
      }
    },
    ...overrides,
  })
}

async function choosePythonImage() {
  fireEvent.click((await screen.findAllByRole('button', { name: 'Escolher imagem' }))[0]!)
  await screen.findByAltText('Prévia da imagem escolhida')
}

function selectedValue(label: string): string {
  const element = screen.getByLabelText(label)
  if (!(element instanceof HTMLSelectElement)) throw new Error(`Expected a select: ${label}`)
  return element.value
}

function buttonDisabled(name: string): boolean {
  const element = screen.getByRole('button', { name })
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Expected a button: ${name}`)
  return element.disabled
}

async function seedPythonProject(kind: 'classic' | 'pro' = 'classic') {
  const raw = documentFixture('python', kind)
  raw.assets = []
  const project = await refinePythonProjectDocument(raw)
  useProjectStore.setState({ project, editingAccess: 'author', isDirty: false })
  return project
}

function seedProject(): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

function renderPanel(adapter: PintaLibraryAdapter | null) {
  return render(
    <StudioPintaLibraryProvider value={adapter}>
      <AssetsPanel open onClose={() => {}} />
    </StudioPintaLibraryProvider>,
  )
}

async function openDialog(adapter: PintaLibraryAdapter | null): Promise<void> {
  renderPanel(adapter)
  fireEvent.click(await screen.findByRole('button', { name: /Trazer do Pinta/ }))
}

beforeEach(() => {
  dbs.clear()
  localStorage.clear()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('perfil-1')
  setPersonalAssetsNamespace('perfil-1')
  seedProject()
})

afterEach(() => {
  cleanup()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('AssetsPanel — botão "Trazer do Pinta"', () => {
  it('sem o adapter (aula/admin): sem botão e a seção "Meus desenhos" continua', async () => {
    renderPanel(null)
    await waitFor(() => {
      expect(screen.getByText('Meus desenhos')).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Trazer do Pinta/ })).toBeNull()
  })

  it('com o adapter: botão presente e a seção "Meus desenhos" SOME (a modal a substitui)', async () => {
    renderPanel(fakeAdapter())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Trazer do Pinta/ })).toBeTruthy()
    })
    expect(screen.queryByText('Meus desenhos')).toBeNull()
  })
})

describe('PintaImportDialog', () => {
  it('atualiza a cópia raster antiga de um vetor sem trocar o nome usado pelos blocos', async () => {
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.assets = [
      {
        id: 'a-vetor',
        name: 'ceu-que-meus-blocos-usam',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:d2',
        libOrigin: 'pinta',
        width: 64,
        height: 64,
      },
    ]
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    await openDialog(
      fakeAdapter({
        import: async () => ({
          ok: true,
          asset: { id: 'd2', name: 'ceu-azul', dataUrl: SVG, width: 64, height: 64 },
        }),
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Trazer do Pinta' })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Atualizar vetor' }))
    await waitFor(() => {
      expect(useProjectStore.getState().project?.assets?.[0]).toMatchObject({
        id: 'a-vetor',
        name: 'ceu-que-meus-blocos-usam',
        dataUrl: SVG,
      })
    })
    expect(within(dialog).queryByRole('button', { name: 'Atualizar vetor' })).toBeNull()
  })

  it('lista a galeria e a busca filtra sem acento/caixa', async () => {
    await openDialog(fakeAdapter())
    await waitFor(() => {
      expect(screen.getByText('dragao-pintado')).toBeTruthy()
    })
    expect(screen.getByText('ceu-azul')).toBeTruthy()
    // Miniatura ausente → emoji do papel; presente → <img>. ⚠️ Escopado NA MODAL:
    // a aba "Imagens" da janela atrás usa o mesmo emoji, e `getByText` não
    // respeita `aria-hidden` — solto, ele acha dois e falha por ambiguidade.
    const galeria = screen.getByRole('dialog', { name: 'Trazer do Pinta' })
    expect(within(galeria).getByText('🖼️')).toBeTruthy()

    const search = screen.getByRole('searchbox', { name: 'Buscar desenhos' })
    fireEvent.change(search, { target: { value: 'Dragão' } })
    expect(screen.getByText('dragao-pintado')).toBeTruthy()
    expect(screen.queryByText('ceu-azul')).toBeNull()

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.getByText('Nenhum desenho combina com essa busca.')).toBeTruthy()
  })

  it('importa: chama o adapter, faz o addAsset com libId personal:<id> e FICA aberta com o selo', async () => {
    const adapter = fakeAdapter()
    await openDialog(adapter)
    const [add] = await screen.findAllByRole('button', { name: 'Adicionar ao projeto' })
    if (!add) throw new Error('botão esperado')
    fireEvent.click(add)

    await waitFor(() => {
      expect(screen.getByText('✓ no projeto')).toBeTruthy()
    })
    expect(adapter.importCalls).toEqual(['d1'])
    const assets = useProjectStore.getState().project?.assets ?? []
    expect(assets.length).toBe(1)
    expect(assets[0]).toMatchObject({
      name: 'dragao-pintado',
      source: 'library',
      libId: 'personal:d1',
      // Quem edita este desenho é o Pinta (o "✏️ Editar" abre lá).
      libOrigin: 'pinta',
    })
    // Modal segue aberta; o card importado perde o botão (só o selinho fica) e
    // o OUTRO desenho continua adicionável.
    expect(screen.getAllByRole('button', { name: 'Adicionar ao projeto' })).toHaveLength(1)
  })

  it('já no projeto ao abrir: SÓ o selinho, sem botão de adicionar naquele card', async () => {
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.assets = [
      {
        id: 'a1',
        name: 'dragao-pintado',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:d1',
      },
    ]
    useProjectStore.setState({ project, isDirty: false, saveError: null })

    await openDialog(fakeAdapter())
    await waitFor(() => {
      expect(screen.getByText('✓ no projeto')).toBeTruthy()
    })
    // Nada de "Adicionar de novo": o único botão de adicionar é o do OUTRO
    // desenho (ceu-azul), que ainda não está no projeto.
    expect(screen.queryByRole('button', { name: /Adicionar de novo/ })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Adicionar ao projeto' })).toHaveLength(1)
  })

  it('erro do adapter aparece na modal; desenho apagado (not-found) sai da lista', async () => {
    const adapter = fakeAdapter({
      import: async () => ({
        ok: false as const,
        error: 'Esse desenho sumiu.',
        code: 'not-found' as const,
      }),
    })
    await openDialog(adapter)
    const [add] = await screen.findAllByRole('button', { name: 'Adicionar ao projeto' })
    if (!add) throw new Error('botão esperado')
    fireEvent.click(add)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Esse desenho sumiu.')
    })
    expect(screen.queryByText('dragao-pintado')).toBeNull()
    expect(useProjectStore.getState().project?.assets ?? []).toEqual([])
  })

  it('lista rejeitada mostra erro com "Tentar de novo"', async () => {
    let fail = true
    const adapter = fakeAdapter({
      list: async () => {
        if (fail) throw new Error('offline')
        return DRAWINGS
      },
    })
    await openDialog(adapter)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Não consegui abrir a sua galeria do Pinta agora.',
      )
    })
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByText('dragao-pintado')).toBeTruthy()
    })
  })
})

describe('filterPintaDrawings (puro)', () => {
  it('vazio devolve tudo; acento/caixa não importam; nome do jogo também busca', () => {
    expect(filterPintaDrawings(DRAWINGS, '')).toHaveLength(2)
    expect(filterPintaDrawings(DRAWINGS, 'DRAGÃO').map((d) => d.id)).toEqual(['d1'])
    expect(filterPintaDrawings(DRAWINGS, 'céu').map((d) => d.id)).toEqual(['d2'])
    expect(filterPintaDrawings(DRAWINGS, 'meu-jogo').map((d) => d.id)).toEqual(['d2'])
    expect(filterPintaDrawings(DRAWINGS, 'nada')).toHaveLength(0)
  })
})

describe('Pinta import intent lifetime', () => {
  for (const change of ['close', 'profile-aba'] as const) {
    it(`discards a pending gallery response after ${change}`, async () => {
      const pending = Promise.withResolvers<DrawingSummary[]>()
      let signal: AbortSignal | undefined
      render(
        <StudioPintaLibraryProvider
          value={fakeAdapter({
            list: (options) => {
              signal = options?.signal
              return pending.promise
            },
          })}
        >
          <PintaImportDialog onClose={() => {}} />
        </StudioPintaLibraryProvider>,
      )
      await act(async () => {
        if (change === 'close')
          fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!)
        else {
          setStorageNamespace('perfil-2')
          setStorageNamespace('perfil-1')
        }
        pending.resolve(DRAWINGS)
        await pending.promise
      })
      expect(signal?.aborted).toBe(true)
      expect(screen.queryByText('dragao-pintado') === null).toBe(true)
    })
  }

  for (const change of [
    'close',
    'unmount',
    'project',
    'project-aba',
    'adapter',
    'possession',
    'profile-aba',
    'observer-aba',
  ] as const) {
    it(`discards an imported image after ${change}`, async () => {
      const raw = documentFixture('python', 'classic')
      raw.assets = []
      delete raw.coverAssetName
      const original = await refinePythonProjectDocument(raw)
      useProjectStore.setState({ project: original, editingAccess: 'author', isDirty: false })
      const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
      let signal: AbortSignal | undefined
      const adapter = pythonAdapter({
        import: (_id, options) => {
          signal = options?.signal
          return pending.promise
        },
      })
      const imported = mock(() => {})
      const closed = mock(() => {})
      const content = (value: PintaLibraryAdapter | null) => (
        <StudioPintaLibraryProvider value={value}>
          <PintaImportDialog onClose={closed} onImported={imported} />
        </StudioPintaLibraryProvider>
      )
      const view = render(content(adapter))
      await choosePythonImage()
      fireEvent.click(await screen.findByRole('button', { name: 'Adicionar imagem' }))
      await waitFor(() => expect(signal).toBeDefined())
      await act(async () => {
        if (change === 'close')
          fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!)
        else if (change === 'unmount') view.unmount()
        else if (change === 'adapter' || change === 'possession')
          view.rerender(content(change === 'adapter' ? fakeAdapter() : null))
        else if (change === 'profile-aba') {
          setStorageNamespace('perfil-2')
          setStorageNamespace('perfil-1')
        } else if (change === 'observer-aba') {
          useProjectStore.getState().setEditingAccess('observer')
          useProjectStore.getState().setEditingAccess('author')
        } else {
          useProjectStore.setState({ project: { ...original, id: 'project-B' } })
          if (change === 'project-aba') useProjectStore.setState({ project: original })
        }
      })
      expect(signal?.aborted).toBe(true)
      await act(async () => {
        pending.resolve({ ok: true, asset: { id: 'd1', name: 'dragao-pintado', dataUrl: PNG } })
        await pending.promise
      })
      expect(useProjectStore.getState().project?.assets).toEqual([])
      expect(useProjectStore.getState().isDirty).toBe(false)
      expect(imported).not.toHaveBeenCalled()
      if (change === 'close') expect(closed).toHaveBeenCalledTimes(1)
    })
  }

  it('admits one synchronous import and preserves ordinary source edits in StrictMode', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
    const run = mock(() => pending.promise)
    const imported = mock(() => {})
    render(
      <StrictMode>
        <StudioPintaLibraryProvider value={fakeAdapter({ import: run })}>
          <PintaImportDialog onClose={() => {}} onImported={imported} />
        </StudioPintaLibraryProvider>
      </StrictMode>,
    )
    const add = (await screen.findAllByRole('button', { name: 'Adicionar ao projeto' }))[0]!
    await act(async () => {
      add.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      add.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      const project = useProjectStore.getState().project!
      useProjectStore.setState({ project: { ...project, name: 'Nome editado durante importação' } })
    })
    expect(run).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve({ ok: true, asset: { id: 'd1', name: 'dragao-pintado', dataUrl: PNG } })
      await pending.promise
    })
    expect(useProjectStore.getState().project?.name).toBe('Nome editado durante importação')
    expect(useProjectStore.getState().project?.assets).toHaveLength(1)
    expect(imported).toHaveBeenCalledTimes(1)
  })

  for (const change of ['edit', 'replace'] as const)
    it(`a same-id document ${change === 'edit' ? 'edit keeps' : 'replacement cancels'} the pending import`, async () => {
      const { installLocalRevision } = await import('../../../state/projectStorageRevision')
      const stamped = installLocalRevision(createEmptyProject('p1', 'Meu Jogo'), 'perfil-1')
      useProjectStore.setState({ project: stamped, editingAccess: 'author', isDirty: false })
      const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
      let signal: AbortSignal | undefined
      const imported = mock(() => {})
      render(
        <StudioPintaLibraryProvider
          value={fakeAdapter({
            import: (_id, options) => {
              signal = options?.signal
              return pending.promise
            },
          })}
        >
          <PintaImportDialog onClose={() => {}} onImported={imported} />
        </StudioPintaLibraryProvider>,
      )
      fireEvent.click((await screen.findAllByRole('button', { name: 'Adicionar ao projeto' }))[0]!)
      await waitFor(() => expect(signal).toBeDefined())
      act(() => {
        // Reopening the same id (host replacement, another revision) forks the local lineage.
        if (change === 'replace') useProjectStore.getState().hydrateProject(stamped)
        else useProjectStore.getState().rename('Nome editado durante importação')
      })
      expect(signal?.aborted).toBe(change === 'replace')
      await act(async () => {
        pending.resolve({ ok: true, asset: { id: 'd1', name: 'dragao-pintado', dataUrl: PNG } })
        await pending.promise
      })
      const state = useProjectStore.getState()
      expect(state.project?.id).toBe('p1')
      if (change === 'replace') {
        expect(state.project?.assets ?? []).toEqual([])
        expect(state.isDirty).toBe(false)
        expect(imported).not.toHaveBeenCalled()
      } else {
        expect(state.project?.name).toBe('Nome editado durante importação')
        expect(state.project?.assets).toHaveLength(1)
        expect(imported).toHaveBeenCalledTimes(1)
      }
    })

  it('does not show a late failure after closing even if the parent keeps the component mounted', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
    render(
      <StudioPintaLibraryProvider value={fakeAdapter({ import: () => pending.promise })}>
        <PintaImportDialog onClose={() => {}} />
      </StudioPintaLibraryProvider>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Adicionar ao projeto' }))[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!)
    await act(async () => {
      pending.resolve({ ok: false, error: 'falha tardia' })
      await pending.promise
    })
    expect(screen.queryByText('falha tardia') === null).toBe(true)
  })
})

describe('Python image selection through the real modal and project store', () => {
  it('making the legacy JavaScript default explicit does not revoke an ordinary pending import', async () => {
    const original = createEmptyProject('legacy-js', 'JavaScript antigo')
    useProjectStore.setState({ project: original, editingAccess: 'author', isDirty: false })
    const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
    let signal: AbortSignal | undefined
    const imported = mock(() => {})
    render(
      <StudioPintaLibraryProvider
        value={fakeAdapter({
          import: (_id, options) => {
            signal = options?.signal
            return pending.promise
          },
        })}
      >
        <PintaImportDialog onClose={() => {}} onImported={imported} />
      </StudioPintaLibraryProvider>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Adicionar ao projeto' }))[0]!)
    await waitFor(() => expect(signal).toBeDefined())
    act(() => {
      useProjectStore.setState({ project: { ...original, programmingLanguage: 'javascript' } })
    })
    expect(signal?.aborted).toBe(false)
    await act(async () => {
      pending.resolve({ ok: true, asset: { id: 'd1', name: 'dragao-pintado', dataUrl: PNG } })
      await pending.promise
    })
    expect(useProjectStore.getState().project?.assets).toHaveLength(1)
    expect(imported).toHaveBeenCalledTimes(1)
  })

  for (const kind of ['classic', 'pro'] as const) {
    for (const phase of ['preview-pending', 'import-pending', 'preview-ready'] as const) {
      it(`${kind}: same-ID programmingLanguage ABA revokes ${phase}`, async () => {
        const original = await seedPythonProject(kind)
        const middle = createEmptyProject(original.id, 'JavaScript no mesmo ID')
        middle.programmingLanguage = 'javascript'
        const previewPending = Promise.withResolvers<ReturnType<typeof portableImage>>()
        const importPending =
          Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
        let previewSignal: AbortSignal | undefined
        let importSignal: AbortSignal | undefined
        let recipe: PintaImageRecipe | undefined
        const importer = mock(
          (_id: string, options?: Parameters<PintaLibraryAdapter['import']>[1]) => {
            importSignal = options?.signal
            return importPending.promise
          },
        )
        const imported = mock(() => {})
        render(
          <StudioPintaLibraryProvider
            value={pythonAdapter({
              previewImage: (input, _limits, options) => {
                recipe = structuredClone(input)
                previewSignal = options?.signal
                return phase === 'preview-pending'
                  ? previewPending.promise
                  : Promise.resolve(portableImage(input))
              },
              import: importer,
            })}
          >
            <PintaImportDialog onClose={() => {}} onImported={imported} />
          </StudioPintaLibraryProvider>,
        )
        fireEvent.click((await screen.findAllByRole('button', { name: 'Escolher imagem' }))[0]!)
        await waitFor(() => expect(previewSignal).toBeDefined())
        let confirm: HTMLElement | undefined
        if (phase !== 'preview-pending') {
          await screen.findByAltText('Prévia da imagem escolhida')
          confirm = screen.getByRole('button', { name: 'Adicionar imagem' })
          if (phase === 'import-pending') {
            fireEvent.click(confirm)
            await waitFor(() => expect(importSignal).toBeDefined())
          }
        }
        act(() => {
          useProjectStore.setState({ project: middle })
          useProjectStore.setState({ project: original })
        })
        // Same project id and final language must not revive the old intention.
        await act(async () => {
          if (phase === 'preview-pending') {
            previewPending.resolve(portableImage(recipe!))
            await previewPending.promise
          } else if (phase === 'import-pending') {
            const image = portableImage(recipe!)
            importPending.resolve({
              ok: true,
              asset: {
                id: 'd1',
                name: 'imagem-tardia',
                dataUrl: image.dataUrl,
                width: 1,
                height: 1,
                pintaImage: image.derivation,
              },
            })
            await importPending.promise
          } else if (confirm) {
            fireEvent.click(confirm)
          }
        })
        expect(useProjectStore.getState().project).toEqual(original)
        expect(useProjectStore.getState().isDirty).toBe(false)
        expect(imported).not.toHaveBeenCalled()
        expect(screen.queryByAltText('Prévia da imagem escolhida') === null).toBe(true)
        expect(previewSignal?.aborted).toBe(true)
        if (phase === 'import-pending') expect(importSignal?.aborted).toBe(true)
        else expect(importer).not.toHaveBeenCalled()
      })
    }
  }

  it('the asset panel reopens the recorded frame for review, preserving the other image', async () => {
    await seedPythonProject('pro')
    for (const frameIndex of [0, 1]) {
      const image = portableImage({
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'd1',
        selection: { kind: 'frame', animationId: 'andar', frameIndex },
        scale: 1,
      })
      expect(
        addPintaCreationToProject(useProjectStore.getState(), {
          id: 'd1',
          name: 'heroi',
          dataUrl: image.dataUrl,
          width: 1,
          height: 1,
          pintaImage: image.derivation,
        }),
      ).toBeNull()
    }
    const previous = structuredClone(useProjectStore.getState().project!.assets!)
    const importer = mock(async () => ({ ok: false as const, error: 'preview only' }))
    renderPanel(pythonAdapter({ import: importer }))
    const review = await screen.findAllByRole('button', { name: 'Rever imagem escolhida' })
    expect(review).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /fatiar/ })).toBeNull()
    fireEvent.click(review[1]!)
    await screen.findByAltText('Prévia da imagem escolhida')
    expect(selectedValue('Quadro')).toBe('1')
    expect(importer).not.toHaveBeenCalled()
    expect(useProjectStore.getState().project?.assets).toEqual(previous)
  })

  for (const change of ['rename', 'remove'] as const) {
    it(`an import awaiting preparation cannot overwrite a concurrent ${change}`, async () => {
      await seedPythonProject('pro')
      const recipe: PintaImageRecipe = {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'd1',
        selection: { kind: 'frame', animationId: 'andar', frameIndex: 1 },
        scale: 1,
      }
      const image = portableImage(recipe)
      expect(
        addPintaCreationToProject(useProjectStore.getState(), {
          id: 'd1',
          name: 'heroi',
          dataUrl: image.dataUrl,
          width: 1,
          height: 1,
          pintaImage: image.derivation,
        }),
      ).toBeNull()
      const target = structuredClone(useProjectStore.getState().project!.assets![0]!)
      const pending = Promise.withResolvers<Awaited<ReturnType<PintaLibraryAdapter['import']>>>()
      const importer = mock(() => pending.promise)
      const onImported = mock(() => {})
      render(
        <StudioPintaLibraryProvider value={pythonAdapter({ import: importer })}>
          <PintaImportDialog initialTarget={target} onClose={() => {}} onImported={onImported} />
        </StudioPintaLibraryProvider>,
      )
      await screen.findByAltText('Prévia da imagem escolhida')
      fireEvent.click(screen.getByRole('button', { name: 'Atualizar esta imagem' }))
      await waitFor(() => expect(importer).toHaveBeenCalledTimes(1))
      act(() => {
        if (change === 'rename') useProjectStore.getState().renameAsset(target.id, 'renomeado')
        else useProjectStore.getState().removeAsset(target.id)
      })
      const afterEdit = structuredClone(useProjectStore.getState().project)
      await act(async () => {
        pending.resolve({
          ok: true,
          asset: {
            id: 'd1',
            name: 'heroi',
            dataUrl: image.dataUrl,
            width: 1,
            height: 1,
            pintaImage: image.derivation,
            libRevision: 999,
          },
        })
        await pending.promise
      })
      await screen.findByText(
        'Esta imagem mudou durante a preparação. Confira a seleção novamente.',
      )
      expect(useProjectStore.getState().project).toEqual(afterEdit)
      expect(onImported).not.toHaveBeenCalled()
    })
  }

  for (const kind of ['classic', 'pro'] as const) {
    it(`${kind}: preview does not import; explicit frames coexist and repeat selection updates only itself`, async () => {
      await seedPythonProject(kind)
      const selections: PintaImageRecipe[] = []
      const imports: PintaImageRecipe[] = []
      const listing = mock(async (options?: { includeImageSelection?: boolean }) => {
        expect(options?.includeImageSelection).toBe(true)
        return (await pythonAdapter().list()).map((item) => structuredClone(item))
      })
      const adapter = pythonAdapter({
        list: listing,
        previewImage: async (recipe) => {
          selections.push(structuredClone(recipe))
          return portableImage(recipe)
        },
        import: async (id, options) => {
          if (!options?.image) throw new Error('Explicit recipe required')
          imports.push(structuredClone(options.image.recipe))
          const image = portableImage(options.image.recipe)
          if (imports.length === 3) image.derivation.provenance.sourceSha256 = 'b'.repeat(64)
          return {
            ok: true,
            asset: {
              id,
              name: 'heroi',
              dataUrl: image.dataUrl,
              width: 1,
              height: 1,
              pintaImage: image.derivation,
              libRevision: imports.length,
            },
          }
        },
      })
      render(
        <StudioPintaLibraryProvider value={adapter}>
          <PintaImportDialog onClose={() => {}} />
        </StudioPintaLibraryProvider>,
      )
      await choosePythonImage()
      expect(imports).toEqual([])
      expect(useProjectStore.getState().project?.assets).toEqual([])
      expect(selectedValue('Quadro')).toBe('0')
      expect(selectedValue('Tamanho')).toBe('1')
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar imagem' }))
      await waitFor(() => expect(useProjectStore.getState().project?.assets).toHaveLength(1))
      const first = structuredClone(useProjectStore.getState().project!.assets![0]!)
      fireEvent.change(screen.getByLabelText('Quadro'), { target: { value: '1' } })
      await waitFor(() => expect(buttonDisabled('Adicionar imagem')).toBe(false))
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar imagem' }))
      await waitFor(() => expect(useProjectStore.getState().project?.assets).toHaveLength(2))
      const second = structuredClone(useProjectStore.getState().project!.assets![1]!)
      expect(first.id).not.toBe(second.id)
      expect(first.proPath).toBe('assets/heroi.png')
      expect(second.proPath).toBe('assets/heroi-2.png')
      fireEvent.change(screen.getByLabelText('Quadro'), { target: { value: '0' } })
      await waitFor(() => expect(buttonDisabled('Atualizar esta imagem')).toBe(false))
      fireEvent.click(screen.getByRole('button', { name: 'Atualizar esta imagem' }))
      await waitFor(() =>
        expect(useProjectStore.getState().project?.assets?.[0]?.libRevision).toBe(3),
      )
      expect(useProjectStore.getState().project?.assets?.[0]?.id).toBe(first.id)
      expect(useProjectStore.getState().project?.assets?.[0]?.proPath).toBe(first.proPath)
      expect(useProjectStore.getState().project?.assets?.[1]).toEqual(second)
      expect(selections.map((recipe) => recipe.selection)).toEqual([
        { kind: 'frame', animationId: 'andar', frameIndex: 0 },
        { kind: 'frame', animationId: 'andar', frameIndex: 1 },
        { kind: 'frame', animationId: 'andar', frameIndex: 0 },
      ])
    })
  }

  for (const destination of ['python-pgzero', 'python-turtle', 'none'] as const) {
    it(`${destination}: the destination decides the format of a vector and of a pixel drawing`, async () => {
      const raw = documentFixture('python', 'classic')
      raw.assets = []
      if (destination !== 'none')
        raw.installedExtensions = [{ id: destination, version: '1.0.0', installedAt: 1 }]
      useProjectStore.setState({
        project: await refinePythonProjectDocument(raw),
        editingAccess: 'author',
        isDirty: false,
      })
      const svgText =
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'
      const svgBytes = Buffer.from(svgText)
      const image = (recipe: PintaImageRecipe) => {
        const png = portableImage(recipe)
        return recipe.output === 'svg'
          ? {
              dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`,
              derivation: {
                ...png.derivation,
                output: {
                  mime: 'image/svg+xml' as const,
                  width: 1,
                  height: 1,
                  bytes: svgBytes.length,
                  sha256: createHash('sha256').update(svgBytes).digest('hex'),
                },
              },
            }
          : png
      }
      const previews: PintaImageRecipe[] = []
      const adapter = pythonAdapter({
        list: async () => [
          {
            ...DRAWINGS[1]!,
            imageSelection: { kind: 'background', width: 1, height: 1, vector: true },
          },
          {
            ...DRAWINGS[0]!,
            imageSelection: {
              kind: 'frame',
              width: 1,
              height: 1,
              animations: [{ id: 'andar', name: 'andar', frameCount: 1 }],
            },
          },
        ],
        previewImage: async (recipe) => {
          previews.push(structuredClone(recipe))
          return image(recipe)
        },
        import: async (id, options) => {
          if (!options?.image) throw new Error('Explicit recipe required')
          const result = image(options.image.recipe)
          return {
            ok: true,
            asset: {
              id,
              name: id === 'd2' ? 'ceu-azul' : 'dragao-pintado',
              dataUrl: result.dataUrl,
              pintaImage: result.derivation,
              width: 1,
              height: 1,
            },
          }
        },
      })
      render(
        <StudioPintaLibraryProvider value={adapter}>
          <PintaImportDialog onClose={() => {}} />
        </StudioPintaLibraryProvider>,
      )
      for (const index of [0, 1]) {
        // An added drawing's card says "Escolher outra imagem"; the order stays the gallery's.
        const choose = await screen.findAllByRole('button', { name: /^Escolher (outra )?imagem$/ })
        expect(choose).toHaveLength(2)
        fireEvent.click(choose[index]!)
        await screen.findByAltText('Prévia da imagem escolhida')
        // Only the vector drawing announces the SVG; in Turtle it becomes a turtle shape.
        expect(screen.queryByText(/entra como vetor \(SVG\)/) !== null).toBe(
          destination !== 'none' && index === 0,
        )
        expect(screen.queryByText(/vira uma forma da tartaruga/) !== null).toBe(
          destination === 'python-turtle' && index === 0,
        )
        await waitFor(() => expect(buttonDisabled('Adicionar imagem')).toBe(false))
        fireEvent.click(screen.getByRole('button', { name: 'Adicionar imagem' }))
        await waitFor(() =>
          expect(useProjectStore.getState().project?.assets).toHaveLength(index + 1),
        )
        fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
      }
      const assets = useProjectStore.getState().project?.assets ?? []
      expect(previews.map((recipe) => recipe.output)).toEqual(
        destination === 'none' ? [undefined, undefined] : ['svg', undefined],
      )
      expect(assets.map((asset) => asset.proPath)).toEqual(
        destination === 'python-pgzero'
          ? ['images/ceu_azul.svg', 'images/dragao_pintado.png']
          : destination === 'python-turtle'
            ? ['assets/ceu-azul.svg', 'assets/dragao-pintado.png']
            : ['assets/ceu-azul.png', 'assets/dragao-pintado.png'],
      )
      expect(assets.map((asset) => asset.pintaImage?.output.mime)).toEqual(
        destination === 'none' ? ['image/png', 'image/png'] : ['image/svg+xml', 'image/png'],
      )
    })
  }

  it('a changed frame revokes its pending preview; the late image never replaces the current choice', async () => {
    await seedPythonProject()
    const first = Promise.withResolvers<ReturnType<typeof portableImage>>()
    const requests: Array<{ recipe: PintaImageRecipe; signal?: AbortSignal }> = []
    const importer = mock(async () => ({ ok: false as const, error: 'must not import' }))
    render(
      <StudioPintaLibraryProvider
        value={pythonAdapter({
          import: importer,
          previewImage: (recipe, _limits, options) => {
            requests.push({ recipe: structuredClone(recipe), signal: options?.signal })
            return requests.length === 1 ? first.promise : Promise.resolve(portableImage(recipe))
          },
        })}
      >
        <PintaImportDialog onClose={() => {}} />
      </StudioPintaLibraryProvider>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Escolher imagem' }))[0]!)
    await waitFor(() => expect(requests).toHaveLength(1))
    fireEvent.change(screen.getByLabelText('Quadro'), { target: { value: '1' } })
    await screen.findByAltText('Prévia da imagem escolhida')
    expect(requests[0]?.signal?.aborted).toBe(true)
    await act(async () => {
      first.resolve({
        ...portableImage(requests[0]!.recipe),
        dataUrl: 'data:image/png;base64,b2xk',
      })
      await first.promise
    })
    expect(screen.getByAltText('Prévia da imagem escolhida').getAttribute('src')).toBe(PORTABLE_PNG)
    expect(selectedValue('Quadro')).toBe('1')
    expect(importer).not.toHaveBeenCalled()
    expect(useProjectStore.getState().project?.assets).toEqual([])
  })

  for (const change of [
    'close',
    'unmount',
    'project-aba',
    'adapter',
    'profile-aba',
    'observer-aba',
  ] as const) {
    it(`pending preview cannot update the old modal after ${change}`, async () => {
      const original = await seedPythonProject()
      const pending = Promise.withResolvers<ReturnType<typeof portableImage>>()
      let recipe: PintaImageRecipe | undefined
      let signal: AbortSignal | undefined
      const importer = mock(async () => ({ ok: false as const, error: 'must not import' }))
      const adapter = pythonAdapter({
        import: importer,
        previewImage: (input, _limits, options) => {
          recipe = input
          signal = options?.signal
          return pending.promise
        },
      })
      const content = (value: PintaLibraryAdapter) => (
        <StudioPintaLibraryProvider value={value}>
          <PintaImportDialog onClose={() => {}} />
        </StudioPintaLibraryProvider>
      )
      const view = render(content(adapter))
      fireEvent.click((await screen.findAllByRole('button', { name: 'Escolher imagem' }))[0]!)
      await waitFor(() => expect(signal).toBeDefined())
      await act(async () => {
        if (change === 'close')
          fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1)!)
        else if (change === 'unmount') view.unmount()
        else if (change === 'adapter') view.rerender(content(fakeAdapter()))
        else if (change === 'profile-aba') {
          setStorageNamespace('perfil-2')
          setStorageNamespace('perfil-1')
        } else if (change === 'observer-aba') {
          useProjectStore.getState().setEditingAccess('observer')
          useProjectStore.getState().setEditingAccess('author')
        } else {
          useProjectStore.setState({ project: { ...original, id: 'other' } })
          useProjectStore.setState({ project: original })
        }
      })
      expect(signal?.aborted).toBe(true)
      await act(async () => {
        pending.resolve(portableImage(recipe!))
        await pending.promise
      })
      expect(screen.queryByAltText('Prévia da imagem escolhida')).toBeNull()
      expect(importer).not.toHaveBeenCalled()
      expect(useProjectStore.getState().project?.assets).toEqual([])
    })
  }

  it('removed positional selection stays unavailable until explicitly chosen; review preserves id and path', async () => {
    await seedPythonProject('pro')
    const old = portableImage({
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: 'd1',
      selection: { kind: 'frame', animationId: 'andar', frameIndex: 5 },
      scale: 1,
    })
    expect(
      addPintaCreationToProject(useProjectStore.getState(), {
        id: 'd1',
        name: 'heroi',
        dataUrl: old.dataUrl,
        width: 1,
        height: 1,
        pintaImage: old.derivation,
      }),
    ).toBeNull()
    const target = structuredClone(useProjectStore.getState().project!.assets![0]!)
    const preview = mock(async (recipe: PintaImageRecipe) => portableImage(recipe))
    const close = mock(() => {})
    render(
      <StudioPintaLibraryProvider value={pythonAdapter({ previewImage: preview })}>
        <PintaImportDialog initialTarget={target} onClose={close} />
      </StudioPintaLibraryProvider>,
    )
    await screen.findByLabelText('Quadro')
    expect(selectedValue('Quadro')).toBe('5')
    expect(preview).not.toHaveBeenCalled()
    expect(buttonDisabled('Atualizar esta imagem')).toBe(true)
    expect(useProjectStore.getState().project?.assets?.[0]).toEqual(target)
    fireEvent.change(screen.getByLabelText('Quadro'), { target: { value: '0' } })
    await screen.findByAltText('Prévia da imagem escolhida')
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar esta imagem' }))
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
    const revised = useProjectStore.getState().project?.assets?.[0]
    expect(revised?.id).toBe(target.id)
    expect(revised?.name).toBe(target.name)
    expect(revised?.proPath).toBe(target.proPath)
    expect(revised?.pintaImage?.recipe.selection).toEqual({
      kind: 'frame',
      animationId: 'andar',
      frameIndex: 0,
    })
  })

  it('checks full map dimensions before preview allocation and uses only an explicit smaller scale', async () => {
    await seedPythonProject()
    const preview = mock(async (recipe: PintaImageRecipe) => portableImage(recipe))
    const map: DrawingSummary = {
      ...DRAWINGS[0]!,
      role: 'tilemap',
      imageSelection: { kind: 'tilemap', width: 6144, height: 6144 },
    }
    render(
      <StudioPintaLibraryProvider
        value={pythonAdapter({ list: async () => [map], previewImage: preview })}
      >
        <PintaImportDialog onClose={() => {}} />
      </StudioPintaLibraryProvider>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Escolher imagem' }))[0]!)
    await screen.findByText(/ultrapassa o limite de resolução/)
    expect(preview).not.toHaveBeenCalled()
    expect(selectedValue('Tamanho')).toBe('1')
    fireEvent.change(screen.getByLabelText('Tamanho'), { target: { value: '0.25' } })
    await screen.findByAltText('Prévia da imagem escolhida')
    expect(preview).toHaveBeenCalledTimes(1)
    expect(preview.mock.calls[0]?.[0].scale).toBe(0.25)
    expect(useProjectStore.getState().project?.assets).toEqual([])
  })

  it('the JavaScript gallery requests no image topology and never invokes the Python preview', async () => {
    const list = mock(async (options?: { includeImageSelection?: boolean }) => {
      expect(options?.includeImageSelection).toBeUndefined()
      return DRAWINGS
    })
    const preview = mock(async (recipe: PintaImageRecipe) => portableImage(recipe))
    render(
      <StudioPintaLibraryProvider value={fakeAdapter({ list, previewImage: preview })}>
        <PintaImportDialog onClose={() => {}} />
      </StudioPintaLibraryProvider>,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: 'Adicionar ao projeto' }))[0]!)
    await waitFor(() => expect(useProjectStore.getState().project?.assets).toHaveLength(1))
    expect(preview).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Escolher imagem' })).toBeNull()
  })
})
