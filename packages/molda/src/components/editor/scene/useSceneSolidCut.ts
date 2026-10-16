import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { type AffineMatrix, transformPoint } from '../../../scene/matrix'
import type { MeshCutPlane } from '../../../scene/meshPlaneCut'
import { meshPlaneSection } from '../../../scene/meshPlaneSection'
import { meshSectionPath } from '../../../scene/meshSectionPath'
import { indexMeshEdges } from '../../../scene/meshTopology'
import { sceneLocalBounds } from '../../../scene/pivot'
import { prepareSceneSolidCut } from '../../../scene/solidCut'
import {
  type SceneCutPoint,
  sceneCutPoint,
  sceneSolidCutPlane,
  validateSceneSolidCutPlane,
} from '../../../scene/solidCutPoints'
import { requireScene } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import type { ScenePreviewGuideState } from '../../../viewport/ScenePreviewGuide'
import { cutSolidInWorker } from '../../../workers/sceneSolidCut'

interface CutOwner {
  source: MoldaSceneDocument
  revision: number
  nodeId: string
  points: SceneCutPoint[]
  prepared: ReturnType<typeof prepareSceneSolidCut>
  topology: ReturnType<typeof indexMeshEdges>
  world: Readonly<AffineMatrix>
  extent: number
  numericPlane: MeshCutPlane | null
}
export function useSceneSolidCut(
  editor: EditorStore<MoldaSceneDocument>,
  commit: (next: MoldaSceneDocument) => boolean,
) {
  const [owner, setOwner] = useState<CutOwner | null>(null),
    live = useRef(owner)
  const [midpoint, setMidpoint] = useState(true),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false)
  const [hover, setHover] = useState<SceneCutPoint | null>(null)
  const pending = useRef<AbortController | null>(null)
  const show = useCallback((value: CutOwner | null) => {
    live.current = value
    setOwner(value)
  }, [])
  const cancel = useCallback(() => {
    pending.current?.abort()
    pending.current = null
    show(null)
    setHover(null)
    setError(null)
    setBusy(false)
  }, [show])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state) => {
      const current = live.current
      if (
        current &&
        (state.content !== current.source || state.contentRevision !== current.revision)
      )
        cancel()
    })
    return () => {
      unsubscribe()
      pending.current?.abort()
      pending.current = null
    }
  }, [editor, cancel])
  const { plane, pointError } = useMemo(() => {
    if (owner?.numericPlane) return { plane: owner.numericPlane, pointError: null }
    if (!owner || owner.points.length < 2) return { plane: null, pointError: null }
    try {
      return {
        plane: sceneSolidCutPlane(owner.prepared.mesh, owner.points, owner.topology),
        pointError: null,
      }
    } catch (reason) {
      return {
        plane: null,
        pointError: reason instanceof Error ? reason.message : 'Confira os pontos do corte.',
      }
    }
  }, [owner])
  const guide = useMemo<ScenePreviewGuideState | null>(() => {
    if (!owner) return null
    const world = owner.world
    const localPoints = owner.points.map((point) =>
      sceneCutPoint(owner.prepared.mesh, point, owner.topology),
    )
    const points = localPoints.map((point) => transformPoint(world, point))
    const current = hover
      ? transformPoint(world, sceneCutPoint(owner.prepared.mesh, hover, owner.topology))
      : null
    const worldSegments = (
      value: ReturnType<typeof sceneSolidCutPlane>,
      path?: readonly (typeof points)[number][],
    ) => {
      const section = meshPlaneSection(owner.prepared.mesh, value)
      return (path ? meshSectionPath(section, path) : section).map(
        ([a, b]) => [transformPoint(world, a), transformPoint(world, b)] as const,
      )
    }
    let provisional: ReturnType<typeof worldSegments> = []
    if (
      hover &&
      owner.points.length &&
      !owner.points.some((point) => point.edgeId === hover.edgeId && point.t === hover.t)
    ) {
      try {
        const previewPlane = sceneSolidCutPlane(
          owner.prepared.mesh,
          [...owner.points, hover],
          owner.topology,
        )
        provisional = worldSegments(previewPlane, [
          localPoints.at(-1)!,
          sceneCutPoint(owner.prepared.mesh, hover, owner.topology),
        ])
      } catch {
        /* An incompatible next point has no misleading preview through the volume. */
      }
    }
    return {
      size: owner.extent,
      points,
      cut: {
        segments: plane ? worldSegments(plane, owner.numericPlane ? undefined : localPoints) : [],
        provisional,
        midpoints: midpoint
          ? [...owner.topology.edges.keys()]
              .filter(
                (id) =>
                  !owner.points.some((point) => point.edgeId === id && point.t === 0.5) &&
                  !(hover?.edgeId === id && hover.t === 0.5),
              )
              .map((edgeId) =>
                transformPoint(
                  world,
                  sceneCutPoint(owner.prepared.mesh, { edgeId, t: 0.5 }, owner.topology),
                ),
              )
          : [],
      },
      ...(current ? { hover: current } : {}),
    }
  }, [owner, hover, midpoint, plane])
  return {
    owner,
    plane,
    setNumericPlane: (candidate: MeshCutPlane) => {
      const current = live.current
      if (!current || pending.current) return
      try {
        const numericPlane = validateSceneSolidCutPlane(current.prepared.mesh, candidate)
        show({ ...current, points: [], numericPlane })
        setHover(null)
        setError(null)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Confira o plano do corte.')
      }
    },
    setPointPosition: (index: number, t: number) => {
      const current = live.current
      if (!current || pending.current || !current.points[index]) return
      try {
        const point = { ...current.points[index]!, t }
        const position = sceneCutPoint(current.prepared.mesh, point, current.topology)
        requireScene(
          !current.points.some(
            (other, i) =>
              i !== index &&
              sceneCutPoint(current.prepared.mesh, other, current.topology).every(
                (n, axis) => Math.abs(n - position[axis]!) <= current.extent * 1e-12,
              ),
          ),
          'point',
          'Esse ponto já está marcado. Escolha outro lugar.',
        )
        show({
          ...current,
          numericPlane: null,
          points: current.points.map((p, i) => (i === index ? point : p)),
        })
        setError(null)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Use uma posição entre 0 e 100%.')
      }
    },
    midpoint,
    setMidpoint,
    busy,
    error: error ?? pointError,
    guide,
    cancel,
    hover: (point: SceneCutPoint | null) => {
      const current = live.current
      if (point && current && current.points.length >= 3) {
        try {
          sceneSolidCutPlane(current.prepared.mesh, [...current.points, point], current.topology)
        } catch {
          point = null
        }
      }
      setHover((before) =>
        before?.edgeId === point?.edgeId && before?.t === point?.t ? before : point,
      )
    },
    start: (nodeId: string) => {
      cancel()
      try {
        const state = editor.getState()
        const prepared = prepareSceneSolidCut(state.content, nodeId)
        show({
          source: state.content,
          revision: state.contentRevision,
          nodeId,
          points: [],
          numericPlane: null,
          prepared,
          topology: indexMeshEdges(prepared.mesh),
          world: indexSceneDocument(state.content).scene.worldMatrices.get(nodeId)!,
          extent: Math.max(...(sceneLocalBounds(state.content, nodeId)?.size ?? [1])),
        })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Escolha uma peça para cortar.')
      }
    },
    point: (point: SceneCutPoint) => {
      const current = live.current
      if (!current || pending.current) return
      const candidate = sceneCutPoint(current.prepared.mesh, point, current.topology)
      if (
        current.points.some((entry) =>
          sceneCutPoint(current.prepared.mesh, entry, current.topology).every(
            (n, axis) => Math.abs(n - candidate[axis]!) <= current.extent * 1e-12,
          ),
        )
      ) {
        setError('Esse ponto já está marcado. Escolha outro lugar.')
        return
      }
      if (current.points.length >= 64) {
        setError('Este corte já tem 64 pontos. Corrija um ponto para continuar.')
        return
      }
      if (current.points.length >= 3) {
        try {
          sceneSolidCutPlane(current.prepared.mesh, [...current.points, point], current.topology)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Esse ponto sai do plano do corte.')
          return
        }
      }
      show({ ...current, numericPlane: null, points: [...current.points, point] })
      setError(null)
    },
    back: () => {
      const current = live.current
      if (current && !pending.current) {
        show({ ...current, points: current.points.slice(0, -1) })
        setError(null)
      }
    },
    canConfirm: !!plane && !busy && !error,
    confirm: async () => {
      const current = live.current
      if (!current || pending.current || error) return false
      let plane: ReturnType<typeof sceneSolidCutPlane>
      try {
        plane =
          current.numericPlane ??
          sceneSolidCutPlane(current.prepared.mesh, current.points, current.topology)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Confira os pontos.')
        return false
      }
      const controller = new AbortController()
      pending.current = controller
      setBusy(true)
      setError(null)
      try {
        const halves =
          current.prepared.boxSplit(plane) ??
          (await cutSolidInWorker(
            {
              documentId: current.source.id,
              revision: current.revision,
              mesh: current.prepared.mesh,
              capId: current.prepared.capId,
              plane,
            },
            controller.signal,
          ))
        if (
          controller.signal.aborted ||
          live.current !== current ||
          editor.getState().contentRevision !== current.revision
        )
          return false
        const next = current.prepared.commit(halves)
        pending.current = null
        show(null)
        const accepted = commit(next)
        if (!accepted) show(current)
        return accepted
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível cortar. A peça foi preservada.',
          )
        return false
      } finally {
        if (pending.current === controller) pending.current = null
        if (!controller.signal.aborted) setBusy(false)
      }
    },
  }
}
