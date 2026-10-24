import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import tailwind from '@tailwindcss/postcss'

const app = resolve(import.meta.dir, '../..')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
const styles = await postcss([tailwind()]).process(await Bun.file(cssPath).text(), {
  from: cssPath,
})
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!bundle.success) throw new Error(bundle.logs.join('\n'))
const js = bundle.outputs.find((output) => output.path.endsWith('.js'))
const css = bundle.outputs.find((output) => output.path.endsWith('.css'))
if (!js) throw new Error('Bundle de layout ausente')
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.LESSON_LAYOUT_PORT ?? 5203),
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/client.js') return new Response(js)
    if (path === '/app.css')
      return new Response(styles.css, { headers: { 'Content-Type': 'text/css' } })
    if (path === '/studio.css')
      return new Response(css ?? '', { headers: { 'Content-Type': 'text/css' } })
    if (path.startsWith('/api/')) return Response.json({})
    if (path === '/favicon.ico') return new Response(null, { status: 204 })
    if (
      [
        '/studio-sounds/click.mp3',
        '/studio-sounds/delete.mp3',
        '/studio-sounds/disconnect.mp3',
      ].includes(path)
    )
      return new Response(Bun.file(resolve(app, 'public', path.slice(1))))
    if (path === '/voice.mp3')
      return new Response(Bun.file(resolve(app, 'public/zappy/assista-ao-video-v1.mp3')))
    if (path !== '/') return new Response('Not found', { status: 404 })
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/studio.css"></head><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
console.log('Lesson layout fixture ready')
