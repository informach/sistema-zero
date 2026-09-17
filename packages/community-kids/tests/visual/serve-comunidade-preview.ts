import { createRequire } from 'node:module'
import { extname, resolve, sep } from 'node:path'
import tailwind from '@tailwindcss/postcss'

const packageRoot = resolve(import.meta.dir, '../..')
const publicRoot = resolve(packageRoot, 'public')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', packageRoot))('postcss')
const cssPath = resolve(packageRoot, 'src/app/globals.css')
const [bundle, styles] = await Promise.all([
  Bun.build({
    entrypoints: [resolve(import.meta.dir, 'comunidade-preview.tsx')],
    target: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  }),
  postcss([tailwind()]).process(await Bun.file(cssPath).text(), { from: cssPath }),
])
if (!bundle.success || !bundle.outputs[0]) throw new Error(bundle.logs.join('\n'))
const javascript = await bundle.outputs[0].text()

const CONTENT_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function publicAsset(pathname: string): Response | null {
  if (pathname === '/' || pathname.endsWith('/')) return null
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '')
  const absolute = resolve(publicRoot, relative)
  if (absolute !== publicRoot && !absolute.startsWith(`${publicRoot}${sep}`)) return null
  const file = Bun.file(absolute)
  return file.size > 0
    ? new Response(file, {
        headers: { 'content-type': CONTENT_TYPE[extname(absolute)] ?? 'application/octet-stream' },
      })
    : null
}

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.COMUNIDADE_PREVIEW_PORT ?? 4325),
  fetch(request) {
    const pathname = new URL(request.url).pathname
    if (pathname === '/app.js')
      return new Response(javascript, { headers: { 'content-type': 'text/javascript' } })
    if (pathname === '/app.css')
      return new Response(styles.css, { headers: { 'content-type': 'text/css' } })
    const asset = publicAsset(pathname)
    if (asset) return asset
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia Comunidade dos Criadores</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})

console.log(`Preview: ${server.url}`)
