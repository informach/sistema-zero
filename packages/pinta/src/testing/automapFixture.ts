import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../core/project'
import { type AutomapBook, automapSheetIdentity } from '../tiles/automapping/book'

export async function automapFixture() {
  const sheet = createTilesetAsset({ name: 'folha', tileSize: 16 })
  const map = createTilemapAsset({ name: 'mapa', tilesetId: sheet.id, cols: 5, rows: 2 })
  const layer = map.layers[0]!
  if (!isTileLayer(layer)) throw Error('fixture')
  map.layers = [
    { ...layer, id: 'chao', name: 'Chão' },
    { ...layer, id: 'frente', name: 'Frente', cells: layer.cells.slice() },
  ]
  const { sha256 } = await automapSheetIdentity(sheet)
  const plane = (layer: string) => ({ layer, sheet: sheet.id, sha256, cells: [0] })
  const book: AutomapBook = {
    format: 'pinta-regras',
    version: 1,
    seed: 7,
    rules: [
      {
        id: 'grama',
        name: 'Grama',
        width: 1,
        height: 1,
        input: [plane('chao')],
        outputs: [[plane('frente')]],
      },
    ],
  }
  return { sheet, map, book, gallery: { assets: [sheet, map], books: new Map([[map.id, book]]) } }
}
