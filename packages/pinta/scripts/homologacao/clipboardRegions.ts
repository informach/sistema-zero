/** Browser-only QA bundles of the actual current and archived clipboard modules. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dir, '../../../..'),
  out = resolve(process.argv[2] ?? resolve(root, '.tmp/pinta-clipboard-regions-e2e'))
const fixture = resolve(import.meta.dir, 'fixtures/clipboard-v2'),
  metadata = JSON.parse(readFileSync(resolve(fixture, 'source.json'), 'utf8'))
const source = gunzipSync(readFileSync(resolve(fixture, 'clipboardStore.ts.gz'))),
  hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
if (hash(source) !== metadata.sha256) throw Error('Historical clipboard fixture digest mismatch')
mkdirSync(out, { recursive: true })
const current = resolve(root, 'packages/pinta/src/state/clipboardStore.ts'),
  req = createRequire(resolve(root, 'packages/pinta/package.json'))
const archived = source
  .toString('utf8')
  .replace(/from (['"])([^'"]+)\1/g, (_match, _quote, specifier: string) => {
    const target = specifier.startsWith('.')
      ? resolve(dirname(current), specifier)
      : req.resolve(specifier)
    return `from ${JSON.stringify(target.replaceAll('\\', '/'))}`
  })
const legacy = resolve(out, 'legacy.ts')
writeFileSync(legacy, archived)
const bundles = []
for (const [name, entry] of [
  ['current', current],
  ['legacy', legacy],
]) {
  const file = resolve(out, `${name}.js`)
  execFileSync(
    'bun',
    ['--no-env-file', 'build', entry, '--target=browser', '--format=esm', '--outfile', file],
    { cwd: root, stdio: 'pipe' },
  )
  const bytes = readFileSync(file)
  bundles.push({ name, file, bytes: bytes.length, sha256: hash(bytes) })
}
console.log(JSON.stringify({ bundles, legacySource: metadata, productionEntryChanged: false }))
