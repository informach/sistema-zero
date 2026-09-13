import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import tailwind from '@tailwindcss/postcss'

// Local-only rehearsal of the production component. No profile or production endpoint.
const app = resolve(import.meta.dir, '../..')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
const [bundle, styles] = await Promise.all([
  Bun.build({
    entrypoints: [resolve(import.meta.dir, 'experience-preview.tsx')],
    target: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  }),
  postcss([tailwind()]).process(await Bun.file(cssPath).text(), { from: cssPath }),
])
if (!bundle.success || !bundle.outputs[0]) throw new Error(bundle.logs.join('\n'))
const javascript = await bundle.outputs[0].text()
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.EXPERIENCE_PREVIEW_PORT ?? 4319),
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/app.js')
      return new Response(javascript, { headers: { 'content-type': 'text/javascript' } })
    if (path === '/app.css')
      return new Response(styles.css, { headers: { 'content-type': 'text/css' } })
    return new Response(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ensaio das experiências v6</title><link rel="stylesheet" href="/app.css"><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log(`Preview: ${server.url}`)
