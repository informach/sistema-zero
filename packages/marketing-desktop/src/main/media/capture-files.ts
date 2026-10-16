import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

/** Serves only the packaged capture bundle; never the user's project folders or credentials. */
export async function captureFiles(directory: string) {
  const root = await realpath(directory),
    prefix = `/${randomBytes(24).toString('hex')}/`
  let document: Buffer | undefined
  const mime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  }
  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (
        !url.pathname.startsWith(prefix) ||
        url.search ||
        !['GET', 'HEAD'].includes(req.method ?? '')
      ) {
        res.writeHead(404).end()
        return
      }
      if (url.pathname === `${prefix}runtime.html` && document) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': document.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        })
        res.end(req.method === 'HEAD' ? undefined : document)
        return
      }
      const file = await realpath(
        path.resolve(root, decodeURIComponent(url.pathname.slice(prefix.length))),
      )
      const relative = path.relative(root, file)
      if (relative.startsWith('..') || path.isAbsolute(relative) || !mime[path.extname(file)]) {
        res.writeHead(404).end()
        return
      }
      const info = await stat(file)
      if (!info.isFile()) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)],
        'Content-Length': info.size,
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      const stream = createReadStream(file)
      stream.on('error', () => res.destroy())
      res.on('close', () => stream.destroy())
      stream.pipe(res)
    })().catch((error) => {
      if (!res.headersSent)
        res.writeHead(
          error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
            ? 404
            : 500,
        )
      res.end()
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor de captura indisponível')
  const base = `http://127.0.0.1:${address.port}${prefix}`
  return {
    base,
    document(html: string) {
      document = Buffer.from(html)
      return `${base}runtime.html`
    },
    close() {
      document = undefined
      server.closeAllConnections()
      server.close()
    },
  }
}
