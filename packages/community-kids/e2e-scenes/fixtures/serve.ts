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
const projectPlayBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'project-play-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!projectPlayBundle.success) throw new Error(projectPlayBundle.logs.join('\n'))
const projectPlayScript = projectPlayBundle.outputs.find((output) => output.path.endsWith('.js'))
if (!projectPlayScript) throw new Error('Bundle do jogo pronto não foi gerado')
const authoringBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'project-play-authoring-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!authoringBundle.success) throw new Error(authoringBundle.logs.join('\n'))
const authoringScript = authoringBundle.outputs.find((output) => output.path.endsWith('.js'))
if (!authoringScript) throw new Error('Bundle da autoria do jogo não foi gerado')
const authoringStyles = authoringBundle.outputs.find((output) => output.path.endsWith('.css'))
const lessonVideoBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'lesson-video-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!lessonVideoBundle.success) throw new Error(lessonVideoBundle.logs.join('\n'))
const lessonVideoScript = lessonVideoBundle.outputs.find((output) => output.path.endsWith('.js'))
if (!lessonVideoScript) throw new Error('Bundle da aula com vídeo não foi gerado')
const trailBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'trail-rive-client.tsx')],
  target: 'browser',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL': '""',
    'process.env': '{}',
  },
  plugins: [
    {
      name: 'server-component-fixture',
      setup(build) {
        // CourseTrail roda no servidor no Next; neste ensaio isolado os dados são locais.
        build.onLoad({ filter: /server-only[\\/]index\.js$/ }, () => ({
          contents: '',
          loader: 'js',
        }))
      },
    },
  ],
})
if (!trailBundle.success) throw new Error(trailBundle.logs.join('\n'))
const quizBundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'quiz-zappy-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
})
if (!quizBundle.success) throw new Error(quizBundle.logs.join('\n'))
const quizScript = quizBundle.outputs.find((output) => output.path.endsWith('.js'))
if (!quizScript) throw new Error('Bundle do quiz não foi gerado')
const trailScript = trailBundle.outputs.find((output) => output.path.endsWith('.js'))
if (!trailScript) throw new Error('Bundle da trilha não foi gerado')

/** O progresso que a aula grava volta como o members devolveria (sem banco). */
async function echoProgress(request: Request, path: string) {
  const blockId = path.split('/blocks/')[1]?.split('/')[0] ?? ''
  const body = (await request.json()) as Record<string, unknown>
  return Response.json({
    blockId,
    revision: body.revision,
    answers: body.answers ?? {},
    hintsUsed: body.hintsUsed ?? 0,
    positionSeconds: body.positionSeconds ?? null,
    attemptsCount: 0,
    result: null,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * A tentativa volta APROVADA, como o members devolveria, depois de um atraso de rede: é na
 * espera que a tela mostra "Guardando…", e é ali que o tremor do jogo pronto acontecia.
 */
async function approveAttempt(request: Request, path: string) {
  const blockId = path.split('/blocks/')[1]?.split('/')[0] ?? ''
  const body = (await request.json()) as Record<string, unknown>
  await Bun.sleep(700)
  const now = new Date().toISOString()
  return Response.json({
    attempt: {
      id: body.id,
      blockId,
      revision: body.revision,
      answers: body.answers ?? {},
      hintsUsed: body.hintsUsed ?? 0,
      result: {
        participated: true,
        passed: true,
        feedback: 'Você achou todo mundo!',
        verifiedBy: 'server',
      },
      createdAt: now,
    },
    progress: {
      blockId,
      revision: body.revision,
      answers: body.answers ?? {},
      hintsUsed: body.hintsUsed ?? 0,
      positionSeconds: null,
      attemptsCount: 1,
      result: {
        participated: true,
        passed: true,
        feedback: 'Você achou todo mundo!',
        verifiedBy: 'server',
      },
      updatedAt: now,
    },
  })
}

Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.SCENE_E2E_PORT ?? 5198),
  async fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/trail-rive.js') return new Response(trailScript)
    if (path === '/quiz-zappy.js') return new Response(quizScript)
    // O Zappy animado do balão (`fala.riv`) e a pose parada que o cobre enquanto carrega.
    if (/^\/zappy\/[a-z-]+\.(riv|webp)$/.test(path))
      return new Response(Bun.file(resolve(app, `public${path}`)))
    if (
      path === '/rive/rive.wasm' ||
      path === '/zappy/happy.riv' ||
      path === '/kids/chest-closed.svg'
    )
      return new Response(Bun.file(resolve(app, `public${path}`)))
    if (path === '/missing.riv') return new Response(null, { status: 404 })
    if (request.method === 'POST' && path.endsWith('/learning-progress'))
      return echoProgress(request, path)
    if (request.method === 'POST' && path.endsWith('/learning-attempts'))
      return approveAttempt(request, path)
    if (request.method === 'POST' && path.startsWith('/api/')) return Response.json({})
    if (path === '/video.webm')
      return new Response(Bun.file(resolve(import.meta.dir, 'video.webm')), {
        headers: { 'Content-Type': 'video/webm' },
      })
    if (path === '/lesson-video.js') return new Response(lessonVideoScript)
    if (path === '/client.js') return new Response(script)
    if (path === '/project-play.js') return new Response(projectPlayScript)
    if (path === '/project-play-authoring.js') return new Response(authoringScript)
    if (path === '/project-play-authoring.css')
      return new Response(authoringStyles ?? '', { headers: { 'Content-Type': 'text/css' } })
    if (path === '/scene.css')
      return new Response(styles.css, { headers: { 'Content-Type': 'text/css' } })
    const entrypoint =
      path === '/project-play-authoring'
        ? '/project-play-authoring.js'
        : path === '/project-play'
          ? '/project-play.js'
          : path === '/lesson-video'
            ? '/lesson-video.js'
            : path === '/trail-rive'
              ? '/trail-rive.js'
              : path === '/quiz-zappy'
                ? '/quiz-zappy.js'
                : '/client.js'
    const extraStyles =
      path === '/project-play-authoring'
        ? '<link rel="stylesheet" href="/project-play-authoring.css">'
        : ''
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/scene.css">${extraStyles}</head><body><div id="root"></div><script type="module" src="${entrypoint}"></script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
