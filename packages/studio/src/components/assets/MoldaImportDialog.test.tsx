import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Modal "Trazer do Molda" (fluxo pull das criações 3D) + o botão no AssetsPanel.
 *
 * Arquivo à parte (molde do PintaImportDialog.test.tsx): precisa do mock de
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
const { releaseDrawingSyncProfile } = await import('../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../state/persistence')
const { useProjectStore } = await import('../../state/projectStore')
const { StudioMoldaLibraryProvider } = await import('../../studio/molda-library')
type MoldaLibraryAdapter = import('../../studio/molda-library').StudioMoldaLibraryAdapter
type CreationSummary = import('../../studio/molda-library').StudioMoldaCreationSummary
const { AssetsPanel } = await import('./AssetsPanel')
const { filterMoldaCreations, moldaCreationNeeds3D } = await import('./MoldaImportDialog')
const { projectHas3DConsumer } = await import('./has3DConsumer')

function base64DataUrl(mime: string, bytes: number[]): string {
  return `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`
}
// Assinatura GLB v2 ("glTF" + versão 2 + tamanho) — o que o `isValidAssetDataUrl` confere.
const GLB_OK = base64DataUrl(
  'model/gltf-binary',
  [0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00],
)
const HDR_OK = base64DataUrl(
  'image/vnd.radiance',
  Array.from(new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n')),
)
const PNG = 'data:image/png;base64,AAAA'

const CREATIONS: CreationSummary[] = [
  { id: 'm1', name: 'nave-cristal', kind: 'model', updatedAt: 3, thumbDataUrl: PNG },
  { id: 't1', name: 'grama-do-molda', kind: 'texture', updatedAt: 2, thumbDataUrl: null },
  { id: 's1', name: 'ceu-de-tarde', kind: 'sky', updatedAt: 1, thumbDataUrl: null },
]

function fakeAdapter(
  overrides: Partial<MoldaLibraryAdapter> = {},
): MoldaLibraryAdapter & { importCalls: string[] } {
  const importCalls: string[] = []
  return {
    importCalls,
    list: async () => CREATIONS,
    import: async (id: string) => {
      importCalls.push(id)
      const creation = CREATIONS.find((c) => c.id === id)
      if (!creation) return { ok: false as const, error: 'sumiu', code: 'not-found' as const }
      if (creation.kind === 'model') {
        return {
          ok: true as const,
          asset: {
            id,
            name: creation.name,
            kind: 'model3d' as const,
            dataUrl: GLB_OK,
            originalFileName: `${creation.name}.glb`,
            libRevision: 7,
          },
        }
      }
      if (creation.kind === 'sky') {
        return {
          ok: true as const,
          asset: {
            id,
            name: creation.name,
            kind: 'environment3d' as const,
            dataUrl: HDR_OK,
            originalFileName: `${creation.name}.hdr`,
          },
        }
      }
      return {
        ok: true as const,
        asset: {
          id,
          name: creation.name,
          kind: 'image' as const,
          dataUrl: PNG,
          originalFileName: `${creation.name}.png`,
          width: 16,
          height: 16,
        },
      }
    },
    ...overrides,
  }
}

function seedProject(opts: { with3D?: boolean } = {}): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  if (opts.with3D) {
    project.installedExtensions = [{ id: 'game-3d', version: '0.30.0', installedAt: 0 }]
  }
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

function renderPanel(adapter: MoldaLibraryAdapter | null) {
  return render(
    <StudioMoldaLibraryProvider value={adapter}>
      <AssetsPanel open onClose={() => {}} />
    </StudioMoldaLibraryProvider>,
  )
}

async function openDialog(adapter: MoldaLibraryAdapter | null): Promise<void> {
  renderPanel(adapter)
  fireEvent.click(await screen.findByRole('button', { name: /Trazer do Molda/ }))
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

describe('AssetsPanel — botão "Trazer do Molda"', () => {
  it('sem o adapter (aula/admin): sem botão', async () => {
    renderPanel(null)
    await screen.findByText('Enviar imagem')
    expect(screen.queryByRole('button', { name: /Trazer do Molda/ })).toBeNull()
  })

  it('com o adapter: botão presente ao lado dos uploads', async () => {
    renderPanel(fakeAdapter())
    expect(await screen.findByRole('button', { name: /Trazer do Molda/ })).not.toBeNull()
  })
})

describe('MoldaImportDialog', () => {
  it('lista a galeria com o selo do tipo e a busca filtra sem acento/caixa', async () => {
    await openDialog(fakeAdapter())
    expect(await screen.findByText('nave-cristal')).not.toBeNull()
    expect(screen.getByText('🧊 modelo')).not.toBeNull()
    expect(screen.getByText('🧱 textura')).not.toBeNull()
    expect(screen.getByText('🌤️ céu')).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Buscar criações'), { target: { value: 'CÉU' } })
    expect(screen.getByText('ceu-de-tarde')).not.toBeNull()
    expect(screen.queryByText('nave-cristal')).toBeNull()
  })

  it('SEM consumidor 3D: modelo e céu ficam desabilitados com a dica; a textura entra como imagem', async () => {
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    expect(screen.getByRole('note').textContent).toContain('Instale o Jogo 3D')
    const buttons = screen.getAllByRole('button', { name: 'Adicionar ao projeto' })
    expect(buttons).toHaveLength(3)
    // A ordem dos cards é a da galeria: modelo, textura, céu.
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(buttons[1] as HTMLButtonElement)
    await waitFor(() => expect(adapter.importCalls).toEqual(['t1']))
    await waitFor(() => {
      const asset = useProjectStore.getState().project?.assets?.[0]
      expect(asset?.kind).toBe('image')
      expect(asset?.libId).toBe('personal:t1')
      expect(asset?.name).toBe('grama-do-molda')
    })
    expect(await screen.findByText('✓ no projeto')).not.toBeNull()
  })

  it('COM o Jogo 3D instalado: o modelo entra como model3d (com o nome do arquivo) e o céu como environment3d', async () => {
    seedProject({ with3D: true })
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    expect(screen.queryByRole('note')).toBeNull()
    const buttons = screen.getAllByRole('button', { name: 'Adicionar ao projeto' })
    fireEvent.click(buttons[0] as HTMLButtonElement)
    await waitFor(() => expect(adapter.importCalls).toEqual(['m1']))
    await waitFor(() => {
      const asset = useProjectStore
        .getState()
        .project?.assets?.find((a) => a.name === 'nave-cristal')
      expect(asset?.kind).toBe('model3d')
      expect(asset?.originalFileName).toBe('nave-cristal.glb')
      expect(asset?.libId).toBe('personal:m1')
      expect(asset?.libRevision).toBe(7)
    })
    // Fica aberta (multi-import): o céu entra na sequência.
    const skyButton = screen
      .getAllByRole('button', { name: 'Adicionar ao projeto' })
      .at(-1) as HTMLButtonElement
    fireEvent.click(skyButton)
    await waitFor(() => expect(adapter.importCalls).toEqual(['m1', 's1']))
    await waitFor(() => {
      const sky = useProjectStore.getState().project?.assets?.find((a) => a.name === 'ceu-de-tarde')
      expect(sky?.kind).toBe('environment3d')
      expect(sky?.originalFileName).toBe('ceu-de-tarde.hdr')
    })
    expect(screen.getAllByText('✓ no projeto')).toHaveLength(2)
  })

  it('erro do adapter aparece na modal; criação apagada (not-found) sai da lista', async () => {
    seedProject({ with3D: true })
    const adapter = fakeAdapter({
      import: async () => ({ ok: false, error: 'sumiu do Molda', code: 'not-found' }),
    })
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Adicionar ao projeto' })[0] as HTMLButtonElement,
    )
    expect(await screen.findByRole('alert')).not.toBeNull()
    expect(screen.getByText('sumiu do Molda')).not.toBeNull()
    await waitFor(() => expect(screen.queryByText('nave-cristal')).toBeNull())
  })

  it('lista rejeitada mostra erro com "Tentar de novo"', async () => {
    let calls = 0
    const adapter = fakeAdapter({
      list: async () => {
        calls += 1
        if (calls === 1) throw new Error('fora do ar')
        return CREATIONS
      },
    })
    await openDialog(adapter)
    expect(
      await screen.findByText('Não consegui abrir a sua galeria do Molda agora.'),
    ).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('nave-cristal')).not.toBeNull()
  })
})

describe('régua pura', () => {
  it('filterMoldaCreations: vazio devolve tudo; acento/caixa não importam', () => {
    expect(filterMoldaCreations(CREATIONS, '')).toHaveLength(3)
    expect(filterMoldaCreations(CREATIONS, 'CÉU').map((c) => c.id)).toEqual(['s1'])
    expect(filterMoldaCreations(CREATIONS, 'nave').map((c) => c.id)).toEqual(['m1'])
  })

  it('moldaCreationNeeds3D: só a textura dispensa consumidor 3D', () => {
    expect(moldaCreationNeeds3D('model')).toBe(true)
    expect(moldaCreationNeeds3D('sky')).toBe(true)
    expect(moldaCreationNeeds3D('texture')).toBe(false)
  })

  it('projectHas3DConsumer: o kit Jogo 3D conta (desde os blocos do Molda), como o Avançado, o Mundo 3D e o Canvas 3D', () => {
    const empty = createEmptyProject('p', 'x')
    expect(projectHas3DConsumer(empty)).toBe(false)
    for (const id of ['game-3d', 'game-3d-advanced', 'world-3d']) {
      const p = createEmptyProject('p', 'x')
      p.installedExtensions = [{ id, version: '1.0.0', installedAt: 0 }]
      expect(projectHas3DConsumer(p)).toBe(true)
    }
    const canvas3d = createEmptyProject('p', 'x')
    canvas3d.files = { ...canvas3d.files, 'script.js': "import * as THREE from 'three'\n" }
    expect(projectHas3DConsumer(canvas3d)).toBe(true)
    expect(projectHas3DConsumer(null)).toBe(false)
  })
})
