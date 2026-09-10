/**
 * Leitor do botão inteligente "Trazer de volta": aceita o `.molda.json` cru ou
 * o ZIP produzido por "Baixar tudo". O ZIP é consultado por FAIXAS: diretório
 * central, cabeçalho da entrada e somente os bytes de `galeria.molda.json`. Os
 * `.glb`, `.png` e `.hdr` nunca entram na memória (molde do leitor do Pinta).
 */
import {
  MAX_BACKUP_FILE_BYTES,
  MAX_CLASSIC_ZIP_ENTRIES,
  MOLDA_GALLERY_ZIP_ENTRY,
} from './backupFormat'

import { crc32 } from './png'

export { MAX_BACKUP_FILE_BYTES, MOLDA_GALLERY_ZIP_ENTRY } from './backupFormat'

export type MoldaBackupReadFailure =
  | 'too-large'
  | 'invalid-zip'
  | 'missing-backup'
  | 'duplicate-backup'
  | 'read-error'

export type MoldaBackupReadResult =
  | { ok: true; source: 'json' | 'zip'; text: string }
  | { ok: false; reason: MoldaBackupReadFailure }

interface ZipEntryLocation {
  name: string
  crc: number
  compression: 0 | 8
  flags: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_HEADER_SIGNATURE = 0x02014b50
const LOCAL_HEADER_SIGNATURE = 0x04034b50
const EOCD_FIXED_BYTES = 22
const MAX_ZIP_COMMENT_BYTES = 0xffff
const MAX_EOCD_SEARCH_BYTES = EOCD_FIXED_BYTES + MAX_ZIP_COMMENT_BYTES
const CENTRAL_HEADER_FIXED_BYTES = 46
const LOCAL_HEADER_FIXED_BYTES = 30
// O escritor gera no máximo ~110 bytes de diretório por criação; 16 MiB cobrem
// todo ZIP clássico produzido por ele sem abrir a porta para um diretório ilimitado.
const MAX_ZIP_DIRECTORY_BYTES = 16 * 1024 * 1024
const MAX_COMPRESSED_OVERHEAD_BYTES = 1024 * 1024
const ZIP64_U16 = 0xffff
const ZIP64_U32 = 0xffffffff

function dataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

async function readRange(file: File, start: number, end: number): Promise<Uint8Array | null> {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    return null
  }
  if (end > file.size) return null
  const bytes = new Uint8Array(await file.slice(start, end).arrayBuffer())
  return bytes.byteLength === end - start ? bytes : null
}

function findEocd(bytes: Uint8Array): number {
  const view = dataView(bytes)
  for (let offset = bytes.length - EOCD_FIXED_BYTES; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue
    const commentBytes = view.getUint16(offset + 20, true)
    if (offset + EOCD_FIXED_BYTES + commentBytes === bytes.length) return offset
  }
  return -1
}

async function locateEntries(
  file: File,
  maxBytes: number,
  include: (name: string) => boolean,
): Promise<ZipEntryLocation[] | MoldaBackupReadFailure> {
  if (file.size < EOCD_FIXED_BYTES) return 'invalid-zip'
  const tailStart = Math.max(0, file.size - MAX_EOCD_SEARCH_BYTES)
  const tail = await readRange(file, tailStart, file.size)
  if (!tail) return 'read-error'
  const eocdOffset = findEocd(tail)
  if (eocdOffset < 0) return 'invalid-zip'

  const eocd = dataView(tail)
  const disk = eocd.getUint16(eocdOffset + 4, true)
  const centralDisk = eocd.getUint16(eocdOffset + 6, true)
  const entriesOnDisk = eocd.getUint16(eocdOffset + 8, true)
  const entryCount = eocd.getUint16(eocdOffset + 10, true)
  const directorySize = eocd.getUint32(eocdOffset + 12, true)
  const directoryOffset = eocd.getUint32(eocdOffset + 16, true)
  if (
    disk !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === ZIP64_U16 ||
    directorySize === ZIP64_U32 ||
    directoryOffset === ZIP64_U32
  ) {
    return 'invalid-zip'
  }
  if (entryCount > MAX_CLASSIC_ZIP_ENTRIES || directorySize > MAX_ZIP_DIRECTORY_BYTES) {
    return 'invalid-zip'
  }
  const eocdAbsoluteOffset = tailStart + eocdOffset
  const directoryEnd = directoryOffset + directorySize
  if (!Number.isSafeInteger(directoryEnd) || directoryEnd > eocdAbsoluteOffset) {
    return 'invalid-zip'
  }

  const directory = await readRange(file, directoryOffset, directoryEnd)
  if (!directory) return 'read-error'
  const view = dataView(directory)
  let offset = 0
  const found: ZipEntryLocation[] = []
  const names = new Set<string>()
  let totalBytes = 0

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + CENTRAL_HEADER_FIXED_BYTES > directory.length) return 'invalid-zip'
    if (view.getUint32(offset, true) !== CENTRAL_HEADER_SIGNATURE) return 'invalid-zip'
    const flags = view.getUint16(offset + 8, true)
    const compression = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const entryDisk = view.getUint16(offset + 34, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const nextOffset =
      offset + CENTRAL_HEADER_FIXED_BYTES + nameLength + extraLength + commentLength
    if (nextOffset > directory.length || entryDisk !== 0) return 'invalid-zip'

    const name = new TextDecoder('utf-8', { fatal: true }).decode(
      directory.subarray(
        offset + CENTRAL_HEADER_FIXED_BYTES,
        offset + CENTRAL_HEADER_FIXED_BYTES + nameLength,
      ),
    )
    if (include(name)) {
      if (names.has(name)) return 'duplicate-backup'
      names.add(name)
      totalBytes += uncompressedSize
      if (totalBytes > maxBytes) return 'too-large'
      if (
        (flags & 1) !== 0 ||
        (compression !== 0 && compression !== 8) ||
        compressedSize === ZIP64_U32 ||
        uncompressedSize === ZIP64_U32 ||
        localHeaderOffset === ZIP64_U32
      ) {
        return 'invalid-zip'
      }
      if (uncompressedSize > maxBytes) return 'too-large'
      if (compressedSize > maxBytes + MAX_COMPRESSED_OVERHEAD_BYTES) return 'too-large'
      if (compression === 0 && compressedSize !== uncompressedSize) return 'invalid-zip'
      found.push({
        name,
        crc: view.getUint32(offset + 16, true),
        compression,
        flags,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      })
    }
    offset = nextOffset
  }

  return found
}

async function* blobChunks(blob: Blob): AsyncIterable<Uint8Array> {
  const reader = blob.stream().getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      for (let offset = 0; offset < value.byteLength; offset += 4096)
        yield value.subarray(offset, offset + 4096)
    }
  } finally {
    reader.releaseLock()
  }
}

async function readEntryText(
  file: File,
  entry: ZipEntryLocation,
  maxBytes: number,
): Promise<MoldaBackupReadResult> {
  const headerEnd = entry.localHeaderOffset + LOCAL_HEADER_FIXED_BYTES
  const header = await readRange(file, entry.localHeaderOffset, headerEnd)
  if (!header) return { ok: false, reason: 'invalid-zip' }
  const view = dataView(header)
  if (view.getUint32(0, true) !== LOCAL_HEADER_SIGNATURE) {
    return { ok: false, reason: 'invalid-zip' }
  }
  const localFlags = view.getUint16(6, true)
  const localCompression = view.getUint16(8, true)
  const nameLength = view.getUint16(26, true)
  const extraLength = view.getUint16(28, true)
  if (
    (localFlags & 1) !== 0 ||
    localCompression !== entry.compression ||
    (localFlags & 0x800) !== (entry.flags & 0x800)
  ) {
    return { ok: false, reason: 'invalid-zip' }
  }

  const metadataEnd = headerEnd + nameLength + extraLength
  const metadata = await readRange(file, headerEnd, metadataEnd)
  if (
    !metadata ||
    new TextDecoder('utf-8', { fatal: true }).decode(metadata.subarray(0, nameLength)) !==
      entry.name
  ) {
    return { ok: false, reason: 'invalid-zip' }
  }
  const dataEnd = metadataEnd + entry.compressedSize
  if (!Number.isSafeInteger(dataEnd) || dataEnd > file.size) {
    return { ok: false, reason: 'invalid-zip' }
  }

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const textParts: string[] = []
  let checksum = 0
  let outputBytes = 0
  let complete = entry.compression === 0
  let failure: MoldaBackupReadFailure | null = null

  function accept(chunk: Uint8Array, final: boolean): void {
    if (failure) return
    outputBytes += chunk.byteLength
    if (outputBytes > maxBytes) {
      failure = 'too-large'
      return
    }
    checksum = crc32(chunk, checksum)
    try {
      textParts.push(decoder.decode(chunk, { stream: !final }))
      if (final) complete = true
    } catch {
      failure = 'invalid-zip'
    }
  }

  const compressed = file.slice(metadataEnd, dataEnd)
  if (entry.compression === 0) {
    for await (const chunk of blobChunks(compressed)) accept(chunk, false)
    accept(new Uint8Array(), true)
  } else {
    const { Inflate } = await import('fflate')
    const inflate = new Inflate((chunk, final) => accept(chunk, final))
    try {
      for await (const chunk of blobChunks(compressed)) {
        inflate.push(chunk, false)
        if (failure) break
      }
      if (!failure) inflate.push(new Uint8Array(), true)
    } catch {
      failure = 'invalid-zip'
    }
  }

  if (failure) return { ok: false, reason: failure }
  if (!complete || outputBytes !== entry.uncompressedSize || checksum !== entry.crc) {
    return { ok: false, reason: 'invalid-zip' }
  }
  return { ok: true, source: 'zip', text: textParts.join('') }
}

function isZipFile(file: File): boolean {
  const type = file.type.toLowerCase()
  return (
    file.name.toLowerCase().endsWith('.zip') ||
    type === 'application/zip' ||
    type === 'application/x-zip-compressed'
  )
}

async function readMoldaZipFile(
  file: File,
  maxBytes = MAX_BACKUP_FILE_BYTES,
): Promise<MoldaBackupReadResult> {
  const entries = await locateEntries(file, maxBytes, (name) => name === MOLDA_GALLERY_ZIP_ENTRY)
  const entry = typeof entries === 'string' ? entries : (entries[0] ?? 'missing-backup')
  if (typeof entry === 'string') return { ok: false, reason: entry }
  return readEntryText(file, entry, maxBytes)
}

export async function readMoldaBackupFile(file: File): Promise<MoldaBackupReadResult> {
  if (isZipFile(file)) {
    try {
      return await readMoldaZipFile(file)
    } catch {
      return { ok: false, reason: 'read-error' }
    }
  }
  if (file.size > MAX_BACKUP_FILE_BYTES) return { ok: false, reason: 'too-large' }
  try {
    return { ok: true, source: 'json', text: await file.text() }
  } catch {
    return { ok: false, reason: 'read-error' }
  }
}

/** Native project entries from both old and new gallery ZIPs, without reading GLB/PNG/HDR.
 * Directory and aggregate inflated bytes are bounded before the first project is decoded.
 * No filesystem extraction: only direct children of the canonical project folder qualify.
 */
export async function readMoldaBackupProjects(
  file: File,
): Promise<{ ok: true; projects: string[] } | { ok: false; reason: MoldaBackupReadFailure }> {
  if (!isZipFile(file)) return { ok: true, projects: [] }
  try {
    const entries = await locateEntries(file, MAX_BACKUP_FILE_BYTES, (name) =>
      /^projetos\/[^/\\]+\.molda\.json$/.test(name),
    )
    if (typeof entries === 'string') return { ok: false, reason: entries }
    const projects: string[] = []
    for (const entry of entries) {
      const read = await readEntryText(file, entry, MAX_BACKUP_FILE_BYTES)
      if (!read.ok) return read
      projects.push(read.text)
    }
    return { ok: true, projects }
  } catch {
    return { ok: false, reason: 'read-error' }
  }
}
