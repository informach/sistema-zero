import { expect, test } from 'bun:test'
import { REGION_METADATA_BUDGET } from '../core/mapDocumentBoundary'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { pintaWorkshopAssetToJson } from '../export/workshopDocument'
import { nativeNineGallery } from '../testing/nativeNineFixtures'
import { createEditorStore } from './editorStore'

test('o mesmo editor guarda, desfaz e refaz a projeção sem perder o livro nem as casas de 32 bits', async () => {
  const { hex, iso } = await nativeNineGallery()
  for (const original of [hex, iso]) {
    const saved: string[] = []
    const editor = createEditorStore<WorkshopProjectedMap>({
      asset: original,
      persist: async (asset) => {
        const text = pintaWorkshopAssetToJson(asset)
        if (!text) throw Error('O editor perdeu parte do mapa projetado')
        saved.push(text)
      },
    })
    expect(editor.getState().commit({ ...original, name: `${original.name}-editado` })).toBe(true)
    expect(editor.getState().asset.automapping).toBe(original.automapping)
    expect(editor.getState().asset.layers).toBe(original.layers)
    editor.getState().undo()
    expect(editor.getState().asset.name).toBe(original.name)
    editor.getState().redo()
    expect(editor.getState().asset.name).toBe(`${original.name}-editado`)
    expect(await editor.getState().flush()).toEqual({ ok: true })
    expect(saved).toHaveLength(1)
    expect(editor.getState().dirty).toBe(false)
    expect(editor.getState().canUndo).toBe(true)
  }
})

test('o orçamento do editor também recusa metadados projetados antes de criar histórico ou autosave', async () => {
  const { iso } = await nativeNineGallery()
  let writes = 0
  const editor = createEditorStore<WorkshopProjectedMap>({
    asset: iso,
    persist: async () => {
      writes++
    },
  })
  expect(
    editor.getState().commit({
      ...iso,
      layers: iso.layers.map((layer, index) =>
        index === 0
          ? { ...layer, name: 'x'.repeat(REGION_METADATA_BUDGET.maxStringUnits + 1) }
          : layer,
      ),
    }),
  ).toBe(false)
  expect(editor.getState().asset).toBe(iso)
  expect(editor.getState().canUndo).toBe(false)
  expect(await editor.getState().flush()).toEqual({ ok: true })
  expect(writes).toBe(0)
})
