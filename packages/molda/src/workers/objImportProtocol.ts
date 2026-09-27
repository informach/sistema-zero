import { LOCAL_FILE_PATH_LIMIT } from '../import/localFilePath'
import type { ObjConversionReport } from '../import/objConversionReport'
import { OBJ_INPUT_LIMITS, ObjInputError } from '../import/objInput'
import { OBJ_CONVERSION_REPORT_LIMITS } from '../import/objReportLimits'
import { objLocalFilePath } from '../import/objResourcePath'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readObjImportReport } from './objImportReport'
import type { ObjImportRequest, ObjImportToken } from './objImportRequest'
import type { TaskReply } from './workerTask'

export type ObjImportProgress = 'validating' | 'reading' | 'converting'
export type ObjImportResult =
  | { status: 'missing'; paths: string[] }
  | { status: 'ready'; document: MoldaSceneDocument; report: ObjConversionReport }

export function objImportReply<T extends ObjImportResult>(token: ObjImportToken, result: T) {
  return {
    documentId: token.documentId,
    revision: token.revision,
    requestId: token.requestId,
    type: 'result' as const,
    result,
  }
}

export function readObjImportReply(
  raw: unknown,
  expected: ObjImportRequest,
): TaskReply<ObjImportResult, ObjImportProgress> {
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
    throw new ObjInputError(
      v.choice(row.reason, ['invalid', 'unsupported', 'budget'], 'reply.reason'),
      v.text(row.path, 'reply.path', OBJ_CONVERSION_REPORT_LIMITS.pathChars),
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
    status = v.choice(result.status, ['missing', 'ready'], 'result.status')
  if (status === 'missing') {
    v.record(result, 'result', ['status', 'paths'])
    const selected = new Set(expected.files.map((file) => file.path)),
      paths = v.list(result.paths, 'result.paths', OBJ_INPUT_LIMITS.resources).map((raw) => {
        const path = v.text(raw, 'result.path', LOCAL_FILE_PATH_LIMIT)
        v.requireScene(
          objLocalFilePath(path, 'result.path') === path &&
            path !== expected.entryPath &&
            !selected.has(path),
          'result.path',
          'O arquivo faltante precisa ser um novo caminho local válido.',
        )
        return path
      })
    v.requireScene(
      paths.length > 0 && new Set(paths).size === paths.length,
      'result.paths',
      'A lista de arquivos faltantes está vazia ou repetida.',
    )
    return { type, result: { status, paths } }
  }
  v.record(result, 'result', ['status', 'document', 'report'])
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
    result: { status, document, report: readObjImportReport(result.report, document, expected) },
  }
}
