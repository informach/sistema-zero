import { SCENE_LIMITS } from '../scene/limits'
import type { GltfDocument } from './gltfDocument'
import { selectGltfScene } from './gltfGraph'
import { GltfInputError, requireGltf } from './gltfInput'
import { type GltfSelectedAnimation, selectGltfAnimationChannels } from './gltfSelectionAnimations'

export interface GltfSelection {
  sceneIndex: number | null
  roots: number[]
  /** Parent-before-child order, preserving the selected scene's authored root/child order. */
  nodes: number[]
  instances: Array<{ node: number; mesh: number; variant: number; skin: number | null }>
  /** Shared base shapes only. Skin bindings and animated morphs remain instance-specific. */
  variants: Array<{ meshIndex: number; weights: number[] }>
  /** Original indices in ascending order; no source buffers or numeric arrays are copied. */
  dependencies: {
    meshes: number[]
    materials: number[]
    textures: number[]
    samplers: number[]
    images: number[]
    skins: number[]
    cameras: number[]
    accessors: number[]
    views: number[]
    buffers: number[]
  }
  defaultMaterial: boolean
  texturesWithoutImages: number[]
  animations: GltfSelectedAnimation[]
  /** Global declarations are not discarded just because their scope is unknown. */
  unhandledExtensions: string[]
}

const sorted = (values: ReadonlySet<number>) => [...values].sort((a, b) => a - b)

/**
 * Select from a validated, immutable source. No default choice, native conversion,
 * pixel decode, playback, network or acceptance of losses. Source validation still
 * covers the entire file; this limits subsequent work, not the reader's obligations.
 */
export function selectGltfDocument(source: GltfDocument, sceneIndex: number | null): GltfSelection {
  const nodes = selectGltfScene(source.graph, sceneIndex),
    selected = new Set(nodes),
    instances: GltfSelection['instances'] = []
  // Preflight all instances before touching any geometry, resource or animation data.
  for (const node of nodes) {
    const { mesh, skin } = source.graph.nodes[node]!
    if (mesh === null) continue
    if (instances.length === SCENE_LIMITS.renderedParts)
      throw new GltfInputError(
        'budget',
        'scene',
        'Esta cena tem partes demais para editar no Molda.',
      )
    instances.push({ node, mesh, variant: -1, skin })
  }
  const meshes = new Set<number>(),
    materials = new Set<number>(),
    textures = new Set<number>(),
    samplers = new Set<number>(),
    images = new Set<number>(),
    skins = new Set<number>(),
    cameras = new Set<number>(),
    accessors = new Set<number>(),
    views = new Set<number>(),
    buffers = new Set<number>(),
    variants: GltfSelection['variants'] = [],
    variantIndices = new Map<string, number>()
  for (const instance of instances) {
    const node = source.graph.nodes[instance.node]!,
      weights = node.weights ?? source.meshes[instance.mesh]!.weights
    // Finite numbers have unique round-trip strings. Preserve signed zero explicitly.
    const key = `${instance.mesh}:${weights.map((v) => (Object.is(v, -0) ? '-0' : String(v))).join(',')}`
    let variant = variantIndices.get(key)
    if (variant === undefined) {
      variant = variants.length
      variantIndices.set(key, variant)
      variants.push({ meshIndex: instance.mesh, weights: [...weights] })
    }
    instance.variant = variant
    meshes.add(instance.mesh)
    if (instance.skin !== null) skins.add(instance.skin)
  }
  for (const index of nodes) {
    const camera = source.graph.nodes[index]!.camera
    if (camera !== null) cameras.add(camera)
  }
  let defaultMaterial = false
  for (const index of meshes) {
    for (const primitive of source.meshes[index]!.primitives) {
      if (primitive.material === null) defaultMaterial = true
      else materials.add(primitive.material)
      if (primitive.indicesAccessor !== null) accessors.add(primitive.indicesAccessor)
      for (const accessor of primitive.attributes.values()) accessors.add(accessor)
      for (const target of primitive.targets)
        for (const accessor of target.values()) accessors.add(accessor)
    }
  }
  for (const index of skins) {
    const skin = source.skins[index]!
    requireGltf(
      skin.joints.every((node) => selected.has(node)) &&
        (skin.skeleton === null || selected.has(skin.skeleton)),
      `skins[${index}]`,
      'Todas as juntas e seu apoio precisam pertencer à cena escolhida.',
    )
    if (skin.inverseBindMatrices !== null) accessors.add(skin.inverseBindMatrices)
  }
  for (const index of materials) {
    const material = source.appearance.materials[index]!
    for (const info of [
      material.baseColorTexture,
      material.metallicRoughnessTexture,
      material.normalTexture,
      material.occlusionTexture,
      material.emissiveTexture,
    ])
      if (info) textures.add(info.index)
  }
  const texturesWithoutImages: number[] = []
  for (const index of sorted(textures)) {
    const texture = source.appearance.textures[index]!
    if (texture.source === null) texturesWithoutImages.push(index)
    else images.add(texture.source)
    if (texture.sampler !== null) samplers.add(texture.sampler)
  }
  const animations = selectGltfAnimationChannels(source.animations, selected, accessors)
  for (const index of accessors) {
    const { layout, sparseViews } = source.accessors[index]!
    if (layout) views.add(layout.bufferView)
    if (sparseViews) {
      views.add(sparseViews.indices)
      views.add(sparseViews.values)
    }
  }
  for (const index of images) {
    const image = source.appearance.images[index]!
    if (image.kind === 'bufferView') views.add(image.bufferView)
  }
  for (const index of views) buffers.add(source.resources.views[index]!.buffer)
  return {
    sceneIndex,
    roots: nodes.filter((node) => source.graph.nodes[node]!.parent === null),
    nodes,
    instances,
    variants,
    dependencies: {
      meshes: sorted(meshes),
      materials: sorted(materials),
      textures: sorted(textures),
      samplers: sorted(samplers),
      images: sorted(images),
      skins: sorted(skins),
      cameras: sorted(cameras),
      accessors: sorted(accessors),
      views: sorted(views),
      buffers: sorted(buffers),
    },
    defaultMaterial,
    texturesWithoutImages,
    animations,
    unhandledExtensions: [...source.extensions.unhandled],
  }
}
