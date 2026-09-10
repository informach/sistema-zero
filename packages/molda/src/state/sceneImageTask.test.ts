import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createSceneImageTask } from './sceneImageTask'

function setup() {
  const source = migrateLegacyModel(makeModel()).document
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const states: Array<{ busy: boolean; error?: unknown }> = []
  const task = createSceneImageTask(editor, (busy, error) => states.push({ busy, error }))
  return {
    source,
    editor,
    task,
    states,
    close() {
      task.cancel()
      editor.getState().dispose()
    },
  }
}
test.each([
  false,
  true,
])('async conversion has one undo, keeps other images and validates source/locks after thumbnail=%s', async (thumbnail) => {
  const f = setup()
  try {
    const image = f.source.images[0]!
    if (thumbnail) f.editor.getState().setThumb('photo')
    expect(await f.task.run(f.source, image.id, { kind: 'rgba' })).toBe(true)
    expect(f.editor.getState().asset.images[0]!.encoding).toBe('rgba')
    expect(f.editor.getState().asset.images[1]).toBe(f.source.images[1])
    expect(await f.task.run(f.source, image.id, { kind: 'rgba' })).toBe(false)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
    const locked = { ...f.source, nodes: f.source.nodes.map((node) => ({ ...node, locked: true })) }
    f.editor.getState().commit(locked)
    const before = f.editor.getState().asset
    expect(await f.task.run(before, image.id, { kind: 'rgba' })).toBe(false)
    expect(f.editor.getState().asset).toBe(before)
    expect(f.states.at(-1)?.error).toBeDefined()
  } finally {
    f.close()
  }
})
test('cancelled, superseded and externally invalidated results cannot create history or overwrite a revision', async () => {
  const f = setup()
  try {
    const id = f.source.images[0]!.id
    const first = f.task.run(f.source, id, { kind: 'rgba' })
    f.task.cancel()
    expect(await first).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    const second = f.task.run(f.source, id, { kind: 'rgba' })
    f.editor.getState().commit({ ...f.source, name: 'Nova revisão' })
    const external = f.editor.getState().asset
    expect(await second).toBe(false)
    expect(f.editor.getState().asset).toBe(external)
    const old = f.task.run(external, id, { kind: 'rgba' })
    const latest = f.task.run(external, id, { kind: 'rgba' })
    expect(await old).toBe(false)
    expect(await latest).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.images).toEqual(external.images)
  } finally {
    f.close()
  }
})

test('a no-op fill creates no undo and an oversized RGBA conversion is rejected before becoming busy', async () => {
  const f = setup()
  try {
    const image = f.source.images[0]!
    expect(
      await f.task.run(f.source, image.id, {
        kind: 'fill',
        layerId: image.layers[0]!.id,
        point: [0, 0],
        color: image.layers[0]!.pixels[0]!,
        tolerance: 0,
      }),
    ).toBe(true)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    const large = {
      ...image,
      width: 1024,
      height: 1024,
      layers: Array.from({ length: 8 }, (_, i) => ({
        ...image.layers[0]!,
        id: `layer-${i}`,
        pixels: new Uint8Array(1024 * 1024),
      })),
    }
    f.editor.getState().commit({ ...f.source, images: [large, ...f.source.images.slice(1)] })
    const before = f.editor.getState().asset
    f.states.length = 0
    expect(await f.task.run(before, image.id, { kind: 'rgba' })).toBe(false)
    expect(f.states.some((state) => state.busy)).toBe(false)
    expect(f.editor.getState().asset).toBe(before)
  } finally {
    f.close()
  }
})
