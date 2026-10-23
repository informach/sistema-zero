import { useLayoutEffect, useRef } from 'react'
import { appendSceneImport } from '../../../scene/appendImport'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import type { useSceneImportSession } from './useSceneImportSession'

export type SceneImportStage<Ready> =
  | { kind: 'choose'; message?: string }
  | { kind: 'reading-files' }
  | { kind: 'busy'; progress: 'validating' | 'reading' | 'converting' }
  | { kind: 'missing'; paths: string[] }
  | { kind: 'ready'; result: Ready; accepted: boolean; error?: string }
  | { kind: 'error'; message: string; path?: string }
  | { kind: 'imported' }

/** Current consent and live host guard, then exactly one revision-owned editor commit. */
export function useSceneImportConfirmation<
  View extends {
    entryPath: string | null
    stage: SceneImportStage<{ document: MoldaSceneDocument }>
  },
>(
  session: ReturnType<typeof useSceneImportSession<View>>,
  canAdopt: (() => boolean) | undefined,
  messages: { pendingPose: string; failed: string; emptyScene: string },
) {
  const gate = useRef(canAdopt)
  useLayoutEffect(() => {
    gate.current = canAdopt
  }, [canAdopt])
  const { view, current, owner, owns, publish, detach, isCurrent } = session
  function accept(accepted: boolean) {
    if (
      view !== current.current ||
      view.stage.kind !== 'ready' ||
      !owner.current ||
      !owns(owner.current)
    )
      return
    publish({ ...view, stage: { ...view.stage, accepted } })
  }
  function confirm(): boolean {
    const entry = owner.current
    if (
      view !== current.current ||
      view.stage.kind !== 'ready' ||
      !view.stage.accepted ||
      !entry ||
      !owns(entry)
    )
      return false
    if (gate.current && !gate.current()) {
      if (owns(entry) && current.current === view)
        publish({ ...view, stage: { ...view.stage, error: messages.pendingPose } })
      return false
    }
    if (!owns(entry) || current.current !== view) return false
    const result = view.stage.result
    if (!result.document.nodes.length) {
      publish({ ...view, stage: { ...view.stage, error: messages.emptyScene } })
      return false
    }
    const generation = detach(entry)
    if (generation === null) return false
    try {
      const current = entry.editor.getState().asset
      const filename = view.entryPath?.split(/[\\/]/).at(-1) ?? ''
      const name = filename
        .replace(/\.(glb|gltf|obj|bbmodel)$/i, '')
        .trim()
        .slice(0, 48)
      entry.editor
        .getState()
        .commit(appendSceneImport(current, result.document, name || 'Modelo importado'))
      if (!isCurrent(generation)) return false
      publish({ ...view, stage: { kind: 'imported' } })
      return true
    } catch (error) {
      if (isCurrent(generation))
        publish({
          ...current.current,
          stage: {
            kind: 'error',
            message: error instanceof SceneValidationError ? error.message : messages.failed,
          },
        })
      return false
    }
  }
  return { accept, confirm }
}
