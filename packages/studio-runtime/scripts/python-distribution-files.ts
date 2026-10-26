import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioPortablePathSchema,
  StudioSha256Schema,
} from '@sistemazero/core/studio/project-environment'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { PGZERO_MODULE_FILES } from '../../studio/src/runtime/python/pgzero/contract'
import { RAYLIB_MODULE_FILES } from '../../studio/src/runtime/python/raylib/contract'
import { TURTLE_MODULE_FILES } from '../../studio/src/runtime/python/turtle/contract'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Reject traversal and symlinks/junctions, including the selected root. No source is executed. */
export async function readPromotionFile(directory: string, path: string, maximumBytes: number) {
  StudioPortablePathSchema.parse(path)
  const root = resolve(directory)
  const rootInfo = await lstat(root)
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
    throw new Error('A distribuição não pode ser um link simbólico ou arquivo.')
  const realRoot = await realpath(root)
  if (relative(root, realRoot) !== '') throw new Error('A distribuição contém um link simbólico.')
  let current = root
  const parts = path.split('/')
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part)
    const info = await lstat(current)
    if (info.isSymbolicLink())
      throw new Error('Artefato com link simbólico não pode ser promovido.')
    if (index < parts.length - 1 && !info.isDirectory())
      throw new Error('Diretório de artefato inválido.')
    if (index === parts.length - 1 && (!info.isFile() || info.size > maximumBytes))
      throw new Error('Arquivo inválido ou maior que o limite declarado.')
  }
  const target = await realpath(current)
  const within = relative(realRoot, target)
  if (isAbsolute(within) || within === '..' || within.startsWith(`..${sep}`))
    throw new Error('O artefato escapa da distribuição.')
  const bytes = new Uint8Array(await readFile(target))
  if (bytes.byteLength > maximumBytes) throw new Error('Arquivo cresceu durante a leitura.')
  return bytes
}

/** The shared offline file gate for promotion and reproduction; never loads executable artifacts. */
export async function verifyPythonDistributionFiles(directory: string, expectedSha256: string) {
  StudioSha256Schema.parse(expectedSha256)
  const manifestBytes = await readPromotionFile(directory, 'distribution.json', 2_000_000)
  const distribution = StudioPythonDistributionSchema.parse(
    JSON.parse(new TextDecoder().decode(manifestBytes)),
  )
  if ((await sha256Hex(canonicalJson(distribution))) !== expectedSha256)
    throw new Error('SHA da distribuição diferente do artefato qualificado.')
  const contents = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const file of distribution.files) {
    const bytes = await readPromotionFile(directory, file.path, file.bytes)
    if (bytes.byteLength !== file.bytes || digest(bytes) !== file.sha256)
      throw new Error(`Integridade inválida: ${file.path}.`)
    contents.set(file.path, bytes)
  }
  for (const representation of distribution.httpRepresentations ?? []) {
    const compressed = contents.get(representation.artifactPath)
    const logical = contents.get(representation.path)
    if (!compressed || !logical) throw new Error('Representação gzip incompleta.')
    try {
      const decoded = gunzipSync(compressed, { maxOutputLength: Math.max(1, logical.byteLength) })
      if (
        decoded.byteLength !== logical.byteLength ||
        decoded.some((byte, index) => byte !== logical[index])
      )
        throw new Error('Bytes descomprimidos diferentes.')
    } catch (cause) {
      throw new Error(`Representação gzip inválida: ${representation.path}.`, { cause })
    }
  }
  for (const path of [
    'standalone.mjs',
    'inspect.mjs',
    'playtest.mjs',
    'boot-reader.mjs',
    'analysis.html',
    'analysis-worker.mjs',
    'analysis-frame.mjs',
    'turtle-renderer.mjs',
    'turtle-protocol.mjs',
    ...TURTLE_MODULE_FILES.map((name) => `turtle/${name}`),
    'pgzero-renderer.mjs',
    'pgzero-protocol.mjs',
    ...PGZERO_MODULE_FILES.map((name) => `pgzero/${name}`),
    'raylib-renderer.mjs',
    'raylib-protocol.mjs',
    ...RAYLIB_MODULE_FILES.map((name) => `raylib/${name}`),
    'LICENSE-pgzero.txt',
    'LICENSE-freefont.txt',
    'LICENSE-raylib.txt',
    'LICENSE-raylib-python-cffi.txt',
  ])
    if (!contents.has(path)) throw new Error(`Artefato de produto obrigatório ausente: ${path}.`)
  return distribution
}
