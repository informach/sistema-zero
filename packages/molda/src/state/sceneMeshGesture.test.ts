import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { convertSceneNodesToMesh, renameSceneNode, setSceneNodeFlag } from '../scene/commands'
import type { MoldaSceneDocument } from '../scene/document'
import { sceneToJson } from '../scene/documentJson'
import { extrudeMeshFaces } from '../scene/meshExtrude'
import { insetMeshFaces } from '../scene/meshInset'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument } from '../scene/readDocument'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createSceneMeshGesture } from './sceneMeshGesture'

function setup() {
  const source = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body'])
  const node = source.nodes.find((n) => n.id === 'body')!
  source.nodes.push({ ...node, id: 'shared' })
  const writes: MoldaSceneDocument[] = []
  const errors: unknown[] = []
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: {
      save: async (doc) => {
        writes.push(doc)
      },
    },
  })
  const gesture = createSceneMeshGesture(editor, (error) => errors.push(error))
  return { source, editor, gesture, writes, errors }
}

test('mesh previews replay stable topology IDs, isolate sharing and make exactly one undo', () => {
  const f = setup()
  try {
    expect(f.gesture.begin('body')).toBe(true)
    f.gesture.preview((mesh, allocate) => extrudeMeshFaces(mesh, ['px'], 1, allocate))
    const first = f.editor.getState().asset
    f.gesture.preview((mesh, allocate) => extrudeMeshFaces(mesh, ['px'], 2, allocate))
    const second = f.editor.getState().asset
    expect(second.nodes).toEqual(first.nodes)
    expect(second.geometries.map((g) => g.id)).toEqual(first.geometries.map((g) => g.id))
    const a = first.geometries.at(-1)!
    const b = second.geometries.at(-1)!
    if (a.kind !== 'mesh' || b.kind !== 'mesh') throw new Error('Missing mesh')
    expect(Object.keys(a.faces)).toEqual(Object.keys(b.faces))
    expect(Object.keys(a.vertices)).toEqual(Object.keys(b.vertices))
    expect(b.vertices).not.toEqual(a.vertices)
    expect(second.geometries[0]).toBe(f.source.geometries[0])
    expect(readSceneDocument(sceneToJson(second)).status).toBe('valid')
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.gesture.end(true)).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    f.editor.getState().redo()
    expect(f.editor.getState().asset.geometries).toEqual(second.geometries)
  } finally {
    f.editor.getState().dispose()
  }
})

test('cancel compensates persisted previews and refuses late edits to unrelated revisions or locks', async () => {
  const f = setup()
  try {
    f.gesture.begin('body')
    f.gesture.preview((mesh, allocate) => insetMeshFaces(mesh, ['px'], 0.3, allocate))
    await f.editor.getState().flush()
    f.gesture.cancel()
    await f.editor.getState().flush()
    expect(f.writes).toHaveLength(2)
    expect(f.writes[1]!.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    f.gesture.begin('body')
    f.editor.getState().commit(renameSceneNode(f.editor.getState().asset, 'wing', 'Outra mudança'))
    const latest = f.editor.getState().asset
    expect(
      f.gesture.preview(() => {
        throw new Error('Must not execute after revision change')
      }),
    ).toBe(false)
    expect(f.gesture.end(true)).toBe(false)
    expect(f.editor.getState().asset).toBe(latest)
    expect(f.errors).toHaveLength(1)
    f.editor.getState().commit(setSceneNodeFlag(latest, ['body'], 'locked', true))
    expect(f.gesture.begin('body')).toBe(false)
    expect(f.errors).toHaveLength(2)
  } finally {
    f.editor.getState().dispose()
  }
})

test('zero and invalid previews cannot leak geometry copies, history entries or partial changes', () => {
  const f = setup()
  try {
    f.gesture.begin('body')
    f.gesture.preview((mesh, allocate) => extrudeMeshFaces(mesh, ['px'], 0, allocate))
    f.gesture.end(true)
    expect(f.editor.getState().canUndo).toBe(false)
    f.gesture.begin('body')
    f.gesture.preview((mesh, allocate) => extrudeMeshFaces(mesh, ['px'], 1, allocate))
    expect(
      f.gesture.preview((mesh, allocate) => extrudeMeshFaces(mesh, ['px'], Infinity, allocate)),
    ).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.gesture.end(true)).toBe(false)
    expect(f.errors).toHaveLength(1)
  } finally {
    f.editor.getState().dispose()
  }
})

test('live ownership distinguishes own previews from nested external commits without adding phantom undo', () => {
  const f = setup()
  let nested = false
  const ownership: boolean[] = []
  const off = f.editor.subscribe((state, previous) => {
    if (state.contentRevision === previous.contentRevision) return
    ownership.push(f.gesture.isCurrent())
    if (!nested) {
      nested = true
      f.editor.getState().commit({ ...state.asset, name: 'Edição externa aninhada' })
    } else f.gesture.cancel()
  })
  try {
    expect(f.gesture.begin('body')).toBe(true)
    expect(f.gesture.preview((mesh, allocate) => insetMeshFaces(mesh, ['px'], 0.2, allocate))).toBe(
      false,
    )
    expect(ownership).toEqual([true, false])
    expect(f.gesture.isCurrent()).toBe(false)
    const latest = f.editor.getState().asset
    expect(latest.name).toBe('Edição externa aninhada')
    off()
    expect(f.gesture.begin('body')).toBe(true)
    f.gesture.cancel()
    expect(f.editor.getState().asset).toBe(latest)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    off()
    f.editor.getState().dispose()
  }
})

test('an old mesh publication cannot clear a replacement gesture started by a subscriber', () => {
  const f = setup()
  let replaced = false
  const off = f.editor.subscribe((state, previous) => {
    if (state.contentRevision === previous.contentRevision || replaced) return
    replaced = true
    expect(f.gesture.begin('body')).toBe(true)
  })
  try {
    f.gesture.begin('body')
    expect(f.gesture.preview((mesh, allocate) => insetMeshFaces(mesh, ['px'], 0.2, allocate))).toBe(
      false,
    )
    expect(f.gesture.isCurrent()).toBe(true)
    expect(f.gesture.preview((mesh, allocate) => insetMeshFaces(mesh, ['px'], 0.4, allocate))).toBe(
      true,
    )
    expect(f.gesture.end(true)).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    off()
    f.editor.getState().dispose()
  }
})
