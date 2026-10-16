import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { editSceneAnimationPoses, retimeSceneAnimationPoses } from '../scene/animationArrival'
import { renameSceneNode } from '../scene/commands'
import type { MoldaSceneDocument } from '../scene/document'
import { animatedScene } from '../testing/sceneAnimation'
import { createDocumentEditorStore } from './editorStore'
import { SceneAnimationEditPreview } from './SceneAnimationEditPreview'
import { SceneAnimationPlayer } from './SceneAnimationPlayer'

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
  player.setClip(editor.getState().content, 'clip')
  player.seek(0.75)
  const preview = new SceneAnimationEditPreview(editor, player)
  const disconnect = preview.connect()
  return {
    source,
    editor,
    player,
    preview,
    saves,
    close: () => {
      disconnect()
      editor.getState().dispose()
    },
  }
}
const refs = [{ nodeId: 'body', channel: 'translation' as const, time: 1.123456789123 }]

test('clip edit preview changes playback only, cancellation restores the exact cursor and confirmation adds one undo', async () => {
  const f = setup()
  try {
    const before = f.editor.getState().content
    expect(
      f.preview.prepare('clip', (source) =>
        editSceneAnimationPoses(source, 'clip', refs, 'move', 0.25),
      ),
    ).toBe(true)
    expect(f.player.getSnapshot().source?.clip.tracks[0]?.keys[1]?.time).toBe(1.373456789123)
    expect(f.editor.getState().content).toBe(before)
    expect(f.editor.getState().saveSnapshot()).toBe(before)
    expect(f.editor.getState().canUndo).toBe(false)
    await f.editor.getState().flush()
    expect(f.saves).toEqual([])
    f.player.seek(1.5)
    f.preview.cancel()
    expect(f.player.getSnapshot().time).toBe(0.75)
    expect(f.player.getSnapshot().source?.preview).toBeUndefined()
    expect(
      f.preview.prepare('clip', (source) =>
        retimeSceneAnimationPoses(source, 'clip', refs, 0.5, 0),
      ),
    ).toBe(true)
    expect(f.preview.confirm()).toBe(true)
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys[1]!.time).toBe(
      1.123456789123 / 2,
    )
    expect(f.preview.getSnapshot().pending).toBe(false)
    f.editor.getState().undo()
    expect({ ...f.editor.getState().content, updatedAt: before.updatedAt }).toEqual(before)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('invalid batch, foreign draft, external edits and late confirmation never replace the new owner', () => {
  const f = setup()
  try {
    expect(
      f.preview.prepare('clip', (source) =>
        editSceneAnimationPoses(source, 'clip', refs, 'copy', 5),
      ),
    ).toBe(false)
    expect(f.preview.getSnapshot().error).toBeTruthy()
    expect(f.editor.getState().canUndo).toBe(false)
    expect(
      f.preview.prepare('clip', (source) =>
        editSceneAnimationPoses(source, 'clip', refs, 'copy', 0.2),
      ),
    ).toBe(true)
    const renamed = renameSceneNode(f.editor.getState().content, 'body', 'Outro nome')
    f.editor.getState().commit(renamed)
    expect(f.preview.getSnapshot().pending).toBe(false)
    expect(f.preview.confirm()).toBe(false)
    expect(f.player.getSnapshot().source?.document).toBe(f.editor.getState().content)
    expect(f.player.getSnapshot().source?.preview).toBeUndefined()
    expect(f.editor.getState().content.nodes.find((node) => node.id === 'body')!.name).toBe(
      'Outro nome',
    )
    f.player.setPreview(f.editor.getState().content, f.source.animations[0]!)
    expect(f.preview.prepare('clip', (source) => source)).toBe(false)
    expect(f.player.getSnapshot().source?.preview).toBe(true)
  } finally {
    f.close()
  }
})
