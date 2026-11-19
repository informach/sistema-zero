import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../../src/core/project'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { findTemplate } from '../../src/templates/catalog'
import { createMapSet } from '../../src/tiles/sets'
import { addObjectLayer } from '../../src/tiles/tilemapOps'

const sheet = createTilesetAsset({ name: 'chao', tileSize: 16 })
sheet.tiles[0]!.data.fill(14)
const hero = findTemplate('heroi')!.build().assets[0]!
hero.name = 'personagem-da-vila'
const ghost = findTemplate('fantasminha')!.build().assets[0]!
ghost.name = 'fantasma-da-vila'
const base = createTilemapAsset({
  name: 'vila-da-biblioteca',
  tilesetId: sheet.id,
  cols: 8,
  rows: 6,
})
const setSource = {
  ...base,
  layers: base.layers.map((l) =>
    isTileLayer(l) ? { ...l, cells: new Int16Array(l.cells.length).fill(0) } : l,
  ),
}
const set = createMapSet(setSource, { col: 0, row: 0, cols: 2, rows: 1 }, 16, 'jardim-vinculado')
const map = addObjectLayer(base, 'Objetos')
const directory = resolve(process.argv[2] ?? '.tmp/pinta-library-e2e')
await mkdir(directory, { recursive: true })
await writeFile(
  resolve(directory, 'biblioteca.pinta.json'),
  galleryToPintaJson([sheet, hero, ghost, set, map]),
)
