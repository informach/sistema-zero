import { expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { resolvePaletteColors } from '../core/sanitize'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createScenePaletteGesture } from './scenePaletteGesture'

function fixture(
  asset: MoldaSceneDocument = migrateLegacyModel(makeModel({ parts: [] })).document,
) {
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  return { editor, gesture: createScenePaletteGesture(editor), asset }
}

test('N passos do seletor viram UMA cor e UM desfazer (o relato de 06/09, portado)', () => {
  const { editor, gesture, asset } = fixture()
  const colors = resolvePaletteColors(asset).length
  for (const hex of ['#101010', '#202020', '#303030', '#404040'])
    expect(gesture.step(hex)).toEqual({ index: colors })
  expect(editor.getState().asset.extraColors).toEqual(['#404040'])
  expect(editor.getState().canUndo).toBe(false)
  gesture.end()
  gesture.end()
  expect(editor.getState().canUndo).toBe(true)
  editor.getState().undo()
  expect(editor.getState().asset.extraColors).toBeUndefined()
  expect(editor.getState().canUndo).toBe(false)
  editor.getState().dispose()
})

test('cor que já existe só é escolhida: nenhuma extra, nenhum desfazer', () => {
  const { editor, gesture, asset } = fixture()
  const fixed = resolvePaletteColors(asset)[4]!
  expect(gesture.step(fixed)).toEqual({ index: 4 })
  gesture.end()
  expect(editor.getState().asset).toBe(asset)
  expect(editor.getState().canUndo).toBe(false)
  editor.getState().dispose()
})

test('arrastar até uma cor que já existe tira a extra do gesto e aponta para a existente', () => {
  const { editor, gesture, asset } = fixture()
  const colors = resolvePaletteColors(asset)
  expect(gesture.step('#abcdef')).toEqual({ index: colors.length })
  expect(gesture.step(colors[6]!)).toEqual({ index: 6 })
  expect(editor.getState().asset.extraColors).toBeUndefined()
  // Um passo seguinte para uma cor nova cria a extra de novo, e o gesto continua um só.
  expect(gesture.step('#fedcba')).toEqual({ index: colors.length })
  gesture.end()
  expect(editor.getState().asset.extraColors).toEqual(['#fedcba'])
  editor.getState().undo()
  expect(editor.getState().asset.extraColors).toBeUndefined()
  editor.getState().dispose()
})

test('teto batido no meio do gesto: um aviso, e os passos seguintes são ignorados', () => {
  const full: MoldaSceneDocument = {
    ...migrateLegacyModel(makeModel({ parts: [] })).document,
    extraColors: Array.from(
      { length: MOLDA_LIMITS.maxExtraColors },
      (_, i) => `#00${(0x1000 + i).toString(16).slice(-4)}`,
    ),
  }
  const { editor, gesture } = fixture(full)
  expect(gesture.step('#fedcba')).toEqual({ full: true })
  expect(gesture.step('#fedcbb')).toBeNull()
  gesture.end()
  expect(editor.getState().asset).toBe(full)
  editor.getState().dispose()
})
