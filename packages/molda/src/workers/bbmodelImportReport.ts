import type {
  BbmodelConversionIssue,
  BbmodelConversionReport,
} from '../import/bbmodelConversionReport'
import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import { readBbmodelNativeOptions } from '../import/bbmodelNativeOptions'
import { BBMODEL_REPORT_LIMITS, BbmodelReportBudget } from '../import/bbmodelReportLimits'
import { importDocumentCosts } from '../import/importDocumentCosts'
import type { MoldaSceneDocument } from '../scene/document'
import * as v from '../scene/validation'
import { readBbmodelImportAnimations } from './bbmodelImportAnimationReport'
import {
  readBbmodelImageIssue,
  readBbmodelLayoutIssue,
  readBbmodelNodeMaterialIssue,
  readBbmodelResourceIssue,
  readBbmodelTextureMaterialIssue,
} from './bbmodelImportAppearanceReport'
import { readBbmodelImportPaintIssue } from './bbmodelImportPaintReport'
import type { BbmodelReportContext } from './bbmodelImportReportValues'
import type { BbmodelImportRequest } from './bbmodelImportRequest'
import {
  readBbmodelAuthorialUvIssue,
  readBbmodelGeometryIssue,
  readBbmodelHierarchyIssue,
  readBbmodelNormalizedUvIssue,
  readBbmodelPositionIssue,
  readBbmodelRemainderIssue,
  readBbmodelSelectionIssue,
  readBbmodelSurfaceIssue,
  readBbmodelTopologyIssue,
} from './bbmodelImportStructureReport'
import { readNativeImportReportCode } from './nativeImportReport'

function readSource(
  raw: unknown,
  document: MoldaSceneDocument,
  expected: BbmodelImportRequest,
): BbmodelConversionReport['source'] {
  const row = v.record(raw, 'report.source', [
      'format',
      'version',
      'modelFormat',
      'entryPath',
      'nodes',
      'omittedNodes',
      'textures',
      'unusedTextures',
      'textureGroups',
      'selectedFileBytes',
      'originalFile',
      'auxiliaryMetadata',
    ]),
    nodes = v.number(
      row.nodes,
      'report.source.nodes',
      document.nodes.length,
      BBMODEL_INPUT_LIMITS.nodes,
      true,
    ),
    textures = v.number(
      row.textures,
      'report.source.textures',
      document.images.length,
      BBMODEL_INPUT_LIMITS.textures,
      true,
    ),
    selectedFileBytes =
      expected.bytes.byteLength +
      expected.files.reduce((sum, file) => sum + file.bytes.byteLength, 0)
  v.requireScene(
    row.entryPath === expected.entryPath,
    'report.source.entryPath',
    'Arquivo principal incorreto.',
  )
  v.requireScene(
    row.omittedNodes === nodes - document.nodes.length,
    'report.source.omittedNodes',
    'Contagem de peças inconsistente.',
  )
  v.requireScene(
    row.unusedTextures === textures - document.images.length,
    'report.source.unusedTextures',
    'Contagem de texturas inconsistente.',
  )
  v.requireScene(
    row.selectedFileBytes === selectedFileBytes,
    'report.source.selectedFileBytes',
    'O tamanho escolhido não corresponde ao pedido.',
  )
  return {
    format: v.choice(row.format, ['bbmodel'], 'report.source.format'),
    version: v.choice(row.version, ['4.9', '4.10', '5.0'], 'report.source.version'),
    modelFormat: v.choice(row.modelFormat, ['free'], 'report.source.modelFormat'),
    entryPath: expected.entryPath,
    nodes,
    textures,
    omittedNodes: nodes - document.nodes.length,
    unusedTextures: textures - document.images.length,
    textureGroups: v.number(
      row.textureGroups,
      'report.source.textureGroups',
      0,
      BBMODEL_INPUT_LIMITS.textureGroups,
      true,
    ),
    selectedFileBytes,
    originalFile: v.choice(row.originalFile, ['not-retained'], 'report.source.originalFile'),
    auxiliaryMetadata: v.choice(
      row.auxiliaryMetadata,
      ['not-stored'],
      'report.source.auxiliaryMetadata',
    ),
  }
}
function nativeIndex(id: string, prefix: string, maximum: number): number {
  const index = Number(id.slice(prefix.length))
  v.requireScene(
    Number.isSafeInteger(index) && index >= 0 && index < maximum && id === prefix + index,
    'report.source',
    'Uma identidade nativa não corresponde ao formato de origem.',
  )
  return index
}

/** A validated native document, closed diagnostic variants, matching costs/choices and bounded owned report. */
export function readBbmodelImportReport(
  raw: unknown,
  document: MoldaSceneDocument,
  expected: BbmodelImportRequest,
): BbmodelConversionReport {
  const row = v.record(raw, 'report', ['review', 'source', 'costs', 'issues', 'animations']),
    review = v.choice(row.review, ['required'], 'report.review'),
    costs = importDocumentCosts(document),
    reported = v.record(row.costs, 'report.costs', Object.keys(costs))
  for (const [key, value] of Object.entries(costs))
    v.requireScene(
      reported[key] === value,
      `report.costs.${key}`,
      'O custo não corresponde ao documento recebido.',
    )
  v.requireScene(
    costs.skins === 0 &&
      costs.instances === costs.geometries &&
      costs.materials === costs.geometries + costs.images,
    'report.costs',
    'O documento não corresponde à conversão bbmodel disponível.',
  )
  const source = readSource(row.source, document, expected),
    context: BbmodelReportContext = {
      source,
      options: readBbmodelNativeOptions(expected.options),
      nodes: new Map(document.nodes.map((node) => [node.id, node])),
      geometries: new Map(document.geometries.map((geometry) => [geometry.id, geometry])),
      faceCounts: new Map(
        document.geometries.map((geometry) => {
          v.requireScene(
            geometry.kind === 'mesh',
            'report.costs',
            'Uma geometria importada precisa ser malha.',
          )
          return [geometry.id, Object.keys(geometry.faces).length]
        }),
      ),
      materials: new Map(document.materials.map((material) => [material.id, material])),
      images: new Map(document.images.map((image) => [image.id, image])),
    },
    expectedMaterials = new Set<string>()
  for (const node of document.nodes) {
    const index = nativeIndex(node.id, 'bbmodel_node_', source.nodes)
    if (node.kind === 'mesh') {
      v.requireScene(
        node.geometryId === `bbmodel_geometry_${index}` &&
          node.materialId === `bbmodel_node_material_${index}`,
        'report.source',
        'Os recursos não correspondem à identidade da peça.',
      )
      expectedMaterials.add(node.materialId)
    }
  }
  for (const image of document.images) {
    const index = nativeIndex(image.id, 'bbmodel_image_', source.textures),
      materialId = `bbmodel_material_${index}`
    v.requireScene(
      context.materials.get(materialId)?.colorImageId === image.id && image.encoding === 'rgba',
      'report.source',
      'A imagem não corresponde ao material importado.',
    )
    expectedMaterials.add(materialId)
  }
  v.requireScene(
    document.materials.every((material) => expectedMaterials.has(material.id)),
    'report.source',
    'Há materiais de outra origem no documento.',
  )
  const budget = new BbmodelReportBudget(),
    resourceTextures = new Set<number>(),
    paintTextures = new Set<number>(),
    resourceIds = new Set<number>()
  const animations = readBbmodelImportAnimations(row.animations, document, context)
  budget.addText({ review, source, costs, issues: [], animations })
  const issues = v
    .list(row.issues, 'report.issues', BBMODEL_REPORT_LIMITS.issues)
    .map((raw): BbmodelConversionIssue => {
      const item = v.record(raw, 'issue', ['stage', 'detail']),
        stage = readNativeImportReportCode(item.stage, {
          selection: true,
          remainder: true,
          topology: true,
          positions: true,
          'authorial-uv': true,
          'normalized-uv': true,
          surfaces: true,
          'node-materials': true,
          'texture-materials': true,
          hierarchy: true,
          geometry: true,
          resources: true,
          layouts: true,
          images: true,
          'paint-layers': true,
        } satisfies Record<BbmodelConversionIssue['stage'], true>)
      let issue: BbmodelConversionIssue
      switch (stage) {
        case 'selection':
          issue = { stage, detail: readBbmodelSelectionIssue(item.detail, context) }
          break
        case 'remainder':
          issue = { stage, detail: readBbmodelRemainderIssue(item.detail, context) }
          break
        case 'topology':
          issue = { stage, detail: readBbmodelTopologyIssue(item.detail, context) }
          break
        case 'positions':
          issue = { stage, detail: readBbmodelPositionIssue(item.detail, context) }
          break
        case 'authorial-uv':
          issue = { stage, detail: readBbmodelAuthorialUvIssue(item.detail, context) }
          break
        case 'normalized-uv':
          issue = { stage, detail: readBbmodelNormalizedUvIssue(item.detail, context) }
          break
        case 'surfaces':
          issue = { stage, detail: readBbmodelSurfaceIssue(item.detail, context) }
          break
        case 'node-materials':
          issue = { stage, detail: readBbmodelNodeMaterialIssue(item.detail, context) }
          break
        case 'texture-materials':
          issue = { stage, detail: readBbmodelTextureMaterialIssue(item.detail, context) }
          break
        case 'hierarchy':
          issue = { stage, detail: readBbmodelHierarchyIssue(item.detail, context) }
          break
        case 'geometry':
          issue = { stage, detail: readBbmodelGeometryIssue(item.detail, context) }
          break
        case 'layouts':
          issue = { stage, detail: readBbmodelLayoutIssue(item.detail, context) }
          break
        case 'images':
          issue = { stage, detail: readBbmodelImageIssue(item.detail, context) }
          break
        case 'paint-layers': {
          const detail = readBbmodelImportPaintIssue(item.detail, context)
          v.requireScene(
            !paintTextures.has(detail.texture),
            'issue.texture',
            'Composição de camadas repetida.',
          )
          paintTextures.add(detail.texture)
          issue = { stage, detail }
          break
        }
        case 'resources': {
          const detail = readBbmodelResourceIssue(item.detail, context)
          v.requireScene(
            !resourceTextures.has(detail.texture),
            'issue.texture',
            'Origem de imagem repetida.',
          )
          resourceTextures.add(detail.texture)
          resourceIds.add(detail.resource)
          issue = { stage, detail }
          break
        }
      }
      budget.addIssue(issue)
      return issue
    })
  v.requireScene(
    resourceTextures.size === document.images.length &&
      [...resourceIds].every((index) => index < resourceIds.size),
    'report.issues',
    'Faltam origens de imagens ou seus índices são inconsistentes.',
  )
  for (const image of document.images) {
    const index = nativeIndex(image.id, 'bbmodel_image_', source.textures)
    if (paintTextures.has(index)) continue
    const layer = image.layers[0]
    v.requireScene(
      image.layers.length === 1 &&
        layer?.id === `${image.id}_layer` &&
        layer.name === 'Imagem importada' &&
        layer.visible &&
        layer.opacity === 1,
      'report.issues',
      'Falta o relatório da composição editável desta imagem.',
    )
  }
  return { review, source, costs, issues, animations }
}
