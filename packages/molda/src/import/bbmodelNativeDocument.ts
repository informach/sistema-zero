import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { assessBbmodelAnimationBounds } from './bbmodelAnimationBounds'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { convertBbmodelClips } from './bbmodelClips'
import {
  type BbmodelConversionReport,
  collectBbmodelConversionReport,
} from './bbmodelConversionReport'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { readBbmodelGraph } from './bbmodelGraph'
import { convertBbmodelHierarchy } from './bbmodelHierarchy'
import { convertBbmodelImages } from './bbmodelImages'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { type BbmodelNativeOptions, readBbmodelNativeOptions } from './bbmodelNativeOptions'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { convertBbmodelNodeMaterials } from './bbmodelNodeMaterials'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { bbmodelOptionGroup } from './bbmodelOptionGroup'
import { convertBbmodelPaintImages } from './bbmodelPaintImages'
import { planBbmodelPaintLayers, readBbmodelPaintLayers } from './bbmodelPaintLayers'
import { decodeBbmodelPaintRasters } from './bbmodelPaintRasters'
import { convertBbmodelPositions } from './bbmodelPositions'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { assessBbmodelRemainder } from './bbmodelRemainder'
import {
  type BbmodelResourceRequest,
  readBbmodelLocalFiles,
  readBbmodelResources,
} from './bbmodelResources'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'
import { assessBbmodelSurfaces } from './bbmodelSurfaces'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { planBbmodelTextureLayouts } from './bbmodelTextureLayouts'
import {
  materializeBbmodelTextureMaterials,
  planBbmodelTextureMaterials,
} from './bbmodelTextureMaterials'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase, type NativeImportIdentity } from './importDocumentBase'

export type BbmodelNativeRequest = Pick<BbmodelResourceRequest, 'bytes' | 'entryPath' | 'files'>
export type BbmodelNativeResult =
  | { status: 'missing'; paths: string[] }
  | { status: 'ready'; document: MoldaSceneDocument; report: BbmodelConversionReport }

function checkedDocument(candidate: MoldaSceneDocument, identity = false): MoldaSceneDocument {
  const result = readSceneDocument(candidate)
  if (result.status === 'valid') return result.document
  throw new BbmodelInputError(
    identity ? 'invalid' : 'unsupported',
    `${identity ? 'identity' : 'native'}.${result.status === 'invalid' ? result.path : 'formatVersion'}`,
    result.status === 'invalid'
      ? result.message
      : 'Este documento precisa de outra versão do leitor nativo.',
  )
}

/**
 * Bounded, synchronous free-format conversion, NOT source archival or import approval.
 * Entire known source is parsed before selection; every adaptation survives in a bounded report.
 * Missing companions return no partial document. No network/FS/clock/random ID/script execution.
 * Caller owns original files, review, worker scheduling and transactional adoption.
 */
export function convertBbmodelDocument(
  request: BbmodelNativeRequest,
  identity: NativeImportIdentity,
  options: BbmodelNativeOptions,
): BbmodelNativeResult {
  requireBbmodel(
    identity !== null && typeof identity === 'object' && !Array.isArray(identity),
    'identity',
    'Informe a identidade da criação de destino.',
  )
  const empty = checkedDocument(importDocumentBase(identity), true),
    policy = readBbmodelNativeOptions(options)
  requireBbmodel(
    request !== null && typeof request === 'object' && !Array.isArray(request),
    'request',
    'Informe o arquivo e suas imagens locais.',
  )
  for (const key of Object.keys(request))
    requireBbmodel(
      ['bytes', 'entryPath', 'files'].includes(key),
      `request.${key}`,
      'Este campo de arquivo não é conhecido.',
    )
  const selectedFiles = readBbmodelLocalFiles(request),
    entryPath = selectedFiles.entryPath
  try {
    const envelope = readBbmodelEnvelope(request.bytes),
      graph = readBbmodelGraph(envelope),
      metadata = readBbmodelNodeMetadata(envelope, graph),
      visual = readBbmodelSurfaceMetadata(metadata),
      source = readBbmodelGeometry(graph),
      appearance = readBbmodelAppearance(envelope),
      sourceLayers = readBbmodelPaintLayers(appearance),
      selection = planBbmodelSelection(envelope, graph, policy.selection),
      topology = planBbmodelNativeGeometry(source, selection, policy.geometry),
      bindings = bindBbmodelTextures(source, appearance),
      byNode = new Map(bindings.map((row) => [row.node, row])),
      usedTextures = new Set<number>()
    // Retained face bindings select resources without reading/copying XYZ or UV values.
    for (const plan of topology.plans) {
      const bound = byNode.get(plan.node)
      if (!bound) throw new Error('Missing bbmodel native texture bindings')
      for (const face of plan.faces) {
        const binding = bound.faces[face.sourceFace]
        if (!binding || (binding.kind !== 'texture' && binding.kind !== 'none'))
          throw new Error('Mismatched bbmodel native texture face')
        if (binding.kind === 'texture') usedTextures.add(binding.texture)
      }
    }
    const textureIndices = [...usedTextures]
    if (topology.plans.length + textureIndices.length > SCENE_LIMITS.materials)
      throw new BbmodelInputError(
        'budget',
        'materials',
        'Os materiais das peças e das texturas ultrapassam o limite do Molda.',
      )
    const report = collectBbmodelConversionReport({
      format: 'bbmodel',
      version: envelope.version,
      modelFormat: 'free',
      entryPath,
      nodes: graph.nodes.length,
      omittedNodes: graph.nodes.length - selection.nodes.length,
      textures: appearance.textures.length,
      unusedTextures: appearance.textures.length - usedTextures.size,
      textureGroups: appearance.groups.length,
      selectedFileBytes: selectedFiles.selectedBytes,
      originalFile: 'not-retained',
      auxiliaryMetadata: 'not-stored',
    })
    for (const detail of selection.issues) report.add({ stage: 'selection', detail })
    assessBbmodelRemainder(
      { envelope, graph, metadata, geometry: source, appearance, selection, textureIndices },
      policy.remainder,
      (detail) => report.add({ stage: 'remainder', detail }),
    )
    for (const detail of topology.issues) report.add({ stage: 'topology', detail })
    const transforms = readBbmodelTransforms(graph, selection),
      positions = convertBbmodelPositions(source, topology.plans, transforms, policy.positions)
    for (const detail of positions.issues) report.add({ stage: 'positions', detail })
    const authorial = convertBbmodelFaceUvs(source, topology.plans, appearance, policy.uvs)
    for (const detail of authorial.issues) report.add({ stage: 'authorial-uv', detail })
    const uvs = convertBbmodelNativeUvs(
      source,
      topology.plans,
      authorial.geometries,
      bindings,
      appearance,
    )
    for (const detail of uvs.issues) report.add({ stage: 'normalized-uv', detail })
    const surfaces = assessBbmodelSurfaces(visual, topology.plans, uvs.geometries, policy.surfaces)
    for (const detail of surfaces.issues) report.add({ stage: 'surfaces', detail })
    const defaults = convertBbmodelNodeMaterials(
      visual,
      topology.plans,
      uvs.geometries,
      policy.nodeMaterials,
    )
    for (const detail of defaults.issues) report.add({ stage: 'node-materials', detail })
    const texturePlan = bbmodelOptionGroup('textureMaterials', () =>
      planBbmodelTextureMaterials(appearance, textureIndices, policy.textureMaterials),
    )
    for (const detail of texturePlan.issues) report.add({ stage: 'texture-materials', detail })
    const paint = planBbmodelPaintLayers(
      sourceLayers,
      textureIndices,
      policy.images,
      policy.remainder.unmapped,
      (detail) => report.add({ stage: 'remainder', detail }),
    )
    const hierarchy = convertBbmodelHierarchy(
        graph,
        metadata,
        selection,
        transforms,
        { geometries: topology.plans, defaultMaterials: defaults.byNode },
        policy.hierarchy,
      ),
      // IDs already belong to the validated metadata plan; geometry need not wait for pixels.
      materialIds = new Map(texturePlan.materials.map((row) => [row.texture, row.id])),
      geometries = convertBbmodelGeometries(
        topology.plans,
        positions.geometries,
        uvs.geometries,
        materialIds,
      )
    for (const detail of hierarchy.issues) report.add({ stage: 'hierarchy', detail })
    for (const detail of geometries.issues) report.add({ stage: 'geometry', detail })
    const clips =
      policy.remainder.animations === 'convert'
        ? bbmodelOptionGroup('clips', () =>
            convertBbmodelClips(
              { envelope, graph, metadata, selection, transforms, nodeIds: hierarchy.nodeIds },
              policy.clips,
            ),
          )
        : null
    if (clips)
      report.setAnimations({
        ...clips.report,
        bounds: assessBbmodelAnimationBounds(
          hierarchy.nodes,
          geometries.geometries,
          clips.animations,
        ),
      })
    const resources = readBbmodelResources({
      ...request,
      entryPath,
      version: envelope.version,
      appearance,
      textureIndices,
      sourcePreference: policy.sourcePreference,
    })
    if (resources.status === 'missing') return resources
    for (const binding of resources.textures)
      report.add({
        stage: 'resources',
        detail: {
          ...binding,
          code: 'texture-resource-selected',
          path: `textures[${binding.texture}]`,
        },
      })
    const paintDecoded = paint.layers.size
        ? decodeBbmodelPaintRasters(resources, paint, policy.images)
        : null,
      decoded = paintDecoded ?? decodeBbmodelRasters(resources),
      layouts = planBbmodelTextureLayouts(appearance, decoded, textureIndices)
    for (const detail of layouts.issues) report.add({ stage: 'layouts', detail })
    const images = paintDecoded
      ? convertBbmodelPaintImages(appearance, paintDecoded, layouts.textures, paint, policy.images)
      : {
          ...convertBbmodelImages(appearance, decoded, layouts.textures, policy.images),
          paintIssues: [],
        }
    for (const detail of images.issues) report.add({ stage: 'images', detail })
    for (const detail of images.paintIssues) report.add({ stage: 'paint-layers', detail })
    const materials = materializeBbmodelTextureMaterials(texturePlan.materials, images.byTexture),
      document = checkedDocument({
        ...empty,
        nodes: hierarchy.nodes,
        geometries: geometries.geometries,
        materials: [...defaults.materials, ...materials.materials],
        images: images.images,
        ...(clips === null ? {} : { animations: clips.animations }),
      })
    return { status: 'ready', document, report: report.finish(document) }
  } catch (error) {
    if (
      !(error instanceof BbmodelInputError) ||
      /^(?:files\[|native\.|report\.|options(?:\.|$)|identity\.|file$|files$|entryPath$)/.test(
        error.path,
      )
    )
      throw error
    throw new BbmodelInputError(
      error.reason,
      `files[${JSON.stringify(entryPath)}].${error.path}`,
      error.message,
      { cause: error },
    )
  }
}
