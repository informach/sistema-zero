import { expect, test } from 'bun:test'
import { metadataBudgetFixture } from '../../scripts/homologacao/metadataBudget'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { createTilesetAsset, sanitizeRegionTilemapAsset } from '../core/project'
import { createEditorStore } from './editorStore'

test('regional metadata is refused globally before history, autosave or host side effects', async () => {
  const { source, over } = metadataBudgetFixture()
  let writes = 0,
    admittedByHost = 0
  const editor = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      admittedByHost++
      return true
    },
  })
  expect(sanitizeRegionTilemapAsset(source)).not.toBeNull()
  expect(sanitizeRegionTilemapAsset(over)).toBeNull()
  try {
    expect(editor.getState().commit(over)).toBe(false)
    expect(editor.getState().replaceIfCurrent(source, over)).toBeNull()
    editor.getState().replace(over)
    editor.getState().commitGesture(over)
    expect(editor.getState().asset).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
    expect(editor.getState().dirty).toBe(false)
    expect(admittedByHost).toBe(0)
  } finally {
    await editor.getState().flush()
  }
  expect(writes).toBe(0)
})

test('an over-budget initial revision cannot open an internal regional store', () => {
  const { over } = metadataBudgetFixture()
  expect(() =>
    createEditorStore<PintaMemoryAsset>({ asset: over, persist: async () => {} }),
  ).toThrow(RangeError)
})

test('admitted metadata edits keep one real undo/redo entry and persist the surviving revision', async () => {
  const { source } = metadataBudgetFixture()
  const persisted: PintaMemoryAsset[] = []
  const editor = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async (asset) => {
      persisted.push(asset)
    },
  })
  expect(editor.getState().commit({ ...source, name: 'outra vila' })).toBe(true)
  const changed = editor.getState().asset
  editor.getState().undo()
  expect(editor.getState().asset).toBe(source)
  expect(editor.getState().canUndo).toBe(false)
  editor.getState().redo()
  expect(editor.getState().asset).toBe(changed)
  expect(editor.getState().canRedo).toBe(false)
  expect(await editor.getState().flush()).toEqual({ ok: true })
  expect(persisted).toEqual([changed])
})

test('one over-budget regional consumer refuses the complete linked edit', async () => {
  const { source, over } = metadataBudgetFixture(),
    sheet = createTilesetAsset({ name: 'terra', tileSize: 16 })
  let writes = 0
  const editor = createEditorStore<PintaMemoryAsset>({
    asset: sheet,
    persist: async () => {
      writes++
    },
  })
  try {
    expect(
      editor
        .getState()
        .commitLinked({ ...sheet, name: 'outra' }, { before: [source], after: [over] }),
    ).toBe(false)
    expect(editor.getState().asset).toBe(sheet)
    expect(editor.getState().linkedAssets).toBeNull()
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    await editor.getState().flush()
  }
  expect(writes).toBe(0)
})
