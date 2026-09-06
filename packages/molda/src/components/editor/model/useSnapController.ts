import { useCallback, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaModelAsset } from '../../../core/model'
import { findPart, resolveSourceId } from '../../../model/partOps'
import {
  applySnapMove,
  type SnapAnchor,
  type SnapMoveFailure,
  snapSourceAnchors,
} from '../../../model/snap'
import type { SessionStore, TransformTool } from '../../../state/sessionStore'
import type { ViewportSnapState } from '../../../viewport/types'

interface UseSnapControllerOptions {
  session: SessionStore
  model: () => MoldaModelAsset
  commit: (model: MoldaModelAsset) => void
  showToast: (message: string) => void
}

interface SnapController {
  state: ViewportSnapState
  instruction: string | undefined
  chooseTool: (tool: TransformTool) => void
  toggle: () => void
  cancel: () => void
  chooseSource: (anchor: SnapAnchor) => void
  chooseTarget: (anchor: SnapAnchor) => void
}

function failureMessage(reason: SnapMoveFailure): string {
  return COPY.editor.model.snap.errors[reason]
}

function selectedSources(
  currentModel: MoldaModelAsset,
  selectedId: string | null,
  extraIds: readonly string[],
): { primaryId: string; movingIds: string[] } | null {
  if (!selectedId) return null
  const primaryId = resolveSourceId(currentModel, selectedId)
  const movingIds = [primaryId, ...extraIds.map((id) => resolveSourceId(currentModel, id))].filter(
    (id, index, ids) => ids.indexOf(id) === index,
  )
  return { primaryId, movingIds }
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

export function useSnapController({
  session,
  model,
  commit,
  showToast,
}: UseSnapControllerOptions): SnapController {
  const [state, setState] = useState<ViewportSnapState>({ phase: 'inactive' })

  const cancel = useCallback(() => {
    setState({ phase: 'inactive' })
    const current = session.getState()
    if (current.tool === 'snap') current.setTool('move')
  }, [session])

  const toggle = useCallback(() => {
    const currentSession = session.getState()
    if (currentSession.tool === 'snap') {
      cancel()
      return
    }
    if (currentSession.meshEditId) return
    if (!currentSession.selectedId) {
      showToast(COPY.editor.model.snap.selectPart)
      return
    }
    const currentModel = model()
    const selected = selectedSources(
      currentModel,
      currentSession.selectedId,
      currentSession.extraIds,
    )
    if (!selected) return
    const { primaryId, movingIds } = selected
    const parts = movingIds.map((id) => findPart(currentModel, id))
    if (parts.some((part) => part?.locked)) {
      showToast(COPY.editor.model.snap.locked)
      return
    }
    const primary = findPart(currentModel, primaryId)
    if (!primary || primary.hidden) {
      showToast(COPY.editor.model.snap.hidden)
      return
    }
    if (snapSourceAnchors(currentModel, primaryId, movingIds).length === 0) {
      showToast(COPY.editor.model.snap.unavailable)
      return
    }
    currentSession.setPlacingShape(null)
    currentSession.setTool('snap')
    setState({ phase: 'source', primaryId, movingIds })
  }, [cancel, model, session, showToast])

  const chooseTool = useCallback(
    (tool: TransformTool) => {
      if (tool === 'snap') {
        toggle()
        return
      }
      setState({ phase: 'inactive' })
      session.getState().setTool(tool)
    },
    [session, toggle],
  )

  const chooseSource = useCallback((anchor: SnapAnchor) => {
    setState((current) =>
      current.phase === 'source' ? { ...current, phase: 'target', source: anchor } : current,
    )
  }, [])

  const chooseTarget = useCallback(
    (anchor: SnapAnchor) => {
      if (state.phase !== 'target') return
      const currentModel = model()
      const currentSession = session.getState()
      const selected = selectedSources(
        currentModel,
        currentSession.selectedId,
        currentSession.extraIds,
      )
      // A UI pode mudar a seleção por outra entrada enquanto o palco está no
      // segundo toque. Nunca aplique o snapshot antigo sobre a seleção nova.
      if (
        currentSession.tool !== 'snap' ||
        !selected ||
        selected.primaryId !== state.primaryId ||
        !sameIds(selected.movingIds, state.movingIds)
      ) {
        cancel()
        return
      }
      const result = applySnapMove(currentModel, state.movingIds, state.source.ref, anchor.ref)
      if (!result.ok) {
        showToast(failureMessage(result.reason))
        return
      }
      commit(result.model)
      const primaryId = result.movedIds.includes(state.primaryId)
        ? state.primaryId
        : (result.movedIds[0] ?? null)
      currentSession.select(primaryId)
      currentSession.setExtraIds(result.movedIds.filter((id) => id !== primaryId))
      currentSession.setTool('move')
      setState({ phase: 'inactive' })
    },
    [cancel, commit, model, session, showToast, state],
  )

  return {
    state,
    instruction:
      state.phase === 'source'
        ? COPY.editor.model.snap.source
        : state.phase === 'target'
          ? COPY.editor.model.snap.target
          : undefined,
    chooseTool,
    toggle,
    cancel,
    chooseSource,
    chooseTarget,
  }
}
