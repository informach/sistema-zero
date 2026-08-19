import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

/**
 * Botão "Editar" nos desenhos vindos do Pinta (as duas seções do painel).
 *
 * Arquivo à parte do `AssetsPanel.test.tsx` porque precisa do mock de idb-keyval
 * (a biblioteca pessoal vive no IndexedDB) — o registry de module mocks é global,
 * então cada arquivo carrega o seu.
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
const { savePersonalAsset, setPersonalAssetsNamespace } = await import(
  '../../asset-library/personal'
)
const { releaseDrawingSyncProfile } = await import('../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../state/persistence')
const { useProjectStore } = await import('../../state/projectStore')
const { StudioEditDrawingProvider } = await import('../../studio/edit-drawing')
const { AssetsPanel } = await import('./AssetsPanel')

const PNG = 'data:image/png;base64,AAAA'

/** Asset do projeto ligado ao desenho `d1` da biblioteca pessoal. */
function seedProjectWithDrawingAsset(libId = 'personal:d1'): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  project.assets = [
    { id: 'a1', name: 'heroi', kind: 'image', dataUrl: PNG, source: 'library', libId },
  ]
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

function renderPanel(onEditDrawing: ((id: string) => void) | null) {
  return render(
    <StudioEditDrawingProvider value={onEditDrawing}>
      <AssetsPanel open onClose={() => {}} />
    </StudioEditDrawingProvider>,
  )
}

beforeEach(async () => {
  dbs.clear()
  localStorage.clear()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('perfil-1')
  setPersonalAssetsNamespace('perfil-1')
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
})

afterEach(() => {
  cleanup()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('AssetsPanel — botão "Editar" do desenho', () => {
  it('aparece nas DUAS seções quando o host liga o callback', async () => {
    seedProjectWithDrawingAsset()
    renderPanel(() => {})
    // "Meus desenhos" (biblioteca) e "No projeto" (a imagem já usada no jogo).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^✏️ Editar$/ })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /editar desenho/i })).toBeTruthy()
  })

  it('entrega o id do desenho do Pinta (não o id do asset do projeto)', async () => {
    seedProjectWithDrawingAsset()
    const abertos: string[] = []
    renderPanel((id) => abertos.push(id))
    await waitFor(() => screen.getByRole('button', { name: /editar desenho/i }))
    screen.getByRole('button', { name: /editar desenho/i }).click()
    expect(abertos).toEqual(['d1'])
  })

  it('sem o callback do host (aula/admin) nenhum botão aparece', async () => {
    seedProjectWithDrawingAsset()
    renderPanel(null)
    // Espera a biblioteca carregar para não passar por render vazio.
    await waitFor(() => expect(screen.getAllByAltText('heroi').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull()
  })

  it('imagem cujo desenho foi APAGADO no Pinta não oferece editar no card do projeto', async () => {
    seedProjectWithDrawingAsset('personal:sumiu')
    renderPanel(() => {})
    await waitFor(() => screen.getByRole('button', { name: /^✏️ Editar$/ }))
    expect(screen.queryByRole('button', { name: /editar desenho/i })).toBeNull()
  })

  it('imagem enviada do computador nunca oferece editar', async () => {
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.assets = [{ id: 'a1', name: 'foto', kind: 'image', dataUrl: PNG, source: 'upload' }]
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    renderPanel(() => {})
    await waitFor(() => screen.getByRole('button', { name: /^✏️ Editar$/ }))
    expect(screen.queryByRole('button', { name: /editar desenho/i })).toBeNull()
  })
})
