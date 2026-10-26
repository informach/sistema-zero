/** Real components and both app styles, synthetic data only, bound to loopback. */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  creatorAdminFixture,
  creatorAdminGalleryFixture,
  creatorAdminPythonFixture,
} from './creator-admin-fixture'
import { creatorSceneFixture } from './creator-journey-fixtures'

const root = resolve(import.meta.dir, '../../..')
const tailwindPath = Bun.resolveSync(
  '@tailwindcss/postcss',
  resolve(root, 'packages/community-kids'),
)
const { default: tailwind } = await import(tailwindPath)
const postcss = createRequire(tailwindPath)('postcss')
const styles = new Map<string, string>()
for (const [skin, name] of [
  ['adult', 'community'],
  ['kids', 'community-kids'],
  ['admin', 'admin'],
] as const) {
  const path = resolve(root, `packages/${name}/src/app/globals.css`)
  styles.set(
    skin,
    (await postcss([tailwind()]).process(await Bun.file(path).text(), { from: path })).css,
  )
}
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'creator-journey-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
})
if (!bundle.success) throw new Error(bundle.logs.join('\n'))
const script = bundle.outputs.find((item) => item.path.endsWith('.js'))
if (!script) throw new Error('Preview bundle missing')
const adminBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'creator-admin-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
})
if (!adminBundle.success) throw new Error(adminBundle.logs.join('\n'))
const adminScript = adminBundle.outputs.find((item) => item.path.endsWith('.js'))
if (!adminScript) throw new Error('Admin preview bundle missing')
const port = Number(process.env.CREATOR_JOURNEY_PREVIEW_PORT ?? 4394)
const galleryReview = creatorAdminGalleryFixture()
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const url = new URL(request.url)
    const galleryItem = galleryReview.copies.find(
      (copy) =>
        url.pathname ===
        `/api/members/journey/masteries/submissions/${galleryReview.detail.submission.id}/gallery/${copy.id}`,
    )
    if (request.method === 'GET' && galleryItem)
      return Response.json({ url: `/preview-gallery/${galleryItem.id}.gz`, parts: [] })
    const galleryCopy = galleryReview.copies.find(
      (copy) => url.pathname === `/preview-gallery/${copy.id}.gz`,
    )
    if (request.method === 'GET' && galleryCopy)
      return new Response(gzipSync(galleryCopy.json), {
        headers: { 'content-type': 'application/gzip' },
      })
    if (url.pathname === '/preview.js')
      return new Response(script, { headers: { 'Content-Type': 'text/javascript' } })
    if (url.pathname === '/admin-preview.js')
      return new Response(adminScript, { headers: { 'Content-Type': 'text/javascript' } })
    if (url.pathname === '/preview-fonts.css') {
      const file = Bun.file(
        resolve(root, 'packages/community/.cache/creator-preview-fonts/fonts.css'),
      )
      return new Response((await file.exists()) ? await file.text() : '', {
        headers: { 'Content-Type': 'text/css' },
      })
    }
    if (/^\/preview-fonts\/[a-f0-9]{24}\.woff2$/.test(url.pathname))
      return new Response(
        Bun.file(
          resolve(
            root,
            'packages/community/.cache/creator-preview-fonts',
            url.pathname.split('/').at(-1)!,
          ),
        ),
      )
    if (url.pathname.endsWith('.css'))
      return new Response(
        styles.get(
          url.pathname.includes('admin')
            ? 'admin'
            : url.pathname.includes('kids')
              ? 'kids'
              : 'adult',
        ),
        {
          headers: { 'Content-Type': 'text/css' },
        },
      )
    if (/^\/jornada\/[a-z-]+\.webp$/.test(url.pathname)) {
      const file = Bun.file(resolve(root, `packages/community-kids/public${url.pathname}`))
      return (await file.exists()) ? new Response(file) : new Response('', { status: 404 })
    }
    if (url.pathname.startsWith('/api/'))
      return Response.json(
        {
          error: {
            code: 'PREVIEW_ONLY',
            message:
              'Esta prévia usa dados fictícios e não envia projetos. O fluxo real é validado nos testes.',
          },
        },
        { status: 409 },
      )
    if (url.pathname === '/admin-review')
      return new Response(
        `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisar Maestrias · prévia local</title><link rel="stylesheet" href="/admin.css"><link rel="stylesheet" href="/preview-fonts.css"><style>:root{--font-atkinson:"Atkinson Hyperlegible Next",sans-serif;--font-bricolage:"Bricolage Grotesque",sans-serif;--font-geist-mono:monospace}body{margin:0}</style></head><body class="bg-background text-foreground"><div id="root"></div><script>window.creatorReviewFixture=${JSON.stringify(url.searchParams.get('evidence') === 'gallery' ? galleryReview.detail : url.searchParams.get('evidence') === 'python' ? creatorAdminPythonFixture() : creatorAdminFixture()).replace(/</g, '\\u003c')}</script><script type="module" src="/admin-preview.js"></script></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    const skin = url.searchParams.get('skin') === 'kids' ? 'kids' : 'adult'
    const fixture = creatorSceneFixture(skin, url.searchParams.get('state') ?? 'pair')
    return new Response(
      `<!doctype html><html lang="pt-BR" data-sz-palette="blue"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jornada · prévia local</title><link rel="stylesheet" href="/${skin}.css"><link rel="stylesheet" href="/preview-fonts.css"><style>:root{--font-atkinson:"Atkinson Hyperlegible Next",sans-serif;--font-bricolage:"Bricolage Grotesque",sans-serif;--font-silkscreen:"Silkscreen",monospace;--font-baloo:"Baloo 2",sans-serif;--font-nunito:Nunito,sans-serif}body{margin:0}</style></head><body class="bg-background text-foreground"><div id="root"></div><script>window.creatorFixture=${JSON.stringify(fixture).replace(/</g, '\\u003c')}</script><script type="module" src="/preview.js"></script></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  },
})
console.log(`Creator journey preview: http://127.0.0.1:${port}/?skin=adult&screen=map&state=pair`)
