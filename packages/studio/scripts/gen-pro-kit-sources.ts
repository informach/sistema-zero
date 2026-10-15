import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProjectAsset } from '../src/core/project'

const studio = fileURLToPath(new URL('../', import.meta.url))
const root = join(studio, 'pro-kits/canvas-survival')
const output = join(
  studio,
  'src/components/code/pro-templates/games/canvas-survival.sources.generated.ts',
)
const check = process.argv.includes('--check')
const sources: Record<string, string> = {}
const seen = new Set<string>()

async function add(path: string) {
  const normalized = path.replaceAll('\\', '/')
  if (seen.has(normalized.toLowerCase())) throw new Error(`Caminho repetido: ${normalized}`)
  seen.add(normalized.toLowerCase())
  sources[normalized] = (await readFile(join(root, path), 'utf8')).replaceAll('\r\n', '\n')
}
async function visit(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await visit(path)
    else if (/\.(ts|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts'))
      await add(relative(root, path))
  }
}

await visit(join(root, 'src'))
for (const path of [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  'studio-kit.json',
  'README.md',
  'CREDITS.md',
])
  await add(path)
interface PackEntry {
  id: string
  role: string
  file: string
  width: number
  height: number
  bytes: number
  sha256: string
  sprite: ProjectAsset['sprite']
  license: NonNullable<ProjectAsset['license']>
}
const pack = JSON.parse(await readFile(join(root, 'assets/manifest.json'), 'utf8')) as {
  version: number
  assets: PackEntry[]
}
if (pack.version !== 1 || !Array.isArray(pack.assets) || pack.assets.length !== 3)
  throw new Error('Pack da arena inválido.')
const assets: ProjectAsset[] = []
for (const entry of [...pack.assets].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
  if (!/^[a-z-]+\.png$/.test(entry.file)) throw new Error('Nome de arquivo do pack inválido.')
  if (assets.some((asset) => asset.id === entry.id)) throw new Error('ID repetido no pack.')
  const bytes = await readFile(join(root, 'assets', entry.file))
  if (
    bytes.length !== entry.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== entry.sha256
  )
    throw new Error(`Pack desatualizado: ${entry.file}`)
  assets.push({
    id: entry.id,
    name: `arena-${entry.role}`,
    kind: 'image',
    source: 'library',
    libId: entry.id,
    dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
    width: entry.width,
    height: entry.height,
    sprite: entry.sprite,
    license: entry.license,
  })
}
const sortedSources = Object.fromEntries(
  Object.entries(sources).sort(([a], [b]) => a.localeCompare(b, 'en')),
)
const sharedRevision = createHash('sha256')
  .update(
    (
      await readFile(join(studio, 'src/components/code/pro-templates/games/shared.ts'), 'utf8')
    ).replaceAll('\r\n', '\n'),
  )
  .digest('hex')
const raw =
  '// Gerado por scripts/gen-pro-kit-sources.ts. Edite pro-kits/canvas-survival.\n' +
  `// Revisão dos helpers compartilhados: ${sharedRevision}\n` +
  '// biome-ignore-all lint/suspicious/noTemplateCurlyInString: Fontes TypeScript serializadas, sem interpolação neste módulo.\n' +
  "import type { ProjectAsset } from '../../../../core/project'\n\n" +
  `export const CANVAS_SURVIVAL_SOURCES: Record<string, string> = ${JSON.stringify(sortedSources, null, 2)}\n\n` +
  `export const CANVAS_SURVIVAL_ASSETS: readonly ProjectAsset[] = ${JSON.stringify(assets, null, 2)}\n`
const formatter = Bun.spawn(
  [
    'bunx',
    '--no-install',
    'biome',
    'format',
    '--stdin-file-path=canvas-survival.sources.generated.ts',
  ],
  {
    cwd: studio,
    stdin: new Blob([raw]),
    stdout: 'pipe',
    stderr: 'pipe',
  },
)
const [code, generated, errors] = await Promise.all([
  formatter.exited,
  new Response(formatter.stdout).text(),
  new Response(formatter.stderr).text(),
])
if (code !== 0) throw new Error(`Falha ao formatar fontes geradas: ${errors}`)
if (check) {
  const actual = await readFile(output, 'utf8').catch(() => '')
  if (actual.replaceAll('\r\n', '\n') !== generated)
    throw new Error('Fontes Canvas divergentes. Execute bun run gen:pro-kits e revise o resultado.')
  console.log('Fontes e pack Canvas conferidos.')
} else {
  await writeFile(output, generated, 'utf8')
  console.log(
    `Gerado ${relative(studio, output)} (${Object.keys(sources).length} arquivos, ${assets.length} materiais).`,
  )
}
