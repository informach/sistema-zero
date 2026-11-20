import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { build } from 'vite'
import { prepareAuthorityBaseline } from './authority-baseline'

const root = resolve(import.meta.dir, '../../..')
const pinta = join(root, 'packages/pinta')
const port = Number(process.env.PINTA_AUTHORITY_PORT ?? 5401)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida')
await mkdir(join(pinta, '.cache'), { recursive: true })
const temporary = await mkdtemp(join(pinta, '.cache/authority-'))
const { extracted } = await prepareAuthorityBaseline(root, temporary)
const { extracted: previous } = await prepareAuthorityBaseline(root, temporary, '899d2596f')
const { extracted: denseReader } = await prepareAuthorityBaseline(root, temporary, 'ec4e58066')
const proof = join(temporary, 'proof')
await mkdir(proof)
for (const [version, src] of [
  ['current', join(pinta, 'src')],
  ['old', join(extracted, 'packages/pinta/src')],
  ['previous', join(previous, 'packages/pinta/src')],
  ['dense-reader', join(denseReader, 'packages/pinta/src')],
]) {
  const entry = join(temporary, `${version}.ts`)
  const modulePath = (file: string) => JSON.stringify(join(src!, file).replaceAll('\\', '/'))
  await writeFile(
    entry,
    `import * as persistence from ${modulePath('state/persistence.ts')};
import * as project from ${modulePath('core/project.ts')};
import * as clipboard from ${modulePath('state/clipboardStore.ts')};
Object.assign(window, { pinta026: { ...persistence, ...project, ...clipboard } });`,
  )
  const result = await Bun.build({ entrypoints: [entry], target: 'browser', outdir: proof })
  if (!result.success) throw new AggregateError(result.logs, 'Não compilou a prova')
  await writeFile(
    join(proof, `${version}.html`),
    `<html lang="pt-BR"><title>Prova local 026 (${version})</title><script type="module" src="/proof/${version}.js"></script><body>IndexedDB local, sem nuvem</body></html>`,
  )
}
const app = join(temporary, 'app')
await build({
  configFile: join(pinta, 'playground/vite.config.ts'),
  build: { outDir: app, emptyOutDir: true },
})
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    const isProof = path.startsWith('/proof/')
    const base = isProof ? proof : app
    const target = resolve(base, `.${isProof ? path.slice('/proof'.length) : path}`)
    if (target !== base && !target.startsWith(base + sep))
      return new Response('Forbidden', { status: 403 })
    const file = Bun.file(target)
    if (await file.exists()) return new Response(file)
    return isProof
      ? new Response('Not found', { status: 404 })
      : new Response(Bun.file(join(app, 'index.html')))
  },
})
console.log(`Authority browser proof: http://127.0.0.1:${port}`)
