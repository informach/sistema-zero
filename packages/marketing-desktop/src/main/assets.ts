import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import { z } from 'zod'
import type { AssetManifest } from '../../../marketing-contracts/src/assets'
import type { Asset } from '../shared/contracts'
import { copySource, type ExpectedSource } from './media/copy-source'
import { probeImage } from './media/probe-image'

const mimeByExtension: Record<string, string> = {
  '.mjs': 'text/plain',
  '.cjs': 'text/plain',
  '.js': 'text/plain',
  '.ts': 'text/plain',
  '.mts': 'text/plain',
  '.cts': 'text/plain',
  '.tsx': 'text/plain',
  '.jsx': 'text/plain',
  '.py': 'text/plain',
  '.ps1': 'text/plain',
  '.css': 'text/plain',
  '.svg': 'text/plain',
  '.csv': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.srt': 'text/plain',
  '.json': 'application/json',
  '.html': 'text/html',
  '.pdf': 'application/pdf',
}
const canonicalExtension: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'audio/wav': '.wav',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'font/woff2': '.woff2',
  'text/markdown': '.md',
  'text/plain': '.txt',
  'application/json': '.json',
  'text/html': '.html',
  'application/pdf': '.pdf',
}
export class FileIntegrityError extends Error {}
const metadataSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    id: z.string().uuid(),
    filename: z.string().max(100).optional(),
    name: z.string().max(500),
    mime: z.string().max(100),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().positive().max(2000000000),
  })
  .strict()
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!header) return { start: 0, end: size - 1 }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start < size &&
    end >= start
    ? { start, end }
    : null
}
async function hashFile(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

export class LocalAssets {
  private entries = new Map<string, { asset: Asset; path: string }>()
  private server?: Server
  private origin = ''
  private token = randomBytes(24).toString('hex')
  private issues: Array<{ name: string; message: string }> = []
  constructor(
    readonly directory: string,
    private readonly reserveDisk: (bytes: number) => Promise<() => void> = async () => () => {},
  ) {}
  reserve(bytes: number) {
    return this.reserveDisk(bytes)
  }

  async start() {
    await mkdir(this.directory, { recursive: true })
    const server = createServer((request, response) => {
      const match = new RegExp(`^/${this.token}/([a-f0-9-]+)$`).exec(
        (request.url ?? '').split('?')[0] ?? '',
      )
      const entry = match?.[1] ? this.entries.get(match[1]) : undefined
      if (!entry || !['GET', 'HEAD'].includes(request.method ?? '')) {
        response.writeHead(404).end()
        return
      }
      const range = parseRange(request.headers.range, entry.asset.size)
      if (!range) {
        response.writeHead(416, { 'Content-Range': `bytes */${entry.asset.size}` }).end()
        return
      }
      response.writeHead(request.headers.range ? 206 : 200, {
        'Content-Type':
          entry.asset.mime === 'text/html' ? 'text/plain; charset=utf-8' : entry.asset.mime,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Content-Length': range.end - range.start + 1,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=3600',
        ...(request.headers.range
          ? { 'Content-Range': `bytes ${range.start}-${range.end}/${entry.asset.size}` }
          : {}),
      })
      if (request.method === 'HEAD') {
        response.end()
        return
      }
      const stream = createReadStream(entry.path, range)
      stream.on('error', () => response.destroy())
      response.on('close', () => stream.destroy())
      stream.pipe(response)
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Falha ao abrir mídia local.')
    this.server = server
    this.origin = `http://127.0.0.1:${address.port}`
    await this.restore()
  }
  private async restore() {
    const files = await readdir(this.directory),
      root = await realpath(this.directory)
    for (const filename of files.filter((name) => /^[a-f0-9-]{36}\.json$/i.test(name))) {
      try {
        const metadataPath = path.join(root, filename)
        if (path.dirname(await realpath(metadataPath)) !== root)
          throw new Error('Metadados fora do cache')
        if ((await stat(metadataPath)).size > 16000) throw new Error('Metadados acima do limite')
        const metadata = metadataSchema.parse(JSON.parse(await readFile(metadataPath, 'utf8')))
        if (filename !== `${metadata.id}.json`)
          throw new Error('Identificação do arquivo não corresponde aos metadados')
        const candidates = metadata.filename
          ? [metadata.filename]
          : files.filter((name) => name.startsWith(`${metadata.id}.`) && name !== filename)
        const chosen = candidates[0]
        if (
          candidates.length !== 1 ||
          !chosen ||
          path.basename(chosen) !== chosen ||
          !chosen.startsWith(`${metadata.id}.`)
        )
          throw new Error('Arquivo original ausente ou ambíguo')
        const target = await realpath(path.join(root, chosen))
        if (
          path.dirname(target) !== root ||
          mimeByExtension[path.extname(chosen).toLowerCase()] !== metadata.mime
        )
          throw new Error('Arquivo fora do cache ou tipo inconsistente')
        const info = await stat(target)
        if (!info.isFile() || info.size !== metadata.size)
          throw new Error('Arquivo ausente ou tamanho alterado')
        this.entries.set(metadata.id, {
          path: target,
          asset: {
            id: metadata.id,
            name: metadata.name,
            mime: metadata.mime,
            sha256: metadata.sha256,
            size: metadata.size,
            url: `${this.origin}/${this.token}/${metadata.id}`,
          },
        })
      } catch (error) {
        this.issues.push({
          name: filename,
          message:
            error instanceof Error ? error.message : 'Não foi possível restaurar este arquivo',
        })
      }
    }
  }
  diagnostics() {
    return this.issues.map((issue) => ({ ...issue }))
  }
  list() {
    return [...this.entries.values()].map((entry) => ({ ...entry.asset }))
  }
  async verify(id: string) {
    const entry = this.get(id)
    try {
      const info = await stat(entry.path)
      if (info.size !== entry.asset.size || (await hashFile(entry.path)) !== entry.asset.sha256)
        throw new FileIntegrityError(
          'O arquivo local mudou ou foi danificado. Restaure o original antes de continuar.',
        )
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        throw new FileIntegrityError(
          'O arquivo não está mais no cache; baixe a cópia confirmada no servidor.',
          { cause: error },
        )
      throw error
    }
    return entry
  }

  async importFile(
    source: string,
    options: { expected?: ExpectedSource; signal?: AbortSignal } = {},
  ): Promise<Asset> {
    const extension = path.extname(source).toLowerCase()
    const mime = mimeByExtension[extension]
    if (!mime) throw new Error('Tipo de arquivo não aceito no acervo de marketing.')
    const id = randomUUID()
    const destination = path.join(this.directory, `${id}.source${extension}`)
    let copied = false
    try {
      await copySource(source, destination, (bytes) => this.reserve(bytes), options)
      copied = true
      return await this.register(id, destination, path.basename(source), mime, options.expected)
    } catch (error) {
      if (copied) await this.discardRejected(id, destination, error)
      throw error
    }
  }

  async addImage(data: Buffer): Promise<Asset> {
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255
    if ((!png && !jpeg) || data.length > 24_000_000)
      throw new Error('O cliente retornou uma imagem inválida.')
    const id = randomUUID()
    const file = path.join(this.directory, `${id}.${png ? 'png' : 'jpg'}`)
    const release = await this.reserve(data.length)
    let written = false
    try {
      await writeFile(file, data, { flag: 'wx' })
      written = true
      return await this.register(id, file, path.basename(file), png ? 'image/png' : 'image/jpeg')
    } catch (error) {
      if (written) await this.discardRejected(id, file, error)
      throw error
    } finally {
      release()
    }
  }
  async acceptDownload(source: string, manifest: AssetManifest) {
    if (path.dirname(await realpath(source)) !== (await realpath(this.directory)))
      throw new Error('Download fora do cache deste projeto')
    const existing = this.entries.get(manifest.id)
    if (existing) {
      if (existing.asset.sha256 !== manifest.sha256)
        throw new Error('Identidade de mídia divergente')
      return (await this.verify(manifest.id)).asset
    }
    const extension = canonicalExtension[manifest.mime]
    if (!extension) throw new Error('Tipo de arquivo não suportado')
    if ((await stat(source)).size !== manifest.size || (await hashFile(source)) !== manifest.sha256)
      throw new FileIntegrityError('O download não corresponde ao arquivo confirmado no servidor')
    const destination = path.join(this.directory, `${manifest.id}.source${extension}`)
    let exists = false
    try {
      await stat(destination)
      exists = true
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error
    }
    if (exists) {
      if (
        (await stat(destination)).size !== manifest.size ||
        (await hashFile(destination)) !== manifest.sha256
      ) {
        // Only a download whose full hash was checked above can replace this reproducible cache path.
        if (path.dirname(await realpath(destination)) !== (await realpath(this.directory)))
          throw new Error('Destino fora do cache')
        await unlink(destination)
        await rename(source, destination)
      }
    } else await rename(source, destination)
    return this.register(manifest.id, destination, manifest.name, manifest.mime)
  }
  async evict(id: string) {
    const entry = this.get(id),
      root = await realpath(this.directory)
    if (path.dirname(path.resolve(entry.path)) !== root) throw new Error('Arquivo fora do cache')
    try {
      if (path.dirname(await realpath(entry.path)) !== root)
        throw new Error('Arquivo fora do cache')
      await unlink(entry.path)
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error
    }
    try {
      await unlink(path.join(root, `${id}.json`))
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error
    }
    this.entries.delete(id)
    return entry.asset.size
  }

  private async discardRejected(id: string, file: string, reason: unknown) {
    if (
      path.dirname(path.resolve(file)) !== path.resolve(this.directory) ||
      !path.basename(file).startsWith(`${id}.`) ||
      this.entries.has(id)
    )
      throw new Error('A cópia rejeitada não pertence ao cache de importação', { cause: reason })
    for (const candidate of [file, path.join(this.directory, `${id}.json.tmp`)]) {
      try {
        await unlink(candidate)
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
          throw new AggregateError(
            [reason, error],
            'A importação falhou e a cópia temporária não pôde ser removida',
          )
      }
    }
  }
  private async register(
    id: string,
    file: string,
    name: string,
    mime: string,
    expected?: ExpectedSource,
  ) {
    const size = (await stat(file)).size
    if (size <= 0 || size > 2000000000)
      throw new Error('Arquivo vazio ou maior que o limite local de 2 GB.')
    if (mime.startsWith('image/')) await probeImage(file, mime)
    const asset: Asset = {
      id,
      name,
      mime,
      sha256: await hashFile(file),
      size,
      url: `${this.origin}/${this.token}/${id}`,
    }
    if (expected && (asset.sha256 !== expected.sha256 || asset.size !== expected.size))
      throw new FileIntegrityError('A cópia difere do original inventariado')
    const metadataPath = path.join(this.directory, `${id}.json`)
    await writeFile(
      `${metadataPath}.tmp`,
      JSON.stringify(
        { schemaVersion: 1, filename: path.basename(file), ...asset, url: undefined },
        null,
        2,
      ),
    )
    await rename(`${metadataPath}.tmp`, metadataPath)
    this.entries.set(id, { asset, path: file })
    return asset
  }

  get(id: string) {
    const entry = this.entries.get(id)
    if (!entry) throw new Error('Arquivo não encontrado nesta sessão.')
    return entry
  }

  ownsUrl(url: string) {
    return [...this.entries.values()].some((entry) => entry.asset.url === url)
  }
  async bytes(id: string) {
    return readFile(this.get(id).path)
  }
  close() {
    this.server?.closeAllConnections()
    this.server?.close()
  }
}
