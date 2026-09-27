import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { GLTF_IMPORT_COPY as copy } from '../../../core/gltfImportCopy'
import { encodePng } from '../../../export/png'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import {
  sceneImportEditor as editorStore,
  sceneImportFile as localFile,
  sceneImportRenderer as renderer,
} from '../../../testing/sceneImportFixtures'
import { SceneGltfImportPanel } from './SceneGltfImportPanel'
import { SceneImportPreview } from './SceneImportPreview'
import { SceneWorkshop } from './SceneWorkshop'

function choose(label: string, files: File[]) {
  fireEvent.change(screen.getByLabelText(label), { target: { files } })
}
async function prepare(scene = '0') {
  const select = await screen.findByLabelText(copy.scene)
  expect((select as HTMLSelectElement).value).toBe('')
  expect((screen.getByRole('button', { name: copy.prepare }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  fireEvent.change(select, { target: { value: scene } })
  fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
  await screen.findByText(copy.ready)
}

test('workshop imports through its lazy dialog, requires review, restores focus and undoes/redoes one replacement', async () => {
  const editor = editorStore(),
    before = editor.getState().asset,
    { factory, ports } = renderer(),
    bytes = encodeSceneGlb(makeSceneGlbFixture(2, 1, 3, 2), { allowLosses: true }).bytes,
    view = render(
      <StrictMode>
        <SceneWorkshop editor={editor} viewportFactory={factory} />
      </StrictMode>,
    )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    fireEvent.click(trigger)
    await screen.findByRole('dialog', { name: copy.title })
    await screen.findByLabelText(copy.choose)
    choose(copy.choose, [localFile('fox.glb', bytes)])
    await prepare()
    expect(editor.getState().asset).toBe(before)
    expect(editor.getState().canUndo).toBe(false)
    const confirm = screen.getByRole('button', { name: copy.confirm }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.accept))
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: copy.title }) === null).toBe(true),
    )
    await waitFor(() => expect(document.activeElement === trigger).toBe(true))
    const imported = editor.getState().asset
    expect(imported.name).toBe(before.name)
    expect(imported.id).toBe(before.id)
    expect(imported.images.length).toBe(1)
    expect(editor.getState().contentRevision).toBe(1)
    expect(ports.filter((port) => port.disposed === 0).length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.nodes).toEqual(before.nodes)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    expect(editor.getState().asset.images).toEqual(imported.images)
  } finally {
    view.unmount()
    editor.getState().dispose()
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  }
})

test('folder paths and missing companions remain explicit; selecting an empty scene does not import the default scene', async () => {
  const editor = editorStore(),
    before = editor.getState().asset,
    { factory } = renderer()
  let imported = 0
  const view = render(
    <SceneGltfImportPanel
      editor={editor}
      viewportFactory={factory}
      onClose={() => {}}
      onImported={() => {
        imported++
      }}
    />,
  )
  try {
    expect(screen.getByLabelText(copy.folder).hasAttribute('webkitdirectory')).toBe(true)
    choose(copy.folder, [
      localFile(
        'fox/model.gltf',
        {
          asset: { version: '2.0' },
          buffers: [{ byteLength: 4, uri: 'mesh.bin' }],
          images: [{ uri: 'paint.png' }],
          nodes: [{ name: 'Não trazer' }],
          scenes: [{ nodes: [0] }, { name: 'Vazia' }],
          scene: 0,
        },
        true,
      ),
    ])
    const missing = await screen.findByRole('region', { name: copy.missing })
    expect(
      within(missing)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['fox/mesh.bin', 'fox/paint.png'])
    choose(copy.companions, [
      localFile('fox/mesh.bin', new Uint8Array([1, 2, 3, 4]), true),
      localFile('fox/paint.png', encodePng(new Uint8Array([10, 20, 30, 255]), 1, 1), true),
    ])
    await prepare('1')
    expect(editor.getState().asset).toBe(before)
    expect(screen.getByText(copy.scope(1, 1)).textContent).toBe(copy.scope(1, 1))
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByLabelText(copy.loop))
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    await screen.findByText(copy.ready)
    expect((screen.getByLabelText(copy.accept) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(imported).toBe(1)
    expect(editor.getState().asset.nodes).toEqual([])
    expect(editor.getState().asset.images).toEqual([])
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('report detail DOM is bounded and literal; original and complete report downloads require explicit clicks', async () => {
  const editor = editorStore(),
    { factory } = renderer(),
    nodes = Array.from({ length: 60 }, (_, i) => ({
      name: `<script>${i}</script>${'x'.repeat(130)}`,
    })),
    file = localFile('many.gltf', {
      asset: { version: '2.0' },
      nodes,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
    }),
    blobs: Blob[] = [],
    names: string[] = [],
    url = spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:test'
    }),
    anchor = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download)
    }),
    view = render(
      <SceneGltfImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {}}
      />,
    )
  try {
    choose(copy.choose, [file])
    await prepare()
    const report = screen.getByRole('region', { name: copy.changes })
    expect(report.querySelectorAll('ol > li').length).toBe(50)
    expect(report.querySelectorAll('ul > li').length).toBe(1)
    expect(view.container.querySelector('script') === null).toBe(true)
    expect(blobs.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: copy.downloadReport }))
    fireEvent.click(
      screen.getByRole('button', { name: copy.downloadOriginal('many.gltf'), hidden: true }),
    )
    expect(names).toEqual(['molda-relatorio-glTF.json', 'many.gltf'])
    const reportJson = JSON.parse(await blobs[0]!.text())
    expect(reportJson.issues.length).toBe(60)
    expect(new Uint8Array(await blobs[1]!.arrayBuffer())).toEqual(
      new Uint8Array(await file.arrayBuffer()),
    )
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})

test('standalone review preview is read-only, seekable, motion-paused, context-safe and fully disposed in StrictMode', async () => {
  const model = makeSceneGlbFixture(1, 1, 3, 0),
    before = structuredClone(model),
    { factory, ports } = renderer(),
    view = render(
      <StrictMode>
        <SceneImportPreview document={model} factory={factory} />
      </StrictMode>,
    )
  try {
    await waitFor(() => expect(ports.at(-1)!.frames).toBeGreaterThan(0))
    const active = ports.at(-1)!
    expect(active.documents.at(-1)).toBe(model)
    expect(active.editing.every((editing) => !editing)).toBe(true)
    act(() => {
      active.callbacks.select(model.nodes[0]!.id, false)
      expect(active.callbacks.transform?.begin()).toBe(false)
    })
    expect(screen.queryByRole('button', { name: copy.play }) === null).toBe(true)
    fireEvent.change(screen.getByLabelText(copy.clip), {
      target: { value: model.animations![0]!.id },
    })
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.73' } })
    expect(active.poses.at(-1)?.time).toBe(0.73)
    expect(active.poses.at(-1)?.source).toBe(model)
    fireEvent.click(screen.getByRole('button', { name: copy.play }))
    act(() => window.dispatchEvent(new Event('blur')))
    expect(screen.queryByRole('button', { name: copy.pause }) === null).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: copy.play }))
    act(() => active.callbacks.contextLost(true))
    expect(screen.getByText(copy.previewUnavailable).textContent).toBe(copy.previewUnavailable)
    expect((screen.getByRole('button', { name: copy.play }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    act(() => active.callbacks.contextLost(false))
    expect((screen.getByRole('button', { name: copy.play }) as HTMLButtonElement).disabled).toBe(
      false,
    )
    const next = { ...model, name: 'Outra prévia' }
    view.rerender(
      <StrictMode>
        <SceneImportPreview document={next} factory={factory} />
      </StrictMode>,
    )
    expect(active.documents.at(-1)).toBe(next)
    expect(active.poses.at(-1)).toBeNull()
    expect(screen.queryByRole('slider') === null).toBe(true)
    expect(model).toEqual(before)
  } finally {
    view.unmount()
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  }
})
