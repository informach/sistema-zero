import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { prepareAuthorityBaseline } from '../../../../../packages/pinta/scripts/authority-baseline'

const root = resolve(import.meta.dir, '../../../../..')
const base = join(root, '.cache/pinta-palette-cas-browser')
await mkdir(base, { recursive: true })
const dir = await mkdtemp(join(base, 'build-'))
const historical = '64c197d5332a36b73af54de6ae5bf045a4a7699e'
const old = (await prepareAuthorityBaseline(root, dir, historical)).extracted
const v1 = (await prepareAuthorityBaseline(root, dir, '14fcee965333172f8d101e5445b165d4ace817b1'))
  .extracted
for (const [name, checkout] of [
  ['atual', root],
  ['antigo', old],
  ['anterior', v1],
] as const) {
  const ref = (file: string) => JSON.stringify(join(checkout, file).replaceAll('\\', '/'))
  const entry = join(dir, name + '.ts')
  await writeFile(
    entry,
    [
      'import {createPintaPersistence} from ' + ref('packages/pinta/src/state/persistence.ts'),
      name === 'atual'
        ? 'import {createCloudMirroredPintaPersistence} from ' +
          ref('packages/member-shell/src/lib/pinta-cloud-persistence.ts')
        : '',
      name === 'atual'
        ? 'import {createMemorySyncedMarks} from ' +
          ref('packages/member-shell/src/lib/creations-sync.ts')
        : '',
      'window.api={createPintaPersistence,' +
        (name === 'atual' ? 'createCloudMirroredPintaPersistence,createMemorySyncedMarks' : '') +
        '}',
    ].join('\n'),
  )
  const result = await Bun.build({
    target: 'browser',
    entrypoints: [entry],
    outdir: dir,
    minify: true,
  })
  if (!result.success) throw new AggregateError(result.logs)
  console.log(
    name,
    new Bun.CryptoHasher('sha256').update(await result.outputs[0]!.arrayBuffer()).digest('hex'),
  )
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(req) {
    const path = new URL(req.url).pathname
    const matched = /^\/(atual|antigo|anterior)\.(html|js)$/.exec(path)
    if (!matched) return new Response(null, { status: 404 })
    if (matched[2] === 'js') return new Response(Bun.file(join(dir, matched[1] + '.js')))
    return new Response(
      '<!doctype html><script type="module" src="/' + matched[1] + '.js"></script>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
try {
  const check = Bun.spawn(['node', join(import.meta.dir, 'browser.mjs'), server.url.origin, root], {
    stdout: 'inherit',
    stderr: 'inherit',
    windowsHide: true,
  })
  process.exitCode = await check.exited
} finally {
  await server.stop(true)
}
