import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import { createEditorGesture } from './editorGesture'
import { createEditorStore } from './editorStore'

for (const action of ['replace', 'cancel', 'finish'] as const)
  test(`sessão: ${action} não reassume uma revisão externa do mesmo ID`, async () => {
    const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2 }),
      editor = createEditorStore({ asset: base, autosaveDelayMs: 100000, persist: async () => {} }),
      gesture = createEditorGesture(editor)
    expect(gesture.replace({ ...base, name: 'proposta' })).toBe(true)
    editor.getState().replace({ ...base, name: 'externa' })
    const adopted = editor.getState().asset
    expect(action === 'replace' ? gesture.replace(base) : gesture[action]()).toBe(false)
    expect(editor.getState().asset).toBe(adopted)
    expect(editor.getState().canUndo).toBe(false)
    await editor.getState().flush()
  })

test('sessão: encerramento é terminal e não cria um segundo desfazer', async () => {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2 }),
    editor = createEditorStore({ asset: base, autosaveDelayMs: 100000, persist: async () => {} }),
    gesture = createEditorGesture(editor)
  expect(gesture.replace({ ...base, name: 'editada' })).toBe(true)
  expect(gesture.finish()).toBe(true)
  expect(gesture.finish()).toBe(false)
  expect(gesture.replace(base)).toBe(false)
  expect(gesture.cancel()).toBe(false)
  editor.getState().undo()
  expect(editor.getState().asset).toBe(base)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})

test('sessão: revisão trocada no assinante não é reivindicada pelo gesto', async () => {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2 }),
    editor = createEditorStore({ asset: base, autosaveDelayMs: 100000, persist: async () => {} }),
    gesture = createEditorGesture(editor),
    stop = editor.subscribe((state) => {
      if (state.asset.name === 'proposta') state.replace({ ...state.asset, name: 'externa' })
    })
  expect(gesture.replace({ ...base, name: 'proposta' })).toBe(false)
  expect(gesture.finish()).toBe(false)
  expect(gesture.cancel()).toBe(false)
  expect(editor.getState().asset.name).toBe('externa')
  expect(editor.getState().canUndo).toBe(false)
  stop()
  await editor.getState().flush()
})
