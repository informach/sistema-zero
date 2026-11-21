import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import { createMapSet } from '../tiles/sets'
import { setCell } from '../tiles/tilemapOps'
import { createEditorStore } from './editorStore'
import { createMapSetEditorStore } from './mapSetEditorStore'

function setup() {
  const map = createTilemapAsset({ name: 'Mapa', tilesetId: 'tiles', cols: 2, rows: 2 }),
    set = createMapSet(map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'Conjunto'),
    outer = createEditorStore({ asset: set, autosaveDelayMs: 100000, persist: async () => {} }),
    inner = createMapSetEditorStore(outer),
    stop = outer.subscribe(() => inner.store.setState(inner.read(), true))
  return { outer, inner: inner.store, stop }
}

test('the map-set view retains no-op identity and returns the surviving inner gesture snapshot', async () => {
  const { outer, inner, stop } = setup()
  try {
    const base = inner.getState().asset
    if (base.kind !== 'tilemap') throw Error('Mapa esperado')
    expect(inner.getState().commit(base)).toBe(false)
    expect(inner.getState().replaceIfCurrent(base, base)).toBe(base)
    const written = inner
      .getState()
      .replaceIfCurrent(base, setCell(base, base.layers[0]!.id, 0, 0, 0))
    expect(written).toBe(inner.getState().asset)
    expect(written).not.toBeNull()
    inner.getState().commitGesture(base)
    expect(outer.getState().canUndo).toBe(true)
    outer.getState().undo()
    expect(outer.getState().canUndo).toBe(false)
    expect(inner.getState().asset).toEqual(base)
    await outer.getState().flush()
  } finally {
    stop()
  }
})

test('an outer-only map-set revision invalidates the inner gesture without losing its metadata', async () => {
  const { outer, inner, stop } = setup()
  try {
    const base = inner.getState().asset,
      root = outer.getState().asset
    if (base.kind !== 'tilemap' || root.kind !== 'map-set') throw Error('Conjunto esperado')
    outer.getState().replace({ ...root, name: 'Nome atualizado fora do gesto' })
    const adopted = outer.getState().asset
    expect(inner.getState().asset === base).toBe(false)
    expect(
      inner.getState().replaceIfCurrent(base, setCell(base, base.layers[0]!.id, 0, 0, 0)),
    ).toBeNull()
    expect(outer.getState().asset).toBe(adopted)
    expect(outer.getState().canUndo).toBe(false)
    await outer.getState().flush()
  } finally {
    stop()
  }
})
