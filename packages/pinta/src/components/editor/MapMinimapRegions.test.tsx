import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createTilemapAsset, createTilesetAsset, type RegionTilemapAsset } from '../../core/project'
import { editRegionMapCells, prepareMapRegions } from '../../tiles/regionMap'
import { MapMinimapPanel } from './MapMinimapPanel'

function fixture() {
  const tileset = createTilesetAsset({ name: 'chao', tileSize: 16 }),
    prepared = prepareMapRegions(
      createTilemapAsset({ name: 'mundo', tilesetId: tileset.id, cols: 4, rows: 3 }),
    )
  if (!prepared.ok) throw Error(prepared.reason)
  const base: RegionTilemapAsset = { ...prepared.map, origin: { col: -10, row: -20 } },
    changed = editRegionMapCells(base, base.layers[0]!.id, [{ col: -10, row: -20, cell: 0 }])
  if (!changed.ok) throw Error(changed.reason)
  return { map: changed.map, tileset }
}

test('minimap keyboard navigation uses signed world bounds without editing the map', () => {
  const { map, tileset } = fixture(),
    before = structuredClone(map),
    jumps: Array<[number, number]> = []
  render(
    <MapMinimapPanel
      map={map}
      tilesets={[tileset]}
      onJump={(col, row) => jumps.push([col, row])}
    />,
  )
  const button = screen.getByRole('button', { name: COPY.scene.navegarPeloMinimapa })
  fireEvent.keyDown(button, { key: 'Home' })
  fireEvent.keyDown(button, { key: 'End' })
  expect(jumps).toEqual([
    [-10, -20],
    [-7, -18],
  ])
  expect(map).toEqual(before)
})

test('minimap pointer and non-pointer activation target the signed map rather than coordinate zero', () => {
  const { map, tileset } = fixture(),
    jumps: Array<[number, number]> = []
  render(
    <MapMinimapPanel
      map={map}
      tilesets={[tileset]}
      onJump={(col, row) => jumps.push([col, row])}
    />,
  )
  const button = screen.getByRole('button', { name: COPY.scene.navegarPeloMinimapa })
  Object.defineProperty(button, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }),
  })
  fireEvent.click(button, { clientX: 100, clientY: 25, detail: 1 })
  fireEvent.click(button)
  expect(jumps).toEqual([
    [-8, -19.25],
    [-8, -18.5],
  ])
})

test('minimap budget counts allocated region buffers instead of multiplying logical dimensions', () => {
  const { map, tileset } = fixture()
  render(<MapMinimapPanel map={map} tilesets={[tileset]} onJump={() => {}} />)
  expect(document.body.textContent).toContain(COPY.scene.budget(1024, 2097152))
})

test('the actual panel allocates at most a 256-square canvas for a 100-million-cell world', () => {
  const { map, tileset } = fixture(),
    world = { ...map, cols: 10000, rows: 10000 }
  const { container } = render(
    <MapMinimapPanel map={world} tilesets={[tileset]} onJump={() => {}} />,
  )
  const canvas = container.querySelector('canvas')!
  expect([canvas.width, canvas.height]).toEqual([256, 256])
  expect(document.body.textContent).toContain(COPY.scene.budget(1024, 2097152))
})
