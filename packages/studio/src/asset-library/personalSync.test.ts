import { beforeEach, describe, expect, it, mock } from 'bun:test'

/**
 * "Editei o desenho no Pinta → o jogo se atualiza sozinho."
 *
 * Mock FUNCIONAL (Map por DB) do idb-keyval, igual ao `personal.test.ts` — o
 * IndexedDB não existe no happy-dom e a sincronia atravessa DOIS bancos (a
 * biblioteca pessoal e os projetos).
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
let reads = 0

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => ({ name: dbName }),
  get: async (key: IDBValidKey, store?: { name?: string }) => {
    reads += 1
    return kvOf(store).get(key)
  },
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    reads += 1
    return keys.map((key) => kvOf(store).get(key))
  },
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
  keys: async (store?: { name?: string }) => {
    reads += 1
    return [...kvOf(store).keys()]
  },
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
type ProjectAsset = import('#core').ProjectAsset
const { savePersonalAsset, setPersonalAssetsNamespace } = await import('./personal')
const { loadProjectAssetsById, persistProject } = await import('../state/persistence')
const { useProjectStore } = await import('../state/projectStore')
const {
  drawingNeedsSync,
  personalIdOf,
  resetDrawingSyncClockForTests,
  syncDrawingsIntoProjects,
  takeDrawingSyncFailures,
} = await import('./personalSync')

const PNG = 'data:image/png;base64,AAAA'
const PNG_NOVO = 'data:image/png;base64,BBBB'
/**
 * Imagem NO teto de um asset (800k chars) — válida sozinha. A MESMA string é
 * reusada em vários assets (JS compartilha por referência: o teste custa ~800KB
 * de memória, não 33MB) para encostar no orçamento TOTAL do projeto.
 */
const PNG_ENORME = `data:image/png;base64,${'C'.repeat(800_000 - 22)}`
/** Quantos assets no teto cabem antes de estourar o total (33M). */
const QUASE_CHEIO = 41

/** Enche o projeto até a beira da cota — o cenário real da recusa. */
function fillerAssets(): ProjectAsset[] {
  return Array.from({ length: QUASE_CHEIO }, (_, i) =>
    drawingAsset({ id: `filler-${i}`, name: `filler-${i}`, dataUrl: PNG_ENORME, libId: '' }),
  )
}

/** Asset de projeto que veio de "Meus desenhos" (o elo é o `libId`). */
function drawingAsset(over: Partial<ProjectAsset>): ProjectAsset {
  return {
    id: 'asset-1',
    name: 'heroi',
    kind: 'image',
    dataUrl: PNG,
    source: 'library',
    libId: 'personal:d1',
    ...over,
  }
}

function seedOpenProject(assets: ProjectAsset[], id = 'aberto'): void {
  const project = createEmptyProject(id, 'Jogo Aberto')
  project.assets = assets
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

beforeEach(() => {
  dbs.clear()
  reads = 0
  localStorage.clear()
  setPersonalAssetsNamespace('')
  resetDrawingSyncClockForTests()
  takeDrawingSyncFailures()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('personalIdOf / drawingNeedsSync', () => {
  it('extrai o id do Pinta só de assets da biblioteca pessoal', () => {
    expect(personalIdOf({ libId: 'personal:d1' })).toBe('d1')
    expect(personalIdOf({ libId: 'lib-heroi' })).toBeNull()
    expect(personalIdOf({ libId: 'personal:' })).toBeNull()
    expect(personalIdOf({})).toBeNull()
  })

  it('compara os BYTES: mesmo desenho não gera trabalho', () => {
    const asset = drawingAsset({})
    const igual = { id: 'd1', name: 'heroi', kind: 'image' as const, dataUrl: PNG, updatedAt: 1 }
    expect(drawingNeedsSync(asset, igual)).toBe(false)
    expect(drawingNeedsSync(asset, { ...igual, dataUrl: PNG_NOVO })).toBe(true)
    expect(drawingNeedsSync(asset, null)).toBe(false)
  })
})

describe('updateAssetImage (a ação da store)', () => {
  it('troca os pixels e NÃO mexe em nome/id/libId', () => {
    seedOpenProject([drawingAsset({})])
    const err = useProjectStore.getState().updateAssetImage('asset-1', { dataUrl: PNG_NOVO })
    expect(err).toBeNull()
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.dataUrl).toBe(PNG_NOVO)
    expect(asset?.name).toBe('heroi')
    expect(asset?.id).toBe('asset-1')
    expect(asset?.libId).toBe('personal:d1')
  })

  it('mesmos bytes = no-op (não suja o projeto)', () => {
    seedOpenProject([drawingAsset({})])
    expect(useProjectStore.getState().updateAssetImage('asset-1', { dataUrl: PNG })).toBeNull()
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('recusa quando a imagem nova estoura a cota do projeto, sem tocar no asset', () => {
    seedOpenProject([drawingAsset({}), ...fillerAssets()])
    const err = useProjectStore.getState().updateAssetImage('asset-1', { dataUrl: PNG_ENORME })
    expect(err).toContain('heroi')
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG)
  })

  it('mesma geometria PRESERVA o tileset configurado no Estúdio', () => {
    seedOpenProject([
      { ...drawingAsset({}), width: 32, height: 32, tileset: { tileSize: 16, solid: [1] } },
    ])
    useProjectStore.getState().updateAssetImage('asset-1', {
      dataUrl: PNG_NOVO,
      width: 32,
      height: 32,
    })
    expect(useProjectStore.getState().project?.assets?.[0]?.tileset).toEqual({
      tileSize: 16,
      solid: [1],
    })
  })

  it('geometria DIFERENTE descarta o tileset (os índices não valem mais)', () => {
    seedOpenProject([
      { ...drawingAsset({}), width: 32, height: 32, tileset: { tileSize: 16, solid: [1] } },
    ])
    useProjectStore.getState().updateAssetImage('asset-1', {
      dataUrl: PNG_NOVO,
      width: 64,
      height: 64,
    })
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.tileset).toBeUndefined()
    expect(asset?.width).toBe(64)
  })
})

describe('syncDrawingsIntoProjects', () => {
  it('atualiza o projeto ABERTO quando o desenho mudou no Pinta', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    seedOpenProject([drawingAsset({})])
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })

    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(1)
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
  })

  it('alcança TAMBÉM os jogos fechados (a decisão dela)', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const fechado = createEmptyProject('fechado', 'Outro Jogo')
    fechado.assets = [drawingAsset({ id: 'asset-2' })]
    await persistProject(fechado)
    seedOpenProject([])

    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    const result = await syncDrawingsIntoProjects(useProjectStore)

    expect(result.updatedInOtherProjects).toBe(1)
    expect((await loadProjectAssetsById('fechado'))[0]?.dataUrl).toBe(PNG_NOVO)
  })

  it('ignora imagem que não veio do Pinta', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    seedOpenProject([
      drawingAsset({ id: 'upload-1', name: 'foto', source: 'upload', libId: undefined }),
    ])
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(0)
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG)
  })

  it('desenho apagado no Pinta NÃO apaga nem zera o asset do jogo', async () => {
    seedOpenProject([drawingAsset({})])
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(0)
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG)
  })

  it('é idempotente: a 2ª rodada não escreve nada', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    seedOpenProject([drawingAsset({})])
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOpenProject).toBe(1)
    const segunda = await syncDrawingsIntoProjects(useProjectStore)
    expect(segunda.updatedInOpenProject).toBe(0)
    expect(segunda.updatedInOtherProjects).toBe(0)
  })

  it('sem desenho novo desde a última passada, NÃO toca no IndexedDB', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    seedOpenProject([drawingAsset({})])
    await syncDrawingsIntoProjects(useProjectStore) // 1ª passada desta aba
    reads = 0
    await syncDrawingsIntoProjects(useProjectStore)
    expect(reads).toBe(0)
  })

  it('a recusa fica guardada para o painel mostrar (o sucesso é silencioso)', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_ENORME })
    seedOpenProject([drawingAsset({}), ...fillerAssets()])
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.failures).toHaveLength(1)
    expect(takeDrawingSyncFailures()).toHaveLength(1)
    // Drenou: a mensagem não volta a aparecer sozinha.
    expect(takeDrawingSyncFailures()).toHaveLength(0)
  })
})
