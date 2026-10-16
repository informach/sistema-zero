import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import {
  type ImportInventory,
  type InventoryEntry,
  inventoryDigestInput,
  inventorySchema,
} from '@sistemazero/marketing-contracts'
import { classifySource, containsCredential, sourceRoots } from './inventory-policy'

export class SourceChangedError extends Error {
  constructor() {
    super('Arquivo mudou durante a leitura; refaça o inventário antes de importar')
  }
}
function sameFile(a: Awaited<ReturnType<typeof lstat>>, b: Awaited<ReturnType<typeof lstat>>) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  )
}
function within(root: string, value: string) {
  const relative = path.relative(root, value)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}
/** Resolve every segment. A junction/symlink is never used to leave the selected tree. */
export async function confinedSource(root: string, relativePath: string) {
  const { relativeSourcePathSchema } = await import('@sistemazero/marketing-contracts')
  relativeSourcePathSchema.parse(relativePath)
  const resolvedRoot = await realpath(root)
  let candidate = resolvedRoot
  for (const segment of relativePath.split('/')) {
    candidate = path.join(candidate, segment)
    const stat = await lstat(candidate)
    if (stat.isSymbolicLink())
      throw new Error('Atalho ou link simbólico não é uma origem importável')
    if (!within(resolvedRoot, await realpath(candidate)))
      throw new Error('Origem fora da pasta selecionada')
  }
  return candidate
}
async function fingerprint(
  file: string,
  signal: AbortSignal,
  maxBytes: number,
  consume?: (chunk: Buffer) => Promise<void>,
) {
  const before = await lstat(file)
  if (!before.isFile() || before.isSymbolicLink()) throw new SourceChangedError()
  if (before.size > maxBytes) throw new Error('Arquivo excede o limite de leitura do inventário')
  const handle = await open(
    file,
    constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW),
  )
  try {
    if (!sameFile(before, await handle.stat())) throw new SourceChangedError()
    const sha = createHash('sha256'),
      buffer = Buffer.alloc(256 * 1024),
      decoder = new StringDecoder('utf8')
    let bytes = 0,
      tail = '',
      credential = false
    for (;;) {
      signal.throwIfAborted()
      const result = await handle.read(buffer, 0, buffer.length, null)
      if (!result.bytesRead) break
      bytes += result.bytesRead
      if (bytes > maxBytes) throw new SourceChangedError()
      const chunk = buffer.subarray(0, result.bytesRead)
      sha.update(chunk)
      if (consume) await consume(chunk)
      const text = tail + decoder.write(chunk)
      credential ||= containsCredential(text)
      tail = text.slice(-1024)
    }
    credential ||= containsCredential(tail + decoder.end())
    if (
      bytes !== before.size ||
      !sameFile(before, await handle.stat()) ||
      !sameFile(before, await lstat(file))
    )
      throw new SourceChangedError()
    return { sha256: sha.digest('hex'), bytes, credential }
  } finally {
    await handle.close()
  }
}

export async function scanInventory(input: {
  root: string
  origin: ImportInventory['origin']
  signal: AbortSignal
  onProgress?: (files: number, bytes: number) => void
  limits?: { entries: number; fileBytes: number; totalBytes: number }
}): Promise<ImportInventory> {
  const root = await realpath(input.root),
    entries: InventoryEntry[] = []
  const limits = input.limits ?? {
    entries: 100000,
    fileBytes: 2_000_000_000,
    totalBytes: 32 * 1024 ** 3,
  }
  let totalBytes = 0
  const add = (entry: InventoryEntry) => {
    if (entries.length >= limits.entries)
      throw new Error('Inventário excede o limite de itens; selecione uma origem menor')
    entries.push(entry)
    input.onProgress?.(entries.length, totalBytes)
  }
  async function walk(relative: string, depth: number): Promise<void> {
    input.signal.throwIfAborted()
    if (depth > 40) throw new Error('Estrutura de pastas excede 40 níveis')
    const candidate = path.join(root, ...relative.split('/'))
    let stat: Awaited<ReturnType<typeof lstat>>
    try {
      stat = await lstat(candidate)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT' && depth === 0) {
        add({
          path: relative,
          kind: 'directory',
          ...classifySource(input.origin, relative, true),
          disposition: 'blocked',
          reason: 'Pasta prevista não encontrada nesta origem',
          bytes: null,
          sha256: null,
        })
        return
      }
      throw error
    }
    const classification = classifySource(input.origin, relative, stat.isDirectory())
    const entry: InventoryEntry = {
      path: relative,
      kind: stat.isDirectory() ? 'directory' : 'file',
      ...classification,
      bytes: null,
      sha256: null,
    }
    if (classification.disposition === 'excluded') {
      add(entry)
      return
    }
    if (stat.isSymbolicLink()) {
      add({
        ...entry,
        disposition: 'excluded',
        reason: 'Link simbólico ou junction; destino não percorrido',
      })
      return
    }
    // Check ancestors too: selected roots can sit under a junction.
    const safePath = await confinedSource(root, relative)
    if (stat.isDirectory()) {
      const children = await readdir(safePath)
      children.sort()
      for (const child of children) await walk(`${relative}/${child}`, depth + 1)
      return
    }
    if (!stat.isFile()) {
      add({ ...entry, disposition: 'excluded', reason: 'Tipo especial de arquivo não suportado' })
      return
    }
    if (stat.size > limits.fileBytes) {
      add({
        ...entry,
        disposition: 'blocked',
        reason: 'Arquivo excede 2 GiB; precisa de tratamento explícito',
        bytes: stat.size,
      })
      return
    }
    if (totalBytes + stat.size > limits.totalBytes)
      throw new Error(
        'Inventário excede o orçamento de leitura; nenhum retrato parcial será confirmado',
      )
    try {
      const value = await fingerprint(safePath, input.signal, limits.fileBytes)
      totalBytes += value.bytes
      add({
        ...entry,
        bytes: value.bytes,
        sha256: value.credential ? null : value.sha256,
        ...(value.credential
          ? {
              disposition: 'excluded',
              reason: 'Possível credencial no conteúdo; não importar nem expor o trecho',
            }
          : {}),
      })
    } catch (error) {
      if (!(error instanceof SourceChangedError)) throw error
      add({ ...entry, disposition: 'blocked', reason: error.message })
    }
  }
  for (const scope of sourceRoots(input.origin)) await walk(scope, 0)
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return inventorySchema.parse({
    schemaVersion: 1,
    policyVersion: 'marketing-acervo-v2',
    origin: input.origin,
    capturedAt: new Date().toISOString(),
    entries,
    digest: createHash('sha256')
      .update(
        inventoryDigestInput({
          origin: input.origin,
          entries,
          policyVersion: 'marketing-acervo-v2',
        }),
      )
      .digest('hex'),
  })
}

/** Revalidate by bytes, not mtime alone, immediately before consuming an inventoried file. */
export async function verifySource(
  root: string,
  entry: InventoryEntry,
  signal: AbortSignal,
): Promise<string> {
  if (!entry.sha256 || entry.bytes === null || !['eligible', 'review'].includes(entry.disposition))
    throw new Error('Origem não está disponível para importação')
  const file = await confinedSource(root, entry.path)
  const value = await fingerprint(file, signal, entry.bytes)
  if (value.sha256 !== entry.sha256 || value.bytes !== entry.bytes || value.credential)
    throw new SourceChangedError()
  return file
}
/** Bounded text transport retains BOM and original bytes; no decode/encode transformation. */
export async function sourceTextBytes(
  root: string,
  entry: InventoryEntry,
  signal: AbortSignal,
): Promise<Buffer> {
  if (!entry.sha256 || entry.bytes === null || !['eligible', 'review'].includes(entry.disposition))
    throw new Error('Origem não está disponível para carga')
  if (entry.bytes > 196608)
    throw new Error('Este texto precisa ser preservado como arquivo original por exceder 192 KiB')
  const file = await confinedSource(root, entry.path),
    chunks: Buffer[] = []
  const value = await fingerprint(file, signal, entry.bytes, async (chunk) => {
    chunks.push(Buffer.from(chunk))
  })
  if (value.sha256 !== entry.sha256 || value.bytes !== entry.bytes || value.credential)
    throw new SourceChangedError()
  const bytes = Buffer.concat(chunks)
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  return bytes
}
