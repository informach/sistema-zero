import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from '../import/bbmodelInput'
import type { BbmodelNativeResult } from '../import/bbmodelNativeDocument'
import { BBMODEL_REPORT_LIMITS } from '../import/bbmodelReportLimits'
import { bbmodelLocalFilePath } from '../import/bbmodelResourcePath'
import { LOCAL_FILE_PATH_LIMIT } from '../import/localFilePath'
import { readSceneDocument } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readBbmodelImportReport } from './bbmodelImportReport'
import type { BbmodelImportRequest, BbmodelImportToken } from './bbmodelImportRequest'
import type { TaskReply } from './workerTask'

export type BbmodelImportProgress = 'validating' | 'converting'
export type BbmodelImportResult = BbmodelNativeResult
export function bbmodelImportReply(token: BbmodelImportToken, result: BbmodelImportResult) {
  return {
    documentId: token.documentId,
    revision: token.revision,
    requestId: token.requestId,
    type: 'result' as const,
    result,
  }
}
export function readBbmodelImportReply(
  raw: unknown,
  expected: BbmodelImportRequest,
): TaskReply<BbmodelImportResult, BbmodelImportProgress> {
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
    throw new BbmodelInputError(
      v.choice(row.reason, ['invalid', 'unsupported', 'budget'], 'reply.reason'),
      v.text(row.path, 'reply.path', BBMODEL_REPORT_LIMITS.pathChars),
      v.text(row.message, 'reply.message', 1024),
    )
  }
  if (type === 'progress') {
    v.record(row, 'reply', [...fields, 'progress'])
    return {
      type,
      progress: v.choice(row.progress, ['validating', 'converting'], 'reply.progress'),
    }
  }
  v.record(row, 'reply', [...fields, 'result'])
  const result = v.record(row.result, 'result'),
    status = v.choice(result.status, ['missing', 'ready'], 'result.status')
  if (status === 'missing') {
    v.record(result, 'result', ['status', 'paths'])
    const selected = new Set(expected.files.map((file) => file.path)),
      paths = v.list(result.paths, 'result.paths', BBMODEL_INPUT_LIMITS.resources).map((raw) => {
        const path = v.text(raw, 'result.path', LOCAL_FILE_PATH_LIMIT)
        v.requireScene(
          bbmodelLocalFilePath(path, 'result.path') === path &&
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
    result: {
      status,
      document,
      report: readBbmodelImportReport(result.report, document, expected),
    },
  }
}
