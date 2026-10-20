import { readdir, readFile, writeFile } from 'node:fs/promises'
import { prepareRuntimeDependencyLock } from '../../studio-runtime/src/dependency-lock'

const root = new URL('../pro-kits/grid-games/src/', import.meta.url)
const sources: Record<string, string> = {}
for (const name of (await readdir(root)).sort()) {
  if (name.endsWith('.ts'))
    sources[`src/${name}`] = (await readFile(new URL(name, root), 'utf8')).replaceAll('\r\n', '\n')
}
const locks: Record<string, string> = {}
for (const [id, engine] of [
  ['canvas-grid-arena', 'canvas'],
  ['phaser-tactics', 'phaser'],
  ['three-tactics', 'three'],
]) {
  locks[id!] = prepareRuntimeDependencyLock(
    JSON.stringify({
      name: id,
      dependencies:
        engine === 'phaser' ? { phaser: '3.90.0' } : engine === 'three' ? { three: '0.180.0' } : {},
      devDependencies: {
        vite: '8.1.6',
        typescript: '5.9.3',
        ...(engine === 'three' ? { '@types/three': '0.180.0' } : {}),
      },
    }),
  )
}
const raw =
  '// Gerado por scripts/gen-pro-kit-grid.ts. Edite pro-kits/grid-games/src.\n' +
  '// biome-ignore-all lint/suspicious/noTemplateCurlyInString: Fontes TypeScript serializadas.\n' +
  `export const GRID_SOURCES: Record<string, string> = ${JSON.stringify(sources, null, 2)}\n` +
  `export const GRID_LOCKS: Record<string, string> = ${JSON.stringify(locks, null, 2)}\n`
const formatter = Bun.spawn(
  ['bunx', '--no-install', 'biome', 'format', '--stdin-file-path=grid.sources.generated.ts'],
  { stdin: new Blob([raw]), stdout: 'pipe', stderr: 'pipe' },
)
const [code, generated, errors] = await Promise.all([
  formatter.exited,
  new Response(formatter.stdout).text(),
  new Response(formatter.stderr).text(),
])
if (code !== 0) throw new Error(errors)
const output = new URL(
  '../src/components/code/pro-templates/games/grid.sources.generated.ts',
  import.meta.url,
)
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')).replaceAll('\r\n', '\n') !== generated)
    throw new Error('Fontes de grade divergentes. Execute gen:pro-kits.')
  console.log('Fontes de grade e locks conferidos.')
} else {
  await writeFile(output, generated, 'utf8')
  console.log('Fontes de grade e locks gerados.')
}
const sound = (
  await readFile(new URL('../pro-kits/shared/sound.ts', import.meta.url), 'utf8')
).replaceAll('\r\n', '\n')
const soundOutput = new URL(
  '../src/components/code/pro-templates/games/sound.source.generated.ts',
  import.meta.url,
)
const materials = (
  await readFile(new URL('../pro-kits/shared/MATERIALS.md', import.meta.url), 'utf8')
).replaceAll('\r\n', '\n')
const soundRaw =
  '// Gerado por scripts/gen-pro-kit-grid.ts. Edite pro-kits/shared.\n' +
  `export const SOUND_SOURCE = ${JSON.stringify(sound)}\nexport const MATERIALS_GUIDE = ${JSON.stringify(materials)}\n`
const soundFormatter = Bun.spawn(
  ['bunx', '--no-install', 'biome', 'format', '--stdin-file-path=sound.source.generated.ts'],
  { stdin: new Blob([soundRaw]), stdout: 'pipe', stderr: 'pipe' },
)
const [soundCode, soundGenerated, soundErrors] = await Promise.all([
  soundFormatter.exited,
  new Response(soundFormatter.stdout).text(),
  new Response(soundFormatter.stderr).text(),
])
if (soundCode !== 0) throw new Error(soundErrors)
if (process.argv.includes('--check')) {
  if ((await readFile(soundOutput, 'utf8')).replaceAll('\r\n', '\n') !== soundGenerated)
    throw new Error('Fonte de áudio divergente. Execute gen:pro-kits.')
} else await writeFile(soundOutput, soundGenerated, 'utf8')
