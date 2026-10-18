import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { cp, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { prepareRuntime } from './prepare'

const cache = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
const output = resolve(cache, `windows-kit-${randomUUID()}`)
const experiment = resolve(output, 'experiments/studio-python-l0')
await mkdir(experiment, { recursive: true })
await mkdir(resolve(output, 'bin'), { recursive: true })
await mkdir(resolve(output, 'licenses'), { recursive: true })
const upstream: { url: string; sha256: string; bytes: number }[] = []
async function download(url: string, target: string, expected?: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  assert.ok(response.ok, `${url}: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (expected) assert.equal(sha256, expected, `Integrity: ${url}`)
  await writeFile(target, bytes)
  upstream.push({ url, sha256, bytes: bytes.length })
}
await prepareRuntime()
await cp(resolve(cache, 'runtime'), resolve(output, '.cache/studio-python-l0/runtime'), {
  recursive: true,
  errorOnExist: true,
})
const sourceFiles = [
  'probe.ts',
  'graphics.ts',
  'input.ts',
  'checks.ts',
  'source-hashes.ts',
  'prepare.ts',
  'server.ts',
  'reference.ts',
  'pinta-cancellation.ts',
  'reference-server.ts',
  'runtime-manifest.json',
]
for (const file of sourceFiles)
  await cp(resolve(import.meta.dirname, file), resolve(experiment, file))
await writeFile(resolve(experiment, 'package.json'), '{"private":true,"type":"module"}\n')
for (const folder of ['web', 'fixtures', 'corpus'])
  await cp(resolve(import.meta.dirname, folder), resolve(experiment, folder), { recursive: true })
for (const [from, to] of [
  ['reference-runner.mjs', 'reference-runner.mjs'],
  ['reference-process.mjs', 'reference-process.mjs'],
  ['reference-run.cmd', 'executar.cmd'],
  ['REFERENCE-README.md', 'LEIA-ME.md'],
])
  await cp(resolve(import.meta.dirname, from), resolve(output, to))
for (const name of ['@playwright/test', 'playwright', 'playwright-core']) {
  const source = await realpath(resolve(import.meta.dirname, 'node_modules', name))
  const pkg = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'))
  assert.equal(pkg.version, '1.60.0')
  await cp(source, resolve(experiment, 'node_modules', name), {
    recursive: true,
    dereference: true,
  })
}
const bundle = resolve(output, '.cache/studio-python-l0/pinta-bundle')
const build = await Bun.build({
  entrypoints: [
    resolve(import.meta.dirname, 'pinta-browser.ts'),
    resolve(import.meta.dirname, 'pinta-composite.mjs'),
  ],
  target: 'browser',
  outdir: bundle,
  splitting: true,
  minify: true,
  metafile: true,
})
if (!build.success || !build.metafile)
  throw new AggregateError(build.logs, 'Reference Pinta build failed')
assert.ok(
  !Object.keys(build.metafile.inputs).some((name) =>
    /(?:molda|three|react|components)\//i.test(name),
  ),
)
await writeFile(
  resolve(bundle, 'files.json'),
  JSON.stringify(build.outputs.map((file) => basename(file.path))),
)
await writeFile(resolve(bundle, 'metafile.json'), JSON.stringify(build.metafile, null, 2))
// Vendor executables are fetched from pinned official releases, never copied
// from user PATH. Independent upstream hashes are fixed here for reproducibility.
await download(
  'https://nodejs.org/dist/v24.15.0/win-x64/node.exe',
  resolve(output, 'bin/node.exe'),
  '3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5',
)
const bunZip = resolve(cache, `bun-reference-${randomUUID()}.zip`)
const bunExtract = resolve(cache, `bun-reference-${randomUUID()}`)
await download(
  'https://github.com/oven-sh/bun/releases/download/bun-v1.3.11/bun-windows-x64-baseline.zip',
  bunZip,
  '9d0e0f923e9626f3bc6044fc32e0d3ab29039aea753f5678ef8801cf26f75288',
)
const extraction = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Expand-Archive -LiteralPath $env:L0_ARCHIVE -DestinationPath $env:L0_DESTINATION',
  ],
  {
    env: { ...process.env, L0_ARCHIVE: bunZip, L0_DESTINATION: bunExtract },
    timeout: 60000,
    windowsHide: true,
    encoding: 'utf8',
  },
)
assert.equal(extraction.status, 0, String(extraction.error ?? extraction.stderr))
await cp(resolve(bunExtract, 'bun-windows-x64-baseline/bun.exe'), resolve(output, 'bin/bun.exe'))
for (const [name, url] of [
  ['node.txt', 'https://raw.githubusercontent.com/nodejs/node/v24.15.0/LICENSE'],
  ['bun.txt', 'https://raw.githubusercontent.com/oven-sh/bun/bun-v1.3.11/LICENSE.md'],
  ['python.txt', 'https://raw.githubusercontent.com/python/cpython/v3.14.2/LICENSE'],
  ['pyodide.txt', 'https://raw.githubusercontent.com/pyodide/pyodide/314.0.7/LICENSE'],
])
  await download(url, resolve(output, 'licenses', name))
const clipping = dirname(
  await realpath(
    resolve(
      import.meta.dirname,
      '../../node_modules/.bun/polygon-clipping@0.15.7/node_modules/polygon-clipping/package.json',
    ),
  ),
)
await cp(resolve(clipping, 'LICENSE.md'), resolve(output, 'licenses/polygon-clipping.txt'))
const files: { path: string; bytes: number; sha256: string }[] = []
async function inventory(directory: string, prefix = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    assert.ok(!entry.isSymbolicLink(), `Unpackaged link: ${path}`)
    if (entry.isDirectory()) await inventory(resolve(directory, entry.name), path)
    else if (entry.isFile()) {
      const bytes = await readFile(resolve(directory, entry.name))
      files.push({
        path,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      })
    }
  }
}
await inventory(output)
await writeFile(
  resolve(output, 'manifest.json'),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      platform: 'windows-x64',
      node: '24.15.0',
      bun: '1.3.11-baseline',
      playwright: '1.60.0',
      upstream,
      files,
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    output,
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  }),
)
