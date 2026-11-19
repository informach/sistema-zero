import { expect, it } from 'bun:test'
import type { PointerEvent } from 'react'
import { createTilemapAsset, createTilesetAsset, type TilemapAsset } from '../../../core/project'
import { createEditorStore } from '../../../state/editorStore'
import { createSessionStore } from '../../../state/sessionStore'
import { tileLayerAt } from '../../../testing/fixtures'
import { addMapObject, createMapObject } from '../../../tiles/mapObjects'
import { addObjectLayer } from '../../../tiles/tilemapOps'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import { createTileGestures, type TileGestureDeps } from './tileGestures'

function prepare(map: TilemapAsset, recovery?: TilemapAsset) {
  const editor = createEditorStore({
    asset: map,
    autosaveDelayMs: 100_000,
    persist: async () => {
      if (recovery) throw new Error('Conflito de revisão')
    },
    recoverPersisted: () => (recovery ? { asset: recovery, linked: [] } : null),
  })
  const canvas = document.createElement('canvas')
  const event = (col: number, row: number, pointerId = 1) =>
    ({
      isPrimary: true,
      pointerId,
      clientX: col,
      clientY: row,
      currentTarget: canvas,
    }) as PointerEvent<HTMLCanvasElement>
  const deps: TileGestureDeps = {
    editor,
    session: createSessionStore(),
    tool: 'pencil',
    tilemap: map,
    layerId: tileLayerAt(map).id,
    tileset: createTilesetAsset({ name: 'peças', tileSize: 16 }),
    selectedTile: 0,
    stamp: null,
    brush: DEFAULT_MAP_BRUSH,
    autoExpand: true,
    tileSize: 16,
    cellPx: 32,
    gestureRef: { current: null },
    previewCellsRef: { current: [] },
    panRef: { current: null },
    stageRef: { current: document.createElement('div') },
    hoverRef: { current: () => {} },
    cellFromEvent: (e) => ({ col: e.clientX, row: e.clientY }),
    clampCell: (p) => ({
      col: Math.max(0, Math.min(map.cols - 1, p.col)),
      row: Math.max(0, Math.min(map.rows - 1, p.row)),
    }),
    repaintMap: () => {},
    showToast: () => {},
    setPanning: () => {},
    onGestureEnd: () => {},
    isLocked: () => false,
  }
  return { editor, deps, event, gesture: createTileGestures(deps) }
}
const base = () => createTilemapAsset({ name: 'fase', tilesetId: 'peças', cols: 4, rows: 3 })

it('somente o ponteiro dono cancela; soltar depois não confirma o gesto descartado', async () => {
  const { editor, gesture, event, deps } = prepare(base())
  gesture.down(event(1, 1))
  gesture.move(event(2, 1))
  expect(gesture.cancel(event(2, 1, 2))).toBe(false)
  expect(deps.gestureRef.current).not.toBeNull()
  expect(gesture.cancel(event(2, 1))).toBe(true)
  expect(deps.gestureRef.current).toBeNull()
  gesture.up(event(2, 1))
  expect(tileLayerAt(editor.getState().asset as TilemapAsset).cells.every((c) => c === -1)).toBe(
    true,
  )
  expect(editor.getState().canUndo).toBe(false)
  expect(editor.getState().canRedo).toBe(false)
  await editor.getState().flush()
})

it('cancelar crescimento à esquerda restaura dimensões, peças e posições dos objetos', async () => {
  const initial = addObjectLayer(base(), 'Objetos')
  const layerId = initial.layers[1]!.id
  const map = addMapObject(initial, layerId, createMapObject({ name: 'Início', x: 16, y: 16 }))
  const { editor, gesture, event } = prepare(map)
  gesture.down(event(0, 0))
  gesture.move(event(-1, 0))
  expect((editor.getState().asset as TilemapAsset).cols).toBe(5)
  expect(gesture.cancel()).toBe(true)
  const restored = editor.getState().asset as TilemapAsset
  expect(restored.cols).toBe(4)
  expect(restored.rows).toBe(3)
  expect(restored.layers).toEqual(map.layers)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

it('cancelamento tardio não recoloca o documento antigo sobre a cópia adotada após conflito', async () => {
  const recovered = { ...base(), id: 'copia-recuperada', name: 'edição-recuperada' }
  const { editor, gesture, event } = prepare(base(), recovered)
  gesture.down(event(1, 1))
  expect(await editor.getState().flush()).toEqual({ ok: true })
  expect(editor.getState().asset).toBe(recovered)
  gesture.cancel(event(1, 1))
  gesture.up(event(1, 1))
  expect(editor.getState().asset).toBe(recovered)
  expect(editor.getState().canUndo).toBe(false)
  expect(editor.getState().canRedo).toBe(false)
})
