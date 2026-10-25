import { beforeEach, describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type PintaAsset,
  type TilemapAsset,
} from '../core/project'
import { clearIdbMock } from '../testing/idbMock'
import { addLayer } from '../tiles/tilemapOps'

const { deleteAsset, listAllAssets, persistAsset, setPintaStorageNamespace } = await import(
  '../state/persistence'
)
const { importDrawingsForStudio, inspectImageForStudio } = await import('./studioLibrary')
const { galleryToPintaJson } = await import('./projectJson')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('perfil')
})

/** The documents of a gallery game, with the deterministic ids the generator writes. */
function gameDocuments() {
  const at = <T extends PintaAsset>(asset: T, id: string): T => ({ ...asset, id })
  const hero = at(createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }), 'jogo-heroi')
  const ground = at(createTilesetAsset({ name: 'terreno', tileSize: 16 }), 'jogo-terreno')
  ground.tiles = [createBitmap(16, 16), createBitmap(16, 16)]
  ground.solid = [true, false]
  ground.platform = [false, false]
  const deco = at(createTilesetAsset({ name: 'enfeites', tileSize: 16 }), 'jogo-enfeites')
  let map: TilemapAsset = at(
    createTilemapAsset({ name: 'fase', tilesetId: ground.id, cols: 3, rows: 2 }),
    'jogo-fase',
  )
  map = addLayer(map, 'Enfeites', deco.id)
  const sky = at(createPixelBackgroundAsset({ name: 'ceu', width: 20, height: 10 }), 'jogo-ceu')
  // A second map over the SAME default pieces (Python Monsters: 8 maps over 4 tilesets).
  const cave = at(
    createTilemapAsset({ name: 'caverna', tilesetId: ground.id, cols: 2, rows: 2 }),
    'jogo-caverna',
  )
  return {
    hero,
    ground,
    deco,
    map,
    cave,
    sky,
    json: galleryToPintaJson([hero, ground, deco, map, cave, sky]),
  }
}

describe('importDrawingsForStudio — a gallery game drawing into the profile gallery', () => {
  it('copies only the requested drawing, with a new id and a unique name', async () => {
    const game = gameDocuments()
    await persistAsset(createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }))
    const result = await importDrawingsForStudio(game.json, ['jogo-heroi'])
    if (!result.ok) throw new Error(result.message)
    expect(result.drawings).toHaveLength(1)
    const [drawing] = result.drawings
    expect(drawing!.sourceId).toBe('jogo-heroi')
    expect(drawing!.id).not.toBe('jogo-heroi')
    // Same collision rule as the restore: the existing "heroi" keeps its name.
    expect(drawing!.name).toBe('heroi-2')
    expect(drawing!.imageSelection).toMatchObject({ kind: 'frame', sheet: { width: 8, height: 8 } })
    const gallery = await listAllAssets()
    expect(gallery.map((asset) => asset.name).sort()).toEqual(['heroi', 'heroi-2'])
  })

  it('a map brings every tileset it uses, relinked to the new copies', async () => {
    const game = gameDocuments()
    const result = await importDrawingsForStudio(game.json, ['jogo-fase'])
    if (!result.ok) throw new Error(result.message)
    expect(result.drawings.map((d) => d.sourceId)).toEqual(['jogo-fase'])
    expect(result.drawings[0]!.imageSelection).toMatchObject({
      kind: 'tilemap',
      width: 48,
      height: 32,
      sheet: { width: 32, height: 32 },
    })
    const gallery = await listAllAssets()
    expect(gallery.map((asset) => asset.name).sort()).toEqual(['enfeites', 'fase', 'terreno'])
    const map = gallery.find((asset) => asset.kind === 'tilemap') as TilemapAsset
    const byName = new Map(gallery.map((asset) => [asset.name, asset.id]))
    expect(map.id).toBe(result.drawings[0]!.id)
    expect(map.tilesetId).toBe(byName.get('terreno')!)
    const layered = map.layers.filter(isTileLayer).find((layer) => layer.name === 'Enfeites')
    expect(layered?.tilesetId).toBe(byName.get('enfeites')!)
    // Nothing points at the game's ids any more.
    expect(JSON.stringify(gallery)).not.toContain('jogo-')
  })

  it('a background or a tileset comes alone', async () => {
    const game = gameDocuments()
    const result = await importDrawingsForStudio(game.json, ['jogo-ceu', 'jogo-terreno'])
    if (!result.ok) throw new Error(result.message)
    expect(result.drawings.map((d) => d.imageSelection.kind)).toEqual(['background', 'tile'])
    expect((await listAllAssets()).map((asset) => asset.name).sort()).toEqual(['ceu', 'terreno'])
  })

  it('refuses an unknown drawing or an unreadable file without writing anything', async () => {
    const game = gameDocuments()
    expect(await importDrawingsForStudio(game.json, ['jogo-nada'])).toMatchObject({
      ok: false,
      reason: 'not-found',
    })
    expect(await importDrawingsForStudio('não é json', ['jogo-heroi'])).toMatchObject({
      ok: false,
      reason: 'invalid',
    })
    expect(await listAllAssets()).toEqual([])
  })
})

describe('importDrawingsForStudio — one copy per example document (origin)', () => {
  const origin = 'example-pygame:jogo'
  const copiesOf = async (name: string) =>
    (await listAllAssets()).filter((asset) => asset.name.replace(/-\d+$/, '') === name)

  it('two maps over the same tileset share ONE copy of it', async () => {
    const game = gameDocuments()
    const first = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    const second = await importDrawingsForStudio(game.json, ['jogo-caverna'], { origin })
    if (!first.ok || !second.ok) throw new Error('import required')
    expect(await copiesOf('terreno')).toHaveLength(1)
    const gallery = await listAllAssets()
    const maps = gallery.filter((asset) => asset.kind === 'tilemap') as TilemapAsset[]
    expect(maps.map((map) => map.name).sort()).toEqual(['caverna', 'fase'])
    expect(new Set(maps.map((map) => map.tilesetId)).size).toBe(1)
    // Every copy remembers which document it came from.
    expect(gallery.find((asset) => asset.name === 'terreno')?.sourceRef).toBe(
      `${origin}/jogo-terreno`,
    )
    expect(second.drawings[0]).toMatchObject({ sourceId: 'jogo-caverna', reused: false })
  })

  it("the tileset edited after the map is the map's own copy, and the other way round", async () => {
    const game = gameDocuments()
    const map = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    const pieces = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    if (!map.ok || !pieces.ok) throw new Error('import required')
    const copy = (await listAllAssets()).find((asset) => asset.id === map.drawings[0]!.id)
    expect(pieces.drawings[0]).toMatchObject({
      reused: true,
      id: (copy as TilemapAsset).tilesetId,
    })
    expect(await copiesOf('terreno')).toHaveLength(1)
    // The same map asked again is the same copy: nothing new is written.
    const again = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    if (!again.ok) throw new Error('import required')
    expect(again.drawings[0]).toMatchObject({ reused: true, id: map.drawings[0]!.id })
    expect((await listAllAssets()).filter((asset) => asset.kind === 'tilemap')).toHaveLength(1)

    clearIdbMock()
    const tilesetFirst = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    const mapAfter = await importDrawingsForStudio(game.json, ['jogo-caverna'], { origin })
    if (!tilesetFirst.ok || !mapAfter.ok) throw new Error('import required')
    const cave = (await listAllAssets()).find((asset) => asset.kind === 'tilemap') as TilemapAsset
    expect(cave.tilesetId).toBe(tilesetFirst.drawings[0]!.id)
    expect(await copiesOf('terreno')).toHaveLength(1)
  })

  it('a deleted copy gives way to a new one', async () => {
    const game = gameDocuments()
    const first = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    if (!first.ok) throw new Error('import required')
    await deleteAsset(first.drawings[0]!.id)
    const second = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    if (!second.ok) throw new Error('import required')
    expect(second.drawings[0]).toMatchObject({ reused: false })
    expect(second.drawings[0]!.id).not.toBe(first.drawings[0]!.id)
    expect(await copiesOf('terreno')).toHaveLength(1)
  })

  it('a copy with another tile size is not reused (the map grid is one)', async () => {
    const game = gameDocuments()
    const stale = {
      ...createTilesetAsset({ name: 'terreno', tileSize: 32 }),
      sourceRef: `${origin}/jogo-terreno`,
    }
    await persistAsset(stale)
    const result = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    if (!result.ok) throw new Error('import required')
    const map = (await listAllAssets()).find((asset) => asset.kind === 'tilemap') as TilemapAsset
    expect(map.tilesetId).not.toBe(stale.id)
    expect(await copiesOf('terreno')).toHaveLength(2)
    // The new compatible copy is the one every later "Editar" lands on.
    const again = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    if (!again.ok) throw new Error('import required')
    expect(again.drawings[0]).toMatchObject({ reused: true, id: map.tilesetId })
    expect(await copiesOf('terreno')).toHaveLength(2)
  })

  it('a newer incompatible copy does not hide an older compatible one', async () => {
    const game = gameDocuments()
    const ref = `${origin}/jogo-terreno`
    const older = { ...createTilesetAsset({ name: 'terreno', tileSize: 16 }), sourceRef: ref }
    const newer = {
      ...createTilesetAsset({ name: 'terreno', tileSize: 32 }),
      sourceRef: ref,
      updatedAt: older.updatedAt + 1000,
    }
    await persistAsset(older)
    await persistAsset(newer)
    for (const ids of [['jogo-terreno'], ['jogo-fase']]) {
      const result = await importDrawingsForStudio(game.json, ids, { origin })
      if (!result.ok) throw new Error('import required')
    }
    const pieces = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
    if (!pieces.ok) throw new Error('import required')
    expect(pieces.drawings[0]).toMatchObject({ reused: true, id: older.id })
    const map = (await listAllAssets()).find((asset) => asset.kind === 'tilemap') as TilemapAsset
    expect(map.tilesetId).toBe(older.id)
    // No third copy was ever born.
    expect(await copiesOf('terreno')).toHaveLength(2)
  })

  it('two imports at the same time ("Editar" on the map, then on its tileset) share ONE copy', async () => {
    const game = gameDocuments()
    const [map, pieces] = await Promise.all([
      importDrawingsForStudio(game.json, ['jogo-fase'], { origin }),
      importDrawingsForStudio(game.json, ['jogo-terreno'], { origin }),
    ])
    if (!map.ok || !pieces.ok) throw new Error('import required')
    expect(await copiesOf('terreno')).toHaveLength(1)
    const copy = (await listAllAssets()).find((asset) => asset.id === map.drawings[0]!.id)
    expect(pieces.drawings[0]).toMatchObject({ reused: true, id: (copy as TilemapAsset).tilesetId })
  })

  it('across tabs the import holds the named browser lock of the profile gallery', async () => {
    const game = gameDocuments()
    const names: string[] = []
    const locks = {
      request: async (name: string, task: () => Promise<unknown>) => {
        names.push(name)
        return task()
      },
    }
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true })
    try {
      const result = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
      expect(result.ok).toBe(true)
      expect(names).toEqual(['pinta:studio-import:perfil'])
    } finally {
      Reflect.deleteProperty(navigator, 'locks')
    }
  })

  it('a duplicated copy (two tabs) converges on the one the copied map uses', async () => {
    const game = gameDocuments()
    const map = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    if (!map.ok) throw new Error('import required')
    const used = (await listAllAssets()).find(
      (asset) => asset.id === map.drawings[0]!.id,
    ) as TilemapAsset
    // What the other tab wrote at the same time: a newer copy no map uses.
    const stray = {
      ...createTilesetAsset({ name: 'terreno', tileSize: 16 }),
      sourceRef: `${origin}/jogo-terreno`,
      updatedAt: Date.now() + 60_000,
    }
    await persistAsset(stray)
    for (let attempt = 0; attempt < 2; attempt++) {
      const pieces = await importDrawingsForStudio(game.json, ['jogo-terreno'], { origin })
      if (!pieces.ok) throw new Error('import required')
      expect(pieces.drawings[0]).toMatchObject({ reused: true, id: used.tilesetId })
    }
    const cave = await importDrawingsForStudio(game.json, ['jogo-caverna'], { origin })
    if (!cave.ok) throw new Error('import required')
    const caveCopy = (await listAllAssets()).find(
      (asset) => asset.id === cave.drawings[0]!.id,
    ) as TilemapAsset
    expect(caveCopy.tilesetId).toBe(used.tilesetId)
    expect(await copiesOf('terreno')).toHaveLength(2)
  })

  it('without an origin nothing is marked nor reused (the historical copy)', async () => {
    const game = gameDocuments()
    await importDrawingsForStudio(game.json, ['jogo-terreno'])
    await importDrawingsForStudio(game.json, ['jogo-terreno'])
    const copies = await copiesOf('terreno')
    expect(copies).toHaveLength(2)
    expect(copies.every((asset) => asset.sourceRef === undefined)).toBe(true)
  })

  it('painting a piece of the shared tileset changes every map that uses it', async () => {
    const game = gameDocuments()
    const fase = await importDrawingsForStudio(game.json, ['jogo-fase'], { origin })
    const caverna = await importDrawingsForStudio(game.json, ['jogo-caverna'], { origin })
    if (!fase.ok || !caverna.ok) throw new Error('import required')
    const maps = [fase.drawings[0]!.id, caverna.drawings[0]!.id]
    const inspect = () =>
      Promise.all(maps.map((id) => inspectImageForStudio(id, { selection: 'map' })))
    const before = await inspect()
    const tileset = (await listAllAssets()).find((asset) => asset.name === 'terreno')!
    if (tileset.kind !== 'tileset') throw new Error('pixel tileset expected')
    const painted = structuredClone(tileset)
    painted.tiles[0]!.data.fill(3)
    await persistAsset(painted)
    const after = await inspect()
    for (const index of maps.keys()) {
      expect(after[index]!.sourceSha256).toBe(before[index]!.sourceSha256)
      const dependency = (list: typeof after) =>
        list[index]!.dependencies.find((item) => item.drawingId === tileset.id)
      expect(dependency(before)).toBeDefined()
      // The shared copy is a dependency of BOTH maps: the Studio sync re-derives both.
      expect(dependency(after)!.sha256).not.toBe(dependency(before)!.sha256)
    }
  })
})
