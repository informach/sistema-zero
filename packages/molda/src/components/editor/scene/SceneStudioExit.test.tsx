import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaExportedAsset } from '../../../export/studioLibrary'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeModel } from '../../../testing/fixtures'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

test('guardar e voltar waits for the actual GLB loss review, preserves the native model and exits after consent', async () => {
  const source = migrateLegacyModel(makeModel()).document
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const sent: MoldaExportedAsset[] = []
  let exits = 0
  const onExit = () => {
    exits++
  }
  const view = render(
    <SceneWorkshop
      editor={editor}
      viewportFactory={sceneViewportProbe().factory}
      onExit={onExit}
      resyncToStudio={async (asset) => {
        sent.push(asset)
        return { updated: true }
      }}
    />,
  )
  try {
    act(() =>
      editor.getState().commit({
        ...source,
        nodes: source.nodes.map((node, index) => (index === 0 ? { ...node, hidden: true } : node)),
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.exit.open }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.exit.save }))
    })
    await screen.findByRole('button', { name: COPY.scene.glbExport.studio.accept })
    expect(screen.queryByRole('dialog', { name: COPY.scene.exit.title })).toBeNull()
    expect(exits).toBe(0)
    expect(sent).toHaveLength(0)
    expect(editor.getState().saveState).toBe('saved')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.glbExport.studio.accept }))
    })
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(editor.getState().asset.nodes[0]!.hidden).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.exit.open }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.exit.save }))
    })
    await waitFor(() => expect(exits).toBe(1))
    expect(sent).toHaveLength(1)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
