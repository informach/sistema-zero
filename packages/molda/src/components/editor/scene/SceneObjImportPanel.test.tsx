import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { OBJ_IMPORT_COPY as copy } from '../../../core/objImportCopy'
import { objImportFixture, objText } from '../../../testing/objImportFixture'
import {
  sceneImportEditor as editorStore,
  sceneImportFile as localFile,
  sceneImportRenderer as renderer,
} from '../../../testing/sceneImportFixtures'
import { SceneImportPanel } from './SceneImportPanel'
import { SceneObjImportPanel } from './SceneObjImportPanel'
import { SceneWorkshop } from './SceneWorkshop'

function choose(label: string, files: File[]) {
  fireEvent.change(screen.getByLabelText(label), { target: { files } })
}
const triangle = objText('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')
async function prepare() {
  fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
  await screen.findByText(copy.ready)
}
test('workshop lazy OBJ panel prepares a read-only review, requires consent, restores focus and undoes/redoes one replacement', async () => {
  const editor = editorStore(),
    before = editor.getState().asset,
    { factory, ports } = renderer(),
    view = render(
      <StrictMode>
        <SceneWorkshop editor={editor} viewportFactory={factory} />
      </StrictMode>,
    )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    fireEvent.click(trigger)
    const format = await screen.findByLabelText(copy.objFormat)
    fireEvent.click(format)
    await screen.findByText(copy.intro)
    choose(copy.choose, [localFile('triangle.obj', triangle)])
    await screen.findByLabelText(copy.principal)
    expect(screen.queryByText(copy.ready) === null).toBe(true)
    await prepare()
    expect(editor.getState().asset).toBe(before)
    expect(editor.getState().canUndo).toBe(false)
    const confirm = screen.getByRole('button', { name: copy.confirm }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: copy.title }) === null).toBe(true),
    )
    await waitFor(() => expect(document.activeElement === trigger).toBe(true))
    const imported = editor.getState().asset
    expect(imported).toMatchObject({ id: before.id, name: before.name })
    expect(imported.geometries).toHaveLength(1)
    expect(editor.getState().contentRevision).toBe(1)
    expect(ports.filter((port) => port.disposed === 0)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.nodes).toEqual(before.nodes)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    expect(editor.getState().asset.geometries).toEqual(imported.geometries)
  } finally {
    view.unmount()
    editor.getState().dispose()
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  }
})
test('OBJ directory companions and all compatibility policies are selectable, explicit and require a new review', async () => {
  const editor = editorStore(),
    before = editor.getState().asset,
    { factory } = renderer(),
    input = objImportFixture()
  let imported = 0
  const view = render(
    <SceneObjImportPanel
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
    choose(copy.folder, [localFile(input.entryPath, input.bytes, true)])
    await screen.findByLabelText(copy.principal)
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    const missing = await screen.findByRole('region', { name: copy.missing })
    expect(
      within(missing)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['project/m/a.mtl', 'project/m/empty.mtl'])
    choose(
      copy.companions,
      input.files.map((file) => localFile(file.path, file.bytes, true)),
    )
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: copy.missing }) === null).toBe(true),
    )
    fireEvent.click(screen.getByText(copy.options, { selector: 'summary' }))
    // Every controlled field participates in the actual hook/normalizer, not a UI-only mock.
    for (const [label, value] of [
      [copy.libraryMode, 'all'],
      [copy.duplicateMaterials, 'first'],
      [copy.missingMaterials, 'default'],
      [copy.repeatedProperties, 'first'],
      [copy.repeatedOptions, 'last'],
      [copy.roleConflicts, 'first'],
      [copy.opacityConflict, 'd'],
      [copy.unsupportedMaps, 'omit'],
      [copy.bump, 'normal'],
      [copy.specularMap, 'roughness'],
      [copy.transparencyMap, 'transparency'],
      [copy.phongRoughness, 'blender'],
      [copy.illumination, 'pbr'],
      [copy.opacitySampling, 'nearest'],
      [copy.emptyObjects, 'omit'],
      [copy.normalY, 'negative'],
    ]) {
      fireEvent.change(screen.getByLabelText(label!), { target: { value } })
      expect((screen.getByLabelText(label!) as HTMLSelectElement).value).toBe(value!)
    }
    fireEvent.click(screen.getByText(copy.colorSpaces, { selector: 'summary' }))
    for (const [label, value] of [
      [copy.baseSpace, 'srgb'],
      [copy.colorSpace, 'linear'],
      [copy.scalarSpace, 'srgb'],
    ]) {
      fireEvent.change(screen.getByLabelText(label!), { target: { value } })
      expect((screen.getByLabelText(label!) as HTMLSelectElement).value).toBe(value!)
    }
    fireEvent.click(screen.getByLabelText(copy.doubleSided))
    fireEvent.click(screen.getByLabelText(copy.colorAlpha))
    await prepare()
    expect(editor.getState().asset).toBe(before)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByLabelText(copy.doubleSided))
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    await prepare()
    expect((screen.getByLabelText(copy.accept) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(imported).toBe(1)
    expect(editor.getState().asset.materials.every((material) => material.doubleSided)).toBe(true)
    expect(editor.getState().asset.nodes.some((node) => node.name === 'Empty')).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
test('OBJ report DOM is bounded and escaped; full report and exact original download only on explicit clicks', async () => {
  const editor = editorStore(),
    { factory } = renderer(),
    source = localFile(
      'literal<script>.obj',
      objText(
        Array.from({ length: 60 }, (_, i) => `o <script>${i}</script>${'x'.repeat(130)}\n`).join(
          '',
        ),
      ),
    ),
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
      <SceneObjImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {}}
      />,
    )
  try {
    choose(copy.choose, [source])
    await screen.findByLabelText(copy.principal)
    await prepare()
    const report = screen.getByRole('region', { name: copy.changes })
    expect(report.querySelectorAll('ol > li')).toHaveLength(50)
    expect(report.querySelectorAll('ul > li')).toHaveLength(2)
    expect(view.container.querySelector('script') === null).toBe(true)
    expect(blobs).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: copy.downloadReport }))
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.downloadOriginal('literal<script>.obj'),
        hidden: true,
      }),
    )
    expect(names).toEqual(['molda-relatorio-OBJ.json', 'literal<script>.obj'])
    expect(JSON.parse(await blobs[0]!.text()).issues).toHaveLength(120)
    expect(new Uint8Array(await blobs[1]!.arrayBuffer())).toEqual(
      new Uint8Array(await source.arrayBuffer()),
    )
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})
test('switching format discards staged files, pending native IO and accepted reviews without touching the editor', async () => {
  const editor = editorStore(),
    before = editor.getState().asset,
    { factory, ports } = renderer(),
    view = render(
      <SceneImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {}}
      />,
    )
  try {
    fireEvent.click(screen.getByLabelText(copy.objFormat))
    await screen.findByText(copy.intro)
    const pending = Promise.withResolvers<ArrayBuffer>(),
      file = localFile('slow.obj', new Uint8Array())
    Object.defineProperty(file, 'arrayBuffer', { value: () => pending.promise })
    choose(copy.choose, [file])
    await screen.findByText(copy.readingFiles)
    fireEvent.click(screen.getByLabelText(copy.gltfFormat))
    await waitFor(() =>
      expect(view.container.querySelector('input[name="gltfFiles"]') !== null).toBe(true),
    )
    await act(async () => {
      pending.resolve(new ArrayBuffer(0))
      await pending.promise
    })
    expect(screen.queryByLabelText(copy.principal) === null).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.objFormat))
    await screen.findByText(copy.intro)
    expect(screen.queryByLabelText(copy.principal) === null).toBe(true)
    choose(copy.choose, [localFile('triangle.obj', triangle)])
    await screen.findByLabelText(copy.principal)
    await prepare()
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByLabelText(copy.gltfFormat))
    await waitFor(() =>
      expect(view.container.querySelector('input[name="gltfFiles"]') !== null).toBe(true),
    )
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
    expect(editor.getState().asset).toBe(before)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
