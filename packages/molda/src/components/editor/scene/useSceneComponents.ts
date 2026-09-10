import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { newId } from '../../../core/id'
import type { MeshSelectionAction } from '../../../model/topologySelection'
import { editSceneMesh } from '../../../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import type { indexSceneDocument } from '../../../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { bevelMeshEdges } from '../../../scene/meshBevel'
import {
  meshComponentIds,
  meshComponentVertices,
  type SceneComponentMode,
  type SceneComponentSelection,
  type SceneComponentSession,
  selectMeshComponents,
} from '../../../scene/meshComponents'
import { createMeshLooseEdge, cutMeshFaceBetweenVertices } from '../../../scene/meshCut'
import {
  MESH_ISSUE_MODES,
  type MeshFixKind,
  type MeshIssueKind,
} from '../../../scene/meshDiagnosis'
import { splitMeshEdges } from '../../../scene/meshEdges'
import { editMeshFaces, type SceneFaceAction } from '../../../scene/meshFaces'
import { dissolveMeshEdges } from '../../../scene/meshMerge'
import { cutMeshByPlane, type MeshCutPlane } from '../../../scene/meshPlaneCut'
import { prepareMeshRemoval } from '../../../scene/meshRemoval'
import { cutMeshEdgeRing } from '../../../scene/meshRingCut'
import { mapMeshUv } from '../../../scene/meshUv'
import { editMeshUv, type MeshUvOperation } from '../../../scene/meshUvOperations'
import { prepareMeshWeld } from '../../../scene/meshWeld'
import { createScenePath, type ScenePathSettings } from '../../../scene/pathCommands'
import type { SceneSkinInfluence } from '../../../scene/skin'
import { setSceneSkinWeights } from '../../../scene/skinCommands'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { useSceneComponentTransform } from './useSceneComponentTransform'
import {
  type SceneFacePreviewTool,
  type SceneFaceSession,
  useSceneFacePreview,
} from './useSceneFacePreview'
import { useSceneMeshCheck } from './useSceneMeshCheck'

/** Components remain session state. Every callback checks the current document before accepting IDs. */
export function useSceneComponents({
  editor,
  index,
  selected,
  covered,
  additive,
  cancel,
  run,
}: {
  editor: EditorStore<MoldaSceneDocument>
  index: ReturnType<typeof indexSceneDocument>
  selected: readonly string[]
  covered: ReadonlySet<string>
  additive: boolean
  cancel(): void
  run(
    command: (source: MoldaSceneDocument) => MoldaSceneDocument,
    selection?: 'created' | 'clear',
  ): MoldaSceneDocument | null
}) {
  const [session, setSession] = useState<SceneComponentSession | null>(null)
  // Equal document IDs/revisions in a replacement editor still belong to a new UI session.
  const weightSession = useMemo(() => ({ editor, key: newId() }), [editor])
  const revision = editor.getState().contentRevision
  const [softEnabled, setSoftEnabled] = useState(false)
  const [softReach, setSoftReach] = useState('1')
  const setFaceSession = useCallback((next: SceneFaceSession | null) => {
    setSession(
      next
        ? { nodeId: next.nodeId, geometryId: next.geometryId, mode: 'face', ids: next.faceIds }
        : null,
    )
  }, [])
  const preview = useSceneFacePreview(editor, setFaceSession)
  const transform = useSceneComponentTransform(editor, setSession)
  const meshCheck = useSceneMeshCheck(editor, setSession)
  const blocked = !!preview.tool || transform.dragging || meshCheck.busy || !!meshCheck.preview
  const flags = useMemo(() => evaluateSceneNodeFlags(index.scene), [index])
  const node = selected.length === 1 ? index.scene.nodes.get(selected[0] ?? '') : null
  const mesh = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null
  const editable =
    node?.kind === 'mesh' &&
    mesh?.kind === 'mesh' &&
    !flags.get(node.id)?.hidden &&
    ![...covered].some((id) => flags.get(id)?.locked)
  const selection = useMemo<SceneComponentSelection | null>(
    () =>
      editable && session?.nodeId === node.id && session.geometryId === mesh.id
        ? {
            nodeId: node.id,
            mode: session.mode,
            ids: (() => {
              const alive = new Set(meshComponentIds(mesh, session.mode))
              return session.ids.filter((id) => alive.has(id))
            })(),
          }
        : null,
    [editable, session, node, mesh],
  )
  const removal = useMemo(
    () => (selection && mesh?.kind === 'mesh' ? prepareMeshRemoval(mesh, selection) : null),
    [mesh, selection],
  )
  const skin = node ? index.skinsByNode.get(node.id) : undefined,
    weightVertices = useMemo(
      () =>
        skin && selection && mesh?.kind === 'mesh' ? meshComponentVertices(mesh, selection) : [],
      [skin, selection, mesh],
    ),
    weightOwner = useMemo(
      () => ({ editor, revision, selection, skin, blocked }),
      [editor, revision, selection, skin, blocked],
    ),
    activeWeights = useRef<typeof weightOwner | null>(null)
  useEffect(() => {
    activeWeights.current = weightOwner
    return () => {
      activeWeights.current = null
    }
  }, [weightOwner])
  const weld = useMemo(
    () =>
      selection?.mode === 'vertex' && mesh?.kind === 'mesh'
        ? prepareMeshWeld(mesh, selection.ids)
        : null,
    [mesh, selection],
  )
  const softMove = selection?.mode === 'vertex' && softEnabled
  const softRadius = Number(softReach)
  const softValid = softReach.trim() !== '' && Number.isFinite(softRadius) && softRadius > 0

  function close() {
    activeWeights.current = null
    cancel()
    meshCheck.clear()
    preview.cancel()
    transform.cancel()
    setSession(null)
  }
  function open(mode: SceneComponentMode = 'face') {
    if (!editable) return
    activeWeights.current = null
    cancel()
    meshCheck.cancel()
    preview.cancel()
    transform.cancel()
    setSession({ nodeId: node.id, geometryId: mesh.id, mode, ids: [] })
  }
  function select(componentId: string | null, add: boolean) {
    updateSelection(componentId === null ? [] : [componentId], add, true)
  }
  function updateSelection(ids: readonly string[], add: boolean, toggle = false) {
    if (blocked) return
    cancel()
    setSession((current) => {
      if (!current) return null
      const document = editor.getState().asset
      const liveNode = document.nodes.find((n) => n.id === current.nodeId)
      const liveMesh =
        liveNode?.kind === 'mesh' && liveNode.geometryId === current.geometryId
          ? document.geometries.find((g) => g.id === current.geometryId)
          : null
      if (liveMesh?.kind !== 'mesh') return null
      const alive = new Set(meshComponentIds(liveMesh, current.mode))
      if (ids.some((id) => !alive.has(id))) return current
      activeWeights.current = null
      const previous = current.ids.filter((id) => alive.has(id))
      const chosen = new Set(previous)
      for (const id of ids) {
        if (toggle && chosen.has(id)) chosen.delete(id)
        else chosen.add(id)
      }
      return {
        ...current,
        ids: add || additive ? [...chosen] : [...new Set(ids)],
      }
    })
  }
  function choose(action: MeshSelectionAction) {
    if (!selection || !editable || blocked) return
    activeWeights.current = null
    cancel()
    setSession({
      nodeId: node.id,
      geometryId: mesh.id,
      mode: selection.mode,
      ids: selectMeshComponents(mesh, selection, action),
    })
  }
  function apply(action: SceneFaceAction) {
    if (selection?.mode !== 'face' || !editable || blocked) return
    const oldFaces = new Set(Object.keys(mesh.faces))
    const chosen = new Set(selection.ids)
    applyMesh((mesh) => {
      const result = editMeshFaces(mesh, selection.ids, action)
      return {
        mesh: result,
        ids: Object.keys(result.faces).filter((id) => chosen.has(id) || !oldFaces.has(id)),
      }
    })
  }
  function splitEdges() {
    if (selection?.mode !== 'edge') return
    applyMesh((mesh) => {
      const result = splitMeshEdges(mesh, selection.ids)
      return { mesh: result.mesh, ids: result.edgeIds }
    })
  }
  function applyMesh(
    operation: (mesh: SceneMeshGeometry) => { mesh: SceneMeshGeometry; ids: readonly string[] },
  ) {
    if (!selection || !editable || blocked) return
    let updatedIds = selection.ids
    const next = run((source) =>
      editSceneMesh(source, selection.nodeId, (current) => {
        // A delayed callback must not edit replacement geometry with reused component IDs.
        if (current !== mesh) throw new Error('A malha mudou. Escolha novamente.')
        const result = operation(current)
        updatedIds = result.ids
        return result.mesh
      }),
    )
    if (!next) return
    const changedNode = next.nodes.find((n) => n.id === selection.nodeId)
    const changedMesh =
      changedNode?.kind === 'mesh'
        ? next.geometries.find((g) => g.id === changedNode.geometryId)
        : null
    if (changedMesh?.kind !== 'mesh') {
      setSession(null)
      return
    }
    setSession({
      nodeId: selection.nodeId,
      geometryId: changedMesh.id,
      mode: selection.mode,
      ids: updatedIds,
    })
  }
  function beginPreview(tool: SceneFacePreviewTool) {
    if (selection?.mode !== 'face' || !selection.ids.length || !editable || blocked) return
    cancel()
    preview.begin(
      tool,
      { nodeId: selection.nodeId, faceIds: selection.ids, geometryId: mesh.id },
      mesh,
    )
  }
  return {
    selection,
    blocked,
    uv:
      selection?.mode === 'face' && mesh?.kind === 'mesh'
        ? {
            mesh,
            sourceKey: JSON.stringify([editor.getState().asset.id, revision, selection.nodeId]),
            blocked,
            ids: selection.ids,
            onSelect: select,
            onChoose: (ids: readonly string[]) => updateSelection(ids, false),
            onApply: (operation: MeshUvOperation) => {
              if (editor.getState().contentRevision !== revision) return
              applyMesh((source) => ({
                mesh: editMeshUv(source, selection.ids, operation),
                ids: selection.ids,
              }))
            },
            onApplyPrepared: (prepared: SceneMeshGeometry) => {
              if (editor.getState().contentRevision !== revision) return
              applyMesh((source) => {
                if (source !== mesh) throw new Error('A malha mudou. Prepare o mapa novamente.')
                return {
                  mesh: mapMeshUv(
                    source,
                    selection.ids,
                    (_uv, id, corner) => prepared.faces[id]!.corners[corner]!.uv,
                  ),
                  ids: selection.ids,
                }
              })
            },
          }
        : null,
    weights:
      skin && selection
        ? {
            sourceKey: JSON.stringify([
              weightSession.key,
              editor.getState().asset.id,
              revision,
              selection.nodeId,
              skin.id,
            ]),
            skin,
            vertexIds: weightVertices,
            joints: skin.joints.map((joint) => ({
              id: joint.nodeId,
              name: index.scene.nodes.get(joint.nodeId)!.name,
            })),
            disabled: blocked,
            onApply: (mix: SceneSkinInfluence[]) => {
              if (
                !editable ||
                blocked ||
                activeWeights.current !== weightOwner ||
                editor.getState().contentRevision !== revision
              )
                return false
              return (
                run((source) => {
                  if (
                    editor.getState().contentRevision !== revision ||
                    source.skins?.find((entry) => entry.id === skin.id) !== skin
                  )
                    throw new SceneValidationError('weights', COPY.scene.skinWeights.changed)
                  return setSceneSkinWeights(
                    source,
                    skin.id,
                    Object.fromEntries(weightVertices.map((id) => [id, mix])),
                  )
                }) !== null
              )
            },
          }
        : null,
    check: {
      busy: meshCheck.busy,
      preview: meshCheck.preview,
      error: meshCheck.error,
      disabled: !editable || !!preview.tool || transform.dragging,
      issues:
        meshCheck.report && meshCheck.report.mesh === mesh && meshCheck.report.nodeId === node?.id
          ? meshCheck.report.issues
          : null,
      cancel: meshCheck.cancel,
      confirm: meshCheck.confirm,
      inspect: () => {
        if (!selection || !editable || blocked) return
        return meshCheck.inspect({ ...selection, geometryId: mesh.id }, mesh)
      },
      repair: (kind: MeshFixKind) => {
        if (!selection || !editable || blocked) return
        return meshCheck.repair({ ...selection, geometryId: mesh.id }, mesh, kind)
      },
      select: (kind: MeshIssueKind) => {
        if (
          !selection ||
          !editable ||
          blocked ||
          meshCheck.report?.mesh !== mesh ||
          meshCheck.report.nodeId !== node.id
        )
          return
        const issue = meshCheck.report.issues.find((i) => i.kind === kind)
        if (issue)
          setSession({
            nodeId: node.id,
            geometryId: mesh.id,
            mode: MESH_ISSUE_MODES[kind],
            ids: issue.ids,
          })
      },
    },
    softMovement: {
      enabled: softEnabled,
      reach: softReach,
      valid: softValid,
      setEnabled: (value: boolean) => {
        if (!blocked) setSoftEnabled(value)
      },
      setReach: (value: string) => {
        if (!blocked) setSoftReach(value)
      },
    },
    transformTools: softMove
      ? softValid
        ? (['move'] as const)
        : []
      : (['move', 'rotate', 'scale'] as const),
    canEdit: editable,
    open,
    setMode: (mode: SceneComponentMode) => {
      if (selection && selection.mode !== mode && !blocked) open(mode)
    },
    close,
    select,
    selectMany: (ids: readonly string[], add: boolean) => updateSelection(ids, add),
    choose,
    apply,
    splitEdges,
    pathPointCount:
      selection?.mode === 'edge' && mesh?.kind === 'mesh'
        ? meshComponentVertices(mesh, selection).length
        : 0,
    createPath: (settings: ScenePathSettings) => {
      if (selection?.mode !== 'edge' || !editable || blocked) return
      const next = run((source) => {
        const liveNode = source.nodes.find((n) => n.id === selection.nodeId)
        if (
          liveNode?.kind !== 'mesh' ||
          source.geometries.find((g) => g.id === liveNode.geometryId) !== mesh
        )
          throw new Error('O caminho mudou. Escolha novamente.')
        return createScenePath(
          source,
          selection.nodeId,
          selection.ids,
          settings,
          COPY.scene.pathName,
        )
      }, 'created')
      if (next) setSession(null)
    },
    bevel: (depth: number) => {
      if (selection?.mode !== 'edge') return
      applyMesh((mesh) => {
        const result = bevelMeshEdges(mesh, selection.ids, depth)
        return { mesh: result.mesh, ids: result.edgeIds }
      })
    },
    cutPlane: (plane: MeshCutPlane) => {
      applyMesh((mesh) => {
        const result = cutMeshByPlane(mesh, plane)
        return {
          mesh: result.mesh,
          ids:
            selection?.mode === 'vertex'
              ? result.vertexIds
              : selection?.mode === 'edge'
                ? result.edgeIds
                : result.faceIds,
        }
      })
    },
    weld: weld
      ? {
          points: weld.points,
          groups: weld.groups,
          faces: weld.faces,
          looseEdges: weld.looseEdges,
          blockedReason: weld.blockedReason,
        }
      : null,
    weldPoints: () => {
      if (!weld) return
      applyMesh(() => ({ mesh: weld.apply(), ids: weld.ids }))
    },
    cutRing: () => {
      if (selection?.mode !== 'edge') return
      applyMesh((mesh) => {
        const result = cutMeshEdgeRing(mesh, selection.ids)
        return { mesh: result.mesh, ids: result.edgeIds }
      })
    },
    connectPoints: (action: 'line' | 'cut') => {
      if (selection?.mode !== 'vertex') return
      applyMesh((mesh) => ({
        mesh:
          action === 'line'
            ? createMeshLooseEdge(mesh, selection.ids)
            : cutMeshFaceBetweenVertices(mesh, selection.ids),
        ids: selection.ids,
      }))
    },
    dissolveEdges: () => {
      if (selection?.mode !== 'edge') return
      applyMesh((mesh) => ({ mesh: dissolveMeshEdges(mesh, selection.ids), ids: [] }))
    },
    removal: removal
      ? { points: removal.points, faces: removal.faces, looseEdges: removal.looseEdges }
      : null,
    remove: () => {
      if (!removal) return
      applyMesh(() => ({ mesh: removal.apply(), ids: [] }))
    },
    preview,
    beginPreview,
    transform: {
      ...transform,
      begin: () => {
        if (!selection?.ids.length || !editable || blocked || (softMove && !softValid)) return false
        activeWeights.current = null
        cancel()
        const started = transform.begin(
          { ...selection, geometryId: mesh.id },
          mesh,
          softMove ? softRadius : 0,
        )
        if (!started) activeWeights.current = weightOwner
        return started
      },
    },
  }
}
