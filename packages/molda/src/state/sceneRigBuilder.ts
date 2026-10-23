import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from '../scene/document'
import { keepSceneThumb } from '../scene/documentContent'
import { indexSceneDocument } from '../scene/documentIndex'
import { type SceneMeasurementStep, snapSceneMeasurement } from '../scene/measurementStep'
import {
  type PreparedSceneRig,
  prepareSceneRig,
  previewSceneRig,
  SCENE_RIG_NORMALS,
  type SceneRigView,
  sceneRigTarget,
} from '../scene/rigBuilder'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import { createSceneSkin } from '../scene/skinCommands'
import { prepareSceneSkinSuggestion } from '../scene/skinSuggestion'
import { requireScene } from '../scene/validation'
import { suggestSkinInWorker } from '../workers/sceneSkinSuggestion'
import type { EditorStore } from './editorStore'

export interface SceneRigDraft {
  source: MoldaSceneDocument
  revision: number
  nodeId: string
  view: SceneRigView
  cameraRequest: { view: SceneRigView }
  center: Vec3
  points: Vec3[]
  pointIds: string[]
  editing: number | null
  phase: 'mark' | 'busy' | 'try'
  prepared: PreparedSceneRig | null
  candidate: MoldaSceneDocument | null
  preview: MoldaSceneDocument | null
  jointId: string | null
  angle: number
}
interface Snapshot {
  draft: SceneRigDraft | null
  error: string | null
}

/** Detached authoring: no draft, guessed weights or test rotation can reach autosave. */
export function createSceneRigBuilder(
  editor: EditorStore<MoldaSceneDocument>,
  commit: (document: MoldaSceneDocument) => boolean,
  suggest: typeof suggestSkinInWorker = suggestSkinInWorker,
  ownsContext: (nodeId: string) => boolean = () => true,
) {
  let snapshot: Snapshot = { draft: null, error: null }
  let controller: AbortController | null = null
  let active = false
  const listeners = new Set<() => void>()
  const publish = (draft: SceneRigDraft | null, error: string | null = null) => {
    snapshot = { draft, error }
    for (const listener of listeners) listener()
  }
  const valid = (draft: SceneRigDraft) =>
    active &&
    ownsContext(draft.nodeId) &&
    editor.getState().content === draft.source &&
    editor.getState().contentRevision === draft.revision
  const cancel = () => {
    controller?.abort()
    controller = null
    if (snapshot.draft || snapshot.error) publish(null)
  }
  const fail = (error: unknown, draft = snapshot.draft) =>
    publish(
      draft,
      error instanceof Error ? error.message : 'Não foi possível montar os ossos. Tente novamente.',
    )
  const updateMark = (change: (draft: SceneRigDraft) => SceneRigDraft) => {
    const draft = snapshot.draft
    if (!draft || !valid(draft) || draft.phase === 'busy') return
    publish(
      change({
        ...draft,
        phase: 'mark',
        candidate: null,
        prepared: null,
        preview: null,
        angle: 0,
        jointId: null,
      }),
    )
  }
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    cancel,
    interrupt() {
      const draft = snapshot.draft
      if (draft?.phase !== 'busy') return
      controller?.abort()
      controller = null
      publish(
        { ...draft, phase: 'mark' },
        'A preparação foi pausada. Seus pontos continuam aqui; toque em Ligar à peça para tentar novamente.',
      )
    },
    connect() {
      active = true
      const unsubscribe = editor.subscribe(() => {
        if (snapshot.draft && !valid(snapshot.draft)) cancel()
      })
      return () => {
        active = false
        cancel()
        unsubscribe()
      }
    },
    start(nodeId: string) {
      if (!active || !ownsContext(nodeId)) return
      cancel()
      try {
        const source = editor.getState().content,
          target = sceneRigTarget(source, nodeId)
        publish({
          source,
          revision: editor.getState().contentRevision,
          nodeId,
          view: 'front',
          cameraRequest: { view: 'front' },
          center: target.center,
          points: [],
          pointIds: [],
          editing: null,
          phase: 'mark',
          prepared: null,
          candidate: null,
          preview: null,
          jointId: null,
          angle: 0,
        })
      } catch (error) {
        fail(error, null)
      }
    },
    setView(view: SceneRigView) {
      requireScene(Object.hasOwn(SCENE_RIG_NORMALS, view), 'view', 'Escolha uma vista.')
      updateMark((draft) => ({ ...draft, view, cameraRequest: { view } }))
    },
    edit(index: number) {
      updateMark((draft) => ({
        ...draft,
        editing: index >= 0 && index < draft.points.length ? index : null,
      }))
    },
    back() {
      updateMark((draft) => ({
        ...draft,
        points: draft.points.slice(0, -1),
        pointIds: draft.pointIds.slice(0, -1),
        editing: null,
      }))
    },
    mark(point: Vec3, step: SceneMeasurementStep) {
      const draft = snapshot.draft
      if (draft?.phase !== 'mark' || !valid(draft)) return
      try {
        const next = point.map((n, axis) =>
          SCENE_RIG_NORMALS[draft.view][axis] === 0 ? snapSceneMeasurement(n, step, -Infinity) : n,
        ) as Vec3
        requireScene(next.every(Number.isFinite), 'point', 'Escolha um ponto na peça.')
        const index = draft.editing ?? draft.points.length
        requireScene(
          index < SCENE_SKIN_LIMITS.joints,
          'points',
          'Esta montagem já tem muitos ossos.',
        )
        for (const adjacent of [draft.points[index - 1], draft.points[index + 1]])
          requireScene(
            !adjacent || next.some((n, axis) => n !== adjacent[axis]),
            'point',
            'Marque este ponto um pouco mais longe do outro.',
          )
        const points = [...draft.points]
        points[index] = next
        const pointIds = [...draft.pointIds]
        pointIds[index] ??= newId()
        publish({ ...draft, points, pointIds, editing: null })
      } catch (error) {
        fail(error)
      }
    },
    async prepare() {
      const draft = snapshot.draft
      if (draft?.phase !== 'mark' || !valid(draft)) return
      const abort = new AbortController()
      controller?.abort()
      controller = abort
      const busy = { ...draft, phase: 'busy' as const }
      publish(busy)
      try {
        const prepared = prepareSceneRig(draft.source, draft.nodeId, draft.points, draft.view)
        const data = prepareSceneSkinSuggestion(prepared.document, {
          nodeId: draft.nodeId,
          jointIds: prepared.jointIds,
          method: 'segments',
        })
        const result = await suggest({ sourceKey: newId(), data }, abort.signal)
        if (abort.signal.aborted || snapshot.draft !== busy || !valid(busy)) return
        const candidate = createSceneSkin(prepared.document, {
          name: 'Montagem de ossos',
          nodeId: draft.nodeId,
          jointIds: prepared.jointIds,
          weights: result.weights,
        })
        publish({
          ...draft,
          phase: 'try',
          editing: null,
          prepared,
          candidate,
          preview: candidate,
          jointId: prepared.jointIds[Math.floor((prepared.jointIds.length - 1) / 2)]!,
          angle: 0,
        })
      } catch (error) {
        if (!abort.signal.aborted && snapshot.draft === busy && valid(busy)) fail(error, draft)
      } finally {
        if (controller === abort) controller = null
      }
    },
    test(jointId: string, angle: number) {
      const draft = snapshot.draft
      if (!draft?.candidate || !draft.prepared || draft.phase !== 'try' || !valid(draft)) return
      try {
        publish({
          ...draft,
          jointId,
          angle,
          preview: previewSceneRig(draft.candidate, draft.prepared, jointId, angle),
        })
      } catch (error) {
        fail(error)
      }
    },
    confirm() {
      const draft = snapshot.draft
      if (!draft?.candidate || draft.phase !== 'try' || !valid(draft)) return false
      const next = keepSceneThumb(draft.candidate, editor.getState().asset)
      cancel()
      try {
        if (commit(next)) return true
        if (valid(draft)) publish(draft, 'Não foi possível guardar a montagem. Tente novamente.')
      } catch (error) {
        if (valid(draft)) fail(error, draft)
      }
      return false
    },
    points() {
      const draft = snapshot.draft
      if (!draft) return []
      if (!draft.preview || !draft.prepared) return draft.points
      const index = indexSceneDocument(draft.preview)
      return draft.prepared.jointIds.map((id) => {
        const m = index.scene.worldMatrices.get(id)!
        return [m[12], m[13], m[14]] as Vec3
      })
    },
  }
}
export type SceneRigBuilder = ReturnType<typeof createSceneRigBuilder>
