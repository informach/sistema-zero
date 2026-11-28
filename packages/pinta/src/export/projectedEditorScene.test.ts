import { expect, test } from 'bun:test'
import { makePintaHexCell } from '@sistemazero/core/creations'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { nativeNineGallery } from '../testing/nativeNineFixtures'
import { editProjectedMapCells } from '../tiles/projectedMap'
import { projectedEditorScene, sameProjectedSceneResources } from './projectedEditorScene'
import { exportPintaProjectedScene } from './projectedScene'

test('pinceladas reutilizam recursos preparados e desenham os buffers canônicos, inclusive flags hexagonais', async () => {
  const { hex, iso, sheet } = await nativeNineGallery()
  for (const map of [hex, iso]) {
    const layer = map.layers.find(isProjectedTileLayer)!
    const cell =
      map.projection.kind === 'hexagonal' ? makePintaHexCell(2, { rotation: 60, flipX: true })! : 2
    const result = editProjectedMapCells(map, layer.id, [{ ...map.origin, cell }])
    if (!result.ok) throw Error(result.reason)
    const catalog = [map, sheet]
    expect(sameProjectedSceneResources(map, result.map, catalog, [result.map, sheet])).toBe(true)
    const { scene } = await exportPintaProjectedScene(
      map,
      (id) => (id === sheet.id ? sheet : null),
      nativeImageOf,
    )
    const view = projectedEditorScene(scene, result.map)
    const rendered = view.layers.find((entry) => entry.id === layer.id)
    const authored = result.map.layers.find((entry) => entry.id === layer.id)
    if (rendered?.kind !== 'tiles' || !authored || !isProjectedTileLayer(authored))
      throw Error('Camada ausente')
    expect(rendered.cells).toBe(authored.cells)
    expect(view.tilesets).toBe(scene.tilesets)
    expect(view.projection).toBe(scene.projection)
    expect(
      sameProjectedSceneResources(
        map,
        {
          ...result.map,
          layers: result.map.layers.map((entry) =>
            entry.id === layer.id ? { ...entry, visible: !entry.visible } : entry,
          ),
        },
        catalog,
        catalog,
      ),
    ).toBe(false)
    expect(
      sameProjectedSceneResources(map, result.map, catalog, [
        result.map,
        { ...sheet, name: 'outras peças' },
      ]),
    ).toBe(false)
    expect(
      sameProjectedSceneResources(map, { ...result.map, resources: [] }, catalog, catalog),
    ).toBe(false)
  }
})
