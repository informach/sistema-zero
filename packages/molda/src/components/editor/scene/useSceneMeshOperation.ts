import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { newId } from '../../../core/id'
import type { Vec3 } from '../../../core/model'
import { editSceneMesh } from '../../../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  transformPoint,
} from '../../../scene/matrix'
import {
  duplicateMeshFaces,
  fillMeshHole,
  meshHoleMaterials,
  meshLocalBox,
  mirrorMeshFaces,
} from '../../../scene/meshComponentOperations'
import type { SceneComponentSelection, SceneComponentSession } from '../../../scene/meshComponents'
import { cutMeshEdgeRings } from '../../../scene/meshRingCuts'
import { meshSymmetrySource, symmetrySourceIds } from '../../../scene/meshSymmetry'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import type { EditorStore } from '../../../state/editorStore'
import type { ScenePreviewGuideState } from '../../../viewport/ScenePreviewGuide'
import { useMoldaToolGate } from '../../toolAccess'

export type MeshOperationSpec =
  | { kind: 'mirror'; axis: 0 | 1 | 2; copy: boolean; continuous: boolean }
  | { kind: 'duplicate'; offset: Vec3 }
  | { kind: 'fill'; material?: string }
  | { kind: 'ring'; count: number; offset: number }
interface Owner {
  editor: EditorStore<MoldaSceneDocument>
  source: MoldaSceneDocument
  revision: number
  selection: SceneComponentSession
  targets: readonly string[]
  mesh: SceneMeshGeometry
  full: SceneMeshGeometry
  world: Readonly<AffineMatrix>
  spec: MeshOperationSpec
  pool: string[]
}

/** Pure document previews share source ownership and stable IDs; only Apply publishes a revision. */
export function useSceneMeshOperation(
  editor: EditorStore<MoldaSceneDocument>,
  nodeId: string | null,
  commit: (next: MoldaSceneDocument) => MoldaSceneDocument | null,
  setSession: (selection: SceneComponentSession | null) => void,
) {
  const { allowed, canUse } = useMoldaToolGate('model.mesh-pro')
  const [owner, setOwner] = useState<Owner | null>(null),
    live = useRef(owner),
    [error, setError] = useState<string | null>(null),
    [showPreview, setShowPreview] = useState(true)
  const move = useRef<Vec3 | null>(null)
  const show = useCallback((next: Owner | null) => {
    live.current = next
    setOwner(next)
  }, [])
  const cancel = useCallback(() => {
    const before = live.current
    show(null)
    setError(null)
    move.current = null
    if (before && before.editor === editor && before.source === editor.getState().content)
      setSession(before.selection)
  }, [editor, setSession, show])
  useLayoutEffect(() => {
    if (owner && (!allowed || owner.editor !== editor || owner.selection.nodeId !== nodeId))
      cancel()
  }, [allowed, editor, nodeId, owner, cancel])
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
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', cancel)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', cancel)
      live.current = null
    }
  }, [editor, cancel])
  const prepared = useMemo(() => {
    if (!owner) return null
    try {
      let cursor = 0
      const allocate = () => {
        const i = cursor++
        let id = owner.pool[i]
        if (!id) {
          id = newId()
          owner.pool[i] = id
        }
        return id
      }
      const { mesh, spec, targets } = owner
      const ring =
        spec.kind === 'ring'
          ? cutMeshEdgeRings(mesh, targets, spec.count, spec.offset, allocate)
          : null
      const result =
        spec.kind === 'mirror'
          ? mirrorMeshFaces(
              mesh,
              targets,
              { ...spec, center: meshLocalBox(owner.full).center[spec.axis] },
              allocate,
            )
          : spec.kind === 'duplicate'
            ? duplicateMeshFaces(mesh, targets, spec.offset, allocate, true)
            : spec.kind === 'fill'
              ? fillMeshHole(mesh, targets, spec.material, allocate)
              : ring!
      const document = editSceneMesh(
        owner.source,
        owner.selection.nodeId,
        () => result.mesh,
        allocate,
        { symmetricNewFaces: spec.kind === 'duplicate' && !!owner.full.symmetry },
      )
      return { result, document, segments: ring?.segments ?? [], error: null }
    } catch (reason) {
      return {
        result: null,
        document: null,
        error: reason instanceof Error ? reason.message : 'Confira a seleção e os ajustes.',
      }
    }
  }, [owner])
  const neutral = owner?.spec.kind === 'duplicate' && owner.spec.offset.every((n) => n === 0)
  const guide = useMemo<ScenePreviewGuideState | null>(() => {
    if (!owner) return null
    const box = meshLocalBox(owner.full),
      size = Math.max(box.extent, 1e-6)
    if (owner.spec.kind === 'mirror') {
      const axis = owner.spec.axis,
        center = box.center
      const inverse = affineInverse(owner.world)
      if (!inverse) return null
      const normal: Vec3 = [inverse[axis]!, inverse[4 + axis]!, inverse[8 + axis]!],
        point = transformPoint(owner.world, center)
      // The inverse transpose transports the local plane through rotation, scale and shear.
      const length = Math.hypot(...normal),
        unit = normal.map((n) => n / length) as Vec3
      return { size, points: [point], plane: { normal: unit, origin: point } }
    }
    if (owner.spec.kind === 'ring' && prepared?.result)
      return {
        size,
        cut: {
          midpoints: [],
          segments: prepared.segments!.map(
            ([a, b]) => [transformPoint(owner.world, a), transformPoint(owner.world, b)] as const,
          ),
          provisional: [],
        },
      }
    return null
  }, [owner, prepared])
  function configure(spec: MeshOperationSpec) {
    const current = live.current
    if (current && current.spec.kind === spec.kind) {
      show({ ...current, spec })
      setError(null)
    }
  }
  return {
    owner,
    kind: owner?.spec.kind ?? null,
    spec: owner?.spec ?? null,
    error: error ?? prepared?.error ?? null,
    canConfirm: allowed && !!prepared?.document && !neutral && !error,
    document: showPreview && owner?.spec.kind !== 'ring' ? (prepared?.document ?? null) : null,
    selection:
      showPreview && owner?.spec.kind === 'duplicate' && prepared?.result
        ? ({
            nodeId: owner.selection.nodeId,
            mode: 'face',
            ids: prepared.result.faceIds,
          } as SceneComponentSelection)
        : null,
    guide: showPreview ? guide : null,
    showPreview,
    setShowPreview,
    configure,
    cancel,
    materials: owner?.spec.kind === 'fill' ? meshHoleMaterials(owner.mesh, owner.targets) : [],
    target: (ids: readonly string[]) => {
      const current = live.current
      if (current && (current.spec.kind === 'ring' || current.spec.kind === 'fill')) {
        show({ ...current, targets: [...ids] })
        setError(null)
      }
    },
    start: (
      kind: MeshOperationSpec['kind'],
      selection: SceneComponentSession,
      full: SceneMeshGeometry,
    ) => {
      cancel()
      if (!canUse()) return false
      const state = editor.getState(),
        index = indexSceneDocument(state.content),
        flags = evaluateSceneNodeFlags(index.scene).get(selection.nodeId)
      if (flags?.locked || flags?.hidden) return false
      const mesh = meshSymmetrySource(full),
        edge = kind === 'ring' || kind === 'fill'
      const spec: MeshOperationSpec =
        kind === 'mirror'
          ? { kind, axis: 0, copy: true, continuous: false }
          : kind === 'duplicate'
            ? { kind, offset: [0, 0, 0] }
            : kind === 'fill'
              ? { kind }
              : { kind, count: 1, offset: 0 }
      show({
        editor,
        source: state.content,
        revision: state.contentRevision,
        selection: { ...selection, ids: [...selection.ids] },
        targets: edge && selection.mode !== 'edge' ? [] : [...selection.ids],
        mesh,
        full,
        world: index.scene.worldMatrices.get(selection.nodeId)!,
        spec,
        pool: [],
      })
      if (edge)
        setSession({
          ...selection,
          mode: 'edge',
          ids: selection.mode === 'edge' ? selection.ids : [],
        })
      setError(null)
      setShowPreview(true)
      return true
    },
    confirm: () => {
      const current = live.current
      if (
        !canUse() ||
        current !== owner ||
        !current ||
        !prepared?.document ||
        !prepared.result ||
        neutral ||
        error
      )
        return false
      if (
        current.editor !== editor ||
        current.source !== editor.getState().content ||
        current.revision !== editor.getState().contentRevision
      ) {
        cancel()
        return false
      }
      show(null)
      const next = commit(prepared.document)
      if (!next) {
        show(current)
        setError('Não foi possível aplicar. Sua peça foi preservada.')
        return false
      }
      const node = next.nodes.find((node) => node.id === current.selection.nodeId),
        geometry =
          node?.kind === 'mesh' ? next.geometries.find((g) => g.id === node.geometryId) : null
      if (geometry) {
        const full = sceneGeometryMesh(geometry)
        setSession({
          nodeId: current.selection.nodeId,
          geometryId: full.id,
          mode: 'face',
          ids: symmetrySourceIds(full, 'face', prepared.result.faceIds),
        })
      }
      move.current = null
      return true
    },
    transform: {
      dragging: move.current !== null,
      error: null,
      begin: () => {
        const current = live.current
        if (current?.spec.kind !== 'duplicate') return false
        move.current = [...current.spec.offset]
        return true
      },
      preview: (delta: AffineMatrix) => {
        const current = live.current,
          offset = move.current
        if (current?.spec.kind !== 'duplicate' || !offset) return false
        const inverse = affineInverse(current.world)
        if (!inverse) {
          setError('A escala da peça precisa ser diferente de zero para mover a cópia.')
          return false
        }
        const local = affineMultiply(affineMultiply(inverse, delta), current.world)
        configure({
          kind: 'duplicate',
          offset: [offset[0] + local[12], offset[1] + local[13], offset[2] + local[14]],
        })
        return true
      },
      end: (accepted: boolean) => {
        if (!accepted && move.current) configure({ kind: 'duplicate', offset: move.current })
        move.current = null
      },
      cancel: () => {
        if (move.current) configure({ kind: 'duplicate', offset: move.current })
        move.current = null
      },
    },
  }
}
