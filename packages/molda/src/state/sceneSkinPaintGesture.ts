import type { MoldaSceneDocument } from '../scene/document'
import {
  createSceneSkinPaintStroke,
  type SceneSkinPaintSample,
  type SceneSkinPaintSettings,
  type SceneSkinPaintStats,
} from '../scene/skinPaint'
import type { EditorStore } from './editorStore'

export interface SceneSkinPaintPreview {
  /** Identity of this detached preview, not of an authorial node or history entry. */
  token: object
  source: MoldaSceneDocument
  nodeId: string
  jointId: string
  delta: ReadonlyMap<string, number>
  stats: SceneSkinPaintStats
}

/** A detached preview never replaces the document or reaches autosave. Commit writes one sparse command. */
export function createSceneSkinPaintGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onPreview: (preview: SceneSkinPaintPreview | null) => void,
  onError: (error: unknown) => void,
) {
  type Stroke = ReturnType<typeof createSceneSkinPaintStroke>
  type Owner = {
    token: object
    source: MoldaSceneDocument
    revision: number
    stroke: Stroke
  }
  let current: Owner | null = null
  let unsubscribe: (() => void) | null = null
  let disposed = false
  let generation = 0
  function release() {
    const previous = current
    current = null
    unsubscribe?.()
    unsubscribe = null
    const ticket = ++generation
    if (previous) onPreview(null)
    return { owner: previous, ticket }
  }
  return {
    begin(
      skinId: string,
      jointId: string,
      settings: SceneSkinPaintSettings,
      expectedRevision = editor.getState().contentRevision,
    ) {
      if (disposed) return false
      const { ticket } = release()
      if (disposed || generation !== ticket) return false
      const state = editor.getState()
      if (state.contentRevision !== expectedRevision) return false
      let owner: Owner | null = null
      try {
        const stroke = createSceneSkinPaintStroke(state.asset, skinId, jointId, settings)
        owner = { token: {}, source: state.asset, revision: state.contentRevision, stroke }
        current = owner
        unsubscribe = editor.subscribe((state) => {
          if (current === owner && owner && state.contentRevision !== owner.revision) release()
        })
        onPreview({
          token: owner.token,
          source: owner.source,
          nodeId: stroke.nodeId,
          jointId,
          delta: new Map(),
          stats: stroke.result().stats,
        })
        return current === owner
      } catch (error) {
        if (owner && current === owner) release()
        onError(error)
        return false
      }
    },
    sample(sample: SceneSkinPaintSample) {
      const owner = current
      if (!owner || disposed) return false
      try {
        const result = owner.stroke.sample(sample)
        onPreview({
          token: owner.token,
          source: owner.source,
          nodeId: owner.stroke.nodeId,
          jointId: owner.stroke.jointId,
          ...result,
        })
        return current === owner
      } catch (error) {
        if (current === owner) release()
        onError(error)
        return false
      }
    },
    end(commit: boolean) {
      const { owner, ticket } = release()
      if (!commit || !owner || disposed || generation !== ticket) return false
      const state = editor.getState()
      if (state.contentRevision !== owner.revision) return false
      try {
        const next = owner.stroke.commit(state.asset)
        state.commit(next)
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    active: () => current !== null,
    cancel: () => {
      release()
    },
    dispose() {
      disposed = true
      release()
    },
  }
}

export type SceneSkinPaintGesture = ReturnType<typeof createSceneSkinPaintGesture>
