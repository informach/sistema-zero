import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { transformPoint } from '../scene/matrix'
import { createSceneSkin } from '../scene/skinCommands'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { createDocumentEditorStore } from './editorStore'
import { createSceneSkinPaintGesture, type SceneSkinPaintPreview } from './sceneSkinPaintGesture'

function setup() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    asset = createSceneSkin(document, input, () => id),
    saved: MoldaSceneDocument[] = [],
    previews: Array<SceneSkinPaintPreview | null> = [],
    errors: unknown[] = [],
    editor = createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: {
        save: async (value) => {
          saved.push(value)
        },
      },
    }),
    gesture = createSceneSkinPaintGesture(
      editor,
      (preview) => previews.push(preview),
      (error) => errors.push(error),
    ),
    geometry = asset.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Malha esperada')
  const matrix = indexSceneDocument(asset).scene.worldMatrices.get(input.nodeId)!,
    sample = { faceId: 'f_0_0', point: transformPoint(matrix, geometry.vertices.v_0_0!) },
    begin = () => gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.25 })
  return {
    asset,
    saved,
    previews,
    errors,
    editor,
    gesture,
    sample,
    begin,
    dispose: () => {
      gesture.dispose()
      editor.getState().dispose()
    },
  }
}

test('detached previews never save or change history; confirmation creates one undo and redo with original binds intact', async () => {
  const context = setup(),
    { asset, editor, gesture, begin, sample, previews, saved, errors } = context
  try {
    expect(begin()).toBe(true)
    expect(Object.keys(previews[0]!).sort()).toEqual([
      'delta',
      'jointId',
      'nodeId',
      'source',
      'stats',
      'token',
    ])
    for (let i = 0; i < 20; i++) expect(gesture.sample(sample)).toBe(true)
    expect(previews[1]!.delta.get('v_0_0')).toBe(0.25)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
    expect(editor.getState().canUndo).toBe(false)
    await editor.getState().flush()
    expect(saved).toHaveLength(0)
    expect(gesture.end(true)).toBe(true)
    expect(previews.at(-1)).toBeNull()
    const next = editor.getState().asset
    expect(next.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.25)
    expect(next.skins![0]!.joints).toBe(asset.skins![0]!.joints)
    expect(editor.getState().contentRevision).toBe(1)
    await editor.getState().flush()
    expect(saved).toHaveLength(1)
    editor.getState().undo()
    expect(editor.getState().asset.skins).toEqual(asset.skins)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.skins).toEqual(next.skins)
    expect(errors).toEqual([])
  } finally {
    context.dispose()
  }
})

test('cancel, dispose, malformed input and external content revisions discard previews without restoring an old document', () => {
  const context = setup(),
    { editor, gesture, begin, sample, asset, errors } = context
  try {
    expect(begin()).toBe(true)
    gesture.sample(sample)
    gesture.cancel()
    expect(gesture.end(true)).toBe(false)
    expect(editor.getState().asset).toBe(asset)
    expect(begin()).toBe(true)
    gesture.sample(sample)
    editor.getState().commit({ ...asset, name: 'Nova revisão' })
    const external = editor.getState().asset
    expect(gesture.active()).toBe(false)
    expect(gesture.sample(sample)).toBe(false)
    expect(gesture.end(true)).toBe(false)
    expect(editor.getState().asset).toBe(external)
    expect(gesture.begin('skin', 'upper', { mode: 'add', radius: 1, strength: 0.5 }, 0)).toBe(false)
    expect(begin()).toBe(true)
    expect(gesture.sample({ faceId: 'missing', point: sample.point })).toBe(false)
    expect(errors).toHaveLength(1)
    expect(gesture.active()).toBe(false)
    expect(editor.getState().asset).toBe(external)
    expect(begin()).toBe(true)
    gesture.sample(sample)
    gesture.dispose()
    expect(begin()).toBe(false)
    expect(gesture.end(true)).toBe(false)
    expect(editor.getState().asset).toBe(external)
  } finally {
    context.dispose()
  }
})

test('thumbnail/save revisions are preserved on cancel and on commit, while a no-op stroke creates no history', () => {
  const context = setup(),
    { editor, gesture, begin, sample, asset } = context
  try {
    begin()
    gesture.sample(sample)
    editor.getState().setThumb('data:image/png;base64,cancel')
    gesture.cancel()
    expect(editor.getState().asset.thumb).toBe('data:image/png;base64,cancel')
    expect(editor.getState().asset.skins).toBe(asset.skins)
    expect(editor.getState().canUndo).toBe(false)
    begin()
    gesture.sample(sample)
    editor.getState().setThumb('data:image/png;base64,commit')
    expect(gesture.end(true)).toBe(true)
    expect(editor.getState().asset.thumb).toBe('data:image/png;base64,commit')
    editor.getState().undo()
    expect(gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0 })).toBe(true)
    gesture.sample(sample)
    expect(gesture.end(true)).toBe(true)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    context.dispose()
  }
})

test('a consumer changing the source during preview cannot commit the captured stroke afterward', () => {
  const context = setup(),
    { editor, asset, sample } = context
  const gesture = createSceneSkinPaintGesture(
    editor,
    (preview) => {
      if (preview?.delta.size) editor.getState().commit({ ...asset, name: 'Mudança externa' })
    },
    () => {},
  )
  try {
    expect(gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.5 })).toBe(true)
    expect(gesture.sample(sample)).toBe(false)
    expect(gesture.end(true)).toBe(false)
    expect(editor.getState().asset.name).toBe('Mudança externa')
    expect(editor.getState().asset.skins).toBe(asset.skins)
  } finally {
    gesture.dispose()
    context.dispose()
  }
})

test('disposing while a previous preview is being cleared cannot open a new stroke afterward', () => {
  const context = setup(),
    { editor } = context
  const gesture = createSceneSkinPaintGesture(
    editor,
    (preview) => {
      if (preview === null) gesture.dispose()
    },
    () => {},
  )
  try {
    expect(gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.5 })).toBe(true)
    expect(gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.5 })).toBe(false)
    expect(gesture.active()).toBe(false)
  } finally {
    gesture.dispose()
    context.dispose()
  }
})

for (const interrupted of ['begin', 'end'] as const)
  test(`a newer stroke opened while clearing ${interrupted} wins ownership without committing the old stroke`, () => {
    const context = setup(),
      { editor, sample } = context
    let reopen = false
    const gesture = createSceneSkinPaintGesture(
      editor,
      (preview) => {
        if (!preview && reopen) {
          reopen = false
          gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.75 })
        }
      },
      () => {},
    )
    try {
      gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.5 })
      gesture.sample(sample)
      reopen = true
      const accepted =
        interrupted === 'begin'
          ? gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.25 })
          : gesture.end(true)
      expect(accepted).toBe(false)
      expect(editor.getState().canUndo).toBe(false)
      expect(gesture.active()).toBe(true)
      gesture.sample(sample)
      expect(gesture.end(true)).toBe(true)
      expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.75)
    } finally {
      gesture.dispose()
      context.dispose()
    }
  })

for (const interrupted of ['begin', 'sample'] as const)
  test(`a preview consumer that opens a newer stroke and throws during ${interrupted} cannot cancel the newer owner`, () => {
    const context = setup(),
      { editor, sample } = context,
      errors: unknown[] = []
    let replace = interrupted === 'begin'
    const gesture = createSceneSkinPaintGesture(
      editor,
      (preview) => {
        if (preview && replace) {
          replace = false
          gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.75 })
          throw new Error('Falha da prévia anterior')
        }
      },
      (error) => errors.push(error),
    )
    try {
      const began = gesture.begin('skin', 'upper', { mode: 'add', radius: 0.1, strength: 0.25 })
      if (interrupted === 'sample') {
        expect(began).toBe(true)
        replace = true
        expect(gesture.sample(sample)).toBe(false)
      } else expect(began).toBe(false)
      expect(gesture.active()).toBe(true)
      expect(errors).toHaveLength(1)
      expect(gesture.sample(sample)).toBe(true)
      expect(gesture.end(true)).toBe(true)
      expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.75)
    } finally {
      gesture.dispose()
      context.dispose()
    }
  })
