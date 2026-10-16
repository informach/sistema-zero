import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import type { Asset } from '../shared/contracts'

const mimeByExtension: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
}
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
  constructor(readonly directory: string) {}

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
        'Content-Type': entry.asset.mime,
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
  }

  async importFile(source: string): Promise<Asset> {
    const extension = path.extname(source).toLowerCase()
    const mime = mimeByExtension[extension]
    if (!mime) throw new Error('Use PNG, JPEG, MP4, MOV ou WebM.')
    const info = await stat(source)
    if (!info.isFile() || info.size === 0 || info.size > 2_000_000_000)
      throw new Error('Arquivo vazio ou maior que o limite local de 2 GB.')
    const id = randomUUID()
    const destination = path.join(this.directory, `${id}${extension}`)
    await copyFile(source, destination)
    return this.register(id, destination, path.basename(source), mime)
  }

  async addImage(data: Buffer): Promise<Asset> {
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255
    if ((!png && !jpeg) || data.length > 24_000_000)
      throw new Error('O cliente retornou uma imagem inválida.')
    const id = randomUUID()
    const file = path.join(this.directory, `${id}.${png ? 'png' : 'jpg'}`)
    await writeFile(file, data, { flag: 'wx' })
    return this.register(id, file, path.basename(file), png ? 'image/png' : 'image/jpeg')
  }

  private async register(id: string, file: string, name: string, mime: string) {
    const asset: Asset = {
      id,
      name,
      mime,
      sha256: await hashFile(file),
      size: (await stat(file)).size,
      url: `${this.origin}/${this.token}/${id}`,
    }
    this.entries.set(id, { asset, path: file })
    await writeFile(
      path.join(this.directory, `${id}.json`),
      JSON.stringify({ ...asset, url: undefined }, null, 2),
    )
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
