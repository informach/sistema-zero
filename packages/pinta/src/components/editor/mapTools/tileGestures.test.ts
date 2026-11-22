import { expect, it } from 'bun:test'
import type { PointerEvent } from 'react'
import { createTilemapAsset, createTilesetAsset, type TilemapAsset } from '../../../core/project'
import { createEditorStore, type PintaEditorStoreOptions } from '../../../state/editorStore'
import { createSessionStore } from '../../../state/sessionStore'
import { tileLayerAt } from '../../../testing/fixtures'
import { addMapObject, createMapObject } from '../../../tiles/mapObjects'
import { addObjectLayer } from '../../../tiles/tilemapOps'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import { createTileGestures, type TileGestureDeps } from './tileGestures'

function prepare(
  map: TilemapAsset,
  recovery?: TilemapAsset,
  acceptEdit?: PintaEditorStoreOptions['acceptEdit'],
) {
  const editor = createEditorStore({
    asset: map,
    acceptEdit,
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

it('cancelar não restaura a base sobre uma revisão mais nova que conserva o mesmo ID', async () => {
  const initial = base(),
    { editor, gesture, event } = prepare(initial)
  gesture.down(event(1, 1))
  const other = { ...initial, name: 'revisão externa mais nova' }
  editor.getState().replace(other)
  const adopted = editor.getState().asset
  gesture.cancel()
  gesture.up()
  expect(editor.getState().asset).toBe(adopted)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

it('um gesto que perde sua revisão não pinta a revisão externa no próximo movimento', async () => {
  const initial = base(),
    { editor, gesture, event } = prepare(initial)
  gesture.down(event(1, 1))
  const other = { ...initial, name: 'revisão externa mais nova' }
  editor.getState().replace(other)
  const adopted = editor.getState().asset
  gesture.move(event(2, 1))
  gesture.up()
  expect(editor.getState().asset).toBe(adopted)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

it('um carimbo recusado desfaz o traço inteiro, sem salvar um pedaço ou criar histórico', async () => {
  const initial = createTilemapAsset({ name: 'Grande', tilesetId: 'peças', cols: 256, rows: 256 }),
    { editor, gesture, event, deps } = prepare(initial),
    messages: string[] = []
  deps.autoExpand = false
  deps.stamp = { cols: 256, rows: 256, tiles: new Int16Array(65536).fill(0) }
  deps.showToast = (text) => messages.push(text)
  gesture.down(event(1, 1))
  gesture.move(event(0, 1))
  gesture.up()
  const restored = editor.getState().asset
  expect(restored.kind === 'tilemap' && restored.layers === initial.layers).toBe(true)
  expect(editor.getState().canUndo).toBe(false)
  expect(messages).toHaveLength(1)
  await editor.getState().flush()
})

it('voltar sobre os mesmos blocos não esgota o gesto nem duplica o histórico', async () => {
  const initial = createTilemapAsset({ name: 'Grande', tilesetId: 'peças', cols: 256, rows: 256 }),
    { editor, gesture, event, deps } = prepare(initial),
    messages: string[] = []
  deps.autoExpand = false
  deps.stamp = { cols: 16, rows: 16, tiles: new Int16Array(256).fill(0) }
  deps.showToast = (text) => messages.push(text)
  gesture.down(event(0, 0))
  for (let row = 0; row < 20; row++) gesture.move(event(row % 2 ? 0 : 255, row))
  gesture.up()
  expect(editor.getState().canUndo).toBe(true)
  expect(messages).toEqual([])
  editor.getState().undo()
  expect(editor.getState().canUndo).toBe(false)
  const restored = editor.getState().asset
  expect(restored.kind === 'tilemap' && restored.layers === initial.layers).toBe(true)
  await editor.getState().flush()
})

it('soltar sem outro movimento não cria histórico em cima de uma revisão externa do mesmo ID', async () => {
  const initial = base(),
    { editor, gesture, event } = prepare(initial)
  gesture.down(event(1, 1))
  editor.getState().replace({ ...initial, name: 'outra revisão' })
  const adopted = editor.getState().asset
  gesture.up()
  expect(editor.getState().asset).toBe(adopted)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

it('um pincel iniciado conserva sua escolha de peça até a soltura', async () => {
  const initial = base(),
    { editor, gesture, event, deps } = prepare(initial)
  gesture.down(event(0, 0))
  deps.selectedTile = 1
  gesture.move(event(1, 0))
  gesture.up()
  const current = editor.getState().asset
  expect(current.kind === 'tilemap' && tileLayerAt(current).cells[1]).toBe(0)
  editor.getState().undo()
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

it('a recusa do host no meio do traço restaura a base inteira sem uma entrada de histórico', async () => {
  const initial = base(),
    { editor, gesture, event } = prepare(
      initial,
      undefined,
      (candidate) => candidate.kind === 'tilemap' && tileLayerAt(candidate).cells[1] === -1,
    )
  gesture.down(event(0, 0))
  gesture.move(event(1, 0))
  gesture.up()
  const restored = editor.getState().asset
  expect(restored.kind === 'tilemap' && restored.layers === initial.layers).toBe(true)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})
