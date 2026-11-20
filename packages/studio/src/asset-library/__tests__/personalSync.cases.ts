import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import type { UseStore } from 'idb-keyval'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { beginProjectOpening, isProjectOpening } from '../../state/projectOpening'
import { projectHeadKey, projectThumbKey } from '../../state/projectStorageKeys'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import type { StudioPintaLibraryAdapter } from '../../studio/pinta-library'
import { failNextFakeIdbWrite, fakeUseStore } from '../../testing/fakeIdbStore'
import type { PersonalAsset } from '../personal'

/**
 * "Editei o desenho no Pinta → o jogo se atualiza sozinho."
 *
 * Mock FUNCIONAL (Map por DB) do idb-keyval, igual ao `personal.test.ts` — o
 * IndexedDB não existe no happy-dom e a sincronia atravessa DOIS bancos (a
 * biblioteca pessoal e os projetos).
 */
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
const kvOf = (store?: UseStore | { name?: string }): KV => {
  const key = store && 'name' in store && typeof store.name === 'string' ? store.name : ''
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
  }
  return kv
}
let reads = 0
let personalInventoryReads = 0
let beforePersonalInventory: (() => Promise<void>) | undefined
/** Chaves pedidas em `getMany` (prova que a varredura usa a lista LEVE, sem capas). */
const askedKeys: string[] = []

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => fakeUseStore(dbName),
  get: async (key: IDBValidKey, store?: { name?: string }) => {
    reads += 1
    return kvOf(store).get(key)
  },
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    reads += 1
    if (store?.name?.includes('personal-assets')) {
      personalInventoryReads += 1
      await beforePersonalInventory?.()
    }
    for (const key of keys) if (typeof key === 'string') askedKeys.push(key)
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

const { createEmptyProject, PROJECT_ASSET_LIMITS } = await import('#core')
type ProjectAsset = import('#core').ProjectAsset
const {
  listPersonalAssets,
  savePersonalAsset,
  savePersonalAssetBundle,
  setPersonalAssetsNamespace,
} = await import('../personal')
const {
  loadProjectAssetsById,
  loadProjectMetaById,
  loadProjectById,
  persistProject,
  persistProjectAssets,
  setStorageNamespace,
  setStudioCloudMirror,
  writeProjectThumb,
} = await import('../../state/persistence')
const { useProjectStore } = await import('../../state/projectStore')
const { getProjectStorageScope, captureProjectStorageScope, runSerializedProjectWrite } =
  await import('../../state/projectStorageRuntime')
const {
  drawingNeedsSync,
  mergeDrawingIntoAsset,
  personalIdOf,
  syncDrawingsIntoProjects,
  takeDrawingSyncFailures,
} = await import('../personalSync')
const { getPersonalAsset } = await import('../personal')

const PNG = 'data:image/png;base64,AAAA'
const PNG_NOVO = 'data:image/png;base64,BBBB'
const PNG_PERFIL_B = 'data:image/png;base64,CCCC'

it('duas alterações no mesmo milissegundo chegam ao projeto sem perder a segunda', async () => {
  const clock = spyOn(Date, 'now').mockReturnValue(1720000000000)
  try {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    seedOpenProject([drawingAsset({})])
    await syncDrawingsIntoProjects(useProjectStore)
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    await syncDrawingsIntoProjects(useProjectStore)
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
  } finally {
    clock.mockRestore()
  }
})

it('sem marcador confiável, novas leituras conferem os desenhos novamente', async () => {
  const { getPersonalAssetsNamespace } = await import('../personal')
  const key = `sz:desenhos-alterados:${getPersonalAssetsNamespace()}`
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
  localStorage.removeItem(key)
  seedOpenProject([drawingAsset({})])
  await syncDrawingsIntoProjects(useProjectStore)
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
  localStorage.setItem(key, 'quebrado')
  await syncDrawingsIntoProjects(useProjectStore)
  expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
})
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

let testScope = 0

beforeEach(() => {
  dbs.clear()
  reads = 0
  personalInventoryReads = 0
  beforePersonalInventory = undefined
  localStorage.clear()
  testScope += 1
  const namespace = `personal-sync-test-${testScope}`
  setStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
  takeDrawingSyncFailures()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  useProjectStore.getState().setEditingAccess('author')
})

// ⚠️ O registro de módulos do bun:test NÃO é isolado por arquivo, e a ORDEM dos
// arquivos muda por plataforma. Este arquivo troca o namespace GLOBAL do storage
// e carrega projeto na store DEFAULT (`restoreProjectSnapshot`); sem devolver os
// dois como encontrou, o próximo arquivo (no Linux do CI é o `persistence.test.ts`,
// que assume namespace '' e projeto nulo) via autosave/cerca caírem no escopo
// errado — 3 casos reprovavam SÓ no CI (19/08). Local passava porque no Windows
// a ordem é outra.
afterEach(() => {
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

afterAll(() => {
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
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

  it('ORIGEM cruzada (registro do Molda no id de um desenho do Pinta) nunca sincroniza; sem as duas marcas, seguem os bytes', () => {
    const doMolda = {
      id: 'd1',
      name: 'grama',
      kind: 'image' as const,
      origin: 'molda' as const,
      dataUrl: PNG_NOVO,
      updatedAt: 1,
    }
    expect(drawingNeedsSync(drawingAsset({ libOrigin: 'pinta' }), doMolda)).toBe(false)
    expect(drawingNeedsSync(drawingAsset({ libOrigin: 'molda' }), doMolda)).toBe(true)
    // Legado sem `libOrigin`, ou registro sem `origin`: não há prova de cruzamento.
    expect(drawingNeedsSync(drawingAsset({}), doMolda)).toBe(true)
    expect(
      drawingNeedsSync(drawingAsset({ libOrigin: 'pinta' }), { ...doMolda, origin: undefined }),
    ).toBe(true)
  })
})

describe('reconcileDrawingsFromRestoredProject (jogo que desceu da nuvem)', () => {
  it('relógio remoto aparentemente maior não decide o vencedor: preserva os dois lados', async () => {
    // O relógio deste aparelho não é comparável ao do computador que enviou o jogo.
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const localRevision = (await getPersonalAsset('d1'))?.updatedAt ?? 0
    const raw = {
      ...createEmptyProject('01J00000000000000000000CLD', 'Vindo da nuvem'),
      assets: [
        drawingAsset({ dataUrl: PNG_NOVO, libRevision: localRevision + 1 }),
        // Um desenho que a biblioteca NÃO tem: não entra sozinho ("Usar no Estúdio" é decisão dela).
        drawingAsset({ id: 'asset-9', name: 'vilao', libId: 'personal:d9', dataUrl: PNG_NOVO }),
      ],
      createdAt: 1,
      updatedAt: 2,
    }
    await useProjectStore.getState().restoreProjectSnapshot(raw, {
      expectedId: '01J00000000000000000000CLD',
    })
    expect((await getPersonalAsset('d1'))?.dataUrl).toBe(PNG)
    expect(await getPersonalAsset('d9')).toBeNull()
    const restoredAsset = (await loadProjectAssetsById('01J00000000000000000000CLD'))[0]
    expect(restoredAsset?.dataUrl).toBe(PNG_NOVO)
    expect(restoredAsset?.libId).not.toBe('personal:d1')
    const copyId = restoredAsset?.libId?.replace('personal:', '')
    expect(copyId ? (await getPersonalAsset(copyId))?.dataUrl : null).toBe(PNG_NOVO)
    // A varredura usa a cópia recém-criada como origem e não reverte o jogo.
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOtherProjects).toBe(0)
    expect((await loadProjectAssetsById('01J00000000000000000000CLD'))[0]?.dataUrl).toBe(PNG_NOVO)
  })

  it('relógio remoto aparentemente menor também não decide o vencedor', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    const local = await getPersonalAsset('d1')
    if (!local) throw new Error('desenho local não salvo')
    const raw = {
      ...createEmptyProject('01J00000000000000000000OLD', 'Snapshot antigo'),
      assets: [drawingAsset({ dataUrl: PNG, libRevision: local.updatedAt - 1 })],
      createdAt: 1,
      updatedAt: 2,
    }

    await useProjectStore.getState().restoreProjectSnapshot(raw, {
      expectedId: '01J00000000000000000000OLD',
    })

    expect((await getPersonalAsset('d1'))?.dataUrl).toBe(PNG_NOVO)
    const restored = (await loadProjectAssetsById(raw.id))[0]
    expect(restored?.dataUrl).toBe(PNG)
    expect(restored?.libId).not.toBe('personal:d1')
  })

  it('preserva os dois lados quando um asset legado diverge sem carimbo de revisão', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const raw = {
      ...createEmptyProject('01J00000000000000000000LEG', 'Snapshot legado'),
      assets: [drawingAsset({ dataUrl: PNG_NOVO })],
      createdAt: 1,
      updatedAt: 2,
    }

    await useProjectStore.getState().restoreProjectSnapshot(raw, {
      expectedId: '01J00000000000000000000LEG',
    })

    const personal = await listPersonalAssets()
    expect(personal.find((asset) => asset.id === 'd1')?.dataUrl).toBe(PNG)
    const copy = personal.find((asset) => asset.id !== 'd1')
    expect(copy?.dataUrl).toBe(PNG_NOVO)
    const restored = (await loadProjectAssetsById(raw.id))[0]
    expect(restored?.libId).toBe(`personal:${copy?.id}`)
    expect(restored?.dataUrl).toBe(PNG_NOVO)
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
  it('a revisão 3D conserva recursos compartilhados quando a arte pessoal é editada', async () => {
    const png =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
      bytes = Buffer.from(png.split(',')[1]!, 'base64'),
      artifact = {
        formato: 'studio-cena3d',
        versao: 1,
        cena: {
          formato: 'molda-cena-compilada',
          versao: 1,
          nome: 'Vila',
          unidade: 'metro',
          eixoVertical: 'y',
          fonte: { cenario: 'vila', revisao: 1, digest: 'a'.repeat(64) },
          arquivos: [
            {
              caminho: 'texturas/flor.png',
              mime: 'image/png',
              papel: 'textura',
              largura: 1,
              altura: 1,
              bytes: bytes.length,
              digest: createHash('sha256').update(bytes).digest('hex'),
            },
          ],
          entidades: [],
          nos: [],
          colisoes: [],
          aguas: [],
          caminhos: [],
          marcadores: [],
          texturas: [],
          fontes: { modelos: [], texturas: [], conjuntos: [] },
          licencas: [],
          ambiente: { hora: 12 },
        },
        recursos: [{ caminho: 'texturas/flor.png', asset: 'asset-1' }],
      },
      scene: ProjectAsset = {
        id: 'vila',
        name: 'vila',
        kind: 'scene3d',
        source: 'library',
        originalFileName: 'vila.json',
        dataUrl: `data:application/vnd.sistemazero.cena3d+json;base64,${Buffer.from(JSON.stringify(artifact)).toString('base64')}`,
      },
      image = drawingAsset({ dataUrl: png })
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: png })
    seedOpenProject([image, scene])
    const before = useProjectStore.getState().project!,
      closed = { ...createEmptyProject('cena-fechada', 'Cena fechada'), assets: [image, scene] }
    await persistProject(closed)
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.failures).toEqual([])
    expect(result.updatedInOpenProject).toBe(0)
    expect(result.updatedInOtherProjects).toBe(0)
    expect(useProjectStore.getState().project!.assets).toEqual(before.assets)
    expect(await loadProjectAssetsById(closed.id)).toEqual(closed.assets)
  })

  const linkedScene = (id: string, destination?: string) =>
    PintaSceneSchema.parse({
      version: 1,
      id,
      name: id,
      tileSize: 16,
      cols: 1,
      rows: 1,
      tilesets: [
        { id: 'ts', name: 'peças', image: PNG, columns: 1, count: 1, solid: [], platform: [] },
      ],
      layers: [
        {
          id: 'objects',
          name: 'Portas',
          kind: 'objects',
          visible: true,
          objects: destination
            ? [
                {
                  id: 'door',
                  name: 'Outra área',
                  type: '',
                  role: 'door',
                  x: 0,
                  y: 0,
                  width: 16,
                  height: 16,
                  properties: { destino: { type: 'asset', value: destination } },
                },
              ]
            : [],
        },
      ],
    })

  it('uma porta nova acrescenta seu destino aos jogos aberto e fechado, conservando os programas', async () => {
    const oldScene = linkedScene('d1')
    await savePersonalAsset({ id: 'd1', name: 'vila', dataUrl: PNG, scene: oldScene })
    const first = await getPersonalAsset('d1')
    const original = drawingAsset({
      name: 'nome-usado-pelo-programa',
      scene: oldScene,
      libRevision: first?.updatedAt,
    })
    seedOpenProject([original])
    const opened = useProjectStore.getState().project!
    const closed = {
      ...createEmptyProject('mundo-fechado', 'Mundo fechado'),
      mode: 'bridge' as const,
      bridgeCodeAhead: true as const,
      assets: [{ ...original, id: 'closed-map' }],
    }
    closed.files['script.js'] = 'const programaDaCrianca = 31;'
    await persistProject(closed)
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana', 'd1') },
    ])
    await savePersonalAsset({
      id: 'unrelated',
      name: 'outro-mapa',
      dataUrl: PNG,
      scene: linkedScene('unrelated'),
    })
    personalInventoryReads = 0
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.failures).toEqual([])
    expect(useProjectStore.getState().project?.assets?.map((asset) => asset.libId)).toEqual([
      'personal:d1',
      'personal:cabana',
    ])
    expect((await loadProjectAssetsById(closed.id)).map((asset) => asset.libId)).toEqual([
      'personal:d1',
      'personal:cabana',
    ])
    expect(useProjectStore.getState().project?.assets?.[0]?.name).toBe(original.name)
    expect(useProjectStore.getState().project?.files).toEqual(opened.files)
    expect(useProjectStore.getState().project?.ir).toEqual(opened.ir)
    expect(useProjectStore.getState().project?.blocksState).toEqual(opened.blocksState)
    expect((await loadProjectById(closed.id))?.files).toEqual(closed.files)
    expect(result.updatedInOpenProject).toBe(2)
    expect(result.updatedInOtherProjects).toBe(1)
    expect(personalInventoryReads).toBe(1)
    const unchanged = useProjectStore.getState().project
    expect(await syncDrawingsIntoProjects(useProjectStore)).toMatchObject({
      updatedInOpenProject: 0,
      updatedInOtherProjects: 0,
      failures: [],
    })
    expect(useProjectStore.getState().project === unchanged).toBe(true)
  })

  it('um destino perdido conserva o mundo anterior, em vez de atualizar só a raiz', async () => {
    const original = linkedScene('d1')
    await savePersonalAsset({
      id: 'd1',
      name: 'vila',
      dataUrl: PNG,
      scene: linkedScene('d1', 'missing'),
    })
    seedOpenProject([drawingAsset({ scene: original })])
    const before = useProjectStore.getState().project
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.failures.length).toBeGreaterThan(0)
    expect(useProjectStore.getState().project === before).toBe(true)
  })

  it('uma porta nova que não cabe recusa a raiz e o destino juntos', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
    ])
    seedOpenProject([
      drawingAsset({ scene: linkedScene('d1') }),
      ...Array.from({ length: PROJECT_ASSET_LIMITS.maxAssetsCount - 1 }, (_, i) =>
        drawingAsset({ id: `f${i}`, name: `f${i}`, libId: '' }),
      ),
    ])
    const before = useProjectStore.getState().project
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.failures.length).toBeGreaterThan(0)
    expect(useProjectStore.getState().project === before).toBe(true)
    // Freeing space does not change the personal marker. The refused sweep must remain pending.
    useProjectStore.setState({ project: { ...before!, assets: before!.assets!.slice(0, 1) } })
    const recovered = await syncDrawingsIntoProjects(useProjectStore)
    expect(recovered.failures).toEqual([])
    expect(recovered.updatedInOpenProject).toBe(2)
    expect(useProjectStore.getState().project?.assets?.map((a) => a.libId)).toEqual([
      'personal:d1',
      'personal:cabana',
    ])
  })

  for (const change of [
    'project-aba',
    'language-aba',
    'owner-aba',
    'profile-aba',
    'cancel',
    'remove',
    'derived',
  ] as const) {
    it(`um mundo pendente não entra depois de ${change}`, async () => {
      await savePersonalAssetBundle([
        { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
        { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
      ])
      seedOpenProject([drawingAsset({ scene: linkedScene('d1') })])
      const project = useProjectStore.getState().project!
      const release = Promise.withResolvers<void>(),
        entered = Promise.withResolvers<void>()
      beforePersonalInventory = async () => {
        entered.resolve()
        await release.promise
      }
      const controller = new AbortController()
      const pending = syncDrawingsIntoProjects(useProjectStore, { signal: controller.signal })
      await entered.promise
      if (change === 'project-aba') {
        useProjectStore.setState({ project: { ...project, id: 'other' } })
        useProjectStore.setState({ project })
      } else if (change === 'language-aba') {
        useProjectStore.setState({
          project: await refinePythonProjectDocument({
            ...documentFixture('python', 'classic'),
            id: project.id,
            assets: [],
          }),
        })
        useProjectStore.setState({ project })
      } else if (change === 'owner-aba') {
        useProjectStore.getState().setEditingAccess('observer')
        useProjectStore.getState().setEditingAccess('author')
      } else if (change === 'profile-aba') {
        setStorageNamespace('world-other-profile')
        setPersonalAssetsNamespace('world-other-profile')
        setStorageNamespace(`personal-sync-test-${testScope}`)
        setPersonalAssetsNamespace(`personal-sync-test-${testScope}`)
      } else if (change === 'cancel') controller.abort()
      else if (change === 'remove')
        useProjectStore.setState({ project: { ...project, assets: [] } })
      else
        useProjectStore.setState({
          project: { ...project, assets: [{ ...project.assets![0]!, libId: 'personal:other' }] },
        })
      const expected = useProjectStore.getState().project
      release.resolve()
      const result = await pending
      expect(result.updatedInOpenProject).toBe(0)
      expect(useProjectStore.getState().project).toBe(expected)
    })
  }

  it('a falha do catálogo recusa o mundo e a próxima conferência pode tentar novamente', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
    ])
    seedOpenProject([drawingAsset({ scene: linkedScene('d1') })])
    const before = useProjectStore.getState().project
    beforePersonalInventory = async () => {
      throw new Error('Leitura interrompida')
    }
    const failed = await syncDrawingsIntoProjects(useProjectStore)
    expect(failed.failures.join(' ')).toContain('conferir os mapas')
    expect(useProjectStore.getState().project).toBe(before)
    beforePersonalInventory = undefined
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOpenProject).toBe(2)
  })

  it('raiz e destinos vêm da mesma captura, sem combinar a raiz antiga com o destino novo', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
      { id: 'jardim', name: 'jardim', dataUrl: PNG, scene: linkedScene('jardim') },
    ])
    seedOpenProject([drawingAsset({ scene: linkedScene('d1') })])
    beforePersonalInventory = async () => {
      beforePersonalInventory = undefined
      const kv = [...dbs.entries()].find(([name]) => name.includes('personal-assets'))![1]
      kv.set('asset:d1', {
        ...(kv.get('asset:d1') as PersonalAsset),
        scene: linkedScene('d1', 'jardim'),
      })
      kv.set('asset:jardim', {
        id: 'jardim',
        name: 'jardim',
        kind: 'image',
        dataUrl: PNG,
        updatedAt: 10,
        scene: linkedScene('jardim'),
      })
    }
    expect((await syncDrawingsIntoProjects(useProjectStore)).failures).toEqual([])
    expect(useProjectStore.getState().project?.assets?.map((a) => a.libId)).toEqual([
      'personal:d1',
      'personal:jardim',
    ])
  })

  it('um jogo fechado que abre durante a captura conserva a partição e atualiza no próximo foco', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
    ])
    const closed = createEmptyProject('mundo-em-abertura', 'Jogo')
    closed.assets = [drawingAsset({ scene: linkedScene('d1') })]
    await persistProject(closed)
    seedOpenProject([])
    beforePersonalInventory = async () => {
      beforePersonalInventory = undefined
      useProjectStore.setState({ project: closed })
    }
    const first = await syncDrawingsIntoProjects(useProjectStore)
    expect(first.updatedInOtherProjects).toBe(0)
    expect(first.updatedInOpenProject).toBe(0)
    expect(await loadProjectAssetsById(closed.id)).toEqual(closed.assets)
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOpenProject).toBe(2)
    expect(useProjectStore.getState().project?.assets?.map((a) => a.libId)).toEqual([
      'personal:d1',
      'personal:cabana',
    ])
  })

  it('a recusa de cota conserva o mundo fechado inteiro e não consome sua atualização', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
    ])
    const closed = createEmptyProject('mundo-cheio', 'Jogo')
    closed.assets = [
      drawingAsset({ scene: linkedScene('d1') }),
      ...Array.from({ length: PROJECT_ASSET_LIMITS.maxAssetsCount - 1 }, (_, i) =>
        drawingAsset({ id: `f${i}`, name: `f${i}`, libId: '' }),
      ),
    ]
    await persistProject(closed)
    const before = await loadProjectAssetsById(closed.id)
    seedOpenProject([])
    const first = await syncDrawingsIntoProjects(useProjectStore)
    expect(first.failures.join(' ')).toContain('limite de arquivos')
    expect(first.updatedInOtherProjects).toBe(0)
    expect(await loadProjectAssetsById(closed.id)).toEqual(before)
    closed.assets = closed.assets.slice(0, 1)
    await persistProject(closed)
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOtherProjects).toBe(1)
    expect((await loadProjectAssetsById(closed.id)).map((a) => a.libId)).toEqual([
      'personal:d1',
      'personal:cabana',
    ])
  })

  it('uma falha física ao salvar o mundo fechado conserva os bytes e permite nova tentativa', async () => {
    await savePersonalAssetBundle([
      { id: 'd1', name: 'vila', dataUrl: PNG, scene: linkedScene('d1', 'cabana') },
      { id: 'cabana', name: 'cabana', dataUrl: PNG, scene: linkedScene('cabana') },
    ])
    const closed = createEmptyProject('mundo-sem-disco', 'Jogo')
    closed.assets = [drawingAsset({ scene: linkedScene('d1') })]
    await persistProject(closed)
    const before = await loadProjectAssetsById(closed.id)
    seedOpenProject([])
    failNextFakeIdbWrite(new DOMException('Sem espaço', 'QuotaExceededError'))
    const first = await syncDrawingsIntoProjects(useProjectStore)
    expect(first.updatedInOtherProjects).toBe(0)
    expect(await loadProjectAssetsById(closed.id)).toEqual(before)
    expect(first.failures.join(' ')).toContain('salvar os mapas')
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOtherProjects).toBe(1)
  })

  it('uma propriedade de cenário muda sem mudar o PNG e atualiza o jogo sem tocar na programação', async () => {
    const scene = {
      version: 1 as const,
      id: 'vila',
      name: 'vila',
      tileSize: 16,
      cols: 1,
      rows: 1,
      tilesets: [
        { id: 'ts', name: 'ts', image: PNG, columns: 1, count: 1, solid: [], platform: [] },
      ],
      layers: [
        {
          id: 'o',
          kind: 'objects' as const,
          name: 'Objetos',
          visible: true,
          objects: [
            {
              id: 'p',
              name: 'Porta',
              type: '',
              x: 0,
              y: 0,
              width: 16,
              height: 16,
              properties: { vidas: { type: 'int' as const, value: 1 } },
            },
          ],
        },
      ],
    }
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG, scene })
    const before = await getPersonalAsset('d1')
    seedOpenProject([drawingAsset({ scene, libRevision: before?.updatedAt })])
    const program = structuredClone(useProjectStore.getState().project?.ir)
    const changed = structuredClone(scene)
    changed.layers[0]!.objects[0]!.properties.vidas.value = 3
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG, scene: changed })
    expect(drawingNeedsSync(drawingAsset({ scene }), await getPersonalAsset('d1'))).toBe(true)
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(1)
    expect(useProjectStore.getState().project?.assets?.[0]?.scene).toEqual(changed)
    expect(useProjectStore.getState().project?.ir).toEqual(program)
  })
  /** Cena mínima válida; `vidas` muda sem mudar a imagem. */
  const cenaDeTeste = (vidas: number) => ({
    version: 1 as const,
    id: 'vila',
    name: 'vila',
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [{ id: 'ts', name: 'ts', image: PNG, columns: 1, count: 1, solid: [], platform: [] }],
    layers: [
      {
        id: 'o',
        kind: 'objects' as const,
        name: 'Objetos',
        visible: true,
        objects: [
          {
            id: 'p',
            name: 'Porta',
            type: '',
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            properties: { vidas: { type: 'int' as const, value: vidas } },
          },
        ],
      },
    ],
  })
  const MAPA_ANTIGO = {
    tileSize: 16,
    cols: 1,
    rows: 1,
    grid: '0',
    solid: [0],
    tileset: { dataUrl: PNG, width: 16, height: 16 },
  }

  it('desenho que saiu do envelope antigo tira o mapa velho do jogo aberto e a sincronia converge', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG, width: 16, height: 16 })
    seedOpenProject([
      drawingAsset({
        width: 16,
        height: 16,
        scene: cenaDeTeste(1),
        tilemap: MAPA_ANTIGO,
        tilemapFront: MAPA_ANTIGO,
        tileset: { tileSize: 16, solid: [0] },
      }),
    ])
    // O mapa cresceu: agora só a cena viaja, com uma miniatura da MESMA medida.
    await savePersonalAsset({
      id: 'd1',
      name: 'heroi',
      dataUrl: PNG_NOVO,
      width: 16,
      height: 16,
      scene: cenaDeTeste(2),
    })
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOpenProject).toBe(1)
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.scene).toEqual(cenaDeTeste(2))
    expect(asset?.tilemap).toBeUndefined()
    expect(asset?.tilemapFront).toBeUndefined()
    // O que a criança configurou no Estúdio e não é mapa continua.
    expect(asset?.tileset).toEqual({ tileSize: 16, solid: [0] })
    expect(drawingNeedsSync(asset as ProjectAsset, await getPersonalAsset('d1'))).toBe(false)
    const segunda = await syncDrawingsIntoProjects(useProjectStore)
    expect(segunda.updatedInOpenProject).toBe(0)
    expect(segunda.failures).toEqual([])
  })

  it('mesmos bytes e mesma cena, mas mapa velho sobrando: a sobra sai (não é "nada a fazer")', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG, scene: cenaDeTeste(1) })
    const sobra = drawingAsset({ scene: cenaDeTeste(1), tilemap: MAPA_ANTIGO })
    const desenho = await getPersonalAsset('d1')
    expect(drawingNeedsSync(sobra, desenho)).toBe(true)
    seedOpenProject([sobra])
    const error = useProjectStore.getState().updateAssetImage('asset-1', {
      dataUrl: PNG,
      scene: desenho?.scene,
    })
    expect(error).toBeNull()
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.tilemap).toBeUndefined()
    expect(drawingNeedsSync(asset as ProjectAsset, desenho)).toBe(false)
    // O mesmo no jogo FECHADO, que passa pelo `mergeDrawingIntoAsset`.
    const merged = mergeDrawingIntoAsset(
      drawingAsset({ scene: cenaDeTeste(1), tilemap: MAPA_ANTIGO, tilemapFront: MAPA_ANTIGO }),
      desenho as NonNullable<typeof desenho>,
    )
    expect(merged?.tilemap).toBeUndefined()
    expect(merged?.tilemapFront).toBeUndefined()
    expect(drawingNeedsSync(merged as ProjectAsset, desenho)).toBe(false)
  })

  it('desenho SEM cena conserva o mapa montado no Estúdio (a herança por geometria continua)', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO, width: 16, height: 16 })
    const desenho = await getPersonalAsset('d1')
    const merged = mergeDrawingIntoAsset(
      drawingAsset({ width: 16, height: 16, tilemap: MAPA_ANTIGO }),
      desenho as NonNullable<typeof desenho>,
    )
    expect(merged?.tilemap).toEqual(MAPA_ANTIGO)
    expect(drawingNeedsSync(merged as ProjectAsset, desenho)).toBe(false)
  })

  it('peças configuradas no Estúdio não fazem a varredura regravar o jogo para sempre', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const configurado = drawingAsset({
      id: 'asset-2',
      width: 32,
      height: 32,
      tileset: { tileSize: 16, solid: [1] },
      sprite: { frameW: 16, frameH: 16, animations: [] },
    })
    expect(drawingNeedsSync(configurado, await getPersonalAsset('d1'))).toBe(false)
    const fechado = createEmptyProject('fechado', 'Outro Jogo')
    fechado.assets = [configurado]
    await persistProject(fechado)
    seedOpenProject([{ ...configurado, id: 'asset-1' }])
    const antes = (await loadProjectMetaById('fechado'))?.updatedAt
    const revisao = useProjectStore.getState().project?.updatedAt
    // Um desenho QUALQUER mudou: a varredura roda de verdade, e não acha nada a fazer aqui.
    await savePersonalAsset({ id: 'outro', name: 'outro', dataUrl: PNG_NOVO })
    for (let rodada = 0; rodada < 2; rodada += 1) {
      const result = await syncDrawingsIntoProjects(useProjectStore)
      expect(result.updatedInOpenProject).toBe(0)
      expect(result.updatedInOtherProjects).toBe(0)
    }
    expect((await loadProjectMetaById('fechado'))?.updatedAt).toBe(antes)
    expect(useProjectStore.getState().project?.updatedAt).toBe(revisao)
    expect((await loadProjectAssetsById('fechado'))[0]?.tileset).toEqual({
      tileSize: 16,
      solid: [1],
    })
  })

  it('atualiza o projeto ABERTO quando o desenho mudou no Pinta', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    seedOpenProject([drawingAsset({})])
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })

    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(1)
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
  })

  it('a varredura lista os jogos pela lista LEVE (nunca lê as capas) e relê a partição de assets de cada um', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    for (let i = 0; i < 6; i += 1) {
      const fechado = createEmptyProject(`fechado-${i}`, `Outro Jogo ${i}`)
      fechado.assets = [drawingAsset({ id: `asset-${i}` })]
      await persistProject(fechado)
      await writeProjectThumb(`fechado-${i}`, 'data:image/jpeg;base64,AAA')
    }
    seedOpenProject([])
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    askedKeys.length = 0
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOtherProjects).toBe(6)
    expect(askedKeys.some((key) => key.startsWith(projectThumbKey('')))).toBe(false)
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

  it('jogo aberto NO MEIO da varredura não perde a atualização', async () => {
    // A varredura roda quando a aba volta ao foco — o mesmo instante em que a
    // criança pode clicar num jogo. Se o projeto for aberto depois do 1º passo,
    // gravar a partição dele por fora seria desfeito pelo autosave do editor.
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const alvo = createEmptyProject('abre-no-meio', 'Jogo Clicado')
    alvo.assets = [drawingAsset({ id: 'asset-3' })]
    await persistProject(alvo)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })

    // A varredura já começou (o 1º passo não viu projeto nenhum) quando a
    // criança abre o jogo.
    const varredura = syncDrawingsIntoProjects(useProjectStore)
    seedOpenProject([drawingAsset({ id: 'asset-3' })], 'abre-no-meio')
    await varredura

    // O jogo aberto tem que estar com a arte nova NA MEMÓRIA (é o que o autosave
    // vai gravar), e não só no disco.
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
  })

  it('não estoura a cota de um jogo fechado (o load descartaria as imagens)', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const cheio = createEmptyProject('cheio', 'Jogo Cheio')
    cheio.assets = [drawingAsset({}), ...fillerAssets()]
    await persistProject(cheio)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_ENORME })

    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOtherProjects).toBe(0)
    expect(result.failures.join(' ')).toContain('Jogo Cheio')
    // A imagem velha continua lá — nada foi descartado nem meio-gravado.
    const assets = await loadProjectAssetsById('cheio')
    expect(assets.find((a) => a.id === 'asset-1')?.dataUrl).toBe(PNG)
    expect(assets).toHaveLength(QUASE_CHEIO + 1)
  })

  it('bytes que o load descartaria NÃO vão ao jogo fechado: recusa registrada e projeto intocado', async () => {
    // A biblioteca valida imagem SEM `kind`, então um registro `image` com bytes de ÁUDIO
    // passa por ela; o `sanitizeProjectAssets` do load o descartaria em silêncio.
    const AUDIO = 'data:audio/mpeg;base64,AAAA'
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const fechado = createEmptyProject('fechado', 'Outro Jogo')
    fechado.assets = [drawingAsset({ id: 'asset-2' })]
    await persistProject(fechado)
    seedOpenProject([])
    expect((await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: AUDIO })).ok).toBe(true)

    const result = await syncDrawingsIntoProjects(useProjectStore)

    expect(result.updatedInOtherProjects).toBe(0)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toContain('"heroi"')
    expect(result.failures[0]).toContain('Outro Jogo')
    expect(takeDrawingSyncFailures()).toHaveLength(1)
    expect((await loadProjectAssetsById('fechado'))[0]?.dataUrl).toBe(PNG)
  })

  it('duas chamadas ao mesmo tempo viram UMA varredura', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    seedOpenProject([drawingAsset({})])
    const [a, b] = await Promise.all([
      syncDrawingsIntoProjects(useProjectStore),
      syncDrawingsIntoProjects(useProjectStore),
    ])
    // A 2ª compartilha o resultado da 1ª (o painel e o observador de foco
    // disparam no mesmo evento quando o painel está aberto).
    expect(a).toBe(b)
    expect(a.updatedInOpenProject).toBe(1)
  })

  it('troca de perfil não compartilha single-flight nem redireciona escritas em voo', async () => {
    setStorageNamespace('perfil-a')
    setPersonalAssetsNamespace('perfil-a')
    await savePersonalAsset({ id: 'd1', name: 'heroi-a', dataUrl: PNG_NOVO })
    for (let index = 0; index < 4; index += 1) {
      const project = createEmptyProject(`a-${index}`, `Projeto A ${index}`)
      project.assets = [drawingAsset({ id: `asset-a-${index}` })]
      await persistProject(project)
    }

    let releaseYield: (() => void) | undefined
    let notifyYieldStarted: (() => void) | undefined
    const yieldStarted = new Promise<void>((resolve) => {
      notifyYieldStarted = resolve
    })
    const previousScheduler = (globalThis as { scheduler?: unknown }).scheduler
    ;(globalThis as { scheduler?: { yield: () => Promise<void> } }).scheduler = {
      yield: () => {
        notifyYieldStarted?.()
        return new Promise<void>((resolve) => {
          releaseYield = resolve
        })
      },
    }

    try {
      const sweepA = syncDrawingsIntoProjects(useProjectStore)
      await yieldStarted

      setStorageNamespace('perfil-b')
      setPersonalAssetsNamespace('perfil-b')
      await savePersonalAsset({ id: 'd1', name: 'heroi-b', dataUrl: PNG_PERFIL_B })
      const projectB = createEmptyProject('b-1', 'Projeto B')
      projectB.assets = [drawingAsset({ id: 'asset-b' })]
      await persistProject(projectB)

      const sweepB = await syncDrawingsIntoProjects(useProjectStore)
      expect(sweepB.updatedInOtherProjects).toBe(1)
      expect((await loadProjectAssetsById('b-1'))[0]?.dataUrl).toBe(PNG_PERFIL_B)

      releaseYield?.()
      await sweepA

      expect(
        (await loadProjectAssetsById('a-3', getProjectStorageScope('perfil-a')))[0]?.dataUrl,
      ).toBe(PNG_NOVO)
      expect((await loadProjectAssetsById('b-1'))[0]?.dataUrl).toBe(PNG_PERFIL_B)
    } finally {
      if (previousScheduler === undefined) {
        delete (globalThis as { scheduler?: unknown }).scheduler
      } else {
        ;(globalThis as { scheduler?: unknown }).scheduler = previousScheduler
      }
      releaseYield?.()
    }
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

/** GLB v2 válido ("glTF", versão 2, tamanho coerente) com `extra` bytes de carga. */
function glb(extra: number): string {
  const len = 12 + extra
  const header = String.fromCharCode(
    0x67,
    0x6c,
    0x54,
    0x46,
    2,
    0,
    0,
    0,
    len & 255,
    (len >> 8) & 255,
    (len >> 16) & 255,
    (len >> 24) & 255,
  )
  return `data:model/gltf-binary;base64,${btoa(header + String.fromCharCode(0).repeat(extra))}`
}
const GLB_A = glb(0)
const GLB_B = glb(4)
/** ~293k chars: junto dos fillers no teto, estoura o orçamento do jogo. */
const GLB_GRANDE = glb(220_000)

/** Modelo do Molda no projeto (o elo é o mesmo `libId`; a origem diz quem edita). */
function modelAsset(over: Partial<ProjectAsset> = {}): ProjectAsset {
  return {
    id: 'asset-1',
    name: 'nave',
    kind: 'model3d',
    dataUrl: GLB_A,
    originalFileName: 'nave.glb',
    source: 'library',
    libId: 'personal:m1',
    libOrigin: 'molda',
    ...over,
  }
}

const moldaRecord = (dataUrl: string, originalFileName = 'nave.glb') =>
  savePersonalAsset({
    id: 'm1',
    name: 'nave',
    kind: 'model3d' as const,
    origin: 'molda' as const,
    dataUrl,
    originalFileName,
  })

const { reconcileDrawingsFromRestoredProject } = await import('../personalSync')

function derivedPintaAsset(): ProjectAsset {
  const dataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
  const bytes = Buffer.from(dataUrl.split(',')[1]!, 'base64')
  return drawingAsset({
    dataUrl,
    libOrigin: 'pinta',
    libRevision: 2,
    width: 1,
    height: 1,
    pintaImage: {
      recipe: {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'd1',
        selection: { kind: 'frame', animationId: 'andar', frameIndex: 1 },
        scale: 1,
      },
      provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
      output: {
        mime: 'image/png',
        width: 1,
        height: 1,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    },
  })
}

function imageResolver() {
  let provenance: PintaImageDerivation['provenance'] = {
    sourceSha256: 'b'.repeat(64),
    dependencies: [],
  }
  let inspections = 0
  const recipes: PintaImageDerivation['recipe'][] = []
  const adapter: StudioPintaLibraryAdapter = {
    list: async () => [],
    import: async () => {
      throw new Error('Synchronization must never save a canonical import')
    },
    inspectImage: async () => {
      inspections++
      return structuredClone(provenance)
    },
    previewImage: async (recipe, _limits, options) => {
      expect(options?.expectedProvenance).toEqual(provenance)
      recipes.push(structuredClone(recipe))
      const source = derivedPintaAsset()
      if (!source.pintaImage) throw new Error('Fixture must carry a recipe')
      return {
        dataUrl: source.dataUrl,
        derivation: { ...source.pintaImage, recipe, provenance: structuredClone(provenance) },
      }
    },
  }
  return {
    adapter,
    recipes,
    inspections: () => inspections,
    setProvenance: (value: PintaImageDerivation['provenance']) => {
      provenance = structuredClone(value)
    },
  }
}

async function seedPythonProject(assets: ProjectAsset[], kind: 'classic' | 'pro' = 'classic') {
  const project = await refinePythonProjectDocument({
    ...documentFixture('python', kind),
    assets,
  })
  useProjectStore.setState({ project, isDirty: false, saveError: null })
  return project
}

describe('C3 recipe sync', () => {
  it('um leitor antigo conserva material e programa nos projetos aberto e fechado; a edição offline pode atualizar depois', async () => {
    const { pngWithPintaData } = await import('../../../../pinta/src/export/pngText')
    async function mapAsset(version: 1 | 2) {
      const asset = derivedPintaAsset()
      const raw = await pngWithPintaData(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64'), {
        format: 'pinta',
        kind: 'map',
        version,
        name: 'fase',
        layers: [],
      })
      asset.dataUrl = `data:image/png;base64,${Buffer.from(raw).toString('base64')}`
      asset.pintaImage!.recipe.selection = { kind: 'map' }
      asset.pintaImage!.provenance = {
        sourceSha256: (version === 1 ? 'a' : 'b').repeat(64),
        dependencies: [{ drawingId: 'tiles', sha256: 'c'.repeat(64) }],
      }
      asset.pintaImage!.output = {
        ...asset.pintaImage!.output,
        bytes: raw.length,
        sha256: createHash('sha256').update(raw).digest('hex'),
        ...(version === 2 ? { dataVersion: 2 as const } : {}),
      }
      return asset
    }
    const before = await mapAsset(1),
      after = await mapAsset(2)
    const closed = await seedPythonProject([before], 'pro')
    await persistProject(closed)
    const open = await seedPythonProject([before])
    const resolver = imageResolver()
    resolver.setProvenance(after.pintaImage!.provenance)
    resolver.adapter.previewImage = async () => ({
      dataUrl: after.dataUrl,
      derivation: after.pintaImage!,
    })
    const refused = await syncDrawingsIntoProjects(useProjectStore, {
      pintaLibrary: resolver.adapter,
      runtimeCatalog: () => ({ profiles: [], releases: [] }),
    })
    expect(refused.updatedInOpenProject).toBe(0)
    expect(refused.updatedInOtherProjects).toBe(0)
    expect(refused.failures).toHaveLength(1) // Same material name: the existing notice queue deduplicates it.
    expect(useProjectStore.getState().project?.assets).toEqual(open.assets)
    expect((await loadProjectById(closed.id))?.assets).toEqual(closed.assets)
    const allowed = await syncDrawingsIntoProjects(useProjectStore, {
      pintaLibrary: resolver.adapter,
      runtimeCatalog: () => null,
    })
    expect(allowed).toMatchObject({
      updatedInOpenProject: 1,
      updatedInOtherProjects: 1,
      failures: [],
    })
    expect(useProjectStore.getState().project?.assets?.[0]?.pintaImage?.output.dataVersion).toBe(2)
    const persisted = await refinePythonProjectDocument(await loadProjectById(closed.id))
    expect(persisted.assets?.[0]?.pintaImage?.output.dataVersion).toBe(2)
    const live = useProjectStore.getState().project
    expect(live?.kind === 'classic' && live.files).toEqual(open.kind === 'classic' && open.files)
    expect(persisted?.kind === 'pro' && persisted.tree).toEqual(
      closed.kind === 'pro' && closed.tree,
    )
  })

  it('a alteração do catálogo durante a rasterização não substitui o material anterior', async () => {
    const { pngWithPintaData } = await import('../../../../pinta/src/export/pngText')
    const previous = derivedPintaAsset()
    previous.pintaImage!.recipe.selection = { kind: 'map' }
    previous.pintaImage!.provenance.dependencies = [{ drawingId: 'tiles', sha256: 'c'.repeat(64) }]
    const raw = await pngWithPintaData(Buffer.from(previous.dataUrl.split(',')[1]!, 'base64'), {
      format: 'pinta',
      kind: 'map',
      version: 1,
    })
    previous.dataUrl = `data:image/png;base64,${Buffer.from(raw).toString('base64')}`
    previous.pintaImage!.output = {
      ...previous.pintaImage!.output,
      bytes: raw.length,
      sha256: createHash('sha256').update(raw).digest('hex'),
    }
    await seedPythonProject([previous])
    let catalog: StudioRuntimeCatalog | null = null
    const resolver = imageResolver()
    resolver.setProvenance({ ...previous.pintaImage!.provenance, sourceSha256: 'b'.repeat(64) })
    const updatedBytes = await pngWithPintaData(
      Buffer.from(derivedPintaAsset().dataUrl.split(',')[1]!, 'base64'),
      { format: 'pinta', kind: 'map', version: 2 },
    )
    resolver.adapter.previewImage = async () => {
      catalog = { profiles: [], releases: [] }
      return {
        dataUrl: `data:image/png;base64,${Buffer.from(updatedBytes).toString('base64')}`,
        derivation: {
          ...previous.pintaImage!,
          provenance: { ...previous.pintaImage!.provenance, sourceSha256: 'b'.repeat(64) },
          output: {
            ...previous.pintaImage!.output,
            dataVersion: 2,
            bytes: updatedBytes.length,
            sha256: createHash('sha256').update(updatedBytes).digest('hex'),
          },
        },
      }
    }
    const result = await syncDrawingsIntoProjects(useProjectStore, {
      pintaLibrary: resolver.adapter,
      runtimeCatalog: () => catalog,
    })
    expect(result.updatedInOpenProject).toBe(0)
    expect(result.failures).toHaveLength(1)
    expect(useProjectStore.getState().project?.assets?.[0]).toEqual(previous)
  })
  for (const kind of ['classic', 'pro'] as const) {
    it(`${kind}: synchronized recipes survive storage, execution materialization and offline source export`, async () => {
      const { loadProjectById } = await import('../../state/persistence')
      const { buildPythonSourceFiles } = await import('../../export/pythonSource')
      const { preparePythonExecutionSnapshot } = await import('../../runtime/python/snapshot')
      const first = { ...derivedPintaAsset(), proPath: 'art/heroi.png' }
      const firstDerivation = first.pintaImage
      if (!firstDerivation) throw new Error('First recipe fixture required')
      const second = structuredClone(first)
      second.id = 'asset-second'
      second.name = 'segundo-quadro'
      second.proPath = 'art/segundo-quadro.png'
      if (!second.pintaImage) throw new Error('Recipe fixture required')
      second.pintaImage.recipe.selection = {
        kind: 'frame',
        animationId: 'andar',
        frameIndex: 0,
      }
      const original = await seedPythonProject([first, second], kind)
      const sourceBefore = structuredClone(original.kind === 'pro' ? original.tree : original.files)
      // Same canonical personal sheet for both project recipes. Sync must not
      // replace this record with a selected frame or remove its animation range.
      const svg =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"/>')
      await savePersonalAsset({
        id: 'd1',
        name: 'heroi',
        dataUrl: svg,
        origin: 'pinta',
        width: 2,
        height: 1,
        sprite: {
          frameW: 1,
          frameH: 1,
          animations: [{ name: 'andar', from: 0, to: 1, fps: 8, loop: true }],
        },
      })
      const canonical = await getPersonalAsset('d1')
      expect(canonical?.dataUrl).toBe(svg)
      // Trusted byte fixture also used by verify-python-preview-browser. The
      // renderer boundary supplies PNGs; native/browser pixel tests live in Pinta.
      const updated =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='
      const resolver = imageResolver()
      const preview = resolver.adapter.previewImage
      if (!preview) throw new Error('Preview fixture required')
      resolver.adapter.previewImage = async (...args) => {
        const result = await preview(...args)
        const selection = args[0].selection
        if (selection.kind !== 'frame') throw new Error('Frame fixture required')
        const dataUrl = selection.frameIndex === 1 ? updated : second.dataUrl
        const bytes = Buffer.from(dataUrl.split(',')[1]!, 'base64')
        return {
          dataUrl,
          derivation: {
            ...result.derivation,
            output: {
              ...result.derivation.output,
              bytes: bytes.length,
              sha256: createHash('sha256').update(bytes).digest('hex'),
            },
          },
        }
      }
      const synced = await syncDrawingsIntoProjects(useProjectStore, {
        pintaLibrary: resolver.adapter,
      })
      expect(synced).toMatchObject({ updatedInOpenProject: 2, failures: [] })
      expect(resolver.inspections()).toBe(1)
      expect(resolver.recipes).toEqual([firstDerivation.recipe, second.pintaImage.recipe])
      const live = useProjectStore.getState().project
      if (!live) throw new Error('Synchronized project required')
      await persistProject(live)
      // No adapter survives into read/export. Any unexpected derivation would fail.
      resolver.adapter.inspectImage = async () => {
        throw new Error('Offline read/export must not inspect Pinta')
      }
      resolver.adapter.previewImage = async () => {
        throw new Error('Offline read/export must not rasterize Pinta')
      }
      useProjectStore.setState({ project: null })
      const restored = await refinePythonProjectDocument(await loadProjectById(original.id))
      expect(restored.kind === 'pro' ? restored.tree : restored.files).toEqual(sourceBefore)
      expect(
        restored.assets?.map(({ id, name, libId, libRevision, proPath }) => ({
          id,
          name,
          libId,
          libRevision,
          proPath,
        })),
      ).toEqual(
        [first, second].map(({ id, name, libId, libRevision, proPath }) => ({
          id,
          name,
          libId,
          libRevision,
          proPath,
        })),
      )
      const snapshot = await preparePythonExecutionSnapshot(restored)
      const exported = await buildPythonSourceFiles(restored, null)
      const manifestPath = Object.keys(exported.files).find((path) =>
        path.endsWith('/export-manifest.json'),
      )
      if (!manifestPath) throw new Error('Source export manifest required')
      const manifest = JSON.parse(exported.files[manifestPath] as string)
      for (const [index, { input, dataUrl }] of [
        { input: first, dataUrl: updated },
        { input: second, dataUrl: second.dataUrl },
      ].entries()) {
        const bytes = new Uint8Array(Buffer.from(dataUrl.split(',')[1]!, 'base64'))
        const derivation = input.pintaImage
        if (!derivation) throw new Error('Restored recipe fixture required')
        const expected: PintaImageDerivation = {
          ...derivation,
          provenance: { sourceSha256: 'b'.repeat(64), dependencies: [] },
          output: {
            ...derivation.output,
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          },
        }
        expect(restored.assets?.[index]?.pintaImage).toEqual(expected)
        expect(snapshot.files.find((file) => file.path === input.proPath)?.bytes).toEqual(bytes)
        expect(exported.files[input.proPath]).toEqual(bytes)
        expect(manifest.assets.assets[index]).toMatchObject({
          path: input.proPath,
          pintaImage: expected,
          sha256: expected.output.sha256,
        })
      }
      expect(await getPersonalAsset('d1')).toEqual(canonical)
      expect(resolver.inspections()).toBe(1)
      expect(resolver.recipes).toHaveLength(2)
    })
  }

  for (const language of ['javascript', 'python'] as const) {
    for (const kind of ['classic', 'pro'] as const) {
      it(`${language} ${kind}: a canonical copy skipped during opening catches up with the same marker`, async () => {
        const { prepareEditableStudioProject } = await import(
          '../../state/editableProjectValidation'
        )
        const { personalAssetsChangedAt } = await import('../personal')
        const old = drawingAsset({})
        const closed = await prepareEditableStudioProject({
          ...documentFixture(language, kind),
          assets: [old],
          coverAssetName: old.name,
        })
        if (!closed) throw new Error('Canonical fixture was refused')
        await persistProject(closed)
        await savePersonalAsset({ id: 'd1', name: 'heroi', origin: 'pinta', dataUrl: PNG_NOVO })
        const marker = personalAssetsChangedAt()
        const scope = captureProjectStorageScope()
        const release = beginProjectOpening(scope, closed.id)
        try {
          const first = await syncDrawingsIntoProjects(useProjectStore)
          expect(first.updatedInOtherProjects).toBe(0)
          expect((await loadProjectAssetsById(closed.id))[0]?.dataUrl).toBe(PNG)
          // The real watcher schedules another sweep on this hydration transition.
          useProjectStore.getState().hydrateProject(closed)
          release()
          expect(personalAssetsChangedAt()).toBe(marker)
          const second = await syncDrawingsIntoProjects(useProjectStore)
          expect(second.updatedInOpenProject).toBe(1)
          expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(PNG_NOVO)
          expect(personalAssetsChangedAt()).toBe(marker)
          const readsBeforeThird = reads
          const third = await syncDrawingsIntoProjects(useProjectStore)
          expect(third.updatedInOpenProject).toBe(0)
          expect(third.updatedInOtherProjects).toBe(0)
          expect(reads).toBe(readsBeforeThird)
        } finally {
          release()
        }
      })
    }
  }

  it('historical closed JS with an observed absent head still updates atomically', async () => {
    const project = createEmptyProject('historical-js', 'JavaScript histórico')
    project.assets = [drawingAsset({})]
    await persistProject(project)
    const scope = captureProjectStorageScope()
    kvOf(scope.store).delete(projectHeadKey(project.id))
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
    seedOpenProject([])
    expect((await syncDrawingsIntoProjects(useProjectStore)).updatedInOtherProjects).toBe(1)
    expect((await loadProjectAssetsById(project.id))[0]?.dataUrl).toBe(PNG_NOVO)
    expect(kvOf(scope.store).has(projectHeadKey(project.id))).toBe(true)
  })

  it('an observed absent head refuses a competing writer that created the first head', async () => {
    const project = createEmptyProject('historical-cas', 'JavaScript histórico')
    project.assets = [drawingAsset({})]
    await persistProject(project)
    const scope = captureProjectStorageScope()
    kvOf(scope.store).delete(projectHeadKey(project.id))
    const absent = await loadProjectAssetsById(project.id, scope)
    const winner = [{ ...drawingAsset({}), name: 'vencedor' }]
    expect(await persistProjectAssets(project.id, winner, scope, absent)).toBe(true)
    const error = await persistProjectAssets(
      project.id,
      [{ ...drawingAsset({}), name: 'atrasado' }],
      scope,
      absent,
    ).then(
      () => null,
      (cause: unknown) => cause,
    )
    expect(error).toBeInstanceOf(Error)
    expect(await loadProjectAssetsById(project.id, scope)).toEqual(winner)
  })

  it('an opening project cannot hydrate a stale material snapshot after the closed sync committed', async () => {
    const asset = derivedPintaAsset()
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      assets: [asset],
    })
    await persistProject(closed)
    seedOpenProject([])
    const resolver = imageResolver()
    const previewEntered = Promise.withResolvers<void>(),
      previewRelease = Promise.withResolvers<void>(),
      loadCaptured = Promise.withResolvers<void>(),
      loadRelease = Promise.withResolvers<void>()
    const preview = resolver.adapter.previewImage
    if (!preview) throw new Error('Fixture preview required')
    resolver.adapter.previewImage = async (...args) => {
      previewEntered.resolve()
      await previewRelease.promise
      return preview(...args)
    }
    const sync = syncDrawingsIntoProjects(useProjectStore, { pintaLibrary: resolver.adapter })
    await previewEntered.promise
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let held = false
    const probe = spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
      const result = await digest(...args)
      if (!held) {
        held = true
        loadCaptured.resolve()
        await loadRelease.promise
      }
      return result
    })
    let opening: ReturnType<ReturnType<typeof useProjectStore.getState>['loadProject']> | undefined
    try {
      opening = useProjectStore.getState().loadProject(closed.id)
      await loadCaptured.promise
      previewRelease.resolve()
      const synced = await sync
      expect([0, 1]).toContain(synced.updatedInOtherProjects)
      // Either opening wins before the write, or it adopts the committed revision.
      const expectedHash = (synced.updatedInOtherProjects === 1 ? 'b' : 'a').repeat(64)
      loadRelease.resolve()
      await opening
      expect(
        useProjectStore.getState().project?.assets?.[0]?.pintaImage?.provenance.sourceSha256,
      ).toBe(expectedHash)
      const live = useProjectStore.getState().project
      if (!live) throw new Error('Opened project required')
      await persistProject(live)
      expect((await loadProjectAssetsById(closed.id))[0]?.pintaImage?.provenance.sourceSha256).toBe(
        expectedHash,
      )
    } finally {
      probe.mockRestore()
      previewRelease.resolve()
      loadRelease.resolve()
      await sync
      await opening
    }
  })

  it('updates open and closed PNG recipes through one native inspection while keeping canonical personal bytes and project identities', async () => {
    const first = derivedPintaAsset()
    const firstDerivation = first.pintaImage
    if (!firstDerivation) throw new Error('First recipe fixture required')
    const second = structuredClone(first)
    second.id = 'asset-second'
    second.name = 'segundo-quadro'
    if (!second.pintaImage) throw new Error('Fixture must carry a recipe')
    second.pintaImage.recipe.selection = {
      kind: 'frame',
      animationId: 'andar',
      frameIndex: 0,
    }
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      assets: [{ ...second, proPath: 'assets/segundo-quadro.png' }],
    })
    await persistProject(closed)
    await savePersonalAsset({ id: 'd1', name: 'heroi', origin: 'pinta', dataUrl: PNG_NOVO })
    const canonical = await getPersonalAsset('d1')
    await seedPythonProject([first, second])
    const resolver = imageResolver()
    const result = await syncDrawingsIntoProjects(useProjectStore, {
      pintaLibrary: resolver.adapter,
    })
    expect(result.updatedInOpenProject).toBe(2)
    expect(result.updatedInOtherProjects).toBe(1)
    expect(result.failures).toEqual([])
    expect(resolver.inspections()).toBe(1)
    expect(resolver.recipes).toEqual([firstDerivation.recipe, second.pintaImage.recipe])
    const open = useProjectStore.getState().project?.assets ?? []
    expect(open.map(({ id, name, libId }) => ({ id, name, libId }))).toEqual(
      [first, second].map(({ id, name, libId }) => ({ id, name, libId })),
    )
    expect(open[0]?.pintaImage?.provenance.sourceSha256).toBe('b'.repeat(64))
    const closedAssets = await loadProjectAssetsById(closed.id)
    expect(closedAssets[0]?.proPath).toBe('assets/segundo-quadro.png')
    expect(closedAssets[0]?.pintaImage?.provenance.sourceSha256).toBe('b'.repeat(64))
    expect(await getPersonalAsset('d1')).toEqual(canonical)
  })

  it('Pygame Zero: an SVG recipe is reapplied as SVG when the drawing changes, open and closed, at the same images/ path', async () => {
    const svgOf = (color: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2" viewBox="0 0 1 1"><rect width="1" height="1" fill="${color}"/></svg>`
    const svgDataUrl = (svg: string) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    const derivationOf = (svg: string, base: PintaImageDerivation): PintaImageDerivation => {
      const bytes = Buffer.from(svg)
      return {
        ...base,
        recipe: { ...base.recipe, output: 'svg' },
        output: {
          mime: 'image/svg+xml',
          width: 2,
          height: 2,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
      }
    }
    const png = derivedPintaAsset()
    if (!png.pintaImage) throw new Error('Fixture must carry a recipe')
    const before = svgOf('#ff0000')
    const vector: ProjectAsset = {
      ...png,
      dataUrl: svgDataUrl(before),
      width: 2,
      height: 2,
      proPath: 'images/heroi.svg',
      pintaImage: derivationOf(before, png.pintaImage),
    }
    const pgzero = [{ id: 'python-pgzero', version: '1.0.0', installedAt: 1 }]
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'classic'),
      id: 'python-closed-pgzero',
      installedExtensions: pgzero,
      assets: [vector],
    })
    await persistProject(closed)
    const open = await refinePythonProjectDocument({
      ...documentFixture('python', 'classic'),
      installedExtensions: pgzero,
      assets: [vector],
    })
    useProjectStore.setState({ project: open, isDirty: false, saveError: null })
    await savePersonalAsset({ id: 'd1', name: 'heroi', origin: 'pinta', dataUrl: PNG_NOVO })
    const after = svgOf('#0000ff')
    const resolver = imageResolver()
    resolver.adapter.previewImage = async (recipe, _limits, options) => {
      resolver.recipes.push(structuredClone(recipe))
      if (!vector.pintaImage) throw new Error('Fixture must carry a recipe')
      return {
        dataUrl: svgDataUrl(after),
        derivation: {
          ...derivationOf(after, vector.pintaImage),
          recipe,
          provenance: structuredClone(options?.expectedProvenance ?? vector.pintaImage.provenance),
        },
      }
    }
    const result = await syncDrawingsIntoProjects(useProjectStore, {
      pintaLibrary: resolver.adapter,
    })
    expect(result.failures).toEqual([])
    expect(result.updatedInOpenProject).toBe(1)
    expect(result.updatedInOtherProjects).toBe(1)
    // The SAME recipe went back to Pinta: it still asks for SVG.
    expect(resolver.recipes.every((recipe) => recipe.output === 'svg')).toBe(true)
    for (const synced of [
      useProjectStore.getState().project?.assets?.[0],
      (await loadProjectAssetsById(closed.id))[0],
    ]) {
      expect(synced?.dataUrl).toBe(svgDataUrl(after))
      expect(synced?.proPath).toBe('images/heroi.svg')
      expect(synced?.pintaImage?.output.mime).toBe('image/svg+xml')
      expect(synced?.pintaImage?.provenance.sourceSha256).toBe('b'.repeat(64))
    }
  })

  it('detects a dependency change with unchanged source and personal marker, without loading JS asset partitions or rasterizing unchanged recipes', async () => {
    const asset = derivedPintaAsset()
    if (!asset.pintaImage) throw new Error('Fixture must carry a recipe')
    asset.pintaImage.recipe.selection = { kind: 'tilemap' }
    asset.pintaImage.provenance.dependencies = [{ drawingId: 'tiles', sha256: 'c'.repeat(64) }]
    await seedPythonProject([asset])
    const js = createEmptyProject('js-unchanged', 'JS intacto')
    js.assets = [drawingAsset({})]
    await persistProject(js)
    // This case requires an unchanged, valid signal. A missing signal now forces a safe scan.
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const resolver = imageResolver()
    resolver.setProvenance(asset.pintaImage.provenance)
    const options = { pintaLibrary: resolver.adapter }
    expect((await syncDrawingsIntoProjects(useProjectStore, options)).updatedInOpenProject).toBe(0)
    expect(resolver.recipes).toEqual([])
    askedKeys.length = 0
    resolver.setProvenance({
      ...asset.pintaImage.provenance,
      dependencies: [{ drawingId: 'tiles', sha256: 'd'.repeat(64) }],
    })
    expect((await syncDrawingsIntoProjects(useProjectStore, options)).updatedInOpenProject).toBe(1)
    expect(resolver.inspections()).toBe(2)
    expect(resolver.recipes).toEqual([asset.pintaImage.recipe])
    expect(askedKeys.filter((key) => key.includes('assets') && key.includes(js.id))).toEqual([])
    expect(
      useProjectStore.getState().project?.assets?.[0]?.pintaImage?.provenance.dependencies,
    ).toEqual([{ drawingId: 'tiles', sha256: 'd'.repeat(64) }])
  })

  for (const change of [
    'project-aba',
    'language-aba',
    'owner-aba',
    'profile-aba',
    'cancel',
    'edit',
    'remove',
    'adapter',
  ] as const) {
    it(`a pending PNG cannot commit after ${change}`, async () => {
      const asset = derivedPintaAsset()
      const project = await seedPythonProject([asset])
      const resolver = imageResolver()
      const release = Promise.withResolvers<void>()
      const entered = Promise.withResolvers<void>()
      const preview = resolver.adapter.previewImage
      if (!preview) throw new Error('Fixture preview required')
      resolver.adapter.previewImage = async (...args) => {
        entered.resolve()
        await release.promise
        return preview(...args)
      }
      const controller = new AbortController()
      const pending = syncDrawingsIntoProjects(useProjectStore, {
        pintaLibrary: resolver.adapter,
        signal: controller.signal,
      })
      await entered.promise
      if (change === 'project-aba') {
        useProjectStore.setState({ project: { ...project, id: 'another' } })
        useProjectStore.setState({ project })
      } else if (change === 'language-aba') {
        useProjectStore.setState({ project: createEmptyProject(project.id, 'JavaScript') })
        useProjectStore.setState({ project })
      } else if (change === 'owner-aba') {
        useProjectStore.getState().setEditingAccess('observer')
        useProjectStore.getState().setEditingAccess('author')
      } else if (change === 'profile-aba') {
        const namespace = captureProjectStorageScope().namespace
        setStorageNamespace('another-profile')
        setPersonalAssetsNamespace('another-profile')
        setStorageNamespace(namespace)
        setPersonalAssetsNamespace(namespace)
      } else if (change === 'cancel') controller.abort()
      else if (change === 'edit') {
        useProjectStore.setState({
          project: { ...project, assets: [{ ...asset, name: 'manual' }] },
        })
      } else if (change === 'remove') {
        useProjectStore.setState({ project: { ...project, assets: [] } })
      } else {
        const nextOwner = imageResolver()
        nextOwner.setProvenance({ sourceSha256: 'c'.repeat(64), dependencies: [] })
        expect(
          (await syncDrawingsIntoProjects(useProjectStore, { pintaLibrary: nextOwner.adapter }))
            .updatedInOpenProject,
        ).toBe(1)
      }
      const expected = structuredClone(useProjectStore.getState().project?.assets)
      release.resolve()
      const result = await pending
      expect(result.updatedInOpenProject).toBe(0)
      expect(result.updatedInOtherProjects).toBe(0)
      expect(useProjectStore.getState().project?.assets).toEqual(expected)
    })
  }

  for (const failure of ['missing', 'recipe', 'digest', 'quota'] as const) {
    it(`preserves the last PNG and reports ${failure} instead of adopting a substitute`, async () => {
      const asset = derivedPintaAsset()
      await seedPythonProject([asset])
      const resolver = imageResolver()
      if (failure === 'missing')
        resolver.adapter.inspectImage = async () => {
          throw new Error('O desenho não está disponível.')
        }
      else {
        const preview = resolver.adapter.previewImage
        if (!preview) throw new Error('Fixture preview required')
        resolver.adapter.previewImage = async (...args) => {
          const image = await preview(...args)
          if (failure === 'recipe')
            image.derivation.recipe = { ...image.derivation.recipe, scale: 2 }
          if (failure === 'digest') image.derivation.output.sha256 = 'f'.repeat(64)
          if (failure === 'quota') image.derivation.output.width = 4097
          return image
        }
      }
      const result = await syncDrawingsIntoProjects(useProjectStore, {
        pintaLibrary: resolver.adapter,
      })
      expect(result.updatedInOpenProject).toBe(0)
      expect(result.failures.length).toBeGreaterThan(0)
      expect(result.failures.join(' ')).toContain('mantida')
      expect(useProjectStore.getState().project?.assets).toEqual([asset])
    })
  }

  it('closed material/head changes win over a pending derivation', async () => {
    const asset = derivedPintaAsset()
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      assets: [asset],
    })
    await persistProject(closed)
    seedOpenProject([])
    const resolver = imageResolver()
    const entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>()
    const preview = resolver.adapter.previewImage
    if (!preview) throw new Error('Fixture preview required')
    resolver.adapter.previewImage = async (...args) => {
      entered.resolve()
      await release.promise
      return preview(...args)
    }
    const pending = syncDrawingsIntoProjects(useProjectStore, { pintaLibrary: resolver.adapter })
    await entered.promise
    const expected = await loadProjectAssetsById(closed.id)
    const manual = [{ ...asset, name: 'manual-fechado' }]
    expect(await persistProjectAssets(closed.id, manual, undefined, expected)).toBe(true)
    release.resolve()
    expect((await pending).updatedInOtherProjects).toBe(0)
    expect(await loadProjectAssetsById(closed.id)).toEqual(manual)
  })

  it('closed writes require an observed head and recheck their guard inside the transaction', async () => {
    const asset = derivedPintaAsset()
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      assets: [asset],
    })
    await persistProject(closed)
    const expected = await loadProjectAssetsById(closed.id)
    const replacement = [{ ...asset, name: 'substituto' }]
    expect(await persistProjectAssets(closed.id, replacement, undefined, [...expected])).toBe(false)
    let guardCalls = 0
    expect(
      await persistProjectAssets(
        closed.id,
        replacement,
        undefined,
        expected,
        () => ++guardCalls < 2,
      ),
    ).toBe(false)
    expect(guardCalls).toBe(2)
    expect(await loadProjectAssetsById(closed.id)).toEqual([asset])
  })

  it('a queued closed write is revoked before its turn without touching its observed head', async () => {
    const asset = derivedPintaAsset()
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      assets: [asset],
    })
    await persistProject(closed)
    const scope = captureProjectStorageScope()
    const expected = await loadProjectAssetsById(closed.id, scope)
    const release = Promise.withResolvers<void>()
    const first = runSerializedProjectWrite(scope, closed.id, async () => {
      await release.promise
      return undefined
    })
    let allowed = true
    const pending = persistProjectAssets(
      closed.id,
      [{ ...asset, name: 'late' }],
      scope,
      expected,
      () => allowed,
    )
    allowed = false
    release.resolve()
    await first
    expect(await pending).toBe(false)
    expect(await loadProjectAssetsById(closed.id, scope)).toEqual([asset])
    // The revoked operation did not advance the head: the same observed CAS remains usable.
    expect(
      await persistProjectAssets(closed.id, [{ ...asset, name: 'valid' }], scope, expected),
    ).toBe(true)
  })

  it('an opening acquired after queue admission still fences the conditional transaction', async () => {
    const project = createEmptyProject('opening-transaction', 'JS')
    const asset = drawingAsset({})
    project.assets = [asset]
    await persistProject(project)
    const scope = captureProjectStorageScope()
    const expected = await loadProjectAssetsById(project.id, scope)
    let release = () => {}
    try {
      expect(
        await persistProjectAssets(
          project.id,
          [{ ...asset, name: 'late' }],
          scope,
          expected,
          () => {
            release = beginProjectOpening(scope, project.id)
            return true
          },
        ),
      ).toBe(false)
      expect(isProjectOpening(scope, project.id)).toBe(true)
      expect(await loadProjectAssetsById(project.id, scope)).toEqual(expected)
    } finally {
      release()
    }
    expect(isProjectOpening(scope, project.id)).toBe(false)
  })
})

describe('Pinta derived images retain their source link until recipe-aware synchronization', () => {
  it('restoring a frame never creates a personal copy of its PNG or changes its drawing link', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', origin: 'pinta', dataUrl: PNG })
    const library = await listPersonalAssets()
    const project = { assets: [derivedPintaAsset()], updatedAt: 3 }
    const before = structuredClone(project)
    expect(await reconcileDrawingsFromRestoredProject(project)).toEqual({ projectChanged: false })
    expect(project).toEqual(before)
    expect(await listPersonalAssets()).toEqual(library)
    // Legacy JavaScript drawings still retain both sides of an actual divergence.
    const javascript = { assets: [drawingAsset({ dataUrl: PNG_NOVO })] }
    expect(await reconcileDrawingsFromRestoredProject(javascript)).toEqual({ projectChanged: true })
    expect(javascript.assets[0]?.libId).not.toBe('personal:d1')
    expect((await getPersonalAsset('d1'))?.dataUrl).toBe(PNG)
  })

  it('open and closed derived frames keep PNG, recipe and source identity when canonical artwork changes', async () => {
    const derived = derivedPintaAsset()
    const closed = await refinePythonProjectDocument({
      ...documentFixture('python', 'pro'),
      name: 'Quadro Python fechado',
      assets: [derived],
    })
    await persistProject(closed)
    await savePersonalAsset({ id: 'd1', name: 'heroi', origin: 'pinta', dataUrl: PNG_NOVO })
    await savePersonalAsset({ id: 'js', name: 'legado', origin: 'pinta', dataUrl: PNG_NOVO })
    seedOpenProject([derived, drawingAsset({ id: 'legacy', name: 'legado', libId: 'personal:js' })])
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(1)
    expect(result.updatedInOtherProjects).toBe(0)
    expect(result.failures.join(' ')).toContain('receita do Pinta')
    expect(useProjectStore.getState().project?.assets?.[0]).toEqual(derived)
    expect(useProjectStore.getState().project?.assets?.[1]?.dataUrl).toBe(PNG_NOVO)
    expect(await loadProjectAssetsById(closed.id)).toEqual([derived])
    expect(mergeDrawingIntoAsset(derived, (await getPersonalAsset('d1'))!)).toBeNull()
    expect((await getPersonalAsset('d1'))?.dataUrl).toBe(PNG_NOVO)
  })
})
type UpdateAssetImageInput = import('../../state/projectStore').UpdateAssetImageInput

describe('criações 3D do Molda (model3d/environment3d)', () => {
  it('bytes iguais = nada a fazer; tipo cruzado NUNCA sincroniza', () => {
    const asset = modelAsset()
    const same = { id: 'm1', name: 'nave', kind: 'model3d' as const, dataUrl: GLB_A, updatedAt: 1 }
    expect(drawingNeedsSync(asset, same)).toBe(false)
    expect(drawingNeedsSync(asset, { ...same, dataUrl: GLB_B })).toBe(true)
    expect(drawingNeedsSync(asset, { ...same, kind: 'image', dataUrl: PNG })).toBe(false)
    expect(drawingNeedsSync(drawingAsset({}), { ...same, dataUrl: GLB_B })).toBe(false)
  })

  it('o .glb novo chega ao projeto ABERTO com o nome do arquivo novo, sem tocar em nome/libId', async () => {
    await moldaRecord(GLB_A)
    seedOpenProject([modelAsset()])
    await moldaRecord(GLB_B, 'nave-v2.glb')
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOpenProject).toBe(1)
    expect(useProjectStore.getState().project?.assets?.[0]).toMatchObject({
      name: 'nave',
      kind: 'model3d',
      dataUrl: GLB_B,
      originalFileName: 'nave-v2.glb',
      libId: 'personal:m1',
      libOrigin: 'molda',
    })
  })

  it('chega ao jogo FECHADO com o nome do arquivo (o sanitize do load exige o .glb)', async () => {
    await moldaRecord(GLB_A)
    const fechado = createEmptyProject('fechado', 'Outro Jogo')
    fechado.assets = [modelAsset({ id: 'asset-2' })]
    await persistProject(fechado)
    seedOpenProject([])
    await moldaRecord(GLB_B, 'nave-v2.glb')
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOtherProjects).toBe(1)
    expect((await loadProjectAssetsById('fechado'))[0]).toMatchObject({
      kind: 'model3d',
      dataUrl: GLB_B,
      originalFileName: 'nave-v2.glb',
      libOrigin: 'molda',
    })
  })

  it('.glb que cresceu e não cabe no jogo fechado vira recusa, sem tocar no asset', async () => {
    await moldaRecord(GLB_A)
    const fechado = createEmptyProject('fechado', 'Jogo Cheio')
    fechado.assets = [...fillerAssets(), modelAsset({ id: 'asset-2' })]
    await persistProject(fechado)
    seedOpenProject([])
    await moldaRecord(GLB_GRANDE)
    const result = await syncDrawingsIntoProjects(useProjectStore)
    expect(result.updatedInOtherProjects).toBe(0)
    expect(result.failures[0]).toContain('A criação "nave" cresceu')
    expect(takeDrawingSyncFailures()).toHaveLength(1)
    const assets = await loadProjectAssetsById('fechado')
    expect(assets.find((a) => a.id === 'asset-2')?.dataUrl).toBe(GLB_A)
  })

  it('mergeDrawingIntoAsset (jogo FECHADO) valida pelo mesmo portão: bytes de imagem, extensão errada ou GLB torto viram null', () => {
    const base = { id: 'm1', name: 'nave', kind: 'model3d' as const, updatedAt: 1 }
    expect(mergeDrawingIntoAsset(modelAsset(), { ...base, dataUrl: PNG })).toBeNull()
    expect(
      mergeDrawingIntoAsset(modelAsset(), {
        ...base,
        dataUrl: GLB_B,
        originalFileName: 'nave.hdr',
      }),
    ).toBeNull()
    expect(
      mergeDrawingIntoAsset(modelAsset(), {
        ...base,
        dataUrl: 'data:model/gltf-binary;base64,AAAA',
        originalFileName: 'nave.glb',
      }),
    ).toBeNull()
    // Válido: o nome novo entra; sem nome novo, vale o que o asset já tinha.
    expect(
      mergeDrawingIntoAsset(modelAsset(), {
        ...base,
        dataUrl: GLB_B,
        originalFileName: 'nave-v2.glb',
      }),
    ).toMatchObject({ dataUrl: GLB_B, originalFileName: 'nave-v2.glb', libRevision: 1 })
    expect(mergeDrawingIntoAsset(modelAsset(), { ...base, dataUrl: GLB_B })).toMatchObject({
      dataUrl: GLB_B,
      originalFileName: 'nave.glb',
    })
    // Imagem: o mesmo `isValidAssetDataUrl(dataUrl, 'image')` do `updateAssetImage`.
    const desenho = { id: 'd1', name: 'heroi', kind: 'image' as const, updatedAt: 1 }
    expect(
      mergeDrawingIntoAsset(drawingAsset({}), {
        ...desenho,
        dataUrl: 'data:audio/mpeg;base64,AAAA',
      }),
    ).toBeNull()
    expect(
      mergeDrawingIntoAsset(drawingAsset({}), { ...desenho, dataUrl: PNG_NOVO }),
    ).toMatchObject({
      dataUrl: PNG_NOVO,
      name: 'heroi',
      libId: 'personal:d1',
    })
  })

  it('updateAssetImage valida MIME × extensão × assinatura e recusa imagem num model3d', () => {
    seedOpenProject([modelAsset()])
    const update = (input: UpdateAssetImageInput) =>
      useProjectStore.getState().updateAssetImage('asset-1', input)
    expect(
      update({ dataUrl: 'data:model/gltf-binary;base64,AAAA', originalFileName: 'nave.glb' }),
    ).toBeTruthy()
    expect(update({ dataUrl: GLB_B, originalFileName: 'nave.hdr' })).toBeTruthy()
    expect(update({ dataUrl: PNG })).toBeTruthy()
    expect(useProjectStore.getState().project?.assets?.[0]?.dataUrl).toBe(GLB_A)
    expect(update({ dataUrl: GLB_B, originalFileName: 'nave-v2.glb' })).toBeNull()
    expect(useProjectStore.getState().project?.assets?.[0]).toMatchObject({
      dataUrl: GLB_B,
      originalFileName: 'nave-v2.glb',
    })
  })

  it('jogo que desce da nuvem com o .glb divergente: a cópia adotada guarda kind, origem e nome do arquivo', async () => {
    await moldaRecord(GLB_A)
    const project = { assets: [modelAsset({ dataUrl: GLB_B })] }
    const { projectChanged } = await reconcileDrawingsFromRestoredProject(project)
    expect(projectChanged).toBe(true)
    const relinked = project.assets[0]
    if (!relinked) throw new Error('sem asset')
    expect(relinked.libId).not.toBe('personal:m1')
    expect(relinked.libOrigin).toBe('molda')
    const copyId = personalIdOf(relinked)
    expect(copyId).toBeTruthy()
    expect(await getPersonalAsset(copyId ?? '')).toMatchObject({
      kind: 'model3d',
      origin: 'molda',
      originalFileName: 'nave.glb',
      dataUrl: GLB_B,
    })
    // O registro original fica intocado (os dois lados preservados).
    expect((await getPersonalAsset('m1'))?.dataUrl).toBe(GLB_A)
  })
})

describe('M2 (full review 26/09/2026): a religação que MUDA o projeto restaurado muda também o `updatedAt`', () => {
  // A régua da nuvem é "mesmo `updatedAt` ⇒ mesmo conteúdo" (o `resolveStale` do kids avança a
  // marca sem cópia quando as datas batem). Se o restauro trocasse bytes/`libRevision` dos assets
  // e subisse com a DATA da nuvem, o outro aparelho veria "a mesma versão" com conteúdo diferente
  // e subiria por cima: religa, sobe, religa, sobe. A data nova é o que quebra o laço.
  it('com um desenho divergente: grava e persiste `updatedAt` NOVO (maior que o da nuvem) e acorda o espelho', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const raw = {
      ...createEmptyProject('01J00000000000000000000BMP', 'Vindo da nuvem'),
      assets: [drawingAsset({ dataUrl: PNG_NOVO })],
      createdAt: 1,
      updatedAt: 2,
    }
    const changed: string[] = []
    setStudioCloudMirror({ onChanged: (id) => changed.push(id), onDeleted: () => {} })
    try {
      const { project } = await useProjectStore.getState().restoreProjectSnapshot(raw, {
        expectedId: raw.id,
      })
      expect(project.updatedAt).toBeGreaterThan(2)
      expect((await loadProjectMetaById(raw.id))?.updatedAt).toBe(project.updatedAt)
      expect(changed).toEqual([raw.id])
    } finally {
      setStudioCloudMirror(null)
    }
  })

  it('sem mudança (o desenho é o mesmo): a data da nuvem é preservada e o espelho fica em silêncio', async () => {
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const local = await getPersonalAsset('d1')
    const raw = {
      ...createEmptyProject('01J00000000000000000000SIL', 'Vindo da nuvem'),
      assets: [drawingAsset({ dataUrl: PNG, libRevision: local?.updatedAt })],
      createdAt: 1,
      updatedAt: 2,
    }
    const changed: string[] = []
    setStudioCloudMirror({ onChanged: (id) => changed.push(id), onDeleted: () => {} })
    try {
      const { project } = await useProjectStore.getState().restoreProjectSnapshot(raw, {
        expectedId: raw.id,
      })
      expect(project.updatedAt).toBe(2)
      expect((await loadProjectMetaById(raw.id))?.updatedAt).toBe(2)
      expect(changed).toEqual([])
    } finally {
      setStudioCloudMirror(null)
    }
  })
})

it('a pending migration preserves the drawing update for the next successful sweep', async () => {
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
  const project = createEmptyProject('pending-drawing', 'Desenho preservado')
  project.assets = [drawingAsset({})]
  await persistProject(project)
  await syncDrawingsIntoProjects(useProjectStore)
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
  const { readValue, writeInOneTransaction } = await import('../../state/idbTransaction')
  const { projectMetaKey } = await import('../../state/projectStorageKeys')
  const scope = captureProjectStorageScope()
  const key = projectMetaKey(project.id)
  const readable = (await readValue(scope.store, key)) as Record<string, unknown>
  const future = { ...readable, storageVersion: 999 }
  await writeInOneTransaction(scope.store, { puts: [[key, future]] })
  const refused = await syncDrawingsIntoProjects(useProjectStore)
  expect(refused.failures).toEqual([])
  expect(refused.updatedInOtherProjects).toBe(0)
  expect(await readValue(scope.store, key)).toEqual(future)
  await writeInOneTransaction(scope.store, { puts: [[key, readable]] })
  const recovered = await syncDrawingsIntoProjects(useProjectStore)
  expect(recovered.failures).toEqual([])
  expect(recovered.updatedInOtherProjects).toBe(1)
  expect((await loadProjectAssetsById(project.id))[0]?.dataUrl).toBe(PNG_NOVO)
})

it('an unreadable legacy project keeps the drawing revision pending even in the lightweight list', async () => {
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
  await syncDrawingsIntoProjects(useProjectStore)
  const project = createEmptyProject('legacy-pending-drawing', 'Projeto preservado')
  project.assets = [drawingAsset({})]
  const { readValue, writeInOneTransaction } = await import('../../state/idbTransaction')
  const { projectMetaKey } = await import('../../state/projectStorageKeys')
  const { projectStorageEntries } = await import('../../state/projectStorageRecords')
  const scope = captureProjectStorageScope()
  const key = projectMetaKey(project.id, 3)
  await writeInOneTransaction(scope.store, {
    puts: [
      ...projectStorageEntries(project, 3),
      [
        projectHeadKey(project.id, 3),
        {
          version: 1,
          token: 'legacy-drawing-head',
          writer: 'legacy-client',
          base: null,
          sequence: 1,
        },
      ],
    ],
  })
  const readable = (await readValue(scope.store, key)) as Record<string, unknown>
  await writeInOneTransaction(scope.store, { puts: [[key, { ...readable, formatVersion: 9999 }]] })
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG_NOVO })
  expect(await syncDrawingsIntoProjects(useProjectStore)).toMatchObject({
    failures: [],
    updatedInOtherProjects: 0,
  })
  await writeInOneTransaction(scope.store, { puts: [[key, readable]] })
  const recovered = await syncDrawingsIntoProjects(useProjectStore)
  expect(recovered.failures).toEqual([])
  expect(recovered.updatedInOtherProjects).toBe(1)
  expect((await loadProjectAssetsById(project.id))[0]?.dataUrl).toBe(PNG_NOVO)
})
