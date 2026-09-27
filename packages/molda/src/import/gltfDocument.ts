import { type GltfAccessor, readGltfAccessors } from './gltfAccessors'
import { readGltfAnimations } from './gltfAnimations'
import type { GltfAnimation } from './gltfAnimationTypes'
import { readGltfAppearance } from './gltfAppearance'
import { type GltfCamera, readGltfCameras } from './gltfCameras'
import { type GltfEnvelope, readGltfEnvelope } from './gltfEnvelope'
import { type GltfExtensionUsage, readGltfExtensions } from './gltfExtensions'
import { type GltfGraph, readGltfGraph } from './gltfGraph'
import { GLTF_INPUT_LIMITS, gltfList } from './gltfInput'
import { validateGltfMaterialUvs } from './gltfMaterials'
import { type GltfMesh, readGltfMeshes } from './gltfMeshes'
import type { GltfLocalFile } from './gltfResourcePlan'
import { type GltfResourcesRead, readGltfResources } from './gltfResources'
import { type GltfSkin, readGltfSkins } from './gltfSkins'
import { type GltfSkinWeights, readGltfSkinWeights } from './gltfSkinWeights'

export interface GltfDocument {
  /** Owned inert JSON for extension/loss review. Do not retain the envelope's duplicate BIN. */
  source: Omit<GltfEnvelope, 'bin'>
  resources: Extract<GltfResourcesRead, { status: 'ready' }>
  extensions: GltfExtensionUsage
  accessors: GltfAccessor[]
  appearance: ReturnType<typeof readGltfAppearance>
  meshes: GltfMesh[]
  cameras: GltfCamera[]
  graph: GltfGraph
  skins: GltfSkin[]
  skinWeights: GltfSkinWeights
  animations: GltfAnimation[]
}
export type GltfDocumentRead =
  | { status: 'missing'; paths: string[] }
  | { status: 'ready'; document: GltfDocument }

/**
 * Pure source staging, not native import or complete glTF conformance validation.
 * Missing files have no partial document. Pixels, scene selection and conversion
 * remain explicit subsequent steps. No IO, rendering, playback or authorial writes.
 */
export function readGltfDocument(
  bytes: Uint8Array,
  files: readonly GltfLocalFile[] = [],
  entryPath = 'model.gltf',
): GltfDocumentRead {
  const envelope = readGltfEnvelope(bytes),
    extensions = readGltfExtensions(envelope.json),
    resources = readGltfResources(envelope, files, entryPath)
  if (resources.status === 'missing') return resources
  const { json, format, unknownChunkTypes } = envelope,
    accessors = readGltfAccessors(json.accessors, resources),
    appearance = readGltfAppearance(json, resources.views, accessors),
    { meshes, viewUses } = readGltfMeshes(json.meshes, accessors, appearance.materials.length),
    cameras = readGltfCameras(json.cameras),
    skinRows = gltfList(json.skins, 'skins', GLTF_INPUT_LIMITS.skins)
  validateGltfMaterialUvs(meshes, appearance.materials)
  const graph = readGltfGraph(json, meshes, { skins: skinRows.length, cameras: cameras.length }),
    skins = readGltfSkins(json.skins, graph, accessors, viewUses),
    skinWeights = readGltfSkinWeights(graph, meshes, skins, accessors),
    animations = readGltfAnimations(json.animations, {
      graph,
      meshes,
      accessors,
      skins,
      meshUses: viewUses,
    })
  return {
    status: 'ready',
    document: {
      source: { json, format, unknownChunkTypes },
      resources,
      extensions,
      accessors,
      appearance,
      meshes,
      cameras,
      graph,
      skins,
      skinWeights,
      animations,
    },
  }
}
