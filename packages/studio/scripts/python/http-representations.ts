import { createHash } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'
import { STUDIO_PYTHON_HTTP_GZIP_PREFIX } from '@sistemazero/core/studio/python-runtime-distribution'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export const PYTHON_HTTP_COMPRESSION_RECIPE = {
  version: 1,
  encoding: 'gzip',
  api: 'node:zlib.gzipSync',
  level: 9,
  minimumModuleBytes: 1024,
  logicalExtension: '.mjs',
  timestamp: 0,
} as const

/** Packaging only: logical bytes are never rewritten and serving never compresses on demand. */
export function createPythonHTTPRepresentations(contents: ReadonlyMap<string, Uint8Array>) {
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  const representations: { path: string; encoding: 'gzip'; artifactPath: string }[] = []
  if ([...contents.keys()].some((path) => path.startsWith(STUDIO_PYTHON_HTTP_GZIP_PREFIX)))
    throw new Error('O namespace de transporte HTTP está reservado para o empacotamento.')
  for (const [path, bytes] of [...contents].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (
      !path.endsWith(PYTHON_HTTP_COMPRESSION_RECIPE.logicalExtension) ||
      bytes.byteLength < PYTHON_HTTP_COMPRESSION_RECIPE.minimumModuleBytes
    )
      continue
    const compressed = new Uint8Array(
      gzipSync(bytes, { level: PYTHON_HTTP_COMPRESSION_RECIPE.level }),
    )
    if (compressed.byteLength >= bytes.byteLength) continue
    const decoded = gunzipSync(compressed, { maxOutputLength: bytes.byteLength })
    if (
      decoded.byteLength !== bytes.byteLength ||
      digest(decoded) !== digest(bytes) ||
      compressed.slice(4, 8).some((byte) => byte !== 0)
    )
      throw new Error(`Representação gzip não determinística ou inválida: ${path}.`)
    const artifactPath = `${STUDIO_PYTHON_HTTP_GZIP_PREFIX}${digest(compressed)}.gz`
    files.set(artifactPath, compressed)
    representations.push({ path, encoding: 'gzip', artifactPath })
  }
  return { files, representations }
}
