import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { parseBuildRequest } from '../../studio-runtime/src/contracts'
import { createProProject } from '../src/components/code/pro-templates'
import { buildProAssetBundle } from '../src/core/proAssets'
import { exportProjectSource } from '../src/export/sourceExport'

const repository = fileURLToPath(new URL('../../../', import.meta.url))
const cache = join(repository, '.cache')
await mkdir(cache, { recursive: true })
const destination = await mkdtemp(join(tmpdir(), 'studio-canvas-export-'))
const project = await createProProject(
  '01CANVAS000000000000000005',
  'Guardiões da arena',
  'canvas-survival',
)
const exported = await exportProjectSource(project)
if (exported.warnings.length) throw new Error(exported.warnings.join('\n'))
const zip = new Uint8Array(await exported.blob.arrayBuffer())
const files = unzipSync(zip)
for (const [path, bytes] of Object.entries(files)) {
  if (path.split('/').some((part) => part === '..') || path.startsWith('/'))
    throw new Error('Caminho inválido no ZIP.')
  await mkdir(dirname(join(destination, path)), { recursive: true })
  await writeFile(join(destination, path), bytes)
}
const sourceFiles = Object.fromEntries(
  Object.entries(project.tree!).flatMap(([path, node]) =>
    node.kind === 'file' ? [[path, node.content]] : [],
  ),
)
const bundle = await buildProAssetBundle(project.assets, project.tree)
const binaries = Object.fromEntries(
  [...bundle.files].map(([path, bytes]) => [
    path,
    {
      base64: Buffer.from(bytes).toString('base64'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  ]),
)
const request = {
  executionId: 'canvas-proof-1234567890abcdef',
  templateId: 'canvas-survival',
  parentOrigin: 'https://kids.test',
  files: sourceFiles,
  binaries,
  validate: true,
}
const parsed = parseBuildRequest(request)
const envelopeBytes = Buffer.byteLength(JSON.stringify(request))
if (
  envelopeBytes > 1_500_000 ||
  Object.keys(sourceFiles).length + Object.keys(binaries).length > 80
)
  throw new Error('Kit ultrapassou o orçamento aprovado.')
console.log(
  JSON.stringify({
    destination,
    envelopeBytes,
    sourceFiles: Object.keys(sourceFiles).length,
    assetFiles: bundle.files.size,
    zipBytes: zip.length,
  }),
)
// npm resolves its platform launcher itself; no monorepo node_modules junction is used.
async function run(command: string[]) {
  const child = Bun.spawn(command, { cwd: destination, stdout: 'pipe', stderr: 'pipe' })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0) throw new Error(`${command.join(' ')}\n${stdout}\n${stderr}`)
  if (command[1] !== 'ls') console.log(stdout.trim())
  return stdout
}
const lockBefore = await readFile(join(destination, 'package-lock.json'), 'utf8')
await run(['npm', 'ci', '--no-audit', '--no-fund'])
await run(['npm', 'ls', '--all'])
await run(['npm', 'run', 'typecheck'])
await run(['npm', 'run', 'build'])
if ((await readFile(join(destination, 'package-lock.json'), 'utf8')) !== lockBefore)
  throw new Error('A instalação modificou o lock.')
let artifactBytes = 0
const artifactFiles: Record<string, number> = {}
async function measure(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await measure(path)
    else {
      const bytes = (await readFile(path)).byteLength
      artifactFiles[relative(join(destination, 'dist'), path).replaceAll('\\', '/')] = bytes
      artifactBytes += bytes
    }
  }
}
await measure(join(destination, 'dist'))
const browserEvidence = JSON.parse(
  await run([
    'node',
    '--experimental-strip-types',
    fileURLToPath(new URL('./verify-canvas-dist.ts', import.meta.url)),
    destination,
  ]),
) as { captureBytes: number; tick: number; health: number; nestedPath: boolean; errors: string[] }
if (artifactBytes + browserEvidence.captureBytes > 1_500_000)
  throw new Error('Artefato com captura ultrapassou orçamento do kit.')
const evidence = {
  measuredAt: new Date().toISOString(),
  destination,
  commands: [
    'npm ci --no-audit --no-fund',
    'npm ls --all',
    'npm run typecheck',
    'npm run build',
    'Chromium: dist em caminho aninhado',
  ],
  sourceFiles: Object.keys(sourceFiles).length,
  assetFiles: bundle.files.size,
  envelopeBytes,
  zipBytes: zip.length,
  artifactBytes,
  artifactFiles,
  browserEvidence,
  artifactWithCaptureBytes: artifactBytes + browserEvidence.captureBytes,
  parsedDependencies: parsed.dependencies,
  lockUnchanged: true,
}
await writeFile(
  join(cache, 'studio-canvas-export-evidence.json'),
  JSON.stringify(evidence, null, 2),
)
console.log(JSON.stringify(evidence, null, 2))
