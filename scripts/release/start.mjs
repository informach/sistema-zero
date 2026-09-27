import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const message = 'Estamos atualizando a plataforma. Volte daqui a pouco para continuar.'
const page = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voltamos já</title><body style="margin:0;background:#f5f7fb;color:#17213b;font:20px/1.6 system-ui;display:grid;min-height:100dvh;place-items:center"><main style="max-width:32rem;padding:2rem"><h1>Voltamos já!</h1><p>${message}</p><p>Se você estava criando algo, mantenha a aba aberta.</p></main></body></html>`

/** Stops the entire app, including background jobs, before importing its entrypoint. */
export function createMaintenanceServer() {
  return createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    const health = ['/health', '/readyz', '/api/healthz'].includes(path)
    const html = !health && request.headers.accept?.includes('text/html')
    response.writeHead(health ? 200 : 503, {
      'content-type': html ? 'text/html; charset=utf-8' : 'application/json',
      'cache-control': 'no-store',
      'retry-after': '60',
      'x-release-maintenance': 'full',
      'x-content-type-options': 'nosniff',
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
    })
    response.end(
      health
        ? JSON.stringify({ status: 'maintenance' })
        : html
          ? page
          : JSON.stringify({
              error: { code: 'RELEASE_MAINTENANCE', message },
            }),
    )
  })
}

export async function start() {
  const mode = process.env.RELEASE_MAINTENANCE_MODE ?? 'off'
  if (mode === 'off') {
    if (!process.argv[2]) throw new Error('Missing application entrypoint')
    await import(pathToFileURL(resolve(process.argv[2])).href)
    return
  }
  if (mode !== 'full') throw new Error('RELEASE_MAINTENANCE_MODE must be off or full')
  const port = Number(process.env.PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid maintenance PORT')
  const server = createMaintenanceServer()
  server.listen(port, process.env.HOST ?? '::', () => {
    console.log(JSON.stringify({ event: 'release.maintenance', mode, port }))
  })
  const stop = () => {
    server.close(() => process.exit(0))
    setTimeout(() => {
      server.closeAllConnections()
      process.exit(0)
    }, 5000).unref()
  }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await start()
