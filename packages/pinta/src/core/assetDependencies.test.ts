import { beforeEach, describe, expect, it } from 'bun:test'
import { assetBundleToJson } from '../export/assetJson'
import { importPintaJson } from '../export/projectJson'
import { cloneWithNewIds, planImport } from '../state/importPlan'
import { clearIdbMock, idbMockDb, setIdbReadGuard } from '../testing/idbMock'
import { createMapObject } from '../tiles/mapObjects'
import { expandSelection } from './gallerySelection'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isObjectLayer,
  type MapSetAsset,
  pintaAssetDependencyIds,
  type TilemapAsset,
} from './project'

const { capturePintaAssetForImage, createPintaPersistence } = await import('../state/persistence')
const { createGalleryStore } = await import('../state/galleryStore')

const ref = (value: string) => ({ type: 'asset' as const, value })

function fixture() {
  const sprites = ['camada', 'grupo', 'objeto', 'peca'].map((name) =>
    createPixelSpriteAsset({ name, frameSize: 8 }),
  )
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  tileset.tileProperties = { '0': { premio: ref(sprites[3]!.id) } }
  const map = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
  map.layers[0]!.properties = { premio: ref(sprites[0]!.id) }
  map.layers.push(
    {
      id: 'g',
      kind: 'group',
      name: 'Grupo',
      visible: true,
      properties: { premio: ref(sprites[1]!.id) },
    },
    {
      id: 'o',
      kind: 'objects',
      name: 'Objetos',
      visible: true,
      objects: [createMapObject({ id: 'objeto', properties: { premio: ref(sprites[2]!.id) } })],
    },
  )
  const set: MapSetAsset = {
    id: 'conjunto',
    kind: 'map-set',
    name: 'conjunto',
    createdAt: 1,
    updatedAt: 1,
    schema: 4,
    map: structuredClone(map),
  }
  return { sprites, tileset, map, set, assets: [tileset, ...sprites, map, set] }
}

beforeEach(clearIdbMock)

describe('referências tipadas conservadas nas fronteiras do Pinta', () => {
  it('todos os contêineres entram na fonte canônica, sem confundir texto e objeto com recurso', () => {
    const { sprites, tileset, map, set } = fixture()
    map.layers[0]!.properties!.texto = sprites[3]!.id
    map.layers[0]!.properties!.alvo = { type: 'object', value: sprites[3]!.id }
    const expected = new Set([tileset.id, ...sprites.slice(0, 3).map((a) => a.id)])
    expect(new Set(pintaAssetDependencyIds(map))).toEqual(expected)
    expect(new Set(pintaAssetDependencyIds(set))).toEqual(expected)
    expect(pintaAssetDependencyIds(tileset)).toEqual([sprites[3]!.id])
    const vector = createVectorTilesetAsset({ name: 'vetor', tileSize: 16 })
    vector.tileProperties = tileset.tileProperties
    expect(pintaAssetDependencyIds(vector)).toEqual([sprites[3]!.id])
  })

  it('pacote e seleção levam dependências transitivas uma vez, inclusive em ciclos', () => {
    const { sprites, tileset, map, assets } = fixture()
    tileset.tileProperties!['0']!.voltar = ref(map.id)
    const json = assetBundleToJson(map, assets)
    expect(json).not.toBeNull()
    const result = importPintaJson(json!)
    expect(result.warnings).toEqual([])
    expect(new Set(result.assets.map((a) => a.id))).toEqual(
      new Set([tileset.id, map.id, ...sprites.map((a) => a.id)]),
    )
    expect(result.assets).toHaveLength(6)
    const selected = expandSelection(assets, new Set([map.id]))
    expect(new Set(selected.assets.map((a) => a.id))).toEqual(
      new Set(result.assets.map((a) => a.id)),
    )
    expect(selected.autoIncludedTilesetIds).toEqual([tileset.id])
  })

  it('tileset autônomo também leva sua dependência; pacote incompleto é recusado', () => {
    const { sprites, tileset, map, assets } = fixture()
    const json = assetBundleToJson(tileset, assets)
    expect(importPintaJson(json!).assets.map((a) => a.id)).toEqual([sprites[3]!.id, tileset.id])
    expect(assetBundleToJson(map, [map, tileset])).toBeNull()
    expect(assetBundleToJson(tileset, [tileset])).toBeNull()
  })

  it('travessia portátil aceita o teto existente de captura e recusa excedê-lo sem corte', () => {
    const first = createTilesetAsset({ name: 'a', tileSize: 16 })
    const chain = Array.from({ length: 226 }, (_, i) => ({
      ...first,
      id: `pecas-${i}`,
      name: `p-${i}`,
    }))
    chain.forEach((asset, i) => {
      if (chain[i + 1]) asset.tileProperties = { '0': { proximo: ref(chain[i + 1]!.id) } }
    })
    expect(assetBundleToJson(chain[0]!, chain)).toBeNull()
    const allowed = chain.slice(1)
    expect(importPintaJson(assetBundleToJson(allowed[0]!, allowed)!).assets).toHaveLength(225)
  })

  it('importação religa referências de todas as camadas, objetos, conjuntos e dos dois tilesets', () => {
    const { sprites, tileset, map, set, assets } = fixture()
    const vector = createVectorTilesetAsset({ name: 'vetor', tileSize: 16 })
    vector.tileProperties = tileset.tileProperties
    const original = structuredClone([...assets, vector])
    const plan = planImport([...assets, vector], new Set([tileset.id, vector.id]), new Set())
    const newRef = (i: number) => ref(plan.idMap.get(sprites[i]!.id)!)
    for (const pair of plan.pairs) {
      const a = pair.restored
      if (a.kind === 'tileset' || a.kind === 'vector-tileset') {
        expect(a.tileProperties?.['0']?.premio).toEqual(newRef(3))
      } else if (a.kind === 'tilemap' || a.kind === 'map-set') {
        const m = a.kind === 'tilemap' ? a : a.map
        expect(m.layers[0]?.properties?.premio).toEqual(newRef(0))
        expect(m.layers[1]?.properties?.premio).toEqual(newRef(1))
        const objects = m.layers.find(isObjectLayer)!
        expect(objects.objects[0]?.properties.premio).toEqual(newRef(2))
      }
    }
    expect([...assets, vector]).toEqual(original)
    const copied = cloneWithNewIds(map, 'copia') as TilemapAsset
    expect(copied.layers[0]?.properties?.premio).toEqual(ref(sprites[0]!.id))
    expect(set.map.id).toBe(map.id)
  })

  it('captura inclui as referências transitivas de mapa e tileset em snapshot coerente', async () => {
    const { sprites, tileset, map, assets } = fixture()
    tileset.tileProperties!['0']!.voltar = ref(map.id)
    const persistence = createPintaPersistence({ namespace: 'refs' })
    await persistence.persistAssets(assets)
    for (const source of [map, tileset]) {
      const captured = await capturePintaAssetForImage(source.id, { namespace: 'refs' })
      expect(captured.ok).toBe(true)
      if (!captured.ok) throw new Error(captured.reason)
      expect(new Set([captured.source, ...(captured.assets ?? [])].map((a) => a.id))).toEqual(
        new Set([map.id, tileset.id, ...sprites.map((a) => a.id)]),
      )
    }
  })

  it('mapa sem propriedades próprias ainda captura a referência guardada nas peças', async () => {
    const { sprites, tileset, map, assets } = fixture()
    map.layers = [map.layers[0]!]
    delete map.layers[0]!.properties
    await createPintaPersistence({ namespace: 'pecas-refs' }).persistAssets(assets)
    const captured = await capturePintaAssetForImage(map.id, { namespace: 'pecas-refs' })
    if (!captured.ok) throw new Error(captured.reason)
    expect(new Set([captured.source, ...(captured.assets ?? [])].map((a) => a.id))).toEqual(
      new Set([map.id, tileset.id, sprites[3]!.id]),
    )
  })

  it('mudança de referência tipada durante a descoberta recusa um snapshot incompleto', async () => {
    const { sprites, tileset, assets } = fixture()
    await createPintaPersistence({ namespace: 'refs-race' }).persistAssets(assets)
    setIdbReadGuard((key) => {
      if (key === `pinta:asset:${tileset.id}`)
        idbMockDb('sistema-zero-pinta-refs-race').set(key, {
          ...tileset,
          tileProperties: { '0': { premio: ref(sprites[0]!.id) } },
        })
    })
    expect(await capturePintaAssetForImage(tileset.id, { namespace: 'refs-race' })).toEqual({
      ok: false,
      reason: 'source-changed',
    })
  })

  it('referência ao próprio documento conserva o pacote sem impedir sua exclusão', async () => {
    const { tileset, map } = fixture()
    delete tileset.tileProperties
    map.layers = [map.layers[0]!]
    map.layers[0]!.properties = { esteMapa: ref(map.id) }
    const restored = importPintaJson(assetBundleToJson(map, [tileset, map])!).assets
    expect(restored.find((a) => a.kind === 'tilemap')).toMatchObject({
      layers: [{ properties: { esteMapa: ref(map.id) } }],
    })
    const persistence = createPintaPersistence({ namespace: 'refs-self' })
    await persistence.persistAssets([tileset, map])
    const gallery = createGalleryStore(persistence)
    await gallery.getState().load()
    expect(await gallery.getState().remove(map.id)).toBe(true)
  })

  it('exclusão protege recursos referidos só por propriedades, inclusive propriedades de peça', async () => {
    const { sprites, assets } = fixture()
    const persistence = createPintaPersistence({ namespace: 'remove-refs' })
    await persistence.persistAssets(assets)
    const gallery = createGalleryStore(persistence)
    await gallery.getState().load()
    expect(gallery.getState().loadError).toBeNull()
    expect(gallery.getState().assets).toHaveLength(assets.length)
    for (const sprite of sprites) expect(await gallery.getState().remove(sprite.id)).toBe(false)
    expect(gallery.getState().assets).toHaveLength(assets.length)
  })
})
