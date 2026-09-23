/** Player e CSS reais, isolados de login, backend e dados de alunos. */
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
const script = bundle.outputs.find((output) => output.path.endsWith('.js'))
if (!script) throw new Error('Bundle da experiência não foi gerado')

Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.SCENE_E2E_PORT ?? 5198),
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/client.js') return new Response(script)
    if (path === '/scene.css')
      return new Response(styles.css, { headers: { 'Content-Type': 'text/css' } })
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/scene.css"></head><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
