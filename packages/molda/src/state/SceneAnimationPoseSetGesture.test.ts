import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { captureSceneAnimationPoseSet } from '../scene/animationPoseSet'
import type { MoldaSceneDocument } from '../scene/document'
import { type AffineMatrix, identityMatrix } from '../scene/matrix'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { createDocumentEditorStore } from './editorStore'
import { SceneAnimationPlayer } from './SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from './SceneAnimationPoseGesture'

function setup() {
  const source = makeSceneTwoBoneFixture(),
    saves: MoldaSceneDocument[] = []
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: {
      save: async (asset) => {
        saves.push(asset)
      },
    },
    autosaveMs: 60_000,
  })
  const player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel() {} })
  const gesture = new SceneAnimationPoseGesture(editor, player)
  player.setClip(source, 'clip')
  player.seek(0.7)
  const disconnect = gesture.connect()
  const copied = captureSceneAnimationPoseSet(source, 'clip', ['root', 'middle'], 0)
  copied.entries[0]!.pose.translation = [0.25, 0.5, 0]
  copied.entries[1]!.pose.rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2]
  const pairs = copied.entries.map((entry) => ({ sourceId: entry.nodeId, targetId: entry.nodeId }))
  return {
    source,
    saves,
    editor,
    player,
    gesture,
    copied,
    pairs,
    disconnect,
    start: () => gesture.beginPoseSet(copied, pairs, 'x')!,
    close() {
      disconnect()
      player.setClip(null, null)
      editor.getState().dispose()
    },
  }
}

test('mapped poses preview in the original source without autokey, own their candidate, and record once with exact playback', async () => {
  const f = setup()
  try {
    f.gesture.setAutoKey(true)
    const input = f.start(),
      pose = f.gesture.getSnapshot().pose!
    expect(input.isCurrent()).toBe(true)
    expect(f.gesture.getSnapshot().kind).toBe('pose-set')
    expect(pose.source).toBe(f.source)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.gesture.transformActions(['root']).begin()).toBe(false)
    expect(f.gesture.preview(identityMatrix())).toBe(false)
    f.gesture.end(true)
    await f.editor.getState().flush()
    expect(f.saves).toEqual([])
    f.copied.entries[0]!.pose.translation.fill(999)
    f.pairs[0]!.targetId = 'tip'
    const world = new Map(
      [...pose.worldMatrices].map(([id, matrix]): [string, AffineMatrix] => [id, [...matrix]]),
    )
    // Drawing metadata never becomes the commit source.
    ;(pose.worldMatrices.get('root') as AffineMatrix).fill(999)
    expect(input.record()).toBe(true)
    expect(input.record()).toBe(false)
    expect(f.gesture.getSnapshot().kind).toBeNull()
    expect(
      prepareSceneAnimation(f.editor.getState().asset, 'clip').sample(0.7, false).worldMatrices,
    ).toEqual(world)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test.each([
  'seek',
  'play',
  'clip',
  'preview',
  'revision',
  'error',
  'disconnect',
  'cancel',
] as const)('%s revokes a mapped candidate and stale callbacks cannot touch its replacement', (reason) => {
  const f = setup()
  try {
    const input = f.start()
    switch (reason) {
      case 'seek':
        f.player.seek(0.8)
        break
      case 'play':
        f.player.play()
        break
      case 'clip':
        f.player.setClip(null, null)
        break
      case 'preview':
        f.player.setPreview(f.source, { ...f.source.animations![0]!, id: 'preview' })
        break
      case 'revision':
        f.editor.getState().commit({ ...f.source, name: 'Mudou' })
        break
      case 'error':
        f.player.reportError(new Error('render'))
        break
      case 'disconnect':
        f.disconnect()
        break
      case 'cancel':
        f.gesture.cancel()
        break
    }
    expect(input.isCurrent()).toBe(false)
    expect(input.record()).toBe(false)
    input.cancel()
    f.player.setClip(f.editor.getState().asset, 'clip')
    f.player.seek(0.7)
    const replacement = f.start(),
      snapshot = f.gesture.getSnapshot()
    input.cancel()
    expect(input.record()).toBe(false)
    expect(f.gesture.getSnapshot()).toBe(snapshot)
    expect(replacement.isCurrent()).toBe(true)
  } finally {
    f.close()
  }
})

test('invalid maps are visible without writes, no-op candidates remain cancelable and direct posing resumes', () => {
  const f = setup()
  try {
    expect(f.gesture.beginPoseSet(f.copied, [])).toBeNull()
    expect(f.gesture.getSnapshot().error).toContain('destino')
    expect(f.gesture.getSnapshot().kind).toBeNull()
    const input = f.start()
    expect(input.record()).toBe(true)
    f.player.setClip(f.editor.getState().asset, 'clip')
    f.player.seek(0.7)
    const same = f.start()
    expect(f.gesture.getSnapshot().pending).toBe(false)
    expect(same.record()).toBe(false)
    same.cancel()
    expect(f.gesture.begin(['root'])).toBe(true)
    expect(f.gesture.getSnapshot().kind).toBe('transform')
  } finally {
    f.close()
  }
})

test('reentrant cancellation of publication or replacement during recording never returns or commits an obsolete candidate', () => {
  const f = setup()
  try {
    let armed = true
    const off = f.gesture.subscribe(() => {
      if (armed && f.gesture.getSnapshot().kind === 'pose-set') {
        armed = false
        f.gesture.cancel()
      }
    })
    expect(f.gesture.beginPoseSet(f.copied, f.pairs)).toBeNull()
    off()
    const input = f.start()
    armed = true
    const offReplacement = f.gesture.subscribe(() => {
      if (armed && f.gesture.getSnapshot().kind === null) {
        armed = false
        f.start()
      }
    })
    expect(input.record()).toBe(false)
    offReplacement()
    expect(f.gesture.getSnapshot().kind).toBe('pose-set')
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('thumbnail metadata keeps the assisted candidate recordable with one undo', async () => {
  const f = setup()
  try {
    const input = f.start()

    const pose = f.gesture.getSnapshot().pose!
    f.editor.getState().setThumb('latest')
    await f.editor.getState().flush()
    expect(input.isCurrent()).toBe(true)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(input.record()).toBe(true)
    expect(f.editor.getState().asset.thumb).toBe('latest')
    expect(
      prepareSceneAnimation(f.editor.getState().asset, 'clip').sample(0.7, false).worldMatrices,
    ).toEqual(pose.worldMatrices)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})
