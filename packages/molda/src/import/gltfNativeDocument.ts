import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneNodes } from '../scene/graph'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { SceneValidationError } from '../scene/validation'
import { planGltfClips } from './gltfClipPlan'
import type { GltfClipOptions } from './gltfClipTypes'
import { type GltfConversionReport, gltfConversionReport } from './gltfConversionReport'
import type { GltfDocument } from './gltfDocument'
import { convertGltfGeometries } from './gltfGeometries'
import { planGltfGeometries } from './gltfGeometryPlan'
import { convertGltfHierarchy } from './gltfHierarchy'
import { GltfInputError } from './gltfInput'
import { planGltfMaterialSelection } from './gltfMaterialSelection'
import { gltfChoice } from './gltfMetadata'
import { convertGltfClips } from './gltfNativeClips'
import { convertGltfMaterials } from './gltfNativeMaterials'
import { decodeGltfRasters } from './gltfRasters'
import { selectGltfDocument } from './gltfSelection'
import { convertGltfSkinBindings } from './gltfSkinBindings'
import { importDocumentBase, type NativeImportIdentity } from './importDocumentBase'

export type GltfNativeIdentity = NativeImportIdentity
export interface GltfNativeOptions {
  animations?: GltfClipOptions
  skinWeights?: 'preserve' | 'normalize'
}

function nativeDocument(candidate: MoldaSceneDocument, identity = false): MoldaSceneDocument {
  const read = readSceneDocument(candidate)
  if (read.status === 'valid') return read.document
  throw new GltfInputError(
    identity ? 'invalid' : 'unsupported',
    `${identity ? 'identity' : 'native'}.${read.status === 'invalid' ? read.path : 'formatVersion'}`,
    read.status === 'invalid'
      ? read.message
      : 'Este documento precisa de outra versão do leitor nativo.',
  )
}

/**
 * Complete core conversion from a validated immutable source, not import approval.
 * Scene and identity are explicit. The caller owns source archival, review and
 * transactional adoption. No clock, random ID, IO, session or authorial writes.
 */
export function convertGltfDocument(
  source: GltfDocument,
  sceneIndex: number | null,
  identity: GltfNativeIdentity,
  options: GltfNativeOptions = {},
): { document: MoldaSceneDocument; report: GltfConversionReport } {
  // Validate host identity BEFORE traversing source data. Never inherit a thumb or unknown fields.
  const empty = nativeDocument(importDocumentBase(identity), true)
  const weights = gltfChoice(
      options.skinWeights ?? 'preserve',
      ['preserve', 'normalize'],
      'skin.weights',
    ),
    selection = selectGltfDocument(source, sceneIndex),
    materialPlan = planGltfMaterialSelection(source, selection),
    requests = selection.variants.map((variant, i) => ({
      ...variant,
      geometryId: `gltf_geometry_${i}`,
    })),
    plans = planGltfGeometries(source.meshes, source.accessors, requests, materialPlan.geometry)
  let drawTriangles = 0
  for (const instance of selection.instances) {
    drawTriangles += plans[instance.variant]!.cost.triangles
    if (drawTriangles > SCENE_LIMITS.triangles)
      throw new GltfInputError(
        'budget',
        `nodes[${instance.node}].mesh`,
        'As cópias visíveis ultrapassam o limite de desenho do Molda.',
      )
  }
  const hierarchy = convertGltfHierarchy(source, selection, {
    geometryIds: requests.map((request) => request.geometryId),
    defaultMaterialId: materialPlan.geometry.defaultId,
  })
  // Finite glTF transforms can overflow when composed, or exceed native quaternion tolerance.
  // Do not defer this failure to skin planning (which also builds world matrices).
  try {
    indexSceneNodes(hierarchy.nodes)
  } catch (error) {
    if (!(error instanceof RangeError || error instanceof SceneValidationError)) throw error
    throw new GltfInputError(
      'unsupported',
      `native.${error instanceof SceneValidationError ? error.path : 'nodes'}`,
      error.message,
      { cause: error },
    )
  }
  // These cheap gates precede pixel decoding. Clip conversion later checks actual cubic unions too.
  planGltfClips(source, selection, hierarchy, options.animations ?? {})
  const appearances = convertGltfMaterials(
      source,
      selection,
      decodeGltfRasters(source.resources.images, materialPlan.images),
    ),
    geometry = convertGltfGeometries(
      source.meshes,
      source.accessors,
      requests,
      appearances.geometry,
    ),
    skins = convertGltfSkinBindings(source, selection, hierarchy, geometry.sources, { weights }),
    clips = convertGltfClips(source, selection, hierarchy, options.animations),
    document = nativeDocument({
      ...empty,
      nodes: hierarchy.nodes,
      geometries: geometry.geometries,
      materials: appearances.materials,
      images: appearances.images,
      skins: skins.skins,
      animations: clips.animations,
    })
  return {
    document,
    report: gltfConversionReport(source, selection, document, [
      ...hierarchy.issues.map((detail) => ({ stage: 'hierarchy' as const, detail })),
      ...geometry.issues.map((detail) => ({ stage: 'geometry' as const, detail })),
      ...appearances.issues.map((detail) => ({ stage: 'materials' as const, detail })),
      ...skins.issues.map((detail) => ({ stage: 'skins' as const, detail })),
      ...clips.issues.map((detail) => ({ stage: 'animations' as const, detail })),
    ]),
  }
}
