import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import {
  BBMODEL_CLIP_PROBLEM_COPY,
  BBMODEL_ANIMATION_IMPORT_COPY as movement,
} from '../../../core/bbmodelAnimationImportCopy'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { BBMODEL_IMPORT_ISSUE_COPY } from '../../../core/bbmodelImportIssueCopy'
import { COPY } from '../../../core/copy'
import {
  bbmodelAnimatedSource,
  BBMODEL_ANIMATED_TARGET as target,
} from '../../../testing/bbmodelAnimatedImportFixture'
import { bbmodelImportFixture, bbmodelText } from '../../../testing/bbmodelImportFixture'
import { bbmodelPaintSource } from '../../../testing/bbmodelPaintImportFixture'
import {
  sceneImportEditor,
  sceneImportFile,
  sceneImportRenderer,
} from '../../../testing/sceneImportFixtures'
import { SceneBbmodelImportPanel } from './SceneBbmodelImportPanel'
import { SceneImportPanel } from './SceneImportPanel'
import { SceneWorkshop } from './SceneWorkshop'

const triangle = {
  meta: { format_version: '5.0', model_format: 'free' },
  elements: [
    {
      uuid: 'triangle',
      type: 'mesh',
      name: 'Triângulo',
      vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
      faces: {
        face: {
          vertices: ['a', 'b', 'c'],
          texture: false,
          uv: { a: [0, 0], b: [1, 0], c: [0, 1] },
        },
      },
    },
  ],
  outliner: ['triangle'],
}
function choose(label: string, files: File[]) {
  fireEvent.change(screen.getByLabelText(label), { target: { files } })
}
async function prepare() {
  fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
  await screen.findByText(copy.ready)
}
function select(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
  expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(value)
}

test('bbmodel UI reviews editable paint layers, revokes acceptance on choice change, and adopts with one undo', async () => {
  const editor = sceneImportEditor(),
    before = editor.getState().asset,
    { factory, ports } = sceneImportRenderer()
  let adopted = 0
  const view = render(
    <StrictMode>
      <SceneBbmodelImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {
          adopted++
        }}
      />
    </StrictMode>,
  )
  try {
    choose(copy.choose, [sceneImportFile('paint.bbmodel', bbmodelPaintSource())])
    await screen.findByLabelText(copy.layers)
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    expect((await screen.findByRole('alert')).textContent).toContain('camadas')
    expect(editor.getState().asset).toBe(before)
    select(copy.layers, 'molda-layers')
    await prepare()
    const review = screen.getByRole('region', { name: copy.paintReview })
    fireEvent.click(within(review).getByText('Minha pintura · 3 camadas', { selector: 'summary' }))
    expect(within(review).getAllByRole('listitem')).toHaveLength(3)
    expect(within(review).getByText('Escondida').closest('li')?.textContent).toContain(
      'oculta · 0%',
    )
    expect(within(review).getByText(copy.paintSizeChanged)).toBeDefined()
    expect(
      screen.getByText(BBMODEL_IMPORT_ISSUE_COPY['paint-layers-adapted'], { exact: false }),
    ).toBeDefined()
    fireEvent.click(screen.getByLabelText(copy.accept))
    select(copy.layers, 'reject')
    expect(screen.queryByRole('button', { name: copy.confirm })).toBeNull()
    select(copy.layers, 'molda-layers')
    await prepare()
    const confirm = screen.getByRole('button', { name: copy.confirm })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(confirm)
    const imported = editor.getState().asset
    expect(imported.images[0]!.layers).toHaveLength(3)
    expect(imported.images[0]!.layers[2]!.visible).toBe(false)
    expect(adopted).toBe(1)
    act(() => editor.getState().undo())
    expect(editor.getState().asset.images).toEqual(before.images)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    expect(editor.getState().asset.images).toEqual(imported.images)
  } finally {
    view.unmount()
    editor.getState().dispose()
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  }
})

test('bbmodel UI imports animated clips with reasons, playback, complete download, fresh review and one undo', async () => {
  const source = bbmodelAnimatedSource(),
    clip = source.animations[0],
    editor = sceneImportEditor(),
    before = editor.getState().asset,
    { factory, ports } = sceneImportRenderer(),
    blobs: Blob[] = []
  if (!clip) throw new Error('Source clip expected')
  const file = sceneImportFile('moving.bbmodel', {
      ...source,
      animations: [
        clip,
        {
          ...clip,
          uuid: 'global',
          animators: { [target]: { ...clip.animators[target], rotation_global: true } },
        },
      ],
    }),
    url = spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      if (!(blob instanceof Blob)) throw new Error('Report blob expected')
      blobs.push(blob)
      return 'blob:animation-report'
    }),
    anchor = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  let adopted = 0
  const view = render(
    <StrictMode>
      <SceneBbmodelImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {
          adopted++
        }}
      />
    </StrictMode>,
  )
  try {
    choose(copy.choose, [file])
    await screen.findByLabelText(copy.principal)
    select(copy.animations, 'convert')
    fireEvent.click(screen.getByText(movement.settings, { selector: 'summary' }))
    expect(screen.getByText(movement.fpsHint).textContent).toBe(movement.fpsHint)
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      BBMODEL_CLIP_PROBLEM_COPY['animator-mode'],
    )
    expect(editor.getState().asset).toBe(before)
    expect(screen.queryByRole('button', { name: copy.confirm })).toBeNull()
    select(movement.unresolved, 'omit-clip')
    await prepare()
    expect(screen.getByText(movement.summary(1, 1)).textContent).toBe(movement.summary(1, 1))
    expect(screen.getByText(BBMODEL_CLIP_PROBLEM_COPY['animator-mode'])).toBeDefined()
    expect(editor.getState().asset).toBe(before)
    const preview = screen.getByRole('region', { name: copy.preview }),
      port = ports.at(-1)
    if (!port) throw new Error('Preview port expected')
    fireEvent.change(within(preview).getByLabelText(copy.clip), {
      target: { value: 'bbmodel_clip_0' },
    })
    fireEvent.change(within(preview).getByRole('slider'), { target: { value: '0.5' } })
    expect(port.poses.at(-1)?.time).toBe(0.5)
    fireEvent.click(within(preview).getByRole('button', { name: copy.play }))
    expect(within(preview).getByRole('button', { name: copy.pause })).toBeDefined()
    fireEvent.click(within(preview).getByRole('button', { name: copy.pause }))
    fireEvent.click(screen.getByRole('button', { name: copy.downloadReport }))
    const blob = blobs.at(-1)
    if (!blob) throw new Error('Downloaded report expected')
    const downloaded: unknown = JSON.parse(await blob.text())
    expect(downloaded).toMatchObject({
      animations: {
        counts: { clips: 1, tracks: 2 },
        source: [{ kind: 'prepared' }, { kind: 'omitted', problem: { code: 'animator-mode' } }],
        bounds: [{ clipId: 'bbmodel_clip_0' }],
      },
    })
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.change(screen.getByLabelText(movement.fps), { target: { value: '12' } })
    expect(screen.queryByRole('button', { name: copy.confirm })).toBeNull()
    expect(port.disposed).toBe(1)
    await prepare()
    const confirm = screen.getByRole('button', { name: copy.confirm })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(confirm)
    const imported = editor.getState().asset
    expect(imported.animations?.[0]?.fps).toBe(12)
    expect(imported.animations).toHaveLength(1)
    expect(adopted).toBe(1)
    act(() => editor.getState().undo())
    const { updatedAt, ...undoneContent } = editor.getState().asset,
      { updatedAt: beforeUpdatedAt, ...beforeContent } = before
    expect(undoneContent).toEqual(beforeContent)
    expect(updatedAt).toBeGreaterThanOrEqual(beforeUpdatedAt)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    expect(editor.getState().asset.animations).toEqual(imported.animations)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  }
})
test('workshop lazy bbmodel import reviews without editing, confirms once, restores focus and undoes/redoes replacement', async () => {
  const editor = sceneImportEditor(),
    before = editor.getState().asset,
    { factory, ports } = sceneImportRenderer(),
    view = render(
      <StrictMode>
        <SceneWorkshop editor={editor} viewportFactory={factory} />
      </StrictMode>,
    )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByLabelText(copy.bbmodelFormat))
    await screen.findByText(copy.intro)
    expect(screen.getByText(copy.limitsHint).textContent).toBe(copy.limitsHint)
    choose(copy.choose, [sceneImportFile('triangle.bbmodel', triangle)])
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
test('bbmodel UI exposes every codec policy and missing companion flow; any change revokes the previous review', async () => {
  const editor = sceneImportEditor(),
    before = editor.getState().asset,
    { factory, ports } = sceneImportRenderer(),
    input = bbmodelImportFixture()
  let adopted = 0
  const view = render(
    <SceneBbmodelImportPanel
      editor={editor}
      viewportFactory={factory}
      onClose={() => {}}
      onImported={() => {
        adopted++
      }}
    />,
  )
  try {
    expect(screen.getByLabelText(copy.folder).hasAttribute('webkitdirectory')).toBe(true)
    choose(copy.folder, [sceneImportFile(input.entryPath, input.bytes, true)])
    await screen.findByLabelText(copy.principal)
    // Every omission starts rejected; unknown fields and animations are not silently discarded.
    expect((screen.getByLabelText(copy.unmapped) as HTMLSelectElement).value).toBe('reject')
    expect((screen.getByLabelText(copy.animations) as HTMLSelectElement).value).toBe('reject')
    fireEvent.click(screen.getByText(copy.geometry, { selector: 'summary' }))
    fireEvent.click(screen.getByText(copy.omitted, { selector: 'summary' }))
    for (const [label, value] of [
      [copy.sourcePreference, 'prefer-files'],
      [copy.normals, 'molda-flat'],
      [copy.lighting, 'molda-standard'],
      [copy.untextured, 'uniform'],
      [copy.autoSides, 'double'],
      [copy.quads, 'editable-quads'],
      [copy.nonPositiveCubes, 'preserve'],
      [copy.missingUvs, 'zero'],
      [copy.groupFlags, 'inherit'],
      [copy.outsideUvs, 'clamp'],
      [copy.repeatWrap, 'clamp'],
      [copy.rgba16, 'round-to-rgba8'],
      [copy.unlisted, 'omit'],
      [copy.unsupportedNodes, 'omit-subtree'],
      [copy.unsupportedFaces, 'omit'],
      [copy.renderOrder, 'discard'],
      [copy.seamLabels, 'discard'],
      [copy.cubeShade, 'discard'],
      [copy.renderModes, 'standard'],
      [copy.pbrGroups, 'texture-only'],
      [copy.exportFlags, 'discard'],
      [copy.unmapped, 'discard'],
      [copy.animations, 'omit'],
    ])
      select(label!, value!)
    // Restore original triangulation after proving the alternate is selectable.
    select(copy.quads, 'source-triangles')
    fireEvent.change(screen.getByLabelText(copy.color), { target: { value: '#336699' } })
    fireEvent.change(screen.getByLabelText(copy.alpha), { target: { value: '50' } })
    fireEvent.click(screen.getByLabelText(copy.doubleSided))
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    const missing = await screen.findByRole('region', { name: copy.missing })
    expect(
      within(missing)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['paint.png'])
    choose(
      copy.companions,
      input.files.map((file) => sceneImportFile(file.path, file.bytes, true)),
    )
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: copy.missing }) === null).toBe(true),
    )
    await prepare()
    const report = screen.getByRole('region', { name: copy.changes })
    expect(
      within(report).getByText(BBMODEL_IMPORT_ISSUE_COPY['animations-omitted']).textContent,
    ).toContain(BBMODEL_IMPORT_ISSUE_COPY['animations-omitted'])
    // Parsed/ready and renderer delivery are separate effects. Await the document,
    // not merely the earlier status text, before asserting material contents.
    await waitFor(() => expect(ports.at(-1)?.documents.length).toBe(1))
    const preview = ports.at(-1)!.documents.at(-1)!,
      material = preview.materials.find((material) => material.id === 'bbmodel_node_material_0')!
    expect(material.doubleSided).toBe(false)
    if (material.baseColor.kind !== 'rgba') throw new Error('RGBA expected')
    expect(material.baseColor.value[0]).toBeCloseTo(0.033104766570885055, 14)
    expect(material.baseColor.value[1]).toBeCloseTo(0.13286832155381798, 14)
    expect(material.baseColor.value[2]).toBeCloseTo(0.31854677812509186, 14)
    expect(material.baseColor.value[3]).toBe(0.5)
    expect(editor.getState().asset).toBe(before)
    fireEvent.click(screen.getByLabelText(copy.accept))
    select(copy.sourcePreference, 'prefer-embedded')
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    expect(adopted).toBe(0)
    await prepare()
    expect((screen.getByLabelText(copy.accept) as HTMLInputElement).checked).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
test('bbmodel original bytes and full bounded report download while source text stays inert', async () => {
  const editor = sceneImportEditor(),
    { factory } = sceneImportRenderer(),
    model = {
      ...triangle,
      ...Object.fromEntries(
        Array.from({ length: 65 }, (_, i) => [`<script>field${i}</script>`, null]),
      ),
    },
    bytes = bbmodelText(model),
    source = sceneImportFile('literal<script>.bbmodel', bytes),
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
      <SceneBbmodelImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {}}
      />,
    )
  try {
    choose(copy.choose, [source])
    await screen.findByLabelText(copy.principal)
    select(copy.unmapped, 'discard')
    await prepare()
    const report = screen.getByRole('region', { name: copy.changes })
    expect(report.querySelectorAll('ol > li')).toHaveLength(50)
    expect(view.container.querySelector('script') === null).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: copy.downloadReport }))
    fireEvent.click(
      screen.getByRole('button', {
        name: copy.downloadOriginal('literal<script>.bbmodel'),
        hidden: true,
      }),
    )
    expect(names).toEqual(['molda-relatorio-Blockbench.json', 'literal<script>.bbmodel'])
    const downloaded = JSON.parse(await blobs[0]!.text())
    expect(
      downloaded.issues.filter((issue: { stage: string }) => issue.stage === 'remainder'),
    ).toHaveLength(65)
    expect(downloaded.review).toBe('required')
    expect(new Uint8Array(await blobs[1]!.arrayBuffer())).toEqual(bytes)
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})
test('bbmodel format changes discard pending file IO and accepted reviews without editing the current creation', async () => {
  const editor = sceneImportEditor(),
    before = editor.getState().asset,
    { factory, ports } = sceneImportRenderer(),
    view = render(
      <SceneImportPanel
        editor={editor}
        viewportFactory={factory}
        onClose={() => {}}
        onImported={() => {}}
      />,
    )
  try {
    fireEvent.click(screen.getByLabelText(copy.bbmodelFormat))
    await screen.findByText(copy.intro)
    const pending = Promise.withResolvers<ArrayBuffer>(),
      file = sceneImportFile('slow.bbmodel', new Uint8Array())
    Object.defineProperty(file, 'arrayBuffer', { value: () => pending.promise })
    choose(copy.choose, [file])
    await screen.findByText(copy.readingFiles)
    fireEvent.click(screen.getByLabelText(copy.objFormat))
    await waitFor(() =>
      expect(view.container.querySelector('input[name="objFiles"]') !== null).toBe(true),
    )
    await act(async () => {
      pending.resolve(new ArrayBuffer(0))
      await pending.promise
    })
    expect(screen.queryByLabelText(copy.principal) === null).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.bbmodelFormat))
    await screen.findByText(copy.intro)
    expect(screen.queryByLabelText(copy.principal) === null).toBe(true)
    choose(copy.choose, [sceneImportFile('triangle.bbmodel', triangle)])
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
test('bbmodel UI errors keep originals and retry choices; current pose and external edits block adoption', async () => {
  const editor = sceneImportEditor(),
    { factory } = sceneImportRenderer()
  let allowed = false,
    imported = 0
  const view = render(
    <SceneBbmodelImportPanel
      editor={editor}
      viewportFactory={factory}
      canAdopt={() => allowed}
      blocked
      onClose={() => {}}
      onImported={() => {
        imported++
      }}
    />,
  )
  try {
    choose(copy.choose, [sceneImportFile('invalid.bbmodel', new Uint8Array())])
    await screen.findByLabelText(copy.principal)
    fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
    await screen.findByRole('alert')
    expect(editor.getState().contentRevision).toBe(0)
    expect(
      screen.getByRole('button', {
        name: copy.downloadOriginal('invalid.bbmodel'),
        hidden: true,
      }) !== null,
    ).toBe(true)
    choose(copy.choose, [sceneImportFile('valid.bbmodel', triangle)])
    await screen.findByLabelText(copy.principal)
    await prepare()
    fireEvent.click(screen.getByLabelText(copy.accept))
    expect((screen.getByRole('button', { name: copy.confirm }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(screen.getByText(copy.pendingPose).textContent).toBe(copy.pendingPose)
    allowed = true
    view.rerender(
      <SceneBbmodelImportPanel
        editor={editor}
        viewportFactory={factory}
        canAdopt={() => allowed}
        onClose={() => {}}
        onImported={() => {
          imported++
        }}
      />,
    )
    act(() => editor.getState().commit({ ...editor.getState().asset, name: 'Outra revisão' }))
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    expect(imported).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
