import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommunitySidebar } from '../src/components/community/community-nav.tsx'

// Run with Bun: it renders the actual TSX component. Node runs the Tailwind plugin,
// whose native CSS pipeline is not exercised by an application or mocked here.
const root = fileURLToPath(new URL('../../..', import.meta.url))
const output = resolve(root, process.argv[2] ?? '.cache/sidebar-theme-qa')
if (!output.startsWith(`${join(root, '.cache')}${sep}`))
  throw new Error('A saída da conferência deve ser um diretório novo dentro de .cache')
await mkdir(output)
const router = {
  back() {},
  forward() {},
  push() {},
  replace() {},
  refresh() {},
  prefetch: async () => {},
}
const user = {
  id: '00000000-0000-4000-a000-000000000001',
  role: 'admin',
  firstName: 'Pessoa',
  lastName: 'de teste',
  email: 'pessoa@example.test',
  avatarUrl: null,
}
for (const [file, lesson] of [
  ['index.html', false],
  ['lesson.html', true],
]) {
  const menu = renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router },
      React.createElement(CommunitySidebar, { user, unread: 2, lesson }),
    ),
  )
  await writeFile(
    join(output, file),
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div class="sz-app flex">${menu}<main class="${lesson ? 'sz-lesson-ui ' : ''}p-8">Conteúdo da aula</main></div><script type="module" src="/client.js"></script></body></html>`,
    { flag: 'wx' },
  )
}
// Mount the real client component too, so profile opening, Escape and focus can be checked.
const entry = join(output, 'client.mjs')
await writeFile(
  entry,
  `
import React from ${JSON.stringify(join(root, 'packages/community/node_modules/react/index.js'))};
import {createRoot} from ${JSON.stringify(join(root, 'packages/community/node_modules/react-dom/client.js'))};
import {AppRouterContext} from ${JSON.stringify(join(root, 'packages/community/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))};
import {CommunitySidebar} from ${JSON.stringify(join(root, 'packages/community/src/components/community/community-nav.tsx'))};
const router = {back(){},forward(){},push(){},replace(){},refresh(){},prefetch:async()=>{}};
const lesson=location.pathname==='/lesson.html';
createRoot(document.querySelector('.sz-app')).render(React.createElement(AppRouterContext.Provider, {value:router},
  React.createElement(CommunitySidebar,{user:${JSON.stringify(user)},unread:2,lesson}),
  React.createElement('main',{className:(lesson?'sz-lesson-ui ':'')+'p-8'},'Conteúdo da aula')));
`,
  { flag: 'wx' },
)
const client = await Bun.build({
  entrypoints: [entry],
  target: 'browser',
  format: 'esm',
  minify: true,
  define: { 'process.env': JSON.stringify({ NODE_ENV: 'production' }) },
})
if (!client.success) throw new AggregateError(client.logs, 'Falha ao montar a navegação interativa')
await writeFile(join(output, 'client.js'), await client.outputs[0].text(), { flag: 'wx' })
const input = join(root, 'packages/community/src/app/globals.generated.css')
const sourcePaths = [
  join(output, 'index.html'),
  join(output, 'lesson.html'),
  join(root, 'packages/community/src/components/community/user-menu.tsx'),
]
let css = (await readFile(input, 'utf8'))
  .replace(/@source [^;]+;/g, '')
  .replace('@import "tailwindcss";', '@import "tailwindcss" source(none);')
for (const path of sourcePaths)
  css += `\n@source ${JSON.stringify(relative(dirname(input), path).replaceAll('\\', '/'))};`
const config = {
  postcss: new URL('../../ui/node_modules/postcss/lib/postcss.js', import.meta.url).href,
  tailwind: new URL('../node_modules/@tailwindcss/postcss/dist/index.mjs', import.meta.url).href,
  input,
  output: join(output, 'styles.css'),
  css,
}
const build = spawnSync(
  'node',
  [
    '--input-type=module',
    '-e',
    `
  import fs from 'node:fs/promises';
  const config=JSON.parse(await new Promise((done,reject)=>{let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>text+=x);process.stdin.on('end',()=>done(text));process.stdin.on('error',reject)}));
  const {default:postcss}=await import(config.postcss);
  const {default:tailwind}=await import(config.tailwind);
  const result=await postcss([tailwind({base:${JSON.stringify(join(root, 'packages/community/src'))}})]).process(config.css,{from:config.input});
  await fs.writeFile(config.output,result.css,{flag:'wx'});
`,
  ],
  { input: JSON.stringify(config), encoding: 'utf8', timeout: 60_000, windowsHide: true },
)
if (build.error || build.status !== 0)
  throw new Error(build.stderr || build.error?.message || 'Falha ao preparar o CSS')
if (process.argv.includes('--serve')) {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 5379,
    fetch(request) {
      const path = new URL(request.url).pathname
      const file =
        path === '/client.js'
          ? 'client.js'
          : path === '/styles.css'
            ? 'styles.css'
            : path === '/lesson.html'
              ? 'lesson.html'
              : 'index.html'
      return new Response(Bun.file(join(output, file)))
    },
  })
  console.log(JSON.stringify({ output, url: server.url.href, pid: process.pid }))
} else console.log(JSON.stringify({ output }))
