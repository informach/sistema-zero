import { isMoldaAssetId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import type { NativeImportIdentity } from '../import/importDocumentBase'
import * as v from '../scene/validation'

export interface NativeImportToken {
  documentId: string
  revision: number
  requestId: number
}

export function readNativeImportToken(raw: unknown): NativeImportToken {
  const row = v.record(raw, 'request')
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  return {
    documentId: row.documentId,
    revision: v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true),
    requestId: v.number(row.requestId, 'requestId', 0, Number.MAX_SAFE_INTEGER, true),
  }
}

export function readNativeImportIdentity(raw: unknown, documentId: string): NativeImportIdentity {
  const host = v.record(raw, 'identity', ['id', 'name', 'createdAt', 'updatedAt'])
  v.requireScene(host.id === documentId, 'identity.id', 'A importação pertence a outra criação.')
  return {
    id: documentId,
    name: v.text(host.name, 'identity.name', MOLDA_LIMITS.maxNameChars),
    createdAt: v.number(host.createdAt, 'identity.createdAt'),
    updatedAt: v.number(host.updatedAt, 'identity.updatedAt'),
  }
}

/** All metadata/byte budgets precede ANY copy, including unused selected companions. */
export function readNativeImportFiles(
  rawBytes: unknown,
  rawFiles: unknown,
  policy: {
    fileBytes: number
    totalBytes: number
    files: number
    pathChars: number
    path: (value: string, at: string) => string
    budgetError: (at: string) => Error
    /** Format-specific: OBJ may not reuse the entry as a companion. */
    excludedPath?: string
  },
  snapshot: boolean,
) {
  let total = 0
  function bytes(value: unknown, path: string) {
    v.requireScene(
      value instanceof Uint8Array && value.buffer instanceof ArrayBuffer,
      path,
      'Os bytes precisam de memória não compartilhada.',
    )
    total += value.byteLength
    if (value.byteLength > policy.fileBytes || total > policy.totalBytes)
      throw policy.budgetError(path)
    return value
  }
  const input = bytes(rawBytes, 'bytes'),
    seen = new Set<string>(),
    files = v.list(rawFiles, 'files', policy.files).map((raw, i) => {
      const at = `files[${i}]`,
        file = v.record(raw, at, ['path', 'bytes']),
        path = policy.path(v.text(file.path, `${at}.path`, policy.pathChars), `${at}.path`)
      v.requireScene(!seen.has(path), `${at}.path`, 'Dois arquivos têm o mesmo caminho.')
      v.requireScene(
        path !== policy.excludedPath,
        `${at}.path`,
        'O arquivo principal não pode ser também um arquivo complementar.',
      )
      seen.add(path)
      return { path, bytes: bytes(file.bytes, `${at}.bytes`) }
    })
  return {
    bytes: snapshot ? new Uint8Array(input) : input,
    files: snapshot
      ? files.map((file) => ({ path: file.path, bytes: new Uint8Array(file.bytes) }))
      : files,
  }
}
