import 'server-only'
import { createHash } from 'node:crypto'
import { crc32, createInflateRaw } from 'node:zlib'
import { PINTA_CAUSAL_LIMITS } from '@sistemazero/core/creations/pinta-causal'
import {
  inspectPintaCausalDocument,
  MAX_PINTA_CAUSAL_DOCUMENT_BYTES,
  type PintaCausalDocument,
  type PintaCausalDocumentExpectation,
} from '@sistemazero/pinta/assets/causal'
import { CREATION_BLOB_CONTENT_TYPE } from './creation-download'
import type { R2PrivateObject } from './r2'

export class PintaCausalUnverifiedContent extends Error {}

export interface PintaCausalBlobExpectation extends PintaCausalDocumentExpectation {
  bytes: number
  /** No claimed digest for an old unverified pointer during backfill. */
  sha256?: string
}

export interface VerifiedPintaCausalBlob extends PintaCausalDocument {
  sha256: string
  gzip: Buffer
}

async function readGzip(
  blob: R2PrivateObject,
  expected: PintaCausalBlobExpectation,
  signal?: AbortSignal,
): Promise<{ gzip: Buffer; sha256: string }> {
  const reader = blob.body.getReader()
  let complete = false
  const cancel = () => {
    void reader.cancel(signal?.reason).catch(() => undefined)
  }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    signal?.throwIfAborted()
    if (
      !Number.isSafeInteger(expected.bytes) ||
      expected.bytes < 1 ||
      expected.bytes > PINTA_CAUSAL_LIMITS.itemBytes ||
      blob.contentLength !== expected.bytes ||
      blob.contentType !== CREATION_BLOB_CONTENT_TYPE
    )
      throw new PintaCausalUnverifiedContent('O tamanho e o tipo do arquivo não conferem.')

    const gzip = Buffer.allocUnsafe(expected.bytes)
    const digest = createHash('sha256')
    let received = 0
    while (true) {
      signal?.throwIfAborted()
      const { done, value } = await reader.read()
      signal?.throwIfAborted()
      if (done) break
      if (value.byteLength > gzip.byteLength - received)
        throw new PintaCausalUnverifiedContent('O arquivo excede o tamanho reservado.')
      gzip.set(value, received)
      received += value.byteLength
      digest.update(value)
    }
    complete = true
    const sha256 = digest.digest('hex')
    if (
      received !== gzip.byteLength ||
      (expected.sha256 !== undefined && expected.sha256 !== sha256)
    )
      throw new PintaCausalUnverifiedContent('O conteúdo recebido difere do arquivo reservado.')
    return { gzip, sha256 }
  } finally {
    signal?.removeEventListener('abort', cancel)
    if (!complete) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

/** A portable gzip has exactly one member. Node gunzip also concatenates multiple members. */
function deflatePayload(gzip: Buffer): Buffer {
  const trailer = gzip.length - 8
  if (
    trailer <= 10 ||
    gzip[0] !== 0x1f ||
    gzip[1] !== 0x8b ||
    gzip[2] !== 8 ||
    (gzip[3]! & 0xe0) !== 0
  )
    throw new Error('Cabeçalho gzip inválido')

  const flags = gzip[3]!
  let start = 10
  if ((flags & 4) !== 0) {
    if (start + 2 > trailer) throw new Error('Cabeçalho gzip incompleto')
    start += 2 + gzip.readUInt16LE(start)
  }
  for (const flag of [8, 16]) {
    if ((flags & flag) === 0) continue
    const end = gzip.indexOf(0, start)
    if (end < 0 || end >= trailer) throw new Error('Cabeçalho gzip incompleto')
    start = end + 1
  }
  if ((flags & 2) !== 0) {
    if (
      start + 2 > trailer ||
      (crc32(gzip.subarray(0, start)) & 0xffff) !== gzip.readUInt16LE(start)
    )
      throw new Error('Checksum de cabeçalho gzip inválido')
    start += 2
  }
  if (start >= trailer) throw new Error('Arquivo gzip incompleto')
  return gzip.subarray(start, trailer)
}

async function decompressText(gzip: Buffer, signal?: AbortSignal): Promise<string> {
  const deflate = deflatePayload(gzip)
  const inflate = createInflateRaw()
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  const parts: string[] = []
  let length = 0
  let crc = 0
  inflate.end(deflate)
  try {
    for await (const chunk of inflate as AsyncIterable<Buffer>) {
      signal?.throwIfAborted()
      length += chunk.byteLength
      if (length > MAX_PINTA_CAUSAL_DOCUMENT_BYTES)
        throw new Error('Arquivo descomprimido grande demais')
      crc = crc32(chunk, crc)
      parts.push(decoder.decode(chunk, { stream: true }))
    }
    if (
      inflate.bytesWritten !== deflate.byteLength ||
      crc !== gzip.readUInt32LE(gzip.length - 8) ||
      length !== gzip.readUInt32LE(gzip.length - 4)
    )
      throw new Error('O arquivo gzip tem dados extras ou checksum incorreto')
    parts.push(decoder.decode())
    return parts.join('')
  } finally {
    inflate.destroy()
  }
}

/** Validates the stored gzip and retains those exact bytes when the caller needs to seal a copy. */
export async function readPintaCausalBlob(
  blob: R2PrivateObject,
  expected: PintaCausalBlobExpectation,
  signal?: AbortSignal,
): Promise<VerifiedPintaCausalBlob> {
  const { gzip, sha256 } = await readGzip(blob, expected, signal)
  let text: string
  try {
    text = await decompressText(gzip, signal)
  } catch (cause) {
    signal?.throwIfAborted()
    throw new PintaCausalUnverifiedContent('O arquivo do Pinta não pode ser conferido.', { cause })
  }
  signal?.throwIfAborted()
  const document = inspectPintaCausalDocument(text, expected)
  if (!document)
    throw new PintaCausalUnverifiedContent('A revisão do desenho não pode ser conferida.')
  return { ...document, sha256, gzip }
}
