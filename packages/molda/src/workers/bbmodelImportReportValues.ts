import type { BbmodelConversionSource } from '../import/bbmodelConversionReport'
import type { readBbmodelNativeOptions } from '../import/bbmodelNativeOptions'
import { BBMODEL_REPORT_LIMITS } from '../import/bbmodelReportLimits'
import type { ModelSceneNode, SceneGeometry, SceneImage, SceneMaterial } from '../scene/document'
import * as v from '../scene/validation'
import { readNativeImportReportCode } from './nativeImportReport'

export interface BbmodelReportContext {
  source: BbmodelConversionSource
  options: ReturnType<typeof readBbmodelNativeOptions>
  nodes: ReadonlyMap<string, ModelSceneNode>
  geometries: ReadonlyMap<string, SceneGeometry>
  /** Computed once, never enumerate a mesh again for each repeated diagnostic. */
  faceCounts: ReadonlyMap<string, number>
  materials: ReadonlyMap<string, SceneMaterial>
  images: ReadonlyMap<string, SceneImage>
}
export const bbmodelReportPath = (value: unknown) =>
  v.text(value, 'issue.path', BBMODEL_REPORT_LIMITS.pathChars)
export const bbmodelReportCount = (value: unknown, maximum: number, minimum = 1) =>
  v.number(value, 'issue.count', minimum, maximum, true)

export function bbmodelReportNode(value: unknown, context: BbmodelReportContext, retained = true) {
  const node = v.number(value, 'issue.node', 0, context.source.nodes - 1, true)
  v.requireScene(
    !retained || context.nodes.has(`bbmodel_node_${node}`),
    'issue.node',
    'A adaptação aponta para uma peça que não foi importada.',
  )
  return node
}
export function bbmodelReportTexture(value: unknown, context: BbmodelReportContext) {
  const texture = v.number(value, 'issue.texture', 0, context.source.textures - 1, true)
  v.requireScene(
    context.images.has(`bbmodel_image_${texture}`),
    'issue.texture',
    'A adaptação aponta para uma imagem que não foi importada.',
  )
  return texture
}
export function bbmodelReportNodeCount<T extends string>(
  raw: unknown,
  codes: Record<T, true>,
  context: BbmodelReportContext,
  maximum: number,
) {
  const row = v.record(raw, 'issue.detail', ['code', 'node', 'path', 'count']),
    node = bbmodelReportNode(row.node, context)
  v.requireScene(
    context.nodes.get(`bbmodel_node_${node}`)!.kind === 'mesh',
    'issue.node',
    'A adaptação de geometria precisa apontar para uma malha.',
  )
  return {
    code: readNativeImportReportCode(row.code, codes),
    node,
    path: bbmodelReportPath(row.path),
    count: bbmodelReportCount(row.count, maximum),
  }
}
export function bbmodelReportChoice(allowed: boolean): void {
  v.requireScene(allowed, 'issue', 'A adaptação relatada não corresponde às escolhas do pedido.')
}
