import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { addScenePrimitive, setSceneNodeFlag } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { scenePivotTargets } from '../scene/modelGuides'
import { setScenePieceCoordinates } from '../scene/pieceCoordinates'
import { suggestSceneSkinWeights } from '../scene/skinSuggestion'
import type { suggestSkinInWorker } from '../workers/sceneSkinSuggestion'
import { createDocumentEditorStore } from './editorStore'
import { createSceneRigBuilder } from './sceneRigBuilder'

const calculate: typeof suggestSkinInWorker = async (request) =>
  suggestSceneSkinWeights(request.data)
function setup(suggest = calculate) {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Braço' }),
    'box',
    'braço',
  )
  const nodeId = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, nodeId, 'dimensions', [2, 6, 2])
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    autosaveMs: 60000,
    persistence: { save: async () => {} },
  })
  const rig = createSceneRigBuilder(
    editor,
    (next) => {
      editor.getState().commit(next)
      return true
    },
    suggest,
  )
  const disconnect = rig.connect()
  const t = scenePivotTargets(source, nodeId)
  rig.start(nodeId)
  rig.mark([t.center[0], t.bottom[1], t.center[2]], 1)
  rig.mark(t.center, 1)
  rig.mark([t.center[0], 2 * t.center[1] - t.bottom[1], t.center[2]], 1)
  return {
    source,
    nodeId,
    editor,
    rig,
    close() {
      disconnect()
      editor.getState().dispose()
    },
  }
}

test('setup and test bend never reach persistence; confirmation and undo include the whole rig', async () => {
  const f = setup()
  try {
    await f.rig.prepare()
    const draft = f.rig.getSnapshot().draft!
    expect(draft.phase).toBe('try')
    f.rig.test(draft.jointId!, 45)
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.rig.confirm()).toBe(true)
    expect(f.editor.getState().content.nodes).toHaveLength(4)
    expect(f.editor.getState().content.skins).toHaveLength(1)
    const rest = f.editor.getState().content
    expect(rest.nodes.at(-2)!.transform).toEqual(draft.candidate!.nodes.at(-2)!.transform)
    f.editor.getState().undo()
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    f.editor.getState().redo()
    expect(f.editor.getState().content.nodes).toEqual(rest.nodes)
  } finally {
    f.close()
  }
})

test('cancel, interruption, external revisions and disconnect reject delayed weight results', async () => {
  for (const action of ['cancel', 'interrupt', 'edit', 'disconnect'] as const) {
    let release: (() => void) | undefined
    const f = setup(async (request) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return suggestSceneSkinWeights(request.data)
    })
    try {
      const work = f.rig.prepare()
      expect(f.rig.getSnapshot().draft!.phase).toBe('busy')
      if (action === 'cancel') f.rig.cancel()
      else if (action === 'interrupt') f.rig.interrupt()
      else if (action === 'disconnect') f.close()
      else f.editor.getState().commit(setSceneNodeFlag(f.source, [f.nodeId], 'locked', true))
      release!()
      await work
      if (action === 'interrupt') {
        expect(f.rig.getSnapshot().draft!.phase).toBe('mark')
        expect(f.rig.getSnapshot().draft!.points).toHaveLength(3)
        expect(f.rig.getSnapshot().draft!.candidate).toBeNull()
      } else expect(f.rig.getSnapshot().draft).toBeNull()
      expect(f.rig.confirm()).toBe(false)
      expect(f.editor.getState().content.skins).toBeUndefined()
    } finally {
      if (action !== 'disconnect') f.close()
    }
  }
})

test('StrictMode-style reconnect permits only the new session and metadata never invalidates points', () => {
  const f = setup()
  try {
    const disconnect = f.rig.connect()
    disconnect()
    f.rig.start(f.nodeId)
    expect(f.rig.getSnapshot().draft).toBeNull()
    const reconnect = f.rig.connect()
    f.rig.start(f.nodeId)
    f.rig.mark(f.rig.getSnapshot().draft!.center, 1)
    const id = f.rig.getSnapshot().draft!.pointIds[0]
    f.editor.getState().setThumb('data:image/png;base64,AA==')
    expect(f.rig.getSnapshot().draft!.points).toHaveLength(1)
    f.rig.edit(0)
    f.rig.setView('left')
    const old = f.rig.getSnapshot().draft!.points[0]!
    f.rig.mark([old[0], old[1], old[2] + 0.21], 0.1)
    expect(f.rig.getSnapshot().draft!.pointIds[0]).toBe(id)
    expect(f.rig.getSnapshot().draft!.points[0]![2]).toBeCloseTo(old[2] + 0.2)
    reconnect()
  } finally {
    f.close()
  }
})

test('correcting points abandons the derived weights and test rotations', async () => {
  const f = setup()
  try {
    await f.rig.prepare()
    f.rig.edit(1)
    expect(f.rig.getSnapshot().draft!.phase).toBe('mark')
    expect(f.rig.getSnapshot().draft!.candidate).toBeNull()
    const center = f.rig.getSnapshot().draft!.center
    f.rig.mark([center[0] + 1, center[1], center[2]], 1)
    expect(f.rig.getSnapshot().draft!.points[1]![0]).toBe(center[0] + 1)
    f.rig.back()
    expect(f.rig.getSnapshot().draft!.points).toHaveLength(2)
    expect(f.editor.getState().content).toBe(f.source)
  } finally {
    f.close()
  }
})
