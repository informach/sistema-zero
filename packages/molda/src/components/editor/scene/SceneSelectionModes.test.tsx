import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneKnifeLoop } from '../../../testing/sceneKnifeLoop'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

test('the stage selection bar opens edge picking directly and the panel expands a knife loop without changing geometry', async () => {
  const f = makeSceneKnifeLoop()
  const editor = createDocumentEditorStore({
    asset: f.document,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  try {
    await waitFor(() => expect(probe.ports.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const modes = within(screen.getByRole('group', { name: 'Escolher' }))
    fireEvent.click(modes.getByRole('button', { name: 'Linhas' }))
    const panel = screen.getByRole('region', { name: COPY.scene.componentTitles.edge })
    expect(within(panel).queryByRole('button', { name: 'Linhas' })).toBeNull()
    expect(modes.getByRole('button', { name: 'Linhas', pressed: true })).toBeTruthy()
    act(() => probe.ports.at(-1)!.callbacks.selectComponent?.(f.seed, false))
    expect(within(panel).getByText('1 linha escolhida')).toBeTruthy()
    fireEvent.click(within(panel).getByRole('checkbox', { name: COPY.scene.componentWholeLoop }))
    expect(within(panel).getByText('4 linhas escolhidas')).toBeTruthy()
    expect(editor.getState().content).toBe(f.document)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.click(within(panel).getByRole('button', { name: 'Mais ferramentas' }))
    fireEvent.click(modes.getByRole('button', { name: 'Faces' }))
    expect(modes.getByRole('button', { name: 'Faces', pressed: true })).toBeTruthy()
    const faces = within(screen.getByRole('region', { name: COPY.scene.componentTitles.face }))
    expect(faces.getByRole('button', { name: COPY.scene.facePreview.extrude })).toBeTruthy()
    fireEvent.click(modes.getByRole('button', { name: 'Pontos' }))
    expect(modes.getByRole('button', { name: 'Pontos', pressed: true })).toBeTruthy()
    fireEvent.click(modes.getByRole('button', { name: 'Peça inteira' }))
    expect(screen.queryByRole('region', { name: COPY.scene.componentTitles.vertex })).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
