import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { identityMatrix } from '../scene/matrix'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { SceneValidationError } from '../scene/validation'
import { animatedScene, sceneAnimationClip } from '../testing/sceneAnimation'
import { createDocumentEditorStore } from './editorStore'
import { SceneAnimationPlayer } from './SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from './SceneAnimationPoseGesture'

function setup() {
  const source = animatedScene(),
    saves: MoldaSceneDocument[] = []
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: source,
    sizeOf: structuredBytes,
    persistence: {
      save: async (asset) => {
        saves.push(asset)
      },
    },
    autosaveMs: 60_000,
  })
  const player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel: () => {} })
  player.setClip(source, 'clip')
  const gesture = new SceneAnimationPoseGesture(editor, player)
  const disconnect = gesture.connect()
  return {
    source,
    editor,
    player,
    gesture,
    saves,
    disconnect,
    close() {
      disconnect()
      player.setClip(null, null)
      editor.getState().dispose()
    },
  }
}
function move(x: number) {
  const matrix = identityMatrix()
  matrix[12] = x
  return matrix
}

test('thumbnail metadata preserves a pending pose through saving and recording', async () => {
  const f = setup()
  try {
    expect(f.gesture.begin(['body'])).toBe(true)
    expect(f.gesture.preview(move(2))).toBe(true)
    f.gesture.end(true)
    const pose = f.gesture.getSnapshot().pose!
    f.editor.getState().setThumb('data:image/png;base64,thumb')
    await f.editor.getState().flush()
    expect(f.gesture.getSnapshot().pending).toBe(true)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(f.gesture.record()).toBe(true)
    expect(
      prepareSceneAnimation(f.editor.getState().asset, 'clip').sample(0, false).worldMatrices,
    ).toEqual(pose.worldMatrices)
    expect(f.editor.getState().asset.thumb).toBe('data:image/png;base64,thumb')
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('120 pose previews do not write, replace or autosave; explicit recording creates one undo and matches the preview exactly', async () => {
  const f = setup()
  try {
    expect(f.gesture.getSnapshot().autoKey).toBe(false)
    expect(f.gesture.begin(['body'])).toBe(true)
    for (let i = 1; i <= 120; i++) expect(f.gesture.preview(move(i / 100))).toBe(true)
    f.gesture.end(true)
    const pose = f.gesture.getSnapshot().pose!
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().contentRevision).toBe(0)
    expect(f.editor.getState().canUndo).toBe(false)
    await f.editor.getState().flush()
    expect(f.saves).toEqual([])
    expect(f.gesture.record()).toBe(true)
    expect(f.editor.getState().contentRevision).toBe(1)
    expect(f.gesture.getSnapshot().pose).toBeNull()
    const after = f.editor.getState().asset
    expect(after.nodes).toBe(f.source.nodes)
    expect(after.geometries).toBe(f.source.geometries)
    expect(prepareSceneAnimation(after, 'clip').sample(0, false).worldMatrices).toEqual(
      pose.worldMatrices,
    )
    expect(f.gesture.record()).toBe(false)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
    f.editor.getState().redo()
    expect(f.editor.getState().asset.animations).toEqual(after.animations)
  } finally {
    f.close()
  }
})

test('canceling just the latest drag restores an earlier pending pose; whole cancellation and no-op drags add no history', () => {
  const f = setup()
  try {
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    f.gesture.end(true)
    const pending = f.gesture.getSnapshot().pose
    f.gesture.setAutoKey(true)
    expect(f.gesture.getSnapshot().autoKey).toBe(false)
    f.gesture.begin(['body'])
    f.gesture.preview(move(3))
    f.gesture.end(false)
    expect(f.gesture.getSnapshot().pose).toBe(pending)
    expect(f.gesture.getSnapshot().pending).toBe(true)
    f.gesture.cancel()
    expect(f.gesture.getSnapshot().pose).toBeNull()
    f.gesture.setAutoKey(true)
    f.gesture.begin(['body'])
    f.gesture.preview(identityMatrix())
    f.gesture.end(true)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('opt-in automatic recording happens only on a successful pointer end, never on late callbacks or interruption', () => {
  const f = setup()
  try {
    f.gesture.setAutoKey(true)
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.gesture.record()).toBe(false)
    f.gesture.end(true)
    expect(f.editor.getState().contentRevision).toBe(1)
    f.gesture.end(true)
    expect(f.gesture.preview(move(5))).toBe(false)
    expect(f.editor.getState().contentRevision).toBe(1)
    f.player.setClip(f.editor.getState().asset, 'clip')
    f.gesture.begin(['body'])
    f.gesture.preview(move(3))
    f.gesture.end(false)
    expect(f.editor.getState().contentRevision).toBe(1)
    expect(f.gesture.getSnapshot().pose).toBeNull()
    f.gesture.begin(['body'])
    f.gesture.preview(move(3))
    f.gesture.end(true)
    expect(f.editor.getState().contentRevision).toBe(2)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations![0]!.tracks[0]!.keys[0]!.value).toEqual([2, 0, 0])
  } finally {
    f.close()
  }
})

test.each([
  'seek',
  'play',
  'preview',
  'clip',
  'revision',
  'error',
  'disconnect',
] as const)('%s invalidates an outstanding draft and prevents late automatic writes', (kind) => {
  const f = setup()
  try {
    f.gesture.setAutoKey(true)
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    if (kind === 'seek') f.player.seek(0.5)
    if (kind === 'play') f.player.play()
    if (kind === 'preview') f.player.setPreview(f.source, { ...sceneAnimationClip(), id: 'draft' })
    if (kind === 'clip') f.player.setClip(null, null)
    if (kind === 'revision') f.editor.getState().replace({ ...f.source, name: 'Nova revisão' })
    if (kind === 'error') f.player.reportError(new Error('Render failed'))
    if (kind === 'disconnect') f.disconnect()
    const current = f.editor.getState().asset
    expect(f.gesture.getSnapshot().pose).toBeNull()
    expect(f.gesture.preview(move(4))).toBe(false)
    f.gesture.end(true)
    expect(f.gesture.record()).toBe(false)
    expect(f.editor.getState().asset).toBe(current)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('changing selection begins from the new piece; invalid selection/preview/render error refuse edits; remount is usable', () => {
  const f = setup()
  try {
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    f.gesture.end(true)
    expect(f.gesture.begin(['wing'])).toBe(true)
    expect(f.gesture.getSnapshot().pending).toBe(false)
    f.gesture.preview(move(3))
    f.gesture.end(true)
    expect(f.gesture.record()).toBe(true)
    expect(f.editor.getState().asset.animations![0]!.tracks[0]).toBe(
      f.source.animations[0]!.tracks[0],
    )
    f.player.setClip(f.editor.getState().asset, 'clip')
    expect(f.gesture.begin(['missing'])).toBe(false)
    expect(f.gesture.getSnapshot().error).not.toBeNull()
    f.player.setPreview(f.editor.getState().asset, { ...sceneAnimationClip(), id: 'draft' })
    expect(f.gesture.begin(['body'])).toBe(false)
    f.player.cancelPreview()
    f.disconnect()
    const off = f.gesture.connect()
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    f.gesture.reportError(new SceneValidationError('pose', 'Fora da precisão de desenho.'))
    expect(f.gesture.getSnapshot().error).toBe('Fora da precisão de desenho.')
    expect(f.gesture.record()).toBe(false)
    off()
  } finally {
    f.close()
  }
})

test('reentrant subscribers cannot record a stale source while a preview is removed or continue a canceled drag', () => {
  const f = setup()
  try {
    f.gesture.begin(['body'])
    f.gesture.preview(move(2))
    f.gesture.end(true)
    const off = f.gesture.subscribe(() => {
      if (!f.gesture.getSnapshot().pose) f.player.seek(1)
    })
    expect(f.gesture.record()).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    off()
    f.gesture.cancel()
    const next = f.gesture.subscribe(() => {
      if (f.gesture.getSnapshot().dragging) f.gesture.cancel()
    })
    expect(f.gesture.begin(['body'])).toBe(false)
    expect(f.gesture.preview(move(2))).toBe(false)
    next()
  } finally {
    f.close()
  }
})
