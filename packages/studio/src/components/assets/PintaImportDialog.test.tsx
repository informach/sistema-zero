import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

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
  createStore: (dbName: string) => ({ name: dbName }),
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
const { setPersonalAssetsNamespace } = await import('../../asset-library/personal')
const { resetDrawingSyncClockForTests } = await import('../../asset-library/personalSync')
const { useProjectStore } = await import('../../state/projectStore')
const { StudioPintaLibraryProvider } = await import('../../studio/pinta-library')
type PintaLibraryAdapter = import('../../studio/pinta-library').StudioPintaLibraryAdapter
type DrawingSummary = import('../../studio/pinta-library').StudioPintaDrawingSummary
const { AssetsPanel } = await import('./AssetsPanel')
const { filterPintaDrawings } = await import('./PintaImportDialog')

const PNG = 'data:image/png;base64,AAAA'

const DRAWINGS: DrawingSummary[] = [
  { id: 'd1', name: 'dragao-pintado', role: 'sprite', style: 'pixel', updatedAt: 2, thumbDataUrl: PNG },
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
  resetDrawingSyncClockForTests()
  setPersonalAssetsNamespace('perfil-1')
  seedProject()
})

afterEach(() => {
  cleanup()
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
  it('lista a galeria e a busca filtra sem acento/caixa', async () => {
    await openDialog(fakeAdapter())
    await waitFor(() => {
      expect(screen.getByText('dragao-pintado')).toBeTruthy()
    })
    expect(screen.getByText('ceu-azul')).toBeTruthy()
    // Miniatura ausente → emoji do papel; presente → <img>.
    expect(screen.getByText('🖼️')).toBeTruthy()

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
    expect(assets[0]).toMatchObject({ name: 'dragao-pintado', source: 'library', libId: 'personal:d1' })
    // Modal segue aberta; o card importado agora oferece "Adicionar de novo".
    expect(screen.getByRole('button', { name: 'Adicionar de novo' })).toBeTruthy()
  })

  it('já no projeto ao abrir: mostra o selo; "Adicionar de novo" sufixa o nome', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar de novo' }))
    await waitFor(() => {
      const names = (useProjectStore.getState().project?.assets ?? []).map((a) => a.name)
      expect(names).toEqual(['dragao-pintado', 'dragao-pintado-2'])
    })
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
      expect(screen.getByText('Esse desenho sumiu.')).toBeTruthy()
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
      expect(screen.getByText('Não consegui abrir a sua galeria do Pinta agora.')).toBeTruthy()
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
