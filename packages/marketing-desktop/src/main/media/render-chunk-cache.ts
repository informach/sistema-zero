import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
const fileSchema = z
  .object({ size: z.number().int().positive().max(2_000_000_000), sha256: hashSchema })
  .strict()
const receiptSchema = z
  .object({
    version: z.literal(1),
    key: hashSchema,
    kind: z.enum(['video', 'audio']),
    file: fileSchema,
  })
  .strict()
const ownedName = /^[a-f0-9]{64}\.(?:json|ts|m4a|pending\.json|pending\.ts|pending\.m4a)$/
const suffixes = ['json', 'ts', 'm4a', 'pending.json', 'pending.ts', 'pending.m4a']
export const renderCacheLimit = 512 * 1024 * 1024
type Kind = 'video' | 'audio'
function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
async function fingerprint(file: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const info = await lstat(file)
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error('Trecho de render fora do cache regular')
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file, { signal })) hash.update(chunk)
  return fileSchema.parse({ size: info.size, sha256: hash.digest('hex') })
}

/** Only regenerable, hashed intermediates. The supervisor serializes heavy jobs per device. */
export class RenderChunkCache {
  readonly directory: string
  constructor(
    directory: string,
    private readonly limit = renderCacheLimit,
  ) {
    this.directory = path.resolve(directory)
  }
  async initialize() {
    await mkdir(this.directory, { recursive: true })
    const info = await lstat(this.directory)
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Diretório de cache de render inválido')
    return this.prune()
  }
  files(key: string, kind: Kind, pending = false) {
    hashSchema.parse(key)
    const prefix = path.join(this.directory, `${key}${pending ? '.pending' : ''}`)
    return { media: `${prefix}.${kind === 'video' ? 'ts' : 'm4a'}`, receipt: `${prefix}.json` }
  }
  private async remove(key: string) {
    hashSchema.parse(key)
    for (const suffix of suffixes) {
      const target = path.resolve(this.directory, `${key}.${suffix}`)
      if (path.dirname(target) !== this.directory) throw new Error('Caminho de cache inválido')
      try {
        await unlink(target)
      } catch (error) {
        if (!missing(error)) throw error
      }
    }
  }
  async get(key: string, kind: Kind, signal: AbortSignal) {
    const files = this.files(key, kind)
    let receipt: z.infer<typeof receiptSchema>
    try {
      const info = await lstat(files.receipt)
      if (!info.isFile() || info.size > 16000) return null
      const parsed = receiptSchema.safeParse(JSON.parse(await readFile(files.receipt, 'utf8')))
      if (!parsed.success || parsed.data.key !== key || parsed.data.kind !== kind) return null
      receipt = parsed.data
    } catch (error) {
      if (missing(error) || error instanceof SyntaxError) return null
      throw error
    }
    try {
      const actual = await fingerprint(files.media, signal)
      if (actual.size !== receipt.file.size || actual.sha256 !== receipt.file.sha256) return null
    } catch (error) {
      if (missing(error)) return null
      throw error
    }
    await utimes(files.receipt, new Date(), new Date())
    return files.media
  }
  async create(
    key: string,
    kind: Kind,
    signal: AbortSignal,
    render: (file: string) => Promise<void>,
  ) {
    signal.throwIfAborted()
    await this.remove(key)
    const pending = this.files(key, kind, true),
      files = this.files(key, kind)
    try {
      await render(pending.media)
      signal.throwIfAborted()
      const file = await fingerprint(pending.media, signal)
      await writeFile(pending.receipt, JSON.stringify({ version: 1, key, kind, file }), {
        flag: 'wx',
      })
      await rename(pending.media, files.media)
      // The receipt is committed last. Interrupted files are never considered reusable.
      await rename(pending.receipt, files.receipt)
      return files.media
    } catch (error) {
      await this.remove(key)
      throw error
    }
  }
  /** Run only outside an active render; no original, final asset or execution journal is touched. */
  async prune() {
    const groups = new Map<
      string,
      { size: number; count: number; used: number; complete: boolean }
    >()
    for (const entry of await readdir(this.directory, { withFileTypes: true })) {
      if (!ownedName.test(entry.name)) continue
      if (!entry.isFile()) throw new Error('Entrada inesperada no cache de render')
      const key = entry.name.slice(0, 64),
        info = await lstat(path.join(this.directory, entry.name)),
        group = groups.get(key) ?? { size: 0, count: 0, used: 0, complete: false }
      group.size += info.size
      group.count++
      if (entry.name === `${key}.json`) {
        group.used = info.mtimeMs
        group.complete = true
      }
      groups.set(key, group)
    }
    let total = [...groups.values()].reduce((sum, group) => sum + group.size, 0),
      removed = 0,
      freedBytes = 0
    for (const [key, group] of [...groups].sort((a, b) => a[1].used - b[1].used)) {
      if (group.complete && total <= this.limit) continue
      await this.remove(key)
      total -= group.size
      removed += group.count
      freedBytes += group.size
    }
    return { removed, freedBytes }
  }
}
