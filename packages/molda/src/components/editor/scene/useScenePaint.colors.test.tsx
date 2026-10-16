import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaSceneDocument } from '../../../scene/document'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { useScenePaint } from './useScenePaint'

function mount() {
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: animatedScene(),
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  return renderHook(() => useScenePaint(editor), { wrapper: StrictMode })
}

test('escolher cores não registra tinta como usada antes de confirmar uma pintura', () => {
  const view = mount()
  act(() => view.result.current.setColor([200, 10, 10, 255]))
  for (const hex of ['#202020', '#303030', '#404040', '#505050', '#606060', '#707070', '#808080'])
    act(() => view.result.current.newColorStep(hex))
  // A tinta acompanha o arrasto; "Recentes" ainda guarda a cor que a criança usou.
  expect(view.result.current.ink).toEqual([0x80, 0x80, 0x80, 255])
  expect(view.result.current.recentColors).toEqual([])
  view.unmount()
})

test('Pegar cor num ponto sem tinta nenhuma mantém a tinta de antes e volta ao Pincel', () => {
  const view = mount()
  act(() => view.result.current.setColor([12, 34, 56, 255]))
  act(() => view.result.current.setPicker())
  act(() => view.result.current.sample([0, 0, 0, 0]))
  expect(view.result.current.ink).toEqual([12, 34, 56, 255])
  expect(view.result.current.picker).toBe(false)
  expect(view.result.current.eraser).toBe(false)
  // Uma amostra meio transparente vira tinta cheia (a cor que se vê, sem apagar nada).
  act(() => view.result.current.sample([90, 80, 70, 120]))
  expect(view.result.current.ink).toEqual([90, 80, 70, 255])
  view.unmount()
})
