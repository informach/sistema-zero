import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import {
  normalizeWebAnimation,
  readWebAnimation,
  webAnimationPoster,
} from '../../packages/edisvg/src/data'

const [inputDirectory, collection = 'sources'] = process.argv.slice(2)
if (!inputDirectory) throw new Error('Informe a pasta da qualificação real do exportador ediSVG.')
if (!['sources', 'derived'].includes(collection)) throw new Error('Coleção de origem inválida.')
const input = resolve(inputDirectory)
const target = resolve(import.meta.dir, '../../art/edisvg/exports')
const sources = resolve(import.meta.dir, '../../art/edisvg', collection)
const hash = (content: string | Uint8Array) => createHash('sha256').update(content).digest('hex')
const receipt: unknown = JSON.parse(await readFile(resolve(input, 'receipt.json'), 'utf8'))
if (
  typeof receipt !== 'object' ||
  receipt === null ||
  !('passed' in receipt) ||
  receipt.passed !== true ||
  !('exports' in receipt) ||
  !Array.isArray(receipt.exports) ||
  !receipt.exports.length
)
  throw new Error('A qualificação não foi aprovada.')
const vendor = JSON.parse(
  await readFile(resolve(import.meta.dir, '../../packages/edisvg/vendor/manifest.json'), 'utf8'),
)
if (
  !('runtimeSha256' in receipt) ||
  receipt.runtimeSha256 !== vendor.files['edi-web-player.mjs'].sha256
)
  throw new Error('A qualificação usou outra versão do player.')

const prepared = await Promise.all(
  receipt.exports.map(async (item: unknown) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('name' in item) ||
      typeof item.name !== 'string' ||
      !/^[a-z0-9-]+$/.test(item.name) ||
      !('file' in item) ||
      typeof item.file !== 'string' ||
      basename(item.file) !== item.file ||
      item.file.includes('\\') ||
      !item.file.endsWith('.edisvg') ||
      !('sha256' in item) ||
      typeof item.sha256 !== 'string' ||
      !('sourceSha256' in item) ||
      typeof item.sourceSha256 !== 'string' ||
      !('boardId' in item) ||
      typeof item.boardId !== 'string' ||
      !('animationId' in item) ||
      !(item.animationId === null || typeof item.animationId === 'string')
    )
      throw new Error('Referência de exportação inválida.')
    const source = await readFile(resolve(sources, item.file))
    if (hash(source) !== item.sourceSha256) throw new Error(`O projeto ${item.file} mudou.`)
    const content = await readFile(resolve(input, `${item.name}.edi-animation.json`), 'utf8')
    if (hash(content) !== item.sha256) throw new Error(`A exportação ${item.name} mudou.`)
    if (normalizeWebAnimation(content) !== content)
      throw new Error(`A exportação ${item.name} não é canônica.`)
    const poster = webAnimationPoster(content)
    if (!poster) throw new Error(`Falta a reserva de ${item.name}.`)
    const info = readWebAnimation(content)
    const posterSha = hash(poster.bytes)
    return {
      content,
      poster: poster.bytes,
      record: {
        collection,
        key: item.name,
        source: item.file,
        sourceSha256: item.sourceSha256,
        boardId: item.boardId,
        animationId: item.animationId,
        file: `${item.name}.${item.sha256.slice(0, 12)}.edi-animation.json`,
        sha256: item.sha256,
        bytes: Buffer.byteLength(content),
        poster: {
          file: `${item.name}.${posterSha.slice(0, 12)}.png`,
          sha256: posterSha,
          bytes: poster.bytes.byteLength,
          width: poster.width,
          height: poster.height,
        },
        title: info.title,
        inputs: info.inputs,
        machines: info.machines,
      },
    }
  }),
)
if (new Set(prepared.map((value) => value.record.key)).size !== prepared.length)
  throw new Error('Exportações repetidas.')
const manifestPath = resolve(target, 'manifest.json')
type ArtRecord = (typeof prepared)[number]['record']
let existing: ArtRecord[] = []
let previousText: string | undefined
try {
  previousText = await readFile(manifestPath, 'utf8')
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
}
if (previousText !== undefined) {
  const previous = JSON.parse(previousText)
  if (previous.runtimeSha256 !== receipt.runtimeSha256 || !Array.isArray(previous.artifacts))
    throw new Error('O acervo anterior usa outro player ou está inválido.')
  existing = previous.artifacts
  for (const entry of existing) {
    if (
      !/^[a-z0-9-]+$/.test(entry.key) ||
      basename(entry.file) !== entry.file ||
      basename(entry.poster.file) !== entry.poster.file
    )
      throw new Error('Arquivo anterior inválido.')
    if (
      hash(await readFile(resolve(target, entry.file))) !== entry.sha256 ||
      hash(await readFile(resolve(target, entry.poster.file))) !== entry.poster.sha256
    )
      throw new Error('O acervo anterior foi alterado.')
  }
}
const incoming = new Set(prepared.map((value) => value.record.key))
const records = [
  ...existing.filter((value) => !incoming.has(value.key)),
  ...prepared.map((value) => value.record),
]
await mkdir(target, { recursive: true })
for (const item of prepared) {
  await writeFile(resolve(target, item.record.file), item.content)
  await writeFile(resolve(target, item.record.poster.file), item.poster)
}
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      format: 'sistema-zero-edisvg-art',
      version: 1,
      sourceRevision: vendor.sourceRevision,
      runtimeSha256: receipt.runtimeSha256,
      artifacts: records,
    },
    null,
    2,
  )}\n`,
)
console.log(
  JSON.stringify({
    projects: new Set(prepared.map((value) => value.record.source)).size,
    artifacts: prepared.length,
    output: target,
  }),
)
