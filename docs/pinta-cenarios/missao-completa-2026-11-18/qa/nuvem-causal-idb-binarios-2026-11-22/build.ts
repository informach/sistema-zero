import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { prepareAuthorityBaseline } from '../../../../../packages/pinta/scripts/authority-baseline'

const root = resolve(import.meta.dir, '../../../../..')
const output = join(root, '.cache/pinta-chain-compat')
await mkdir(output, { recursive: true })
const derived = await mkdtemp(join(output, 'archived-'))
const revisions = [
  ['new', '09aa01d52'],
  ['old', '332e94b59'],
  ['public', '61ef65f2d'],
  ['before-unbased', '64c197d53'],
  ['before-recovered', '3d6aad294'],
  ['fenced', 'e28bb5dbbc9cfa27e0b4d60b89678f3d4eb78b44'],
]
for (const [version, sha] of revisions) {
  const { extracted, count } = await prepareAuthorityBaseline(root, derived, sha)
  const path = (file: string) =>
    JSON.stringify(join(extracted, 'packages/pinta/src', file).replaceAll('\\', '/'))
  const entry = join(derived, `${version}.ts`)
  await writeFile(
    entry,
    [
      `import * as persistence from ${path('state/persistence.ts')};`,
      `import * as project from ${path('core/project.ts')};`,
      `import { galleryToPintaJson } from ${path('export/projectJson.ts')};`,
      'window.proof = { ...persistence, ...project, assetToJson: (asset) => galleryToPintaJson([asset]) };',
    ].join('\n'),
  )
  const bundle = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: derived,
    minify: true,
  })
  if (!bundle.success) throw new AggregateError(bundle.logs, 'Não compilou o binário histórico.')
  const file = await Bun.file(join(derived, `${version}.js`)).arrayBuffer()
  const revision = Bun.spawnSync(['git', 'rev-parse', sha], { cwd: root })
  if (revision.exitCode !== 0) throw Error('Não consegui conferir o commit do binário.')
  console.log(
    JSON.stringify({
      version,
      sha: revision.stdout.toString().trim(),
      sourceFiles: count,
      bundleSha256: new Bun.CryptoHasher('sha256').update(file).digest('hex'),
    }),
  )
}

const coreSource = Bun.resolveSync(
  '@sistemazero/core/creations/pinta-causal',
  join(root, 'packages/pinta/src/state'),
)
console.log(
  JSON.stringify({
    bunVersion: Bun.version,
    sharedCoreSchemaSha256: new Bun.CryptoHasher('sha256')
      .update(await Bun.file(coreSource).arrayBuffer())
      .digest('hex'),
  }),
)
if (!process.argv.includes('--run')) process.exit(0)

const app = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname
    const match = /^\/([a-z-]+)\.(html|js)$/.exec(path)
    if (!match || !revisions.some(([version]) => version === match[1]))
      return new Response('Not found', { status: 404 })
    const [, version, extension] = match
    if (extension === 'js') return new Response(Bun.file(join(derived, `${version}.js`)))
    return new Response(`<!doctype html><script type=module src="/${version}.js"></script>`, {
      headers: { 'content-type': 'text/html' },
    })
  },
})
try {
  const proof = Bun.spawn(['node', join(import.meta.dir, 'probe.mjs'), app.url.origin, root], {
    stdout: 'inherit',
    stderr: 'inherit',
    windowsHide: true,
  })
  process.exitCode = await proof.exited
} finally {
  await app.stop(true)
}
