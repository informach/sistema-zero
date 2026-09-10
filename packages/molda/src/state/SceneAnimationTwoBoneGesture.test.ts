import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { identityMatrix } from '../scene/matrix'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { sceneAnimationClip } from '../testing/sceneAnimation'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { createDocumentEditorStore } from './editorStore'
import { SceneAnimationPlayer } from './SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from './SceneAnimationPoseGesture'

const CHAIN = ['root', 'middle', 'tip'] as const
function setup() {
  const source = makeSceneTwoBoneFixture(),
    saves: MoldaSceneDocument[] = [],
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: {
        async save(asset) {
          saves.push(asset)
        },
      },
      autosaveMs: 60_000,
    }),
    player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel() {} }),
    gesture = new SceneAnimationPoseGesture(editor, player)
  player.setClip(source, 'clip')
  player.seek(0.7)
  const disconnect = gesture.connect()
  return {
    source,
    saves,
    editor,
    player,
    gesture,
    disconnect,
    close() {
      disconnect()
      player.setClip(null, null)
      editor.getState().dispose()
    },
  }
}

test('assisted samples share the existing pose channel but never autokey; explicit recording is one undo matching playback', async () => {
  const f = setup()
  try {
    f.gesture.setAutoKey(true)
    const input = f.gesture.beginTwoBone(CHAIN)!
    expect(input).not.toBeNull()
    expect(f.gesture.getSnapshot().reach).toEqual({
      status: 'reached',
      bend: 'pose',
      direction: 'target',
    })
    expect(f.gesture.getSnapshot().pending).toBe(false)
    expect(input.record()).toBe(false)
    for (let i = 0; i < 120; i++)
      expect(input.sample([Math.cos(i) * 1.3, Math.sin(i) * 1.3, 0.1], [0, 0, 3])).toBe(true)
    const pose = f.gesture.getSnapshot().pose!
    expect(f.gesture.getSnapshot().pending).toBe(true)
    expect(f.gesture.getSnapshot().dragging).toBe(false)
    expect(f.gesture.begin(['root'])).toBe(false)
    expect(f.gesture.preview(identityMatrix())).toBe(false)
    f.gesture.end(true)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().contentRevision).toBe(0)
    await f.editor.getState().flush()
    expect(f.saves).toEqual([])
    expect(input.record()).toBe(true)
    const committed = f.editor.getState().asset
    expect(prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices).toEqual(
      pose.worldMatrices,
    )
    expect(f.gesture.getSnapshot().reach).toBeNull()
    expect(input.record()).toBe(false)
    expect(input.sample([0, 1, 0])).toBe(false)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
    f.editor.getState().redo()
    expect(f.editor.getState().asset.animations).toEqual(committed.animations)
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
  'cancel',
] as const)('%s revokes an assisted input and all late record/cancel/sample callbacks', (kind) => {
  const f = setup()
  try {
    const old = f.gesture.beginTwoBone(CHAIN)!
    old.sample([1, 1, 0])
    const drag = f.gesture.beginTwoBoneDrag(['tip'])!
    expect(drag).not.toBeNull()
    if (kind === 'seek') f.player.seek(1)
    if (kind === 'play') f.player.play()
    if (kind === 'preview') f.player.setPreview(f.source, sceneAnimationClip())
    if (kind === 'clip') f.player.setClip(null, null)
    if (kind === 'revision') f.editor.getState().replace({ ...f.source, name: 'Novo nome' })
    if (kind === 'error') f.player.reportError(new Error('Failed to draw'))
    if (kind === 'disconnect') f.disconnect()
    if (kind === 'cancel') old.cancel()
    expect(f.gesture.getSnapshot().pose).toBeNull()
    expect(f.gesture.getSnapshot().reach).toBeNull()
    expect(old.sample([0, 1, 0])).toBe(false)
    expect(old.record()).toBe(false)
    expect(drag.preview(identityMatrix())).toBe(false)
    drag.end(true)
    const current = f.editor.getState().asset
    f.player.setClip(null, null)
    f.player.setClip(current, 'clip')
    const reconnect = f.gesture.connect()
    const next = f.gesture.beginTwoBone(CHAIN)!
    expect(next.sample([-1, 1, 0])).toBe(true)
    const pose = f.gesture.getSnapshot().pose
    expect(drag.preview(identityMatrix())).toBe(false)
    drag.end(false)
    old.cancel()
    expect(old.sample([NaN, 0, 0])).toBe(false)
    expect(old.record()).toBe(false)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(f.gesture.getSnapshot().error).toBeNull()
    expect(f.editor.getState().asset).toBe(current)
    expect(f.editor.getState().canUndo).toBe(false)
    reconnect()
  } finally {
    f.close()
  }
})

test('invalid preparation/sample is visible without writes; no-op and reach limits remain reviewable, and normal posing resumes after cancel', () => {
  const f = setup()
  try {
    expect(f.gesture.beginTwoBone(['root', 'tip', 'middle'])).toBeNull()
    expect(f.gesture.getSnapshot().error).toContain('sequência')
    const input = f.gesture.beginTwoBone(CHAIN)!
    expect(input.sample([2, 0, 0])).toBe(true)
    expect(f.gesture.getSnapshot().pending).toBe(false)
    expect(input.sample([20, 1, 0])).toBe(true)
    expect(f.gesture.getSnapshot().reach?.status).toBe('too-far')
    expect(input.sample([NaN, 0, 0])).toBe(false)
    expect(f.gesture.getSnapshot().error).not.toBeNull()
    expect(input.record()).toBe(false)
    expect(f.gesture.getSnapshot().pose).toBeNull()
    f.gesture.cancel()
    expect(f.gesture.begin(['root'])).toBe(true)
    const matrix = identityMatrix()
    matrix[12] = 1
    expect(f.gesture.preview(matrix)).toBe(true)
    const next = f.gesture.beginTwoBone(CHAIN)!
    expect(f.gesture.getSnapshot().pending).toBe(false)
    f.gesture.end(true)
    expect(next.sample([1, 1, 0])).toBe(true)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test.each([
  'transform',
  'two-bone',
] as const)('record removal cannot overwrite a new %s owner started reentrantly on the same revision', (kind) => {
  const f = setup()
  try {
    const old = f.gesture.beginTwoBone(CHAIN)!
    old.sample([1, 1, 0])
    const off = f.gesture.subscribe(() => {
      if (f.gesture.getSnapshot().pose) return
      off()
      if (kind === 'two-bone') f.gesture.beginTwoBone(CHAIN)!.sample([-1, 1, 0])
      else {
        f.gesture.begin(['root'])
        const delta = identityMatrix()
        delta[12] = 1
        f.gesture.preview(delta)
        f.gesture.end(true)
      }
    })
    expect(old.record()).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.gesture.getSnapshot().pending).toBe(true)
    expect(f.gesture.getSnapshot().error).toBeNull()
    expect(f.gesture.getSnapshot().reach !== null).toBe(kind === 'two-bone')
    expect(f.gesture.record()).toBe(true)
    expect(f.editor.getState().contentRevision).toBe(1)
  } finally {
    f.close()
  }
})

test('preparation and publication cannot hand back an input canceled or replaced during synchronous notifications', () => {
  const f = setup()
  try {
    const off = f.gesture.subscribe(() => {
      if (!f.gesture.getSnapshot().pose) return
      off()
      f.gesture.cancel()
    })
    expect(f.gesture.beginTwoBone(CHAIN)).toBeNull()
    const first = f.gesture.beginTwoBone(CHAIN)!
    const replacement = f.gesture.subscribe(() => {
      if (!f.gesture.getSnapshot().pending) return
      replacement()
      f.gesture.beginTwoBone(CHAIN)!.sample([-1, 1, 0])
    })
    expect(first.sample([1, 1, 0])).toBe(false)
    expect(first.record()).toBe(false)
    first.cancel()
    expect(f.gesture.getSnapshot().pending).toBe(true)
    expect(f.gesture.getSnapshot().error).toBeNull()
    expect(f.editor.getState().asset).toBe(f.source)
  } finally {
    f.close()
  }
})

test('changing a normal-pose selection cannot publish the old time if cancellation seeks reentrantly', () => {
  const f = setup()
  try {
    f.gesture.begin(['root'])
    const delta = identityMatrix()
    delta[12] = 1
    f.gesture.preview(delta)
    f.gesture.end(true)
    const off = f.gesture.subscribe(() => {
      if (f.gesture.getSnapshot().pose) return
      off()
      f.player.seek(1)
    })
    expect(f.gesture.begin(['middle'])).toBe(false)
    expect(f.player.getSnapshot().time).toBe(1)
    expect(f.gesture.getSnapshot().pose).toBeNull()
    expect(f.gesture.getSnapshot().dragging).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
  } finally {
    f.close()
  }
})

test('reset withdraws the pending pose without releasing its prepared input or allowing stale recording', () => {
  const f = setup()
  try {
    const input = f.gesture.beginTwoBone(CHAIN)!
    for (let i = 0; i < 20; i++) {
      expect(input.isCurrent()).toBe(true)
      expect(input.sample([1, 1, i / 100])).toBe(true)
      expect(f.gesture.getSnapshot().pending).toBe(true)
      expect(input.reset()).toBe(true)
      expect(f.gesture.getSnapshot().pose).toBe(input.original)
      expect(f.gesture.getSnapshot().reach).toBeNull()
      expect(f.gesture.getSnapshot().pending).toBe(false)
      expect(input.record()).toBe(false)
    }
    expect(input.sample([1, 1, 0])).toBe(true)
    expect(input.record()).toBe(true)
    expect(input.isCurrent()).toBe(false)
    expect(input.reset()).toBe(false)
    expect(f.editor.getState().contentRevision).toBe(1)
    const next = f.gesture.beginTwoBone(CHAIN)
    expect(next).toBeNull() // The player still owns the previous document.
    f.player.setClip(f.editor.getState().asset, 'clip')
    const current = f.gesture.beginTwoBone(CHAIN)!
    expect(current.sample([0, 1, 0])).toBe(true)
    const pose = f.gesture.getSnapshot().pose
    expect(input.reset()).toBe(false)
    expect(input.isCurrent()).toBe(false)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
  } finally {
    f.close()
  }
})

test('reset cannot claim ownership or erase a pose begun reentrantly during withdrawal', () => {
  const f = setup()
  try {
    const input = f.gesture.beginTwoBone(CHAIN)!
    input.sample([1, 1, 0])
    const off = f.gesture.subscribe(() => {
      if (f.gesture.getSnapshot().pending) return
      off()
      f.gesture.beginTwoBone(CHAIN)!.sample([-1, 1, 0])
    })
    expect(input.reset()).toBe(false)
    expect(input.isCurrent()).toBe(false)
    expect(f.gesture.getSnapshot().pending).toBe(true)
    const pose = f.gesture.getSnapshot().pose
    input.cancel()
    expect(input.reset()).toBe(false)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(f.editor.getState().asset).toBe(f.source)
  } finally {
    f.close()
  }
})

test('captured destination drags use the requested target, restore the prior preview on cancel and never autokey', async () => {
  const f = setup()
  try {
    f.gesture.setAutoKey(true)
    const input = f.gesture.beginTwoBone(CHAIN)!
    expect(f.gesture.beginTwoBoneDrag(['tip'])).toBeNull()
    input.sample([3, 0, 0], [0, 0, 2])
    const original = f.gesture.getSnapshot().pose!
    expect(original.twoBoneGuide?.target).toEqual([3, 0, 0])
    expect(original.worldMatrices.get('tip')!.slice(12, 15)).toEqual([2, 0, 0])
    expect(f.gesture.beginTwoBoneDrag(['root'])).toBeNull()
    expect(f.gesture.beginTwoBoneDrag(['middle', 'tip'])).toBeNull()
    const drag = f.gesture.beginTwoBoneDrag(['tip'])!
    expect(f.gesture.beginTwoBoneDrag(['tip'])).toBeNull()
    for (let i = 0; i < 120; i++) {
      const delta = identityMatrix()
      delta[12] = -1 - i / 1000
      expect(drag.preview(delta)).toBe(true)
      expect(f.gesture.getSnapshot().pose?.twoBoneGuide?.target).toEqual([2 - i / 1000, 0, 0])
    }
    expect(f.gesture.getSnapshot().dragging).toBe(true)
    expect(input.sample([1, 1, 0])).toBe(false)
    expect(input.record()).toBe(false)
    f.gesture.end(true)
    expect(f.gesture.getSnapshot().dragging).toBe(true)
    drag.end(false)
    expect(f.gesture.getSnapshot().pose).toBe(original)
    expect(f.gesture.getSnapshot().pending).toBe(false)
    expect(input.isCurrent()).toBe(true)
    const next = f.gesture.beginTwoBoneDrag(['tip'])!,
      delta = identityMatrix()
    delta[12] = -1.5
    expect(next.preview(delta)).toBe(true)
    const pose = f.gesture.getSnapshot().pose!
    expect(pose.twoBoneGuide?.target).toEqual([1.5, 0, 0])
    expect(drag.preview(delta)).toBe(false)
    drag.end(false)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    next.end(true)
    expect(f.gesture.getSnapshot().dragging).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    await f.editor.getState().flush()
    expect(f.saves).toEqual([])
    expect(input.record()).toBe(true)
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

test('reset, malformed deltas and reentrant cancellation revoke destination drags without touching replacements', () => {
  const f = setup()
  try {
    const input = f.gesture.beginTwoBone(CHAIN)!
    input.sample([1, 1, 0])
    const old = f.gesture.beginTwoBoneDrag(['tip'])!
    expect(input.reset()).toBe(true)
    input.sample([0, 1, 0])
    const next = f.gesture.beginTwoBoneDrag(['tip'])!
    expect(old.preview(identityMatrix())).toBe(false)
    old.end(false)
    expect(f.gesture.getSnapshot().dragging).toBe(true)
    const invalid = identityMatrix()
    invalid[0] = 2
    expect(next.preview(invalid)).toBe(false)
    expect(f.gesture.getSnapshot().error).toContain('Mover')
    expect(f.gesture.getSnapshot().pose).toBeNull()
    f.gesture.beginTwoBone(CHAIN)!.sample([1, 1, 0])
    const off = f.gesture.subscribe(() => {
      if (!f.gesture.getSnapshot().dragging) return
      off()
      f.gesture.cancel()
    })
    expect(f.gesture.beginTwoBoneDrag(['tip'])).toBeNull()
    expect(f.gesture.getSnapshot().pose).toBeNull()
    expect(f.editor.getState().asset).toBe(f.source)
  } finally {
    f.close()
  }
})

test('the shared gizmo adapter captures normal and assisted inputs; late callbacks cannot steal a replacement', () => {
  const f = setup()
  try {
    const old = f.gesture.transformActions(['root'])
    expect(old.begin()).toBe(true)
    f.gesture.cancel()
    const next = f.gesture.transformActions(['root']),
      delta = identityMatrix()
    delta[12] = 2
    expect(next.begin()).toBe(true)
    expect(next.preview(delta)).toBe(true)
    const pose = f.gesture.getSnapshot().pose
    expect(old.preview(delta)).toBe(false)
    old.end(true)
    expect(f.gesture.getSnapshot().pose).toBe(pose)
    expect(f.gesture.getSnapshot().dragging).toBe(true)
    next.end(false)
    const input = f.gesture.beginTwoBone(CHAIN)!
    input.sample([1, 1, 0])
    input.reset()
    const direct = f.gesture.transformActions(['tip'])
    expect(direct.begin()).toBe(true)
    expect(input.isCurrent()).toBe(false)
    input.cancel()
    expect(direct.preview(delta)).toBe(true)
    expect(f.gesture.getSnapshot().reach).toBeNull()
    direct.end(false)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test.each([
  'normal',
  'assisted',
] as const)('ending the adapter during %s preparation revokes the returned input', (kind) => {
  const f = setup()
  try {
    if (kind === 'assisted') f.gesture.beginTwoBone(CHAIN)!.sample([1, 1, 0])
    const actions = f.gesture.transformActions([kind === 'normal' ? 'root' : 'tip']),
      off = f.gesture.subscribe(() => {
        if (!f.gesture.getSnapshot().dragging) return
        off()
        actions.end(false)
      })
    expect(actions.begin()).toBe(false)
    expect(actions.preview(identityMatrix())).toBe(false)
    expect(f.gesture.getSnapshot().dragging).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
  } finally {
    f.close()
  }
})

test('thumbnail metadata keeps the assisted candidate recordable with one undo', async () => {
  const f = setup()
  try {
    const input = f.gesture.beginTwoBone(CHAIN)!
    expect(input.sample([1, 1, 0], [0, 0, 3])).toBe(true)
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
