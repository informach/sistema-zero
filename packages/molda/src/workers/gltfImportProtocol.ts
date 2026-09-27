import type { GltfConversionReport } from '../import/gltfConversionReport'
import { GLTF_CONVERSION_REPORT_LIMITS } from '../import/gltfConversionReport'
import { GLTF_INPUT_LIMITS, GltfInputError } from '../import/gltfInput'
import { gltfLocalFilePath } from '../import/gltfResourcePath'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readGltfImportReport } from './gltfImportReport'
import type { GltfImportRequest, GltfImportToken } from './gltfImportRequest'
import type { TaskReply } from './workerTask'

export type GltfImportProgress = 'validating' | 'reading' | 'converting'
export interface GltfImportInspection {
  format: 'glb' | 'gltf'
  defaultScene: number | null
  scenes: Array<{ index: number; name: string | null; roots: number }>
  nodes: number
  meshes: number
  skins: number
  animations: number
  unhandledExtensions: string[]
}
export type GltfImportResult =
  | { status: 'missing'; paths: string[] }
  | { status: 'inspect'; source: GltfImportInspection }
  | { status: 'ready'; document: MoldaSceneDocument; report: GltfConversionReport }

export function gltfImportReply<T extends GltfImportResult>(token: GltfImportToken, result: T) {
  return {
    documentId: token.documentId,
    revision: token.revision,
    requestId: token.requestId,
    type: 'result' as const,
    result,
  }
}
function inspection(raw: unknown): GltfImportInspection {
  const row = v.record(raw, 'inspection', [
      'format',
      'defaultScene',
      'scenes',
      'nodes',
      'meshes',
      'skins',
      'animations',
      'unhandledExtensions',
    ]),
    nodes = v.number(row.nodes, 'inspection.nodes', 0, GLTF_INPUT_LIMITS.nodes, true),
    scenes = v.list(row.scenes, 'inspection.scenes', GLTF_INPUT_LIMITS.scenes).map((raw, i) => {
      const scene = v.record(raw, 'inspection.scene', ['index', 'name', 'roots'])
      v.requireScene(scene.index === i, 'inspection.scene.index', 'Índice de cena incorreto.')
      return {
        index: i,
        name:
          scene.name === null
            ? null
            : v.text(scene.name, 'inspection.scene.name', GLTF_INPUT_LIMITS.pathLength, true),
        roots: v.number(scene.roots, 'inspection.scene.roots', 0, nodes, true),
      }
    }),
    extensions = v
      .list(row.unhandledExtensions, 'inspection.extensions', GLTF_INPUT_LIMITS.extensions)
      .map((name) => v.text(name, 'extension', GLTF_INPUT_LIMITS.pathLength, true))
  v.requireScene(
    new Set(extensions).size === extensions.length,
    'inspection.extensions',
    'Extensão repetida.',
  )
  v.requireScene(
    scenes.reduce((total, scene) => total + scene.roots, 0) <= GLTF_INPUT_LIMITS.sceneRoots,
    'inspection.scenes',
    'As referências de cena ultrapassam o orçamento da fonte.',
  )
  return {
    format: v.choice(row.format, ['glb', 'gltf'], 'inspection.format'),
    defaultScene:
      row.defaultScene === null
        ? null
        : v.number(row.defaultScene, 'inspection.defaultScene', 0, scenes.length - 1, true),
    scenes,
    nodes,
    unhandledExtensions: extensions,
    meshes: v.number(row.meshes, 'inspection.meshes', 0, GLTF_INPUT_LIMITS.meshes, true),
    skins: v.number(row.skins, 'inspection.skins', 0, GLTF_INPUT_LIMITS.skins, true),
    animations: v.number(
      row.animations,
      'inspection.animations',
      0,
      GLTF_INPUT_LIMITS.animations,
      true,
    ),
  }
}

export function readGltfImportReply(
  raw: unknown,
  expected: GltfImportRequest,
): TaskReply<GltfImportResult, GltfImportProgress> {
  const row = v.record(raw, 'reply'),
    fields = ['documentId', 'revision', 'requestId', 'type']
  v.requireScene(
    row.documentId === expected.documentId &&
      row.revision === expected.revision &&
      row.requestId === expected.requestId,
    'reply',
    'Esse resultado pertence a outra criação, revisão ou pedido.',
  )
  const type = v.choice(row.type, ['error', 'progress', 'result'], 'reply.type')
  if (type === 'error') {
    v.record(row, 'reply', [...fields, 'reason', 'path', 'message'])
    throw new GltfInputError(
      v.choice(row.reason, ['invalid', 'unsupported', 'budget'], 'reply.reason'),
      v.text(row.path, 'reply.path', GLTF_CONVERSION_REPORT_LIMITS.pathChars),
      v.text(row.message, 'reply.message', 1024),
    )
  }
  if (type === 'progress') {
    v.record(row, 'reply', [...fields, 'progress'])
    return {
      type,
      progress: v.choice(row.progress, ['validating', 'reading', 'converting'], 'reply.progress'),
    }
  }
  v.record(row, 'reply', [...fields, 'result'])
  const result = v.record(row.result, 'result'),
    status = v.choice(result.status, ['missing', 'inspect', 'ready'], 'result.status')
  if (status === 'missing') {
    v.record(result, 'result', ['status', 'paths'])
    const paths = v
      .list(result.paths, 'result.paths', GLTF_INPUT_LIMITS.resources)
      .map((path) =>
        gltfLocalFilePath(v.text(path, 'result.path', GLTF_INPUT_LIMITS.pathLength), 'result.path'),
      )
    v.requireScene(
      paths.length > 0 && new Set(paths).size === paths.length,
      'result.paths',
      'A lista de arquivos faltantes está vazia ou repetida.',
    )
    return { type, result: { status, paths } }
  }
  if (status === 'inspect') {
    v.record(result, 'result', ['status', 'source'])
    v.requireScene(
      expected.sceneIndex === 'inspect',
      'result.status',
      'Era esperado um documento, não outra inspeção.',
    )
    return { type, result: { status, source: inspection(result.source) } }
  }
  v.record(result, 'result', ['status', 'document', 'report'])
  v.requireScene(
    expected.sceneIndex !== 'inspect',
    'result.status',
    'A cena precisa ser escolhida antes de converter.',
  )
  const read = readSceneDocument(result.document)
  v.requireScene(
    read.status === 'valid',
    'result.document',
    read.status === 'invalid' ? read.message : 'Formato de documento inesperado.',
  )
  const document = read.document,
    identity = expected.identity
  v.requireScene(
    document.id === identity.id &&
      document.name === identity.name &&
      document.createdAt === identity.createdAt &&
      document.updatedAt === identity.updatedAt &&
      document.thumb === undefined,
    'result.document',
    'A identidade do documento recebido não corresponde ao pedido.',
  )
  return {
    type,
    result: {
      status,
      document,
      report: readGltfImportReport(result.report, document, expected.sceneIndex),
    },
  }
}
