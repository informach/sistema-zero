import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument, SceneMirror } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import type { Quaternion, SceneTransform } from '../scene/matrix'
import type { SceneSkinBinding } from '../scene/skin'
import { requireScene } from '../scene/validation'
import { affineTrsChain } from './affineTrsChain'

/** Bounds helper expansion independently of authoring's mesh/node limits. */
export const MAX_SCENE_GLB_NODES = 16_384
export interface SceneGlbNode {
  name: string
  translation: Vec3
  rotation: Quaternion
  scale: Vec3
  children?: number[]
  mesh?: number
  skin?: number
  extras: {
    molda: {
      sourceId: string
      role:
        | 'node'
        | 'base'
        | 'factor'
        | 'mirror-ancestor'
        | 'reflection'
        | 'skin-root'
        | 'skin-draw'
      mirrorId?: string
    }
  }
}
export interface SceneGlbAnimationTarget {
  /** Absolute local animations address the original TRS, not a decomposed affine. */
  local: number | null
  /** Relative clips address a distinct identity layer after the original local matrix. */
  delta: number | null
  leaf: number
}
type Trs = Extract<SceneTransform, { kind: 'trs' }>
type Placement =
  | { sourceId: string; parent: number | null; mesh: boolean; mirrorId?: string }
  | { reflection: SceneMirror }
  | { skinRoot: true }

interface SkinDrawPlacement {
  binding: SceneSkinBinding
  parent: number
  joints: number[]
  skeleton: number
  mirrorId?: string
}

/**
 * Portable hierarchy only, before geometry/textures/binary allocation. Hidden subtrees
 * are excluded explicitly; mirrors share meshes but clone necessary ancestor paths,
 * so a world-space reflection inherits the same animation without world-matrix baking.
 */
export function prepareSceneGlbHierarchy(document: MoldaSceneDocument) {
  const index = indexSceneDocument(document),
    flags = evaluateSceneNodeFlags(index.scene)
  const visibleSkins = [...index.skins.values()].filter((skin) => !flags.get(skin.nodeId)!.hidden)
  const required = new Set<string>()
  for (const skin of visibleSkins)
    for (const joint of skin.joints) {
      let id: string | null = joint.nodeId
      while (id !== null && !required.has(id)) {
        required.add(id)
        id = index.scene.nodes.get(id)!.parentId
      }
    }
  const hidden = index.scene.order.filter((id) => flags.get(id)!.hidden),
    excluded = hidden.filter((id) => !required.has(id)),
    retained = hidden.filter((id) => required.has(id))
  const deltaNodes = new Set(
    (document.animations ?? [])
      .filter((clip) => clip.space === 'local-delta')
      .flatMap((clip) => clip.tracks.map((track) => track.nodeId)),
  )
  const placements: Placement[] = [],
    originals = new Map<string, number>(),
    skinDraws: SkinDrawPlacement[] = []
  let count = 0
  function reserve(amount: number) {
    count += amount
    requireScene(
      count <= MAX_SCENE_GLB_NODES,
      'export.nodes',
      'Os grupos e espelhos gerariam nós demais no GLB. Reduza a quantidade de espelhos ou a profundidade dos grupos.',
    )
  }
  function place(placement: Placement) {
    const node = 'sourceId' in placement ? index.scene.nodes.get(placement.sourceId)! : null
    reserve(
      node ? (node.transform.kind === 'affine' ? 2 : 1) + (deltaNodes.has(node.id) ? 1 : 0) : 1,
    )
    placements.push(placement)
    return placements.length - 1
  }
  // Native bones can belong to separate roots; glTF requires a common scene ancestor.
  const skinRoot = visibleSkins.length ? place({ skinRoot: true }) : null
  for (const id of index.scene.order) {
    if (flags.get(id)!.hidden && !required.has(id)) continue
    const node = index.scene.nodes.get(id)!
    originals.set(
      id,
      place({
        sourceId: id,
        parent: node.parentId === null ? skinRoot : originals.get(node.parentId)!,
        mesh: node.kind === 'mesh' && !flags.get(id)!.hidden && !index.skinsByNode.has(id),
      }),
    )
  }
  for (const binding of visibleSkins) {
    reserve(1)
    skinDraws.push({
      binding,
      parent: originals.get(binding.nodeId)!,
      joints: binding.joints.map((joint) => originals.get(joint.nodeId)!),
      skeleton: skinRoot!,
    })
  }
  const reflections = new Map<string, { root: number; ancestors: Map<string, number> }>()
  for (const mirror of index.mirrors.values()) {
    if (flags.get(mirror.sourceId)!.hidden) continue
    const key = JSON.stringify([mirror.axis, mirror.offset])
    let reflection = reflections.get(key)
    if (!reflection) {
      reflection = { root: place({ reflection: mirror }), ancestors: new Map() }
      reflections.set(key, reflection)
    }
    const frame = reflection
    function reflectPath(id: string | null) {
      const path: string[] = []
      let ancestor = id
      while (ancestor !== null && !frame.ancestors.has(ancestor)) {
        path.push(ancestor)
        ancestor = index.scene.nodes.get(ancestor)!.parentId
      }
      let parent = ancestor === null ? frame.root : frame.ancestors.get(ancestor)!
      for (const sourceId of path.reverse()) {
        parent = place({ sourceId, parent, mesh: false })
        frame.ancestors.set(sourceId, parent)
      }
      return parent
    }
    const binding = index.skinsByNode.get(mirror.sourceId)
    if (binding) {
      // Reflection must act on joint worlds, not the skinned draw node (ignored by glTF).
      const joints = binding.joints.map((joint) => reflectPath(joint.nodeId))
      const parent = reflectPath(binding.nodeId)
      reserve(1)
      skinDraws.push({ binding, parent, joints, skeleton: frame.root, mirrorId: mirror.id })
    } else {
      const parent = reflectPath(index.scene.nodes.get(mirror.sourceId)!.parentId)
      place({ sourceId: mirror.sourceId, parent, mesh: true, mirrorId: mirror.id })
    }
  }
  const nodes: SceneGlbNode[] = [],
    roots: number[] = [],
    leaves: number[] = []
  const targets = new Map<string, SceneGlbAnimationTarget[]>(),
    meshes = new Map<string, number[]>()
  const factors = new Map<string, readonly Trs[]>()
  function append(node: SceneGlbNode, parent: number | null) {
    const id = nodes.length
    nodes.push(node)
    if (parent === null) roots.push(id)
    else {
      const children = nodes[parent]!.children ?? []
      children.push(id)
      nodes[parent]!.children = children
    }
    return id
  }
  for (const placement of placements) {
    if ('skinRoot' in placement) {
      leaves.push(
        append(
          {
            name: 'Esqueletos',
            translation: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
            extras: { molda: { sourceId: document.id, role: 'skin-root' } },
          },
          null,
        ),
      )
      continue
    }
    if ('reflection' in placement) {
      const mirror = placement.reflection,
        axis = mirror.axis === 'x' ? 0 : mirror.axis === 'y' ? 1 : 2
      const translation: Vec3 = [0, 0, 0],
        scale: Vec3 = [1, 1, 1]
      translation[axis] = 2 * mirror.offset
      scale[axis] = -1
      requireScene(
        Number.isFinite(translation[axis]),
        'export.mirror',
        'A posição do espelho excede a precisão do GLB.',
      )
      leaves.push(
        append(
          {
            name: 'Espelho',
            translation,
            rotation: [0, 0, 0, 1],
            scale,
            extras: { molda: { sourceId: mirror.id, role: 'reflection' } },
          },
          null,
        ),
      )
      continue
    }
    const source = index.scene.nodes.get(placement.sourceId)!
    let chain = factors.get(source.id)
    if (!chain) {
      chain =
        source.transform.kind === 'trs'
          ? [source.transform]
          : affineTrsChain(source.transform.matrix)
      factors.set(source.id, chain)
    }
    let parent = placement.parent === null ? null : leaves[placement.parent]!
    const local = source.transform.kind === 'trs' ? nodes.length : null
    const addDelta = deltaNodes.has(source.id)
    const common = {
      sourceId: source.id,
      ...(placement.mirrorId ? { mirrorId: placement.mirrorId } : {}),
    }
    for (const [i, transform] of chain.entries())
      parent = append(
        {
          name: `${source.name} [base ${i + 1}]`,
          translation: [...transform.translation],
          rotation: [...transform.rotation],
          scale: [...transform.scale],
          extras: { molda: { ...common, role: i === 0 ? 'base' : 'factor' } },
        },
        parent,
      )
    const delta = addDelta
      ? append(
          {
            name: `${source.name} [pose]`,
            translation: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
            extras: { molda: { ...common, role: 'base' } },
          },
          parent,
        )
      : null
    const leaf = delta ?? parent!
    const isOriginal = !('mirrorId' in placement) && originals.get(source.id) === leaves.length
    nodes[leaf]!.name = placement.mirrorId
      ? index.mirrors.get(placement.mirrorId)!.name
      : source.name
    nodes[leaf]!.extras.molda.role = isOriginal || placement.mesh ? 'node' : 'mirror-ancestor'
    leaves.push(leaf)
    const list = targets.get(source.id) ?? []
    list.push({ local, delta, leaf })
    targets.set(source.id, list)
    if (placement.mesh) {
      const bindings = meshes.get(source.id) ?? []
      bindings.push(leaf)
      meshes.set(source.id, bindings)
    }
  }
  const skins = new Map<number, SkinDrawPlacement>()
  for (const draw of skinDraws) {
    const sourceId = draw.binding.nodeId,
      source = index.scene.nodes.get(sourceId)!
    // Identity child preserves the native mesh frame for Three's face winding and
    // normal matrix. Joint worlds still determine positions, as required by glTF.
    // Root-flattening this frame loses negative-scale culling and affine shading.
    const leaf = append(
      {
        name: draw.mirrorId ? index.mirrors.get(draw.mirrorId)!.name : source.name,
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
        extras: {
          molda: {
            sourceId,
            role: 'skin-draw',
            ...(draw.mirrorId ? { mirrorId: draw.mirrorId } : {}),
          },
        },
      },
      leaves[draw.parent]!,
    )
    const bindings = meshes.get(sourceId) ?? []
    bindings.push(leaf)
    meshes.set(sourceId, bindings)
    skins.set(leaf, {
      ...draw,
      parent: leaves[draw.parent]!,
      joints: draw.joints.map((joint) => leaves[joint]!),
      skeleton: leaves[draw.skeleton]!,
    })
  }
  return { source: document, index, nodes, roots, targets, meshes, skins, excluded, retained }
}
