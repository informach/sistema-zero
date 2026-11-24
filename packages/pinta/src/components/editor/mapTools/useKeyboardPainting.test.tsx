import { expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type TilemapAsset,
} from '../../../core/project'
import { createEditorStore } from '../../../state/editorStore'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import type { MapTool } from '../TilemapPanels'
import type { MapBrushContext } from './mapBrush'
import { type KeyboardMapPreview, useKeyboardPainting } from './useKeyboardPainting'

function setup(tool: MapTool = 'line', acceptEdit = true, recover = false) {
  const tileset = createTilesetAsset({ name: 'peças', tileSize: 16 })
  const map = createTilemapAsset({ name: 'teclado', tilesetId: tileset.id, cols: 4, rows: 4 })
  const copy = { ...map, id: 'copia-recuperada' }
  let writes = 0,
    canUse = true
  const editor = createEditorStore({
    asset: map,
    acceptEdit: () => acceptEdit,
    autosaveDelayMs: 100000,
    persist: async () => {
      writes++
      if (recover) throw new Error('conflito')
    },
    recoverPersisted: () => (recover ? { asset: copy, linked: [] } : null),
  })
  let brush: MapBrushContext = {
    layerId: map.layers[0]!.id,
    erasing: false,
    selectedTile: 0,
    stamp: null,
    anchor: null,
    tileset,
    brush: DEFAULT_MAP_BRUSH,
  }
  const previewRef: { current: KeyboardMapPreview | null } = { current: null }
  const view = renderHook(() =>
    useKeyboardPainting({
      editor,
      map: editor.getState().asset as TilemapAsset,
      layerId: map.layers[0]!.id,
      enabled: true,
      isAvailable: () => true,
      getTool: () => tool,
      getBrush: () => brush,
      canUse: () => canUse,
      tool,
      brush,
      tileSize: 16,
      previewRef,
      cursorRef: { current: null },
      stageRef: { current: null },
      position: () => ({ x: 0, y: 0 }),
      onCursor: () => {},
      repaint: () => {},
      showToast: () => {},
      pickCell: () => {},
      selectRect: () => {},
      cancelSelection: () => {},
    }),
  )
  const press = (key: string, extra: Partial<KeyboardEvent<HTMLCanvasElement>> = {}) =>
    act(() =>
      view.result.current.onKeyDown({
        key,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        repeat: false,
        defaultPrevented: false,
        preventDefault() {},
        ...extra,
      } as KeyboardEvent<HTMLCanvasElement>),
    )
  return {
    editor,
    map,
    copy,
    previewRef,
    view,
    press,
    writes: () => writes,
    changeBrush: () => {
      brush = { ...brush, brush: { ...brush.brush, seed: brush.brush.seed + 1 } }
      view.rerender()
    },
    changeTool: (next: MapTool) => {
      tool = next
      view.rerender()
    },
    blockPointer: () => {
      canUse = false
    },
  }
}
const cells = (map: TilemapAsset) => map.layers.find(isTileLayer)!.cells

it('two-point preview is outside autosave and confirms exactly one undo', async () => {
  const t = setup()
  t.press('Enter')
  t.press('ArrowRight')
  t.press('ArrowDown')
  expect(t.previewRef.current).not.toBeNull()
  expect(cells(t.editor.getState().asset as TilemapAsset).every((v) => v === -1)).toBe(true)
  expect(t.editor.getState().canUndo).toBe(false)
  await t.editor.getState().flush()
  expect(t.writes()).toBe(0)
  t.press('Enter')
  expect(cells(t.editor.getState().asset as TilemapAsset).filter((v) => v >= 0)).toHaveLength(2)
  t.editor.getState().undo()
  expect(cells(t.editor.getState().asset as TilemapAsset).every((v) => v === -1)).toBe(true)
  expect(t.editor.getState().canUndo).toBe(false)
})
for (const cancel of ['Escape', 'blur', 'pointer', 'brush'] as const)
  it(`${cancel} cancels the draft without writes or delayed confirmation`, () => {
    const t = setup()
    t.press('Enter')
    t.press('ArrowRight')
    act(() => {
      if (cancel === 'Escape') t.press('Escape')
      if (cancel === 'blur') t.view.result.current.onBlur()
      if (cancel === 'pointer') t.view.result.current.onPointerDownCapture()
      if (cancel === 'brush') t.changeBrush()
    })
    expect(t.previewRef.current).toBeNull()
    expect(t.editor.getState().asset).toBe(t.map)
    t.press('Enter')
    expect(t.editor.getState().canUndo).toBe(false)
    expect(t.writes()).toBe(0)
  })
it('host refusal, held Enter and an active pointer do not commit', () => {
  const refused = setup('pencil', false)
  refused.press('Enter')
  expect(refused.editor.getState().asset).toBe(refused.map)
  expect(refused.editor.getState().canUndo).toBe(false)
  const active = setup('pencil')
  active.press('Enter', { repeat: true })
  expect(active.editor.getState().asset).toBe(active.map)
  active.blockPointer()
  active.press('Enter')
  expect(active.editor.getState().asset).toBe(active.map)
})
it('changing only the tool clears a two-point preview immediately', () => {
  const t = setup('line')
  t.press('Enter')
  t.press('ArrowRight')
  expect(t.previewRef.current).not.toBeNull()
  t.changeTool('rect')
  expect(t.previewRef.current).toBeNull()
  expect(t.view.result.current.anchor).toBeNull()
  expect(t.editor.getState().asset).toBe(t.map)
})
it('a recovered document cannot receive a keyboard preview from the original revision', async () => {
  const t = setup('line', true, true)
  t.press('Enter')
  t.press('ArrowRight')
  t.editor.getState().commit({ ...t.map, name: 'Outra revisão' })
  await t.editor.getState().flush()
  expect(t.editor.getState().asset).toBe(t.copy)
  t.press('Enter')
  expect(t.previewRef.current).toBeNull()
  expect(t.editor.getState().asset).toBe(t.copy)
  expect(t.editor.getState().canUndo).toBe(false)
})
it('a Pinta modal blocks keyboard painting behind it', () => {
  const t = setup('pencil')
  const modal = document.createElement('div')
  modal.setAttribute('data-pinta-dialog', '')
  document.body.append(modal)
  try {
    t.press('Enter')
    expect(t.editor.getState().asset).toBe(t.map)
  } finally {
    modal.remove()
  }
})
