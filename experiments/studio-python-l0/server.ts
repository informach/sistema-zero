import { resolve } from 'node:path'
import { runtimeDirectory, runtimeFiles } from './prepare'

const webDirectory = resolve(import.meta.dir, 'web')

export function startProbeServers() {
  const isolated = process.env.L0_ISOLATE === '1'
  const protectedWorkers = process.env.L0_PROTECTED_WORKERS === '1'
  const isolationHeaders: Record<string, string> = isolated
    ? {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Permissions-Policy': 'cross-origin-isolated=*',
      }
    : {}
  const runtime = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const base = `${url.origin}/runtime/`
      const headers = {
        ...isolationHeaders,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      }
      if (url.pathname === '/frame') {
        const csp = [
          "default-src 'none'",
          'sandbox allow-scripts allow-pointer-lock',
          "base-uri 'none'",
          "object-src 'none'",
          "form-action 'none'",
          `script-src 'unsafe-inline' 'wasm-unsafe-eval' ${base}`,
          `connect-src data: blob: ${base}`,
          `worker-src blob: ${base}`,
          `img-src data: blob: ${base}`,
          `style-src 'unsafe-inline'`,
          ...(protectedWorkers
            ? ["require-trusted-types-for 'script'", 'trusted-types sz-python-bootstrap']
            : []),
        ].join('; ')
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Python L0</title><script type="module" src="/runtime/frame.mjs"></script>',
          {
            headers: { ...headers, 'Content-Type': 'text/html', 'Content-Security-Policy': csp },
          },
        )
      }
      const name = url.pathname.slice('/runtime/'.length)
      if (!url.pathname.startsWith('/runtime/')) return new Response('Not found', { status: 404 })
      const isRuntime = runtimeFiles.some((file) => file === name)
      const isExperiment = [
        'frame.mjs',
        'worker.mjs',
        'renderer.mjs',
        'turtle.py',
        'stdio.py',
      ].includes(name)
      if (!isRuntime && !isExperiment) return new Response('Not found', { status: 404 })
      const file = Bun.file(resolve(isRuntime ? runtimeDirectory : webDirectory, name))
      if (!(await file.exists())) return new Response('Missing fixture', { status: 404 })
      const contentType = name.endsWith('.mjs')
        ? 'text/javascript'
        : name.endsWith('.wasm')
          ? 'application/wasm'
          : name.endsWith('.json')
            ? 'application/json'
            : name.endsWith('.py')
              ? 'text/plain'
              : 'application/zip'
      return new Response(file, { headers: { ...headers, 'Content-Type': contentType } })
    },
  })
  const host = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const requestedMode = new URL(request.url).searchParams.get('mode')
      const mode = ['direct', 'blob', 'blob-inline', 'blob-classic'].includes(requestedMode ?? '')
        ? requestedMode
        : 'blob'
      return new Response(
        `<!doctype html><title>Studio Python isolated L0</title><iframe id="runtime" ${isolated ? 'allow="cross-origin-isolated *"' : ''} sandbox="allow-scripts allow-pointer-lock" src="${runtime.url.origin}/frame?mode=${mode}&protected=${protectedWorkers ? 1 : 0}"></iframe>`,
        {
          headers: {
            ...isolationHeaders,
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
          },
        },
      )
    },
  })
  return {
    url: host.url.origin,
    stop() {
      host.stop(true)
      runtime.stop(true)
    },
  }
}

if (import.meta.main) {
  const servers = startProbeServers()
  console.log(JSON.stringify({ url: servers.url }))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      servers.stop()
      process.exit(0)
    })
  }
}
