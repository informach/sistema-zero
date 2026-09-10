import type { MoldaSceneDocument } from '../scene/document'
import { requireScene } from '../scene/validation'
import { GlbBinary, MAX_SCENE_GLB_BYTES } from './GlbBinary'
import { encodeGlbContainer } from './glbContainer'
import { SceneGlbMaterials } from './SceneGlbMaterials'
import { prepareSceneGlbAnimations } from './sceneGlbAnimations'
import { prepareSceneGlbGeometry } from './sceneGlbGeometry'
import { prepareSceneGlbHierarchy } from './sceneGlbHierarchy'
import { type SceneGlbIssue, SceneGlbLossError } from './sceneGlbReport'
import { prepareSceneGlbSkin } from './sceneGlbSkin'

/**
 * Internal v2 export; never down-convert through the public v1 writer. No source mutation.
 * `animatedPaint` is the Studio-bound encoding: the whole sheet plus the versioned contract.
 * Absent, the portable download keeps the first frame and its explicit loss, byte for byte.
 */
export function encodeSceneGlb(
  document: MoldaSceneDocument,
  options: { allowLosses?: boolean; animatedPaint?: boolean } = {},
) {
  const hierarchy = prepareSceneGlbHierarchy(document)
  const issues: SceneGlbIssue[] = hierarchy.excluded.map((sourceId) => ({
    code: 'hidden-node',
    sourceId,
  }))
  for (const sourceId of hierarchy.retained) issues.push({ code: 'skin-dependency', sourceId })
  for (const node of document.nodes)
    if (node.kind !== 'mesh' && node.bendLimit !== undefined)
      issues.push({ code: 'bend-limit-omitted', sourceId: node.id })
  const binary = new GlbBinary(),
    materials = new SceneGlbMaterials(hierarchy, binary, issues, options.animatedPaint === true)
  const geometries = new Map<string, ReturnType<typeof prepareSceneGlbGeometry>>()
  const meshes: Array<{
    name: string
    primitives: Array<{
      attributes: {
        POSITION: number
        NORMAL: number
        TEXCOORD_0: number
        JOINTS_0?: number
        WEIGHTS_0?: number
      }
      indices: number
      material: number
      mode: 4
    }>
  }> = []
  const skins: Array<{
    name: string
    joints: number[]
    skeleton: number
    inverseBindMatrices: number
    extras: { molda: { sourceId: string } }
  }> = []
  const skinVariants = new Map<string, number>()
  const variants = new Map<string, number>()
  let triangles = 0,
    drawCalls = 0,
    renderedParts = 0
  for (const [sourceId, bindings] of hierarchy.meshes) {
    const node = hierarchy.index.scene.nodes.get(sourceId)!
    if (node.kind !== 'mesh') throw new Error('Nó de malha esperado.')
    if (!geometries.has(node.geometryId))
      geometries.set(
        node.geometryId,
        prepareSceneGlbGeometry(hierarchy.index.geometries.get(node.geometryId)!, binary, issues),
      )
    const geometry = geometries.get(node.geometryId)
    if (!geometry) continue
    const binding = hierarchy.index.skinsByNode.get(sourceId),
      sourceGeometry = hierarchy.index.geometries.get(node.geometryId)!
    let portableSkin: ReturnType<typeof prepareSceneGlbSkin> | null = null
    if (binding) {
      requireScene(sourceGeometry.kind === 'mesh', 'export.skin', 'Malha de esqueleto inválida.')
      portableSkin = prepareSceneGlbSkin(binding, sourceGeometry, geometry.built, binary, issues)
    }
    const key = JSON.stringify([
      node.geometryId,
      geometry.groups.map((group) => group.materialId ?? node.materialId),
      ...(binding ? [binding.id] : []),
    ])
    let mesh = variants.get(key)
    if (mesh === undefined) {
      mesh = meshes.length
      variants.set(key, mesh)
      meshes.push({
        name: node.name,
        primitives: geometry.groups.map((group) => ({
          attributes: portableSkin
            ? { ...group.attributes, ...portableSkin.attributes }
            : group.attributes,
          indices: group.indices,
          material: materials.get(group.materialId ?? node.materialId),
          mode: 4,
        })),
      })
    }
    for (const target of bindings) {
      hierarchy.nodes[target]!.mesh = mesh
      const placement = hierarchy.skins.get(target)
      if (placement && portableSkin) {
        const key = JSON.stringify([placement.binding.id, placement.joints])
        let skin = skinVariants.get(key)
        if (skin === undefined) {
          skin = skins.length
          skinVariants.set(key, skin)
          skins.push({
            name: placement.binding.name,
            joints: placement.joints,
            skeleton: placement.skeleton,
            inverseBindMatrices: portableSkin.inverseBindMatrices,
            extras: { molda: { sourceId: placement.binding.id } },
          })
        }
        hierarchy.nodes[target]!.skin = skin
      }
    }
    triangles += geometry.triangles * bindings.length
    drawCalls += geometry.groups.length * bindings.length
    renderedParts += bindings.length
  }
  const animation = prepareSceneGlbAnimations(hierarchy, binary, issues)
  if (issues.length && !options.allowLosses) throw new SceneGlbLossError(issues)
  const json = {
    asset: { version: '2.0', generator: 'Molda' },
    // Declared only when a material carries it: an unused extension would be a false promise.
    ...(materials.textureTransform ? { extensionsUsed: ['KHR_texture_transform'] } : {}),
    scene: 0,
    scenes: [
      { name: document.name, ...(hierarchy.roots.length ? { nodes: hierarchy.roots } : {}) },
    ],
    ...(hierarchy.nodes.length ? { nodes: hierarchy.nodes } : {}),
    ...(meshes.length ? { meshes } : {}),
    ...(skins.length ? { skins } : {}),
    ...(animation.animations.length ? { animations: animation.animations } : {}),
    ...(materials.materials.length ? { materials: materials.materials } : {}),
    ...(materials.images.length
      ? { images: materials.images, textures: materials.textures, samplers: materials.samplers }
      : {}),
    ...(binary.byteLength
      ? {
          accessors: binary.accessors,
          bufferViews: binary.views,
          buffers: [{ byteLength: binary.byteLength }],
        }
      : {}),
    extras: { molda: { sourceId: document.id, formatVersion: document.formatVersion } },
  }
  const bytes = encodeGlbContainer(json, binary.segments, MAX_SCENE_GLB_BYTES)
  // GLTFLoader marks each referenced node once, even when skins/material groups share it.
  const bones = new Set<number>()
  for (const skin of skins) for (const joint of skin.joints) bones.add(joint)
  return {
    bytes,
    issues,
    clips: animation.animations.map(({ name, extras: { molda } }) => ({
      id: molda.sourceId,
      name,
      duration: molda.duration,
      fps: molda.fps,
      loop: molda.loop,
    })),
    stats: {
      nodes: hierarchy.nodes.length,
      bones: bones.size,
      meshes: meshes.length,
      materials: materials.materials.length,
      textures: materials.textures.length,
      pixelBytes: materials.pixelBytes,
      triangles,
      drawCalls,
      renderedParts,
      clips: animation.animations.length,
      animationKeys: animation.keys,
      animationChannels: animation.channels,
    },
  }
}
