import { describe, expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { createSceneEditorStore } from '../state/sceneEditorStore'
import { createScenePersistence } from '../state/scenePersistence'
import { nativeDatabase } from '../testing/nativeDatabase'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import { allocateSceneId } from './commandContext'
import {
  deleteSceneNodes,
  duplicateSceneNodes,
  groupSceneNodes,
  moveScenePivot,
  reparentSceneNodes,
  transformSceneNodes,
  ungroupSceneNodes,
} from './commands'
import type { MoldaSceneDocument } from './document'
import { identityMatrix } from './matrix'
import { scenePieceCoordinates, setScenePieceCoordinates } from './pieceCoordinates'
import { readSceneDocument } from './readDocument'

describe('animation and existing scene commands', () => {
  test('duplication owns remapped keys; deletion prunes only removed targets and reserves clip ids', () => {
    const source = animatedScene()
    source.animations.push(sceneAnimationClip('wing'))
    source.animations[1] = { ...sceneAnimationClip('wing'), id: 'untouched' }
    const original = structuredClone(source)
    let i = 0
    const copied = duplicateSceneNodes(source, ['body'], () => `copy-${++i}`)
    const tracks = copied.animations?.[0]?.tracks
    expect(tracks).toHaveLength(2)
    expect(tracks?.[0]).toBe(source.animations[0]?.tracks[0])
    expect(tracks?.[1]?.nodeId).toBe('copy-1')
    expect(tracks?.[1]?.keys).toEqual(tracks?.[0]?.keys)
    expect(tracks?.[1]?.keys[1]?.value).not.toBe(tracks?.[0]?.keys[1]?.value)
    expect(copied.animations?.[1]).toBe(source.animations[1])
    const deleted = deleteSceneNodes(copied, ['body'])
    expect(deleted.animations?.[0]?.tracks.map((track) => track.nodeId)).toEqual(['copy-1'])
    expect(deleteSceneNodes(deleted, ['copy-1']).animations?.[0]?.tracks).toEqual([])
    expect(readSceneDocument(deleted).status).toBe('valid')
    expect(() => allocateSceneId(source, () => 'clip')()).toThrow('identidade')
    expect(source).toEqual(original)
  })

  test('animated groups cannot disappear or change inherited motion through reparent/group', () => {
    const grouped = groupSceneNodes(animatedScene(), ['body'], { nextId: () => 'group' })
    const source: MoldaSceneDocument = { ...grouped, animations: [sceneAnimationClip('group')] }
    const original = structuredClone(source)
    expect(() => ungroupSceneNodes(source, ['group'])).toThrow('movimentos próprios')
    expect(() => reparentSceneNodes(source, ['body'], null)).toThrow('movimento herdado')
    expect(() => reparentSceneNodes(source, ['wing'], 'group')).toThrow('movimento herdado')
    expect(() => groupSceneNodes(source, ['body', 'wing'])).toThrow('movimento herdado')
    expect(reparentSceneNodes(source, ['body'], 'group')).toBe(source)
    const nested = groupSceneNodes(source, ['body'], { nextId: () => 'static' })
    expect(readSceneDocument(nested).status).toBe('valid')
    const separated = ungroupSceneNodes(nested, ['static'])
    expect(separated.nodes.find((node) => node.id === 'body')?.parentId).toBe('group')
    expect(separated.animations).toBe(source.animations)
    expect(source).toEqual(original)
  })

  test('delta clips survive rest changes; local moves retarget keys while grouping and turns stay guarded', () => {
    const source = animatedScene()
    source.animations[0]?.tracks.push(sceneRotationTrack())
    const original = structuredClone(source)
    const grouped = groupSceneNodes(source, ['body'], { nextId: () => 'group' })
    expect(ungroupSceneNodes(grouped, ['group']).animations).toBe(source.animations)
    expect(() => moveScenePivot(source, 'body', [1, 0, 0])).toThrow('pivô')
    expect(moveScenePivot(source, 'body', [0, 0, 0])).toBe(source)
    expect(readSceneDocument(moveScenePivot(grouped, 'group', [1, 0, 0])).status).toBe('valid')
    const delta = identityMatrix()
    delta[12] = 1
    expect(transformSceneNodes(source, ['body'], delta).animations).toBe(source.animations)
    const absolute: MoldaSceneDocument = {
      ...source,
      animations: source.animations.map((clip) => ({ ...clip, space: 'local' })),
    }
    expect(() => groupSceneNodes(absolute, ['body'])).toThrow('posição local original')
    const moved = transformSceneNodes(absolute, ['body'], delta)
    expect(moved.animations?.[0]?.tracks[0]?.keys[0]?.value).toEqual([1, 0, 0])
    expect(() => setScenePieceCoordinates(absolute, 'body', 'rotation', [0, 0, 90])).toThrow(
      'Converta o movimento',
    )
    expect(source).toEqual(original)
  })

  test('resizing a piece with local animation scales its absolute keys and keeps the clip editable', () => {
    const source = animatedScene()
    const node = source.nodes.find((entry) => entry.id === 'body')!
    if (node.transform.kind !== 'trs') throw new Error('Expected rigid fixture')
    const rest = node.transform
    source.animations[0] = {
      ...source.animations[0]!,
      space: 'local',
      tracks: [
        {
          nodeId: 'body',
          channel: 'translation',
          keys: [
            { time: 0, value: [...rest.translation], interpolation: 'linear' },
            {
              time: 2,
              value: [rest.translation[0] + 3, rest.translation[1], rest.translation[2]],
              interpolation: 'linear',
            },
          ],
        },
        {
          nodeId: 'body',
          channel: 'scale',
          keys: [
            { time: 0, value: [...rest.scale], interpolation: 'linear' },
            {
              time: 2,
              value: [rest.scale[0] * 1.5, rest.scale[1], rest.scale[2]],
              interpolation: 'linear',
            },
          ],
        },
        sceneRotationTrack(),
      ],
    }
    const original = structuredClone(source)
    const dimensions = scenePieceCoordinates(source, 'body').dimensions
    const doubled = dimensions.map((value) => value * 2) as Vec3
    const resized = setScenePieceCoordinates(source, 'body', 'dimensions', doubled)
    const changed = resized.nodes.find((entry) => entry.id === 'body')!
    if (changed.transform.kind !== 'trs') throw new Error('Expected rigid resize')
    const shift = changed.transform.translation.map(
      (value, axis) => value - rest.translation[axis]!,
    )
    expect(scenePieceCoordinates(resized, 'body').dimensions).toEqual(doubled)
    const translation = resized.animations?.[0]?.tracks.find(
      (track) => track.nodeId === 'body' && track.channel === 'translation',
    )
    const scale = resized.animations?.[0]?.tracks.find(
      (track) => track.nodeId === 'body' && track.channel === 'scale',
    )
    expect(translation?.keys.map((key) => key.value)).toEqual([
      rest.translation.map((value, axis) => value + shift[axis]!) as Vec3,
      [
        rest.translation[0] + 3 + shift[0]!,
        rest.translation[1] + shift[1]!,
        rest.translation[2] + shift[2]!,
      ],
    ])
    expect(scale?.keys.map((key) => key.value)).toEqual([
      rest.scale.map((value) => value * 2) as Vec3,
      [rest.scale[0] * 3, rest.scale[1] * 2, rest.scale[2] * 2],
    ])
    expect(resized.animations?.[0]?.tracks[2]).toEqual(source.animations[0]?.tracks[2])
    expect(readSceneDocument(resized).status).toBe('valid')
    const delta = identityMatrix()
    delta[0] = delta[5] = delta[10] = 2
    const dragged = transformSceneNodes(source, ['body'], delta)
    const draggedScale = dragged.animations?.[0]?.tracks.find((track) => track.channel === 'scale')
    expect(draggedScale?.keys[0]?.value).toEqual(rest.scale.map((value) => value * 2) as Vec3)
    expect(readSceneDocument(dragged).status).toBe('valid')
    expect(source).toEqual(original)
  })

  test('clips persist with owned values, exact costs, CAS and a single deletion undo/redo', async () => {
    const db = await nativeDatabase()
    const persistence = createScenePersistence(db.store)
    const source = animatedScene()
    const expected = structuredClone(source)
    const pending = persistence.save(source, null)
    const key = source.animations[0]?.tracks[0]?.keys[1]
    if (!key) throw new Error('Missing fixture')
    key.value[0] = 999
    await pending
    const read = await persistence.read(source.id)
    if (read.status !== 'active') throw new Error('Missing stored scene')
    const editor = createSceneEditorStore(read.document, 1, persistence, { autosaveMs: 60_000 })
    try {
      expect(read.document).toEqual(expected)
      expect(read.summary.bytes).toBe(structuredBytes(expected))
      editor.getState().commit(deleteSceneNodes(editor.getState().asset, ['body']))
      await editor.getState().flush()
      expect(editor.getState().asset.animations?.[0]?.tracks).toEqual([])
      editor.getState().undo()
      await editor.getState().flush()
      expect(editor.getState().asset.animations).toEqual(expected.animations)
      expect(editor.getState().canUndo).toBe(false)
      const reopened = await persistence.read(source.id)
      if (reopened.status !== 'active') throw new Error('Missing stored scene')
      expect(reopened.document.animations).toEqual(expected.animations)
      expect(await persistence.save(expected, 1)).toEqual({ status: 'conflict' })
      editor.getState().redo()
      expect(editor.getState().asset.animations?.[0]?.tracks).toEqual([])
    } finally {
      editor.getState().dispose()
      db.close()
    }
  })
})
