import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type {
  CoursePublicationMediaResult,
  CoursePublicationMediaTask,
} from '@sistemazero/core/course/publication'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import { CoursePromotionProcessor } from '../../../members/src/application/course-publication/course-promotion.processor'
import { CoursePublicationWorker } from '../../../members/src/application/course-publication/course-publication.worker'
import { createAdminPublicationMediaClient } from '../../../members/src/infrastructure/course-publication/admin-media.client'
import { createAdminCourseTransferClient } from '../../../members/src/infrastructure/course-publication/admin-transfer.client'
import { createLocalPublicationFixture } from '../../../members/tests/fakes/course-publication-fixture'
import { planCoursePublicationMedia } from '../../src/lib/course-publication-plan'
import { coursePublicationRequest } from '../../src/lib/course-publication-request'
import {
  createCourseObjectCopier,
  type StoredCourseObject,
} from '../../src/server/course-object-copy'
import { handleCoursePublicationMedia } from '../../src/server/course-publication-endpoint'
import { relayCoursePublication } from '../../src/server/course-publication-relay'
import { createCourseTransferService } from '../../src/server/course-transfer'
import { handleCourseTransfer } from '../../src/server/course-transfer-endpoint'
import {
  createCourseVideoCopier,
  createCourseVideoCopyJournal,
} from '../../src/server/course-video-copy'

const database = process.env.COURSE_SYNC_TEST_DATABASE_URL
if (
  !database ||
  !['localhost', '127.0.0.1'].includes(new URL(database).hostname) ||
  new URL(database).pathname !== '/sistemazero_course_sync_test'
)
  throw new Error('Use somente o Postgres local descartável sistemazero_course_sync_test')
const admin = fileURLToPath(new URL('../..', import.meta.url)),
  root = resolve(admin, '../..')
const output = resolve(
  root,
  process.argv[2] ?? '.cache/course-audience-sync/publication-browser-r1',
)
if (
  !output.startsWith(`${join(root, '.cache')}\\`) &&
  !output.startsWith(`${join(root, '.cache')}/`)
)
  throw new Error('A saída deve ser nova e estar dentro de .cache')
await mkdir(output)
const token = 'course-publication-local-qa-only-credential'
const profileHash = 'b'.repeat(64)
const {
  connection,
  actorId,
  repository,
  app,
  seed,
  productionConnection,
  productionRepository,
  promotionSource,
} = await createLocalPublicationFixture(
  database,
  token,
  process.env.COURSE_PROMOTION_TEST_DATABASE_URL,
  (request, kind, handler) => {
    const url = new URL(request.url)
    const suffix = url.pathname
      .slice(`/api/internal/course-publication/${kind}`.length)
      .split('/')
      .filter(Boolean)
    return relayCoursePublication(
      request,
      kind,
      suffix,
      {
        membersUrl: 'http://members.local',
        environment: kind === 'peer' ? 'production' : 'staging',
        peerToken: `${token}-production-peer`,
        sourceToken: `${token}-staging-source`,
      },
      (input, init) => handler(new Request(input, init)),
    )
  },
)
if (!productionConnection || !productionRepository || !promotionSource)
  throw new Error('Configure o segundo banco local para conferir a promoção')
const production = {
  connection: productionConnection,
  repository: productionRepository,
  source: promotionSource,
}
const objects = new Map<string, StoredCourseObject>([
  ['stage/capa.png', { etag: 'source-cover', bytes: 42, metadata: {} }],
  ['stage-private/manual.pdf', { etag: 'source-manual', bytes: 42, metadata: {} }],
])
const videoJournal = new Map<string, unknown>()
const storage = {
  head: async (bucket: string, key: string) => objects.get(`${bucket}/${key}`) ?? null,
  async copy(input: Parameters<Parameters<typeof createCourseObjectCopier>[0]['copy']>[0]) {
    const original = objects.get(`${input.source.bucket}/${input.source.key}`)
    if (!original || original.etag !== input.source.etag) throw new Error('412 source changed')
    objects.set(`${input.destination.bucket}/${input.destination.key}`, {
      ...original,
      etag: `copy-${input.fingerprint}`,
      metadata: { 'course-source': input.fingerprint },
    })
    return { etag: `copy-${input.fingerprint}` }
  },
}
const transfer = createCourseTransferService(
  {
    origin: {
      publicBaseUrl: 'https://stage.assets.example',
      publicBucket: 'stage',
      privateBucket: 'stage-private',
    },
    destination: {
      publicBaseUrl: 'https://prod.assets.example',
      publicBucket: 'prod',
      privateBucket: 'prod-private',
    },
    sales: { staging: 'https://stage.funnel.example', production: 'https://funnel.example' },
    mediaProfileHash: profileHash,
  },
  {
    head: storage.head,
    copy: createCourseObjectCopier(storage),
    read: async () => new Uint8Array(),
    video: createCourseVideoCopier(
      {
        inspect: async (id) => ({
          id,
          name: id === '10' ? 'aula' : 'copia',
          modifiedAt: '2026-11-01T00:00:00Z',
          available: true,
          contentHash: 'same-files-and-transcripts',
        }),
        copy: async () => '20',
        find: async () => [],
        configure: async () => {},
        verifyConfiguration: async () => {},
        embedUrl: async (id) => `https://player.vimeo.com/video/${id}?h=production`,
      },
      createCourseVideoCopyJournal({
        read: async (key) => videoJournal.get(key) ?? null,
        create: async (key, value) => {
          if (videoJournal.has(key)) return false
          videoJournal.set(key, structuredClone(value))
          return true
        },
      }),
    ),
  },
)
let failedProvider = true,
  heldProvider = true
const require = createRequire(import.meta.url)
const cssPath = join(admin, 'src/app/globals.css')
const style = (await readFile(cssPath, 'utf8'))
  .replace('@import "tailwindcss";', '@import "tailwindcss" source(none);')
  .replace(/^@source .*;$/gm, '')
const config = {
  css: `${style}\n@source "${join(admin, 'src/app/admin/membros/cursos/course-publication-dialog.tsx').replaceAll('\\', '/')}";\n@source "${join(admin, 'tests/fixtures/course-publication-view.tsx').replaceAll('\\', '/')}";\n@source "${resolve(admin, '../ui/src').replaceAll('\\', '/')}";`,
  input: cssPath,
  output: join(output, 'view.css'),
  postcss: pathToFileURL(createRequire(require.resolve('@tailwindcss/postcss')).resolve('postcss'))
    .href,
  tailwind: pathToFileURL(require.resolve('@tailwindcss/postcss')).href,
  base: admin,
}
const css = spawnSync(
  'node',
  [
    '--input-type=module',
    '-e',
    `import fs from 'node:fs/promises'; const c=JSON.parse(await new Promise(r=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>r(s))})); const {default:p}=await import(c.postcss);const {default:t}=await import(c.tailwind);const r=await p([t({base:c.base})]).process(c.css,{from:c.input});await fs.writeFile(c.output,r.css,{flag:'wx'});`,
  ],
  { input: JSON.stringify(config), encoding: 'utf8', timeout: 60_000, windowsHide: true },
)
if (css.error || css.status !== 0)
  throw new Error(css.stderr || css.error?.message || 'Falha no CSS')
const build = await Bun.build({
  entrypoints: [join(admin, 'tests/fixtures/course-publication-view.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
})
if (!build.success) throw new Error(build.logs.join('\n'))
const js = build.outputs.find((item) => item.kind === 'entry-point')!
await writeFile(join(output, 'view.js'), new Uint8Array(await js.arrayBuffer()))
async function executeMedia(
  task: CoursePublicationMediaTask,
): Promise<CoursePublicationMediaResult> {
  if (task.kind === 'voice') {
    if (task.speechText.includes('fail') && failedProvider)
      throw new Error('Provedor fictício indisponível')
    while (task.speechText.includes('hold') && heldProvider) await Bun.sleep(100)
    return {
      kind: 'voice',
      key: chaveDeVoz(task.speechText),
      url: 'https://assets.example/voz-qa.mp3',
      generated: false,
    }
  }
  if (task.kind === 'video') return { kind: 'video', videoId: task.videoId }
  if (task.kind === 'knowledge')
    return {
      kind: 'knowledge',
      sourceRef: task.sourceRef,
      sourceType: task.sourceType,
      content:
        task.extraction.kind === 'text'
          ? task.extraction.content
          : 'WEBVTT\n\n00:00.000 --> 00:01.000\nObserve o jogo.',
    }
  throw new Error('A fixture só prepara texto e voz')
}

const port = Number(process.env.COURSE_PUBLICATION_QA_PORT ?? 5391)
const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  idleTimeout: 100,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 })
    if (
      url.pathname === '/__qa/stop' &&
      request.method === 'POST' &&
      request.headers.get('x-course-publication-token') === token
    ) {
      setTimeout(() => {
        void stop()
      }, 20)
      return Response.json({ stopping: true })
    }
    if (url.pathname === '/view.js')
      return new Response(Bun.file(join(output, 'view.js')), {
        headers: { 'content-type': 'text/javascript' },
      })
    if (url.pathname === '/view.css')
      return new Response(Bun.file(join(output, 'view.css')), {
        headers: { 'content-type': 'text/css' },
      })
    if (url.pathname === '/__qa/course')
      return Response.json(await seed(url.searchParams.get('scenario') ?? 'ready'))
    if (url.pathname === '/__qa/promoted') {
      const source = await seed('promote')
      const origin = await repository.sourceForPromotion(source.id)
      const result = await production.repository.snapshotForPromotion(origin, source.slug)
      const completed = result.target.course.status === 'published'
      return Response.json({
        sourceDatabase: 'sistemazero_course_sync_test',
        targetDatabase: 'sistemazero_course_promotion_test',
        completed,
        sourceCover: origin.course.coverImageUrl,
        targetCover: result.target.course.coverImageUrl,
        videos: result.target.lessons.flatMap((lesson) =>
          lesson.published.blocks
            .filter((block) => block.content.kind === 'video')
            .map((block) => block.content.src),
        ),
        attachments: result.target.lessons.flatMap((lesson) =>
          lesson.published.attachments.map((attachment) => attachment.url),
        ),
      })
    }
    if (url.pathname === '/__qa/release' && request.method === 'POST') {
      heldProvider = false
      return Response.json({ released: true })
    }
    if (url.pathname === '/__qa/recover' && request.method === 'POST') {
      failedProvider = false
      return Response.json({ recovered: true })
    }
    if (url.pathname === '/api/internal/course-publication/media')
      return handleCoursePublicationMedia(request, {
        token,
        environment: 'staging',
        profileHash,
        plan: (documents) => planCoursePublicationMedia(documents, profileHash),
        // External providers alone are deterministic fixtures. Database, protocol, worker and UI are real.
        execute: executeMedia,
      })
    if (url.pathname.startsWith('/api/members/course-publications')) {
      try {
        const suffix = url.pathname
          .slice('/api/members/course-publications'.length)
          .split('/')
          .filter(Boolean)
        const method = request.method as 'GET' | 'POST'
        const planned = coursePublicationRequest(
          method,
          suffix,
          url.searchParams,
          method === 'POST' ? await request.json() : undefined,
        )
        const query = new URLSearchParams(planned.query).toString()
        return app.handle(
          new Request(`http://local${planned.path}?${query}`, {
            method,
            headers: {
              'content-type': 'application/json',
              'x-internal-token': token,
              'x-auth-user-id': actorId,
              'x-auth-user-role': 'admin',
              'x-auth-user-status': 'active',
            },
            ...(planned.body ? { body: JSON.stringify(planned.body) } : {}),
          }),
        )
      } catch {
        return Response.json(
          { error: { code: 'INVALID_INPUT', message: 'Pedido inválido' } },
          { status: 400 },
        )
      }
    }
    if (url.pathname !== '/') return new Response('Não encontrado', { status: 404 })
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/view.css"><title>Publicação local | Sistema Zero</title></head><body><div id="root"></div><script type="module" src="/view.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
const productionServer = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.COURSE_PUBLICATION_QA_PORT ?? 5391) + 1,
  idleTimeout: 100,
  fetch(request) {
    if (new URL(request.url).pathname.endsWith('/transfer'))
      return handleCourseTransfer(request, { token, environment: 'production', service: transfer })
    return handleCoursePublicationMedia(request, {
      token,
      environment: 'production',
      profileHash,
      plan: (documents) => planCoursePublicationMedia(documents, profileHash),
      execute: executeMedia,
    })
  },
})
const productionMedia = createAdminPublicationMediaClient({
  url: productionServer.url.href,
  token,
  environment: 'production',
})
const productionWorker = new CoursePublicationWorker(
  productionRepository,
  productionMedia,
  (id, error) => console.error('production fixture', id, error),
  new CoursePromotionProcessor(
    productionRepository,
    productionMedia,
    createAdminCourseTransferClient({ url: productionServer.url.href, token }),
    promotionSource,
  ),
)
productionWorker.start()
const worker = new CoursePublicationWorker(
  repository,
  createAdminPublicationMediaClient({ url: server.url.href, token, environment: 'staging' }),
)
worker.start()
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  heldProvider = false
  await worker.stop()
  await productionWorker.stop()
  await productionServer.stop(true)
  await production.connection.close()
  await server.stop(true)
  await connection.close()
  process.exit(0)
}
process.on('SIGINT', () => {
  void stop()
})
process.on('SIGTERM', () => {
  void stop()
})
console.log(
  JSON.stringify({
    url: server.url.href,
    output,
    pid: process.pid,
    localDatabase: 'sistemazero_course_sync_test',
  }),
)
