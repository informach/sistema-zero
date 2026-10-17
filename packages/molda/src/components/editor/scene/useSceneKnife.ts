import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { editSceneMesh } from '../../../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { type AffineMatrix, transformPoint } from '../../../scene/matrix'
import type { SceneComponentSelection } from '../../../scene/meshComponents'
import {
  cutMeshWithKnife,
  type MeshKnifePoint,
  meshKnifePointPosition as position,
} from '../../../scene/meshKnife'
import { meshSymmetrySource } from '../../../scene/meshSymmetry'
import { indexMeshEdges } from '../../../scene/meshTopology'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import { sceneLocalBounds } from '../../../scene/pivot'
import { requireScene } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import type { ScenePreviewGuideState } from '../../../viewport/ScenePreviewGuide'
import { useMoldaToolGate } from '../../toolAccess'

interface KnifeOwner {
  source: MoldaSceneDocument
  revision: number
  nodeId: string
  mesh: SceneMeshGeometry
  topology: ReturnType<typeof indexMeshEdges>
  world: Readonly<AffineMatrix>
  extent: number
  points: MeshKnifePoint[]
  selection: SceneComponentSelection | null
}

/** A knife session previews derived topology; only Apply creates a history entry. */
export function useSceneKnife(
  editor: EditorStore<MoldaSceneDocument>,
  commit: (document: MoldaSceneDocument) => boolean,
) {
  const { allowed, canUse } = useMoldaToolGate('model.cut')
  const [owner, setOwner] = useState<KnifeOwner | null>(null),
    live = useRef(owner)
  const [hover, setHover] = useState<MeshKnifePoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [midpoint, setMidpoint] = useState(false)
  const show = useCallback((next: KnifeOwner | null) => {
    live.current = next
    setOwner(next)
  }, [])
  const cancel = useCallback(() => {
    show(null)
    setHover(null)
    setError(null)
  }, [show])
  const reset = useCallback(() => {
    if (live.current) show({ ...live.current, points: [] })
    setHover(null)
    setError(null)
  }, [show])
  const ownerEditor = useRef(editor)
  useLayoutEffect(() => {
    if (ownerEditor.current !== editor) cancel()
    ownerEditor.current = editor
  }, [editor, cancel])
  useLayoutEffect(() => {
    if (!allowed) cancel()
  }, [allowed, cancel])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state) => {
      const current = live.current
      if (
        current &&
        (state.content !== current.source || state.contentRevision !== current.revision)
      )
        cancel()
    })
    const hidden = () => {
      if (document.hidden) reset()
    }
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', reset)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', reset)
      live.current = null
    }
  }, [editor, cancel, reset])
  const prepared = useMemo(() => {
    if (!owner || owner.points.length < 2) return { result: null, error: null }
    try {
      return { result: cutMeshWithKnife(owner.mesh, owner.points), error: null }
    } catch (reason) {
      return {
        result: null,
        error: reason instanceof Error ? reason.message : 'Corrija os pontos do corte.',
      }
    }
  }, [owner])
  const guide = useMemo<ScenePreviewGuideState | null>(() => {
    if (!owner) return null
    const points = owner.points.map((p) =>
      transformPoint(owner.world, position(owner.mesh, p, owner.topology)),
    )
    const current = hover
      ? transformPoint(owner.world, position(owner.mesh, hover, owner.topology))
      : null
    return {
      size: owner.extent,
      points,
      cut: {
        midpoints: [],
        segments:
          prepared.result?.segments.map(
            ([a, b]) => [transformPoint(owner.world, a), transformPoint(owner.world, b)] as const,
          ) ?? points.slice(1).map((end, i) => [points[i]!, end] as const),
        provisional: current && points.length ? [[points.at(-1)!, current]] : [],
      },
      ...(current ? { hover: current } : {}),
    }
  }, [owner, hover, prepared])
  return {
    owner,
    closePoint:
      owner && owner.points.length >= 3
        ? {
            point: owner.points[0]!,
            position: position(owner.mesh, owner.points[0]!, owner.topology),
          }
        : null,
    guide,
    error: error ?? prepared.error,
    midpoint,
    setMidpoint,
    cancel,
    reset,
    canConfirm: allowed && !!prepared.result && !error,
    hover: (point: MeshKnifePoint | null) => setHover(point),
    start: (nodeId: string, selection: SceneComponentSelection | null = null) => {
      cancel()
      if (!canUse()) return
      try {
        const state = editor.getState(),
          source = state.content,
          index = indexSceneDocument(source)
        const node = index.scene.nodes.get(nodeId),
          flags = evaluateSceneNodeFlags(index.scene).get(nodeId)
        requireScene(
          node?.kind === 'mesh' && !flags?.hidden && !flags?.locked,
          'node',
          'Escolha uma peça visível e destravada para cortar.',
        )
        const geometry = index.geometries.get(node.geometryId)
        requireScene(geometry, 'geometry', 'A forma da peça não está disponível.')
        const mesh = meshSymmetrySource(sceneGeometryMesh(geometry))
        show({
          source,
          revision: state.contentRevision,
          nodeId,
          mesh,
          topology: indexMeshEdges(mesh),
          world: index.scene.worldMatrices.get(nodeId)!,
          extent: Math.max(...(sceneLocalBounds(source, nodeId)?.size ?? [1])),
          points: [],
          selection: selection ? { ...selection, ids: [...selection.ids] } : null,
        })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Escolha uma peça para cortar.')
      }
    },
    mark: (point: MeshKnifePoint) => {
      const current = live.current
      if (!current || !canUse()) return
      try {
        requireScene(
          current.points.length < 64,
          'cut',
          'Este traçado já tem 64 pontos. Aplique ou corrija um ponto.',
        )
        const p = position(current.mesh, point, current.topology),
          last = current.points.at(-1)
        requireScene(
          !last ||
            Math.hypot(
              ...position(current.mesh, last, current.topology).map((n, axis) => n - p[axis]!),
            ) >
              current.extent * 1e-10,
          'point',
          'Esse ponto já está marcado. Escolha outro lugar.',
        )
        show({ ...current, points: [...current.points, point] })
        setError(null)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Confira o ponto do corte.')
      }
    },
    back: () => {
      const current = live.current
      if (current) {
        show({ ...current, points: current.points.slice(0, -1) })
        setError(null)
        setHover(null)
      }
    },
    confirm: () => {
      const current = live.current
      if (!canUse() || !current || current !== owner || !prepared.result || error) return null
      try {
        requireScene(
          editor.getState().content === current.source &&
            editor.getState().contentRevision === current.revision,
          'cut',
          'A peça mudou. Marque o corte novamente.',
        )
        const next = editSceneMesh(current.source, current.nodeId, () => prepared.result!.mesh)
        cancel()
        if (!commit(next)) {
          show(current)
          setError('Não foi possível aplicar o corte. Sua peça foi preservada.')
          return null
        }
        return { nodeId: current.nodeId, faceIds: prepared.result.faceIds }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível aplicar o corte. Sua peça foi preservada.',
        )
        return null
      }
    },
  }
}
