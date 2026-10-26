/** Build the standalone approval file from the actual application components and stylesheet. */
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { FONTE as baloo } from '../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'

const root = resolve(import.meta.dirname, '../../..')
const app = resolve(root, 'packages/community-kids')
const prototype = import.meta.dirname
const tailwind = (await import(Bun.resolveSync('@tailwindcss/postcss', app))).default
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
console.log('Compiling the application stylesheet.')
const css = await postcss([tailwind()]).process(
  (await readFile(cssPath, 'utf8')) + '\n@source "' + prototype.replaceAll('\\', '/') + '";\n',
  { from: cssPath },
)
console.log('Compiling the current components and proposed interactions.')
const exact = (source: string, before: string, after: string) => {
  if (!source.includes(before)) throw Error('Application source changed: ' + before.slice(0, 90))
  return source.replace(before, after)
}
const shared = JSON.stringify(resolve(prototype, 'shared.tsx').replaceAll('\\', '/'))
const mascot = async (name: string) =>
  'data:image/webp;base64,' +
  (await readFile(resolve(app, 'public/zappy/' + name + '.webp'))).toString('base64')
const speaking = await mascot('speaking')
const bundle = await Bun.build({
  entrypoints: [resolve(prototype, 'client.tsx')],
  target: 'browser',
  minify: true,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [
    {
      name: 'local-course-approval-only',
      setup(build) {
        build.onResolve(
          { filter: /^(react(?:\/.*)?|react-dom(?:\/.*)?|lucide-react|@sistemazero\/.+)$/ },
          (args) => ({ path: Bun.resolveSync(args.path, app) }),
        )
        build.onResolve({ filter: /^@\// }, (args) => ({
          path: Bun.resolveSync(resolve(app, 'src', args.path.slice(2)), app),
        }))
        build.onLoad({ filter: /shared\.tsx$/ }, async (args) => ({
          contents: (await readFile(args.path, 'utf8')).replace('__ZAPPY_SPEAKING__', speaking),
          loader: 'tsx',
          resolveDir: dirname(args.path),
        }))
        build.onLoad({ filter: /[\\/]kids[\\/]mascot\.tsx$/ }, async (args) => {
          let source = await readFile(args.path, 'utf8')
          for (const name of ['happy', 'celebrating', 'thinking', 'sleeping', 'speaking'])
            source = source.replaceAll(
              "'/zappy/" + name + ".webp'",
              JSON.stringify(await mascot(name)),
            )
          return { contents: source, loader: 'tsx', resolveDir: dirname(args.path) }
        })
        // The official still pose is used in the offline file; no Rive/WASM network is needed.
        build.onLoad({ filter: /[\\/]kids[\\/]mascot-rive\.tsx$/ }, (args) => ({
          contents:
            "import { KidsMascot } from './mascot'; export function KidsMascotAnimated({expression,className}){return <KidsMascot expression={expression} className={className}/>}",
          loader: 'tsx',
          resolveDir: dirname(args.path),
        }))
        build.onLoad({ filter: /scene-activity\.tsx$/ }, async (args) => {
          let source = await readFile(args.path, 'utf8')
          source = exact(
            source,
            "return <DialogueBlockView content={{ kind: 'dialogue', text }} speech={fala} />",
            "return <DialogueBlockView content={{ kind: 'dialogue', text }} speech={fala} mascot={<PrototypeMascot />} />",
          )
          return {
            contents: 'import { PrototypeMascot } from ' + shared + ';\n' + source,
            loader: 'tsx',
            resolveDir: dirname(args.path),
          }
        })
        build.onLoad({ filter: /[\\/]kids[\\/]kids-quiz\.tsx$/ }, async (args) => {
          let source = await readFile(args.path, 'utf8')
          const start = source.indexOf('      const res = await apiSend<QuizAttemptResultView>(')
          const end = source.indexOf('\n      setResult(res)', start)
          if (start < 0 || end < start || end - start > 600)
            throw Error('Quiz submit contract changed')
          source =
            source.slice(0, start) +
            '      const res = { ...gradeLearningQuiz(content as any, body), attemptsCount: 1, retryAvailableAt: null }' +
            source.slice(end)
          source = exact(
            source,
            '      </DialogueBlockView>\n\n      <div',
            '      </DialogueBlockView>\n      <PrototypeQuizScene questionId={question.id}/>\n      <div',
          )
          return {
            contents:
              'import { gradeLearningQuiz } from "@sistemazero/core/learning";\nimport { PrototypeQuizScene } from ' +
              shared +
              ';\n' +
              source,
            loader: 'tsx',
            resolveDir: dirname(args.path),
          }
        })
        build.onLoad({ filter: /kids-quiz-review\.tsx$/ }, async (args) => {
          let source = await readFile(args.path, 'utf8')
          source = exact(
            source,
            '{renderMarkdown(correction.explanation, { helpReturnPath })}',
            '{renderMarkdown(correction.explanation, { helpReturnPath })}<PrototypeQuizScene questionId={question.id} result/>',
          )
          return {
            contents: 'import { PrototypeQuizScene } from ' + shared + ';\n' + source,
            loader: 'tsx',
            resolveDir: dirname(args.path),
          }
        })
      },
    },
  ],
})
if (!bundle.success) throw Error(bundle.logs.join('\n'))
const javascript = await bundle.outputs.find((output) => output.path.endsWith('.js'))!.text()
const nunito =
  'data:font/ttf;base64,' +
  (
    await readFile(resolve(root, 'packages/studio/src/runtime/python/pygame/py/fontes/nunito.ttf'))
  ).toString('base64')
// Typography aliases normally installed by next/font in the app's RootLayout.
const face = baloo as any
const balooSource =
  typeof face.base64 === 'string' ? 'data:font/woff2;base64,' + face.base64 : undefined
if (typeof balooSource !== 'string')
  throw Error('Missing embedded Baloo 2 font: ' + Object.keys(face).join(','))
const glue = `@font-face{font-family:Nunito;src:url('${nunito}') format('truetype');font-weight:400 1000;font-display:swap}@font-face{font-family:'Baloo 2';src:url('${balooSource}') format('woff2');font-weight:400 900;font-display:swap}:root{--font-nunito:Nunito;--font-baloo:'Baloo 2'}body{margin:0}.prototype-page{width:min(100% - 32px,900px);margin:24px auto 48px}.prototype-review{margin-bottom:22px}.prototype-notes{margin-top:20px}.prototype-review button{white-space:nowrap}@media(max-width:480px){.prototype-page{margin-top:14px;width:calc(100% - 20px)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`
const html =
  '<!doctype html><html lang="pt-BR" data-sz-palette="blue"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Cadê Todo Mundo? · Protótipo no padrão atual</title><style>' +
  css.css.replaceAll('</style', '<\\/style') +
  '\n' +
  glue +
  '\n' +
  (await readFile(resolve(prototype, 'teaching.css'), 'utf8')) +
  '</style></head><body><div id="root"></div><script>' +
  javascript.replaceAll('</script', '<\\/script') +
  '</script></body></html>'
await writeFile(resolve(root, 'docs/design/cade-todo-mundo-prototipo.html'), html)
console.log('Built from current components and CSS: ' + Buffer.byteLength(html) + ' bytes.')
