import { COPY } from '../core/copy'
import type { MoldaSceneDocument } from '../scene/document'
import { sameSceneContent } from '../scene/documentContent'
import type {
  SceneSkinPaintSample,
  SceneSkinPaintSettings,
  SceneSkinPaintStats,
} from '../scene/skinPaint'
import { SceneValidationError } from '../scene/validation'
import type { EditorStore } from './editorStore'
import { createSceneSkinPaintGesture, type SceneSkinPaintPreview } from './sceneSkinPaintGesture'

export interface SceneSkinPaintStatus {
  phase: 'idle' | 'painting' | 'applied' | 'cancelled' | 'error'
  stats: SceneSkinPaintStats | null
  error: string | null
}

/** One attached viewport owns input and incremental previews. Status never retains a document. */
export function createSceneSkinPaintSession(editor: EditorStore<MoldaSceneDocument>) {
  let snapshot: SceneSkinPaintStatus = { phase: 'idle', stats: null, error: null }
  const listeners = new Set<() => void>()
  let connection: { cancel(): void; dispose(): void } | null = null
  let generation = 0
  const publish = (next: SceneSkinPaintStatus) => {
    const a = snapshot.stats,
      b = next.stats
    if (
      snapshot.phase === next.phase &&
      snapshot.error === next.error &&
      (a === b ||
        (a &&
          b &&
          a.touched === b.touched &&
          a.changed === b.changed &&
          a.refused['influence-limit'] === b.refused['influence-limit'] &&
          a.refused['no-recipient'] === b.refused['no-recipient'] &&
          a.refused.precision === b.refused.precision))
    )
      return
    snapshot = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    cancel: () => connection?.cancel(),
    /** Creating the session is pure. Effects may attach/dispose repeatedly, including StrictMode. */
    connect(
      scope: {
        skinId: string
        jointId: string
        settings: SceneSkinPaintSettings
        displayed(): MoldaSceneDocument | null
      },
      onPreview: (preview: SceneSkinPaintPreview | null) => void,
    ) {
      const ticket = ++generation
      connection?.dispose()
      const { skinId, jointId, displayed } = scope,
        settings = { ...scope.settings }
      let disposed = false
      let notification = 0
      const gesture = createSceneSkinPaintGesture(
        editor,
        (preview) => {
          const ticket = ++notification
          onPreview(preview)
          if (connection !== owner || notification !== ticket) return
          publish(
            preview
              ? { phase: 'painting', stats: preview.stats, error: null }
              : { ...snapshot, phase: 'cancelled' },
          )
        },
        (error) => {
          if (connection === owner)
            publish({
              ...snapshot,
              phase: 'error',
              error:
                error instanceof SceneValidationError
                  ? error.message
                  : COPY.scene.skinWeights.failed,
            })
        },
      )
      const owner = {
        actions: {
          begin(sample: SceneSkinPaintSample) {
            if (disposed || connection !== owner) return false
            const source = displayed()
            if (!source || !sameSceneContent(source, editor.getState().asset)) {
              gesture.cancel()
              if (connection === owner)
                publish({ phase: 'error', stats: null, error: COPY.scene.skinWeights.changed })
              return false
            }
            return gesture.begin(skinId, jointId, settings) && gesture.sample(sample)
          },
          move(sample: SceneSkinPaintSample | null) {
            if (!disposed && connection === owner && sample) gesture.sample(sample)
          },
          end(commit: boolean) {
            if (disposed || connection !== owner) return
            if (gesture.end(commit) && !disposed && connection === owner)
              publish({ ...snapshot, phase: 'applied', error: null })
          },
        },
        cancel: () => {
          gesture.cancel()
        },
        dispose() {
          if (disposed) return
          disposed = true
          if (connection === owner) connection = null
          gesture.dispose()
          if (!connection) publish({ phase: 'idle', stats: null, error: null })
        },
      }
      if (generation !== ticket) owner.dispose()
      else {
        connection = owner
        publish({ phase: 'idle', stats: null, error: null })
      }
      return owner
    },
  }
}

export type SceneSkinPaintSession = ReturnType<typeof createSceneSkinPaintSession>
