import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import {
  applyLessonDraftChange,
  type LessonDraftDocument,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import tailwind from '@tailwindcss/postcss'
import { newAuthoringSection } from '../../src/lib/lesson-authoring'
import type { LessonBlockContent } from '../../src/lib/types'

const app = resolve(import.meta.dir, '../..')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
const [bundle, styles] = await Promise.all([
  Bun.build({
    entrypoints: [resolve(import.meta.dir, 'lesson-authoring-preview.tsx')],
    target: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  }),
  postcss([tailwind()]).process(await Bun.file(cssPath).text(), { from: cssPath }),
])
if (!bundle.success) throw new Error(bundle.logs.join('\n'))
const javascript = await bundle.outputs.find((file) => file.path.endsWith('.js'))!.text()
let revision = 1
let doc: LessonDraftDocument<LessonBlockContent> = {
  title: 'Corre Dino · Construindo o salto',
  slug: 'construindo-o-salto',
  estimatedMinutes: 25,
  sections: Array.from({ length: 12 }, (_, i) => ({
    ...newAuthoringSection(`section-${i + 1}`),
    title: [
      'Observe o movimento',
      'Crie o primeiro salto',
      'Explore a gravidade',
      'Continue o mesmo projeto',
    ][i % 4]!,
    ...(i === 0
      ? { blockIds: ['video'], completion: { version: 1 as const, blockIds: ['video'] } }
      : {}),
  })),
  blocks: [
    {
      id: 'video',
      content: {
        kind: 'video',
        provider: 'vimeo',
        src: 'https://player.vimeo.com/video/123456789',
      },
    },
  ],
  attachments: [],
  supportBlockIds: [],
  plannedVideos: [
    { blockId: 'video', videoId: '123456789', instructions: 'Apresente a experiência.' },
  ],
}
const cover =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#074b59"/><text x="50" y="180" fill="white" font-size="40">Corre Dino · O salto</text></svg>',
  )
let pictureId = '1'
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4413,
  async fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/app.js')
      return new Response(javascript, { headers: { 'content-type': 'text/javascript' } })
    if (path === '/app.css')
      return new Response(styles.css, { headers: { 'content-type': 'text/css' } })
    if (path === '/api/members/courses/preview-course')
      return Response.json({
        slug: 'corre-dino',
        audience: 'kids',
        status: 'draft',
        modules: [{ lessons: [{ id: 'preview-lesson', isPublished: false }] }],
      })
    if (path.endsWith('/draft') && request.method === 'GET')
      return Response.json({
        lessonId: 'preview-lesson',
        revision: String(revision),
        publishedRevision: '0',
        isPublished: false,
        document: doc,
        updatedBy: 'preview-teacher',
        updatedAt: new Date().toISOString(),
      })
    if (path.endsWith('/draft') && request.method === 'PATCH') {
      const command = await request.json()
      const next = applyLessonDraftChange(doc, command.change)
      const assigned = [...next.sections.flatMap((s) => s.blockIds), ...next.supportBlockIds]
      if (
        new Set(assigned).size !== assigned.length ||
        assigned.length !== next.blocks.length ||
        next.blocks.some((b) => !assigned.includes(b.id))
      )
        return Response.json({ message: 'Estrutura do rascunho inconsistente' }, { status: 400 })
      doc = next
      revision++
      return Response.json({ revision: String(revision), updatedAt: new Date().toISOString() })
    }
    if (path.endsWith('/validate'))
      return Response.json(sectionCompletionIssues(doc.sections, doc.blocks))
    if (path.endsWith('/status'))
      return Response.json({
        status: 'ready',
        durationSeconds: 40,
        embedUrl: 'https://player.vimeo.com/video/123456789',
        captions: [],
      })
    if (path.endsWith('/thumbnail') && request.method === 'GET')
      return Response.json({
        current: { id: pictureId, url: cover, active: true, type: 'custom' },
        pictures: [{ id: pictureId, url: cover, active: true, type: 'custom' }],
        page: 1,
        hasMore: false,
      })
    if (path.endsWith('/thumbnail')) {
      pictureId = String(Number(pictureId) + 1)
      return Response.json({ ok: true, pictureId })
    }
    if (path.startsWith('/api/'))
      return Response.json(
        { error: { message: 'Operação não disponível no ensaio local.' } },
        { status: 400 },
      )
    return new Response(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autoria de aulas · QA local</title><link rel="stylesheet" href="/app.css"><body><script>globalThis.process={env:{NODE_ENV:"production"}}</script><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log(`Ensaio local: ${server.url}`)
