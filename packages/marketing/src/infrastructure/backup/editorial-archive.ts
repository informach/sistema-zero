import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, open, readFile, rename, stat, statfs } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { assetManifestSchema, canonicalJson, hashSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { MediaStore } from '../../domain/ports/media-store.port'
import type { DbConnection } from '../persistence/drizzle/db'

const MAX_CATALOG_BYTES = 64 * 1024 * 1024
const MAX_DATABASE_BYTES = 100 * 1024 ** 3
const archiveFileSchema = z
  .object({
    name: z.enum(['marketing.dump', 'journal.dump', 'assets.jsonl']),
    size: z.number().int().nonnegative(),
    sha256: hashSchema,
  })
  .strict()
  .refine((file) => file.name === 'assets.jsonl' || file.size > 0, 'Dump vazio')
export const editorialArchiveSchema = z
  .object({
    version: z.literal(1),
    scope: z.literal('marketing-database-and-editorial-confirmed-assets'),
    createdAt: z.string().datetime(),
    database: z.tuple([archiveFileSchema, archiveFileSchema]),
    catalog: archiveFileSchema,
    assets: z.number().int().nonnegative().max(100000),
  })
  .strict()
const recordSchema = z
  .object({ manifest: assetManifestSchema, storageKey: z.string().max(500) })
  .strict()
  .superRefine((record, ctx) => {
    if (
      record.storageKey !==
      `editorial/${record.manifest.projectId}/${record.manifest.id}/${record.manifest.sha256}`
    )
      ctx.addIssue({ code: 'custom', message: 'Chave de mídia fora do acervo canônico' })
  })
type Record = z.infer<typeof recordSchema>
type Store = Pick<MediaStore, 'getStream' | 'head' | 'put'>
export type ArchiveDump = (
  snapshot: string,
  selection: 'marketing' | 'journal',
  destination: string,
  signal: AbortSignal,
) => Promise<void>

async function identity(file: string, limit: number, signal: AbortSignal) {
  if (!(await lstat(file)).isFile())
    throw new Error('O backup deve conter arquivos regulares, sem atalhos')
  const hash = createHash('sha256')
  let size = 0
  for await (const chunk of createReadStream(file, { signal })) {
    size += chunk.length
    if (size > limit) throw new Error('Arquivo excedeu o limite do arquivo de segurança')
    hash.update(chunk)
  }
  return { size, sha256: hash.digest('hex') }
}
async function write(file: Awaited<ReturnType<typeof open>>, bytes: Uint8Array) {
  let offset = 0
  while (offset < bytes.length) {
    const result = await file.write(bytes, offset, bytes.length - offset)
    if (!result.bytesWritten) throw new Error('Não foi possível gravar a cópia de segurança')
    offset += result.bytesWritten
  }
}
async function storeFile(
  store: Pick<Store, 'getStream'>,
  record: Record,
  directory: string,
  signal: AbortSignal,
) {
  const file = path.join(directory, 'assets', `${record.manifest.id}.bin`),
    temporary = `${file}.partial`
  const space = await statfs(directory, { bigint: true })
  if (space.bavail * space.bsize < BigInt(record.manifest.size) + 256n * 1024n * 1024n)
    throw new Error('Espaço insuficiente para continuar o backup')
  const handle = await open(temporary, 'wx', 0o600)
  const hash = createHash('sha256')
  let size = 0
  try {
    const reader = (await store.getStream(record.storageKey, signal)).getReader()
    try {
      while (true) {
        signal.throwIfAborted()
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > record.manifest.size) throw new Error('Mídia excedeu o tamanho confirmado')
        hash.update(chunk.value)
        await write(handle, chunk.value)
      }
      if (size !== record.manifest.size || hash.digest('hex') !== record.manifest.sha256)
        throw new Error(`A mídia ${record.manifest.id} diverge do manifesto; backup incompleto`)
    } finally {
      try {
        await reader.cancel()
      } finally {
        reader.releaseLock()
      }
    }
    await handle.sync()
  } finally {
    await handle.close()
  }
  await rename(temporary, file)
}
async function* records(directory: string, signal: AbortSignal) {
  const file = path.join(directory, 'assets.jsonl')
  if ((await stat(file)).size > MAX_CATALOG_BYTES) throw new Error('Catálogo excedeu 64 MB')
  const input = createReadStream(file, { signal }),
    lines = createInterface({ input, crlfDelay: Infinity })
  try {
    for await (const line of lines) {
      signal.throwIfAborted()
      if (Buffer.byteLength(line) > 16000) throw new Error('Registro de mídia excedeu o limite')
      if (line) yield recordSchema.parse(JSON.parse(line))
    }
  } finally {
    lines.close()
    input.destroy()
  }
}

/** No GC is allowed for confirmed editorial objects. This makes media copying safe after the DB snapshot closes. */
export async function createEditorialArchive(input: {
  connection: DbConnection
  store: Pick<Store, 'getStream'>
  directory: string
  dump: ArchiveDump
  signal: AbortSignal
}) {
  const { connection, store, dump, signal } = input,
    directory = path.resolve(input.directory)
  await mkdir(directory, { mode: 0o700 }) // Must be a NEW destination. Never overwrite a previous archive.
  await mkdir(path.join(directory, 'assets'), { mode: 0o700 })
  let count = 0
  await connection.sql.begin('isolation level repeatable read read only', async (tx) => {
    await tx`select set_config('idle_in_transaction_session_timeout', '600000', true)`
    const [row] = await tx`select pg_export_snapshot() as snapshot`
    const snapshot = z.object({ snapshot: z.string().regex(/^[A-Fa-f0-9-]+$/) }).parse(row).snapshot
    const catalog = await open(path.join(directory, 'assets.jsonl'), 'wx', 0o600)
    let bytes = 0
    try {
      for await (const rows of tx`select manifest, storage_key as "storageKey" from marketing.editorial_assets where confirmed = true order by id`.cursor(
        100,
      )) {
        for (const raw of rows) {
          signal.throwIfAborted()
          const record = recordSchema.parse(raw),
            line = Buffer.from(`${canonicalJson(record)}\n`)
          bytes += line.length
          count++
          if (bytes > MAX_CATALOG_BYTES || count > 100000)
            throw new Error(
              'O acervo excedeu o limite deste formato de backup; divida a operação em uma versão compatível',
            )
          await write(catalog, line)
        }
      }
      await catalog.sync()
    } finally {
      await catalog.close()
    }
    await dump(snapshot, 'marketing', path.join(directory, 'marketing.dump'), signal)
    await dump(snapshot, 'journal', path.join(directory, 'journal.dump'), signal)
  })
  // Database locks/snapshot have been released before large video transfers.
  for await (const record of records(directory, signal))
    await storeFile(store, record, directory, signal)
  const database = await Promise.all(
    (['marketing.dump', 'journal.dump'] as const).map(async (name) => ({
      name,
      ...(await identity(path.join(directory, name), MAX_DATABASE_BYTES, signal)),
    })),
  )
  const manifest = editorialArchiveSchema.parse({
    version: 1,
    scope: 'marketing-database-and-editorial-confirmed-assets',
    createdAt: new Date().toISOString(),
    database,
    catalog: {
      name: 'assets.jsonl',
      ...(await identity(path.join(directory, 'assets.jsonl'), MAX_CATALOG_BYTES, signal)),
    },
    assets: count,
  })
  const final = await open(path.join(directory, 'manifest.json.partial'), 'wx', 0o600)
  try {
    await write(final, Buffer.from(canonicalJson(manifest)))
    await final.sync()
  } finally {
    await final.close()
  }
  await rename(path.join(directory, 'manifest.json.partial'), path.join(directory, 'manifest.json'))
  return manifest
}

export async function verifyEditorialArchive(directory: string, signal: AbortSignal) {
  const manifestFile = path.join(directory, 'manifest.json')
  const info = await lstat(manifestFile)
  if (!info.isFile() || info.size > 16000) throw new Error('Manifesto de backup inválido')
  const manifest = editorialArchiveSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')))
  if (
    manifest.database[0].name !== 'marketing.dump' ||
    manifest.database[1].name !== 'journal.dump' ||
    manifest.catalog.name !== 'assets.jsonl'
  )
    throw new Error('Estrutura do backup inválida')
  for (const file of [...manifest.database, manifest.catalog]) {
    const actual = await identity(
      path.join(directory, file.name),
      file.name === 'assets.jsonl' ? MAX_CATALOG_BYTES : MAX_DATABASE_BYTES,
      signal,
    )
    if (actual.sha256 !== file.sha256 || actual.size !== file.size)
      throw new Error(`Integridade inválida: ${file.name}`)
  }
  let count = 0
  const seen = new Set<string>()
  for await (const record of records(directory, signal)) {
    if (seen.has(record.manifest.id)) throw new Error('Mídia duplicada no catálogo')
    seen.add(record.manifest.id)
    count++
    const actual = await identity(
      path.join(directory, 'assets', `${record.manifest.id}.bin`),
      record.manifest.size,
      signal,
    )
    if (actual.sha256 !== record.manifest.sha256 || actual.size !== record.manifest.size)
      throw new Error(`Integridade inválida: ${record.manifest.id}`)
  }
  if (count !== manifest.assets) throw new Error('Contagem do backup diverge do catálogo')
  return manifest
}

/** Only restore missing immutable keys. Existing divergent objects require diagnosis, never blind overwrite. */
export async function restoreEditorialAssets(directory: string, store: Store, signal: AbortSignal) {
  const manifest = await verifyEditorialArchive(directory, signal)
  let restored = 0,
    preserved = 0
  for await (const record of records(directory, signal)) {
    signal.throwIfAborted()
    const current = await store.head(record.storageKey, signal)
    if (!current.exists) {
      const file = path.join(directory, 'assets', `${record.manifest.id}.bin`)
      await store.put({
        key: record.storageKey,
        contentType: record.manifest.mime,
        sizeBytes: record.manifest.size,
        body: Readable.toWeb(createReadStream(file, { signal })),
        signal,
      })
      restored++
    } else preserved++
    const remote = (await store.getStream(record.storageKey, signal)).getReader(),
      hash = createHash('sha256')
    let size = 0
    try {
      while (true) {
        signal.throwIfAborted()
        const chunk = await remote.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > record.manifest.size)
          throw new Error('O objeto existente excede o tamanho aprovado')
        hash.update(chunk.value)
      }
    } finally {
      try {
        await remote.cancel()
      } finally {
        remote.releaseLock()
      }
    }
    if (size !== record.manifest.size || hash.digest('hex') !== record.manifest.sha256)
      throw new Error(
        'O objeto remoto diverge da cópia de segurança. Nenhum objeto existente foi sobrescrito.',
      )
  }
  return { manifest, restored, preserved }
}
