import { expect, test } from 'bun:test'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import { readSceneDocument } from '../../../scene/readDocument'
import { createSceneSkin } from '../../../scene/skinCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import { SceneGlbExportPanel } from './SceneGlbExportPanel'

test('hundreds of unrenderable faces have one readable warning row, not hundreds of DOM items', async () => {
  const asset = animatedScene(),
    geometry = makeSceneGridGeometry(20),
    copy = COPY.scene.glbExport
  for (const point of Object.values(geometry.vertices)) point[1] = 0
  asset.geometries = [geometry]
  asset.nodes = [
    {
      ...asset.nodes[0]!,
      kind: 'mesh',
      geometryId: geometry.id,
      materialId: asset.materials[0]!.id,
    },
  ]
  expect(readSceneDocument(asset).status).toBe('valid')
  expect(encodeSceneGlb(asset, { allowLosses: true }).issues.length).toBe(400)
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
  })
  const view = render(
      <StrictMode>
        <SceneGlbExportPanel editor={editor} onClose={() => {}} />
      </StrictMode>,
    ),
    panel = within(view.container)
  try {
    fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
    await waitFor(() =>
      expect(panel.queryByRole('checkbox', { name: copy.accept }) !== null).toBe(true),
    )
    expect(panel.getAllByRole('listitem').length).toBe(1)
    expect(panel.getByText(copy.issues['face-omitted'](400)) !== null).toBe(true)
    expect((panel.getByRole('button', { name: copy.download }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(panel.getByRole('checkbox', { name: copy.accept }))
    expect(panel.getAllByRole('listitem').length).toBe(1)
    expect(editor.getState().asset).toBe(asset)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

for (const parts of [1, 49]) {
  test(`Studio guidance for ${parts} rendered pieces preserves the source and enables the lossless portable download button`, async () => {
    const asset = makeSceneGlbFixture(parts, 1, 3, 0),
      copy = COPY.scene.glbExport
    const editor = createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
    })
    const view = render(<SceneGlbExportPanel editor={editor} onClose={() => {}} />),
      panel = within(view.container)
    try {
      expect(panel.queryByText(copy.studio.animated)).toBeNull()
      fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
      await waitFor(() => expect(panel.queryByText(copy.studio.animated) !== null).toBe(true))
      const details = view.container.querySelector('details')
      expect(details?.querySelector('summary')?.textContent).toBe(
        parts === 1 ? copy.studio.title : copy.studio.needsChanges,
      )
      expect(
        panel.queryByText(parts === 1 ? copy.studio.fits : copy.studio.tooComplex) !== null,
      ).toBe(true)
      expect(panel.queryByText(copy.studio.manual) !== null).toBe(true)
      expect(panel.queryByText(copy.studio.scope) !== null).toBe(true)
      if (parts === 49)
        expect(panel.queryByText(copy.studio.limits.meshes(49, 48)) !== null).toBe(true)
      expect(panel.queryByRole('checkbox', { name: copy.accept })).toBeNull()
      expect(
        (panel.getByRole('button', { name: copy.download }) as HTMLButtonElement).disabled,
      ).toBe(false)
      expect(editor.getState().asset).toBe(asset)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
}

test('the real worker shows exported clip names, omits empty clips and requires consent for renamed copies', async () => {
  const asset = makeSceneGlbFixture(1, 1, 3, 0),
    first = asset.animations![0]!,
    copy = COPY.scene.glbExport
  asset.animations!.push(
    { ...first, id: 'copy' },
    { ...first, id: 'empty', name: 'Vazio', tracks: [] },
  )
  const before = structuredClone(asset)
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
  })
  const view = render(<SceneGlbExportPanel editor={editor} onClose={() => {}} />),
    panel = within(view.container)
  try {
    fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
    await waitFor(() =>
      expect(panel.queryByRole('checkbox', { name: copy.accept }) !== null).toBe(true),
    )
    const names = [...view.container.querySelectorAll('dt')].map((node) => node.textContent)
    expect(names).toEqual([first.name, `${first.name} (2)`])
    expect(panel.queryByText(copy.clipsHint) !== null).toBe(true)
    expect(panel.queryByText(copy.issues['clip-renamed'](1)) !== null).toBe(true)
    expect(panel.queryByText('Vazio')).toBeNull()
    const download = panel.getByRole('button', { name: copy.download }) as HTMLButtonElement
    expect(download.disabled).toBe(true)
    fireEvent.click(panel.getByRole('checkbox', { name: copy.accept }))
    expect(download.disabled).toBe(false)
    fireEvent.click(panel.getByRole('checkbox', { name: copy.accept }))
    expect(download.disabled).toBe(true)
    expect(editor.getState().asset).toEqual(before)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('skin export uses the real worker, explains each conversion once and requires consent without changing history', async () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    asset = createSceneSkin(document, input, () => id),
    copy = COPY.scene.glbExport
  asset.nodes.find((node) => node.id === 'upper')!.hidden = true
  const before = structuredClone(asset),
    editor = createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
    }),
    view = render(
      <StrictMode>
        <SceneGlbExportPanel editor={editor} onClose={() => {}} />
      </StrictMode>,
    ),
    panel = within(view.container)
  try {
    fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
    await waitFor(() =>
      expect(panel.queryByRole('checkbox', { name: copy.accept }) !== null).toBe(true),
    )
    for (const code of ['skin-precision', 'skin-zero-slots', 'skin-render-space'] as const)
      expect(panel.getAllByText(copy.issues[code](1))).toHaveLength(1)
    expect(panel.getAllByText(copy.issues['skin-dependency'](2))).toHaveLength(1)
    expect(panel.getByText(copy.studio.skinned) !== null).toBe(true)
    const button = panel.getByRole('button', { name: copy.download }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(panel.getByRole('checkbox', { name: copy.accept }))
    expect(button.disabled).toBe(false)
    expect(editor.getState().asset).toEqual(before)
    expect(editor.getState().canUndo).toBe(false)
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('escolher o destino do Estúdio leva a pintura animada inteira e descarta a cópia anterior', async () => {
  const asset = makeSceneGlbFixture(1, 1, 3, 2),
    copy = COPY.scene.glbExport
  asset.animations = []
  asset.images[0]!.flipbook = { frameWidth: 1, frameHeight: 1, frames: [1, 3], fps: 4, loop: true }
  expect(readSceneDocument(asset).status).toBe('valid')
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
  })
  const view = render(
      <StrictMode>
        <SceneGlbExportPanel editor={editor} onClose={() => {}} />
      </StrictMode>,
    ),
    panel = within(view.container)
  try {
    const download = panel.getByRole('radio', { name: new RegExp(copy.destinationDownload) })
    const studio = panel.getByRole('radio', { name: new RegExp(copy.destinationStudio) })
    expect((download as HTMLInputElement).checked).toBe(true)
    // Destino de arquivo: a pintura animada fica no primeiro quadro, com aviso.
    fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
    await waitFor(() =>
      expect(panel.queryByRole('checkbox', { name: copy.accept }) !== null).toBe(true),
    )
    expect(panel.getByText(copy.issues['flipbook-first-frame'](1)) !== null).toBe(true)
    // Trocar o destino descarta a cópia preparada: consentimento não atravessa gravações.
    fireEvent.click(studio)
    expect(panel.queryByRole('checkbox', { name: copy.accept })).toBe(null)
    expect((studio as HTMLInputElement).checked).toBe(true)
    fireEvent.click(panel.getByRole('button', { name: copy.prepare }))
    await waitFor(() => expect(panel.queryByText(copy.noChanges) !== null).toBe(true))
    expect(panel.queryByRole('checkbox', { name: copy.accept })).toBe(null)
    expect((panel.getByRole('button', { name: copy.download }) as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(editor.getState().asset).toBe(asset)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
