/**
 * O ensaio de ponta a ponta da vaga de arte (etapa 9 de
 * `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`), com o extra "Meu primeiro desenho
 * no Pinta":
 *
 * - o MEMBERS DE VERDADE, em memória (o mesmo `buildApp` dos testes de integração), com o curso
 *   importado do manifesto do extra pelas rotas do Admin e publicado;
 * - o EXECUTOR DE VERDADE: o adaptador de produção (`createStudioRuntimeChecker`, que monta o
 *   documento com o `server-check` do Estúdio) responde o `POST /v1/check` aqui mesmo, rodando o
 *   `check-objectives.mjs` do studio-runtime no Chromium (o Worker da Cloudflare não roda local);
 * - a PÁGINA com os componentes reais do member-shell (`LessonSections`, `PintaBlockView`,
 *   `StudioBlockView`), falando com `/api/members/*` como o BFF repassa ao gateway.
 *
 * Os vídeos ainda são `plannedVideo`: saem do manifesto antes de importar (a publicação pede a
 * mídia pronta). O resto da aula é o do manifesto, byte a byte.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isLearningManifest, manifestoParaDestino } from '@sistemazero/core/learning'
import tailwind from '@tailwindcss/postcss'
import {
  type ExecutionObjectiveRequest,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../../core/src/learning/project-execution'

const app = resolve(import.meta.dir, '../..')
const root = resolve(app, '../..')

// O members entra por import dinâmico de caminho CALCULADO: o typecheck do Kids (lib ES2022) não
// segue o caminho e não compila o members, que usa a lib mais nova. Os tipos abaixo são só o que o
// ensaio usa.
type MembersApp = { handle(request: Request): Promise<Response> }
type MembersEnv = {
  app: MembersApp
  courses: {
    lessons: { id: string; slug: string }[]
    blocks: { lessonId: string }[]
  }
  entitlements: unknown
}
const membersDir = resolve(root, 'packages/members')
const { createStudioRuntimeChecker } = (await import(
  resolve(membersDir, 'src/infrastructure/gateways/studio-runtime-checker.ts')
)) as {
  createStudioRuntimeChecker(options: {
    runtimeUrl: string
    runtimeToken: string
    fetchImpl: (url: string | URL, init?: RequestInit) => Promise<Response>
    timeoutMs?: number
  }): unknown
}
const { draftRequest } = (await import(
  resolve(membersDir, 'tests/draft-authoring-helpers.ts')
)) as {
  draftRequest(
    app: MembersApp,
    lessonId: string,
    action: string,
    method?: string,
    body?: unknown,
  ): Promise<Response>
}
const { buildApp, grantLifetime, seedSampleCourse } = (await import(
  resolve(membersDir, 'tests/helpers.ts')
)) as {
  buildApp(options: { projectExecutor: unknown }): MembersEnv
  grantLifetime(entitlements: unknown, options: { userId: string; courseRef: string }): unknown
  seedSampleCourse(
    courses: MembersEnv['courses'],
    slug: string,
    status: 'published',
    audience: 'adult',
  ): { lessonIds: string[] }
}
export const CRIANCA = '33333333-3333-3333-3333-333333333333'
const ADMIN = {
  'content-type': 'application/json',
  'x-auth-user-id': '11111111-1111-1111-1111-111111111111',
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
}

// ── O executor: o check-objectives.mjs do studio-runtime, com o Chromium do Playwright ─────────
const runtime = resolve(root, 'packages/studio-runtime/runtime')
const checks = resolve(app, '.cache/art-slots-checks')
mkdirSync(checks, { recursive: true })
const studio = resolve(root, 'packages/studio')
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
for (const f of readdirSync(runtime))
  if (f.endsWith('.mjs')) {
    let s = readFileSync(resolve(runtime, f), 'utf8')
    if (f === 'check-objectives.mjs')
      s = s.replace("from 'playwright-core'", `from ${JSON.stringify(pathToFileURL(driver).href)}`)
    writeFileSync(resolve(checks, f), s)
  }
const chromium =
  process.env.SZ_CHECK_CHROMIUM ??
  (
    createRequire(resolve(studio, 'package.json'))('@playwright/test') as {
      chromium: { executablePath(): string }
    }
  ).chromium.executablePath()
let run = 0
async function localCheck(_url: string | URL, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body)) as {
    mode: 'classic'
    scope: string
    document: string
    objectives: ExecutionObjectiveRequest[]
    screenshots: boolean
  }
  if (body.mode !== 'classic') return Response.json({ ok: false }, { status: 502 })
  const cwd = resolve(checks, `run-${++run}`)
  mkdirSync(cwd, { recursive: true })
  for (const f of readdirSync(checks))
    if (f.endsWith('.mjs')) writeFileSync(resolve(cwd, f), readFileSync(resolve(checks, f)))
  writeFileSync(resolve(cwd, 'game.html'), body.document)
  writeFileSync(
    resolve(cwd, 'check-options.json'),
    JSON.stringify({
      mode: 'classic',
      scope: body.scope,
      kit: false,
      screenshots: false,
      objectives: body.objectives,
      deadlineMs: 90_000,
    }),
  )
  const child = Bun.spawn(['node', resolve(cwd, 'check-objectives.mjs')], {
    cwd,
    env: { ...process.env, SZ_CHECK_CHROMIUM: chromium },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
  if (code) {
    console.error('[executor]', stderr)
    return Response.json({ ok: false }, { status: 502 })
  }
  const report = JSON.parse(readFileSync(resolve(cwd, 'check-result.json'), 'utf8')) as {
    observations: { id: string }[]
  }
  return Response.json({
    ok: true,
    results: body.objectives.map((objective) => ({
      id: objective.id,
      ...judgeExecutionObservation(
        objective.rule as SectionExecutionRule,
        report.observations.find((o) => o.id === objective.id) as never,
      ),
    })),
  })
}

// ── O members, com o extra importado e publicado ───────────────────────────────────────────────
const env = buildApp({
  projectExecutor: createStudioRuntimeChecker({
    runtimeUrl: 'http://executor.local',
    runtimeToken: 'ensaio',
    fetchImpl: localCheck,
    timeoutMs: 150_000,
  }),
})
const slug = 'jornada-faisca-extra-2-adulto'
const course = seedSampleCourse(env.courses, slug, 'published', 'adult')
const lessonId = course.lessonIds[0]
if (!lessonId) throw new Error('Curso sem aula')
const lesson = env.courses.lessons.find((l) => l.id === lessonId)
if (!lesson) throw new Error('Aula ausente')
lesson.slug = 'aula-1'
// A aula de exemplo do helper traz blocos próprios (um embed antigo, um e-book): a aula do ensaio
// é só a do manifesto.
for (let i = env.courses.blocks.length - 1; i >= 0; i--)
  if (env.courses.blocks[i]?.lessonId === lessonId) env.courses.blocks.splice(i, 1)
grantLifetime(env.entitlements, { userId: CRIANCA, courseRef: slug })

const authored = JSON.parse(
  readFileSync(
    resolve(
      root,
      'docs/aulas-interativas/faisca/meu-primeiro-desenho-no-pinta/meu-desenho-aula-1.manifesto.json',
    ),
    'utf8',
  ),
) as { blocks: { key: string; plannedVideo?: string }[]; sections: Record<string, unknown>[] }
const videos = new Set(authored.blocks.filter((b) => 'plannedVideo' in b).map((b) => b.key))
// A parte que só pedia o vídeo (o Material) sai inteira: critério vazio não publica, e ela não é o
// que este ensaio confere.
const partes = authored.sections
  .map((s) => {
    const completion = s.completion as { blockIds: string[] }
    return {
      ...s,
      blockKeys: (s.blockKeys as string[]).filter((k) => !videos.has(k)),
      completion: { ...completion, blockIds: completion.blockIds.filter((k) => !videos.has(k)) },
    }
  })
  .filter((s) => s.completion.blockIds.length > 0)
const usados = new Set(partes.flatMap((s) => s.blockKeys as string[]))
const semVideos = {
  ...authored,
  blocks: authored.blocks.filter(
    (b) => usados.has(b.key) || b.key === 'desenho' || b.key === 'projeto',
  ),
  sections: partes,
}
if (!isLearningManifest(semVideos)) throw new Error('Manifesto sem vídeos inválido')
const document = manifestoParaDestino(semVideos, { courseSlug: slug, lessonSlug: 'aula-1' })
const admin = (action: string, body: unknown) =>
  env.app.handle(
    new Request(`http://localhost/members/admin/lessons/${lessonId}/${action}`, {
      method: 'POST',
      headers: ADMIN,
      body: JSON.stringify(body),
    }),
  )
const preview = await admin('import-preview', { document, mode: 'preserve' })
const proposal = (await preview.json()) as { fingerprint: string }
if (preview.status !== 200) throw new Error(`Prévia da importação: ${JSON.stringify(proposal)}`)
const applied = await admin('import-learning', {
  document,
  mode: 'preserve',
  expectedFingerprint: proposal.fingerprint,
  operationId: crypto.randomUUID(),
})
if (applied.status !== 200) throw new Error(`Importação: ${await applied.text()}`)
const draft = (await (await draftRequest(env.app, lessonId, '')).json()) as { revision: number }
const published = await draftRequest(env.app, lessonId, '/publish', 'POST', {
  expectedRevision: draft.revision,
  operationId: crypto.randomUUID(),
  readyVideoIds: [],
})
if (published.status !== 200) throw new Error(`Publicação: ${await published.text()}`)

// ── A página: CSS do app, o bundle do player e o repasse das rotas do BFF ──────────────────────
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
if (!js) throw new Error('Bundle do ensaio ausente')

async function repassar(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url)
  let upstream = `/members/${path.slice('/api/members/'.length)}`
  let method = request.method
  // O BFF chama a navegação e o progresso com PUT no members (`routes/learning.ts`).
  if (method === 'POST' && /\/(navigation|learning-progress)$/.test(upstream)) method = 'PUT'
  const search = new URLSearchParams(url.search)
  if (upstream.endsWith('/studio-context')) search.set('audience', 'adult')
  const query = search.toString()
  upstream += query ? `?${query}` : ''
  const response = await env.app.handle(
    new Request(`http://localhost${upstream}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-auth-user-id': CRIANCA },
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: await request.text() }),
    }),
  )
  const text = await response.text()
  // Como o BFF: resposta sem corpo vira `{ok}` (`routes/learning.ts`).
  return new Response(text || JSON.stringify({ ok: response.status === 200 }), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.ART_SLOTS_PORT ?? 5207),
  idleTimeout: 180,
  async fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/client.js') return new Response(js)
    if (path === '/app.css')
      return new Response(styles.css, { headers: { 'Content-Type': 'text/css' } })
    if (path === '/studio.css')
      return new Response(css ?? '', { headers: { 'Content-Type': 'text/css' } })
    if (path === '/fixture.json') return Response.json({ slug, lessonId, viewerId: CRIANCA })
    if (path.startsWith('/api/members/')) return repassar(request, path)
    if (path.startsWith('/api/')) return Response.json({})
    if (path === '/favicon.ico') return new Response(null, { status: 204 })
    if (path.startsWith('/studio-sounds/'))
      return new Response(Bun.file(resolve(app, 'public', path.slice(1))))
    if (path !== '/') return new Response('Not found', { status: 404 })
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/studio.css"></head><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
console.log('Art slots fixture ready')
