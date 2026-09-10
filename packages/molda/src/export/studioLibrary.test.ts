import { beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createSceneProject } from '../scene/createProject'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import {
  createMoldaPersistence,
  getDefaultMoldaPersistence,
  resetMoldaPersistenceForTests,
  setMoldaGenerationStoreFactory,
  setMoldaStorageNamespace,
} from '../state/persistence'
import { createScenePersistence } from '../state/scenePersistence'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { readGlb } from '../testing/glbRead'
import { clearIdbMock } from '../testing/idbMock'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { encodeSceneGlb } from './sceneGlb'
import { inspectSceneStudioCompatibility } from './sceneStudioCompatibility'
import { exportAssetForStudio, listGalleryForStudio } from './studioLibrary'

beforeEach(() => {
  clearIdbMock()
  resetMoldaPersistenceForTests()
  setMoldaStorageNamespace('estudio')
})

describe('studio-library', () => {
  test('listing captures both generations before a profile switch during the legacy read', async () => {
    const a = await nativeDatabase(),
      b = await nativeDatabase()
    setMoldaGenerationStoreFactory((namespace) => (namespace === 'crianca-a' ? a.store : b.store))
    let release!: () => void
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    let listSpy: ReturnType<typeof spyOn> | undefined
    try {
      const source = migrateLegacyModel(makeModel()).document
      await createScenePersistence(a.store).save({ ...source, name: 'perfil-a' }, null)
      await createScenePersistence(b.store).save({ ...source, name: 'perfil-b' }, null)
      setMoldaStorageNamespace('crianca-a')
      listSpy = spyOn(getDefaultMoldaPersistence(), 'listSummaries').mockImplementation(
        async () => {
          await waiting
          return []
        },
      )
      const listing = listGalleryForStudio()
      setMoldaStorageNamespace('crianca-b')
      release()
      expect((await listing).map((item) => item.name)).toEqual(['perfil-a'])
    } finally {
      release()
      listSpy?.mockRestore()
      setMoldaGenerationStoreFactory(null)
      a.close()
      b.close()
    }
  })
  test('lista e exporta o modelo como model3d validável pelo Estúdio', async () => {
    const persistence = createMoldaPersistence({ namespace: 'estudio' })
    await persistence.saveMany([makeModel({ thumb: 'data:image/jpeg;base64,AAAA' }), makeSky()])
    const list = await listGalleryForStudio()
    expect(list.map((item) => item.id).sort()).toEqual(['model-1', 'sky-1'])
    expect(list.find((item) => item.id === 'model-1')?.thumbDataUrl).toBe(
      'data:image/jpeg;base64,AAAA',
    )
    const exported = await exportAssetForStudio('model-1')
    expect(exported.ok).toBe(true)
    if (!exported.ok) return
    expect(exported.asset.kind).toBe('model3d')
    expect(exported.asset.originalFileName).toBe('nave.glb')
    expect(exported.asset.dataUrl.startsWith('data:model/gltf-binary;base64,')).toBe(true)
    expect(exported.asset.bytes).toBeGreaterThan(100)
    const sky = await exportAssetForStudio('sky-1')
    expect(sky.ok).toBe(true)
    if (sky.ok) {
      expect(sky.asset.kind).toBe('environment3d')
      expect(sky.asset.originalFileName).toBe('fim-de-tarde.hdr')
      expect(sky.asset.dataUrl.startsWith('data:image/vnd.radiance;base64,')).toBe(true)
    }
    await persistence.save(makeTexture())
    const texture = await exportAssetForStudio('texture-1')
    expect(texture.ok).toBe(true)
    if (texture.ok) {
      expect(texture.asset.kind).toBe('image')
      expect(texture.asset.originalFileName).toBe('grama.png')
      expect(texture.asset.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
      expect(texture.asset.width).toBe(16)
      expect(texture.asset.height).toBe(16)
    }
    expect(await exportAssetForStudio('nope')).toEqual({ ok: false, reason: 'not-found' })
  })

  test('exporta por carga pontual e reaproveita o resultado enquanto updatedAt não muda', async () => {
    const persistence = getDefaultMoldaPersistence()
    await persistence.save(makeModel())
    const loadAll = spyOn(persistence, 'loadAll')
    const load = spyOn(persistence, 'load')

    const first = await exportAssetForStudio('model-1')
    const cached = await exportAssetForStudio('model-1')
    expect(first.ok).toBe(true)
    expect(cached).not.toBe(first)
    expect(cached.ok && first.ok && cached.asset.dataUrl).toBe(first.ok && first.asset.dataUrl)
    expect(loadAll).toHaveBeenCalledTimes(0)
    expect(load).toHaveBeenCalledTimes(2)

    await persistence.save(makeModel({ name: 'nave-nova', updatedAt: 2 }))
    const changed = await exportAssetForStudio('model-1')
    expect(changed).not.toBe(first)
    expect(changed.ok && changed.asset.originalFileName).toBe('nave-nova.glb')
  })

  test('cache reaproveita só o binário e sempre combina nome/miniatura do registro recém-lido', async () => {
    const persistence = getDefaultMoldaPersistence()
    await persistence.save(
      makeModel({ updatedAt: 7, name: 'nave-a', thumb: 'data:image/jpeg;base64,AAAA' }),
    )
    const first = await exportAssetForStudio('model-1')
    await persistence.save(
      makeModel({ updatedAt: 7, name: 'nave-b', thumb: 'data:image/jpeg;base64,BBBB' }),
    )
    const second = await exportAssetForStudio('model-1')

    expect(first.ok && second.ok && second.asset.dataUrl).toBe(first.ok && first.asset.dataUrl)
    expect(second.ok && second.asset.originalFileName).toBe('nave-b.glb')
    expect(second.ok && second.asset.thumbDataUrl).toBe('data:image/jpeg;base64,BBBB')
  })
})

describe('studio-library e a geração seguinte', () => {
  test('losses require explicit consent for the exact saved revision before crossing the bridge', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    try {
      const scene = migrateLegacyModel(makeModel()).document
      scene.nodes[0]!.hidden = true
      const storage = createScenePersistence(db.store)
      const saved = await storage.save(scene, null)
      expect(saved.status).toBe('saved')
      const review = await exportAssetForStudio(scene.id)
      expect(review.ok).toBe(false)
      if (review.ok || review.reason !== 'needs-review') throw new Error('Missing loss review')
      expect(review.review.losses.some((line) => line.includes('escondid'))).toBe(true)
      const accepted = await exportAssetForStudio(scene.id, { acceptedReview: review.review.token })
      expect(accepted.ok).toBe(true)
      if (saved.status !== 'saved') throw new Error('Missing saved revision')
      await storage.save(
        { ...scene, updatedAt: scene.updatedAt + 1, name: 'mudou' },
        saved.revision,
      )
      const stale = await exportAssetForStudio(scene.id, { acceptedReview: review.review.token })
      expect(stale.ok).toBe(false)
      if (stale.ok || stale.reason !== 'needs-review') throw new Error('Missing refreshed review')
      expect(stale.review.token).not.toBe(review.review.token)
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })
  test('a criação promovida continua na lista e sai pelo exportador de cena, não pelo v1', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    try {
      const scene = migrateLegacyModel({ ...makeModel(), id: 'promovida', name: 'nave' }).document
      await createScenePersistence(db.store).save(scene, null)
      const persistence = createMoldaPersistence({ namespace: 'estudio' })
      await persistence.saveMany([makeTexture()])

      // Some da lista e o "Trazer do Molda" deixa de ver o que a criança acabou de modelar.
      const list = await listGalleryForStudio()
      expect(list.map((item) => item.id).sort()).toEqual(['promovida', 'texture-1'])

      const exported = await exportAssetForStudio('promovida')
      if (!exported.ok) throw new Error(`exportação falhou: ${exported.reason}`)
      expect(exported.asset.kind).toBe('model3d')
      expect(exported.asset.originalFileName).toBe('nave.glb')
      expect(exported.asset.dataUrl.startsWith('data:model/gltf-binary;base64,')).toBe(true)
      // O exportador de cena leva a hierarquia; o v1 funde tudo numa malha só.
      const bytes = Uint8Array.from(atob(exported.asset.dataUrl.split(',')[1] as string), (c) =>
        c.charCodeAt(0),
      )
      const json = readGlb(bytes).json as { nodes?: unknown[]; extras?: { molda?: unknown } }
      expect((json.nodes?.length ?? 0) > 1).toBe(true)
      expect(json.extras?.molda).toEqual({ sourceId: 'promovida', formatVersion: 2 })
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  // Os dois tetos que o caminho v1 já cobrava e a ponte da geração seguinte deixava passar.
  test('a criação vazia é recusada, como o caminho v1 recusa um modelo sem peça', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    try {
      const vazia = createSceneProject({ kind: 'empty', name: 'vazia' })
      await createScenePersistence(db.store).save(vazia, null)
      // O v1 devolve `empty` e o host o mapeia para `encode-failed`: a mesma recusa aqui.
      expect(await exportAssetForStudio(vazia.id)).toEqual({ ok: false, reason: 'encode-failed' })
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  test('a criação que estoura um teto do Estúdio não atravessa a ponte só porque é leve', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    try {
      // 60 malhas contra o teto de 48: cabe nos bytes com folga e derruba o desenho do jogo.
      const pesada = { ...makeSceneGlbFixture(60, 2, 3, 0), id: 'pesada' },
        encoded = encodeSceneGlb(pesada),
        report = inspectSceneStudioCompatibility({
          stats: encoded.stats,
          byteLength: encoded.bytes.byteLength,
        })
      expect(report.exceeded.map((item) => item.limit)).toEqual(['meshes'])
      // Leve nos bytes: é só a contagem de malhas que a recusa, e o teto de bytes não.
      expect(encoded.bytes.byteLength < MOLDA_LIMITS.studioMax3DChars / 4).toBe(true)
      await createScenePersistence(db.store).save(pesada, null)
      expect(await exportAssetForStudio('pesada')).toEqual({ ok: false, reason: 'asset-too-big' })
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  // `useStudioResync` prende a conta ANTES de entrar na fila ("a profile switch cannot borrow
  // its cache"). O caminho da geração seguinte relia o namespace corrente DEPOIS dos awaits,
  // então uma troca de criança no mesmo tablet mandava a criação da outra para o Estúdio.
  test('a exportação sai do perfil que pediu, mesmo se o host trocar de criança no meio', async () => {
    const a = await nativeDatabase()
    const b = await nativeDatabase()
    setMoldaGenerationStoreFactory((namespace) => (namespace === 'crianca-a' ? a.store : b.store))
    try {
      const base = migrateLegacyModel({ ...makeModel(), id: 'mesma-criacao' }).document
      await createScenePersistence(a.store).save({ ...base, name: 'nave-da-ana' }, null)
      await createScenePersistence(b.store).save({ ...base, name: 'nave-do-bento' }, null)
      // O host já trocou de perfil enquanto o reenvio esperava na fila.
      setMoldaStorageNamespace('crianca-b')
      const exported = await exportAssetForStudio('mesma-criacao', {
        persistence: createMoldaPersistence({ namespace: 'crianca-a' }),
        namespace: 'crianca-a',
      })
      if (!exported.ok) throw new Error(`exportação falhou: ${exported.reason}`)
      expect(exported.asset.originalFileName).toBe('nave-da-ana.glb')
    } finally {
      setMoldaGenerationStoreFactory(null)
      a.close()
      b.close()
    }
  })

  test('id que não existe em nenhuma das duas gerações continua sendo not-found', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    try {
      expect(await exportAssetForStudio('nunca-existiu')).toEqual({
        ok: false,
        reason: 'not-found',
      })
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })
})
