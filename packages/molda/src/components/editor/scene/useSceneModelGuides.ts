import { useEffect, useRef, useState } from 'react'
import type { Vec3 } from '../../../core/model'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { MeshCutPlane } from '../../../scene/meshPlaneCut'
import {
  divideSceneByWorldPlane,
  sceneDivisionPlane,
  scenePivotTargets,
} from '../../../scene/modelGuides'
import type { EditorStore } from '../../../state/editorStore'
import type { ScenePreviewGuideState } from '../../../viewport/ScenePreviewGuide'
import type { CameraView } from '../../../viewport/types'

type CutView = 'front' | 'left' | 'top'
const directions: Record<CutView, Vec3> = { front: [0, 0, 1], left: [1, 0, 0], top: [0, 1, 0] }
interface Owner {
  source: MoldaSceneDocument
  revision: number
  nodeId: string
  points: Vec3[]
  view: CutView
  candidate: MoldaSceneDocument | null
  guide: ScenePreviewGuideState
  center: Vec3
}

export function useSceneModelGuides(
  editor: EditorStore<MoldaSceneDocument>,
  commit: (next: MoldaSceneDocument) => boolean,
) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraRequest, setCameraRequest] = useState<{ view: CameraView } | null>(null)
  const live = useRef(owner)
  live.current = owner
  const show = (next: Owner | null) => {
    live.current = next
    setOwner(next)
  }
  const cancel = () => {
    show(null)
    setError(null)
    setCameraRequest(null)
  }
  useEffect(
    () =>
      editor.subscribe((state) => {
        if (
          live.current &&
          (state.content !== live.current.source || state.contentRevision !== live.current.revision)
        ) {
          live.current = null
          setOwner(null)
        }
      }),
    [editor],
  )
  function begin(nodeId: string, view: CutView) {
    const source = editor.getState().content,
      targets = scenePivotTargets(source, nodeId)
    return {
      source,
      revision: editor.getState().contentRevision,
      nodeId,
      view,
      points: [],
      candidate: null,
      guide: { size: targets.size },
      center: targets.center,
    } satisfies Owner
  }
  function division(current: Owner, plane: MeshCutPlane, points: Vec3[]) {
    try {
      const candidate = divideSceneByWorldPlane(current.source, current.nodeId, plane)
      show({ ...current, candidate, points, guide: { size: current.guide.size, points, plane } })
      setError(
        candidate === current.source ? 'O plano não atravessa a peça. Mova os pontos.' : null,
      )
    } catch (error) {
      show({
        ...current,
        candidate: null,
        points,
        guide: { size: current.guide.size, points, plane },
      })
      setError(error instanceof Error ? error.message : 'Não foi possível dividir essa peça.')
    }
  }
  return {
    pending: () => live.current,
    owner,
    error,
    cameraRequest,
    document: owner?.candidate ?? null,
    guide: owner?.guide ?? null,
    cancel,
    cut: (nodeId: string, view: CutView) => {
      try {
        show(begin(nodeId, view))
        setCameraRequest({ view })
        setError(null)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Escolha uma peça.')
      }
    },
    centerCut: () => {
      const current = live.current
      if (!current) return
      const { center, size } = scenePivotTargets(current.source, current.nodeId)
      const axis = current.view === 'top' ? 2 : 1
      const a: Vec3 = [...center],
        b: Vec3 = [...center]
      a[axis] -= size / 2
      b[axis] += size / 2
      division(current, sceneDivisionPlane(a, b, directions[current.view]), [a, b])
    },
    correctPoint: () => {
      const current = live.current
      if (!current) return
      const points = current.points.slice(0, -1)
      show({ ...current, points, candidate: null, guide: { size: current.guide.size, points } })
      setError(null)
    },
    input:
      owner && owner.points.length < 2
        ? { plane: { origin: owner.center, normal: directions[owner.view] } }
        : null,
    point: (point: Vec3) => {
      const current = live.current
      if (
        !current ||
        editor.getState().content !== current.source ||
        editor.getState().contentRevision !== current.revision
      )
        return
      const points = [...current.points, point].slice(-2)
      if (points.length === 2) {
        try {
          division(
            current,
            sceneDivisionPlane(points[0]!, points[1]!, directions[current.view]),
            points,
          )
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Escolha dois pontos distintos.')
        }
      } else show({ ...current, points, guide: { size: current.guide.size, points } })
    },
    confirm: () => {
      const current = live.current
      if (
        !current?.candidate ||
        current.candidate === current.source ||
        editor.getState().content !== current.source ||
        editor.getState().contentRevision !== current.revision
      )
        return false
      cancel()
      const applied = commit(current.candidate)
      if (!applied && editor.getState().content === current.source) show(current)
      return applied
    },
  }
}
