import { expect, test } from 'bun:test'
import { createPintaProjectionGeometry, makePintaHexCell } from '@sistemazero/core/creations'
import { isTilesetKind } from '../core/project'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { pintaWorkshopAssetFromJson, pintaWorkshopAssetToJson } from '../export/workshopDocument'
import { nativeNineGallery } from '../testing/nativeNineFixtures'
import { createProjectedMap, editProjectedMapCells } from './projectedMap'

test('novos mapas projetados nascem no formato canônico e crescem pela mesma edição atômica', async () => {
  const { sheet } = await nativeNineGallery()
  if (!isTilesetKind(sheet)) throw Error('Folha ausente')
  for (const kind of ['isometric', 'hexagonal'] as const) {
    const map = createProjectedMap(`novo-${kind}`, sheet, kind)
    expect(map?.projection.kind).toBe(kind)
    if (!map) throw Error('Mapa novo recusado')
    expect(map.physics).toBe('precise')
    expect(pintaWorkshopAssetFromJson(pintaWorkshopAssetToJson(map)!)).toEqual(map)
    const layer = map.layers.find(isProjectedTileLayer)!
    expect(editProjectedMapCells(map, layer.id, [{ col: -1, row: -1, cell: 0 }]).ok).toBe(true)
  }
})

test('pintar o projetado preserva a projeção, o livro e as outras camadas em uma autoria nativa 9 reabrível', async () => {
  const { hex, iso } = await nativeNineGallery()
  for (const map of [hex, iso]) {
    const layer = map.layers.find(isProjectedTileLayer)
    if (!layer) throw Error('Camada ausente')
    const cell =
      map.projection.kind === 'hexagonal' ? makePintaHexCell(2, { flipX: true, rotation: 60 }) : 2
    if (cell === null) throw Error('Casa inválida')
    const edited = editProjectedMapCells(map, layer.id, [
      { col: map.origin.col, row: map.origin.row, cell },
    ])
    if (!edited.ok) throw Error(edited.reason)
    expect(edited.map.projection).toBe(map.projection)
    expect(edited.map.automapping).toBe(map.automapping)
    expect(edited.map.layers.filter((entry) => entry.id !== layer.id)).toEqual(
      map.layers.filter((entry) => entry.id !== layer.id),
    )
    const json = pintaWorkshopAssetToJson(edited.map)
    if (!json) throw Error('Mapa editado não exportou')
    const reopened = pintaWorkshopAssetFromJson(json)
    expect(reopened && pintaWorkshopAssetToJson(reopened)).toBe(json)
  }
})

test('crescer para coordenadas negativas conserva a posição do mundo e respeita mapa fixo e camadas trancadas', async () => {
  const { iso } = await nativeNineGallery()
  const layer = iso.layers.find(isProjectedTileLayer)
  if (!layer) throw Error('Camada ausente')
  const point = { col: iso.origin.col - 1, row: iso.origin.row - 1, cell: 1 }
  expect(editProjectedMapCells({ ...iso, growth: 'fixed' }, layer.id, [point])).toEqual({
    ok: false,
    reason: 'outside-map',
  })
  const grown = editProjectedMapCells({ ...iso, growth: 'expandable' }, layer.id, [point])
  if (!grown.ok) throw Error(grown.reason)
  expect(grown.map.origin).toEqual({ col: point.col, row: point.row })
  expect(createPintaProjectionGeometry(grown.map.projection).center(0, 0)).toEqual(
    createPintaProjectionGeometry(iso.projection).center(0, 0),
  )
  expect(
    editProjectedMapCells(
      {
        ...iso,
        layers: iso.layers.map((entry) => (entry === layer ? { ...entry, locked: true } : entry)),
      },
      layer.id,
      [],
    ),
  ).toEqual({ ok: false, reason: 'locked' })
})
