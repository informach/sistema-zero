import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const studio = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')
const bundles = [
  {
    directory: 'src/examples/python/turtle-race',
    paths: ['main.py', 'model.py', 'timer_loop.py', 'view.py'],
    output: 'src/examples/python/turtleRace.sources.generated.ts',
    exportName: 'TURTLE_RACE_SOURCES',
  },
  {
    directory: 'src/runtime/python/audio/sz_audio',
    paths: ['__init__.py', '_desktop.py', '_mixer.py', '_wav.py'],
    output: 'src/runtime/python/audio/nativeSources.generated.ts',
    exportName: 'PYTHON_AUDIO_NATIVE_SOURCES',
  },
  {
    directory: 'src/examples/python/maze-lights',
    paths: [
      'main.py',
      'actors.py',
      'renderer.py',
      'mazes.py',
      'constants.py',
      'README.md',
      'NOTICE.md',
      'LICENSE',
      'requirements.txt',
    ],
    output: 'src/examples/python/mazeLights.sources.generated.ts',
    exportName: 'MAZE_LIGHTS_SOURCES',
  },
  {
    directory: 'src/examples/python/maze-lights',
    paths: ['opening.wav', 'collect.wav', 'collision.wav'],
    output: 'src/examples/python/mazeLights.audio.generated.ts',
    exportName: 'MAZE_LIGHTS_AUDIO',
    mime: 'audio/wav',
  },
  {
    directory: 'src/examples/python/pacman-visual',
    paths: ['main.py', 'README.md', 'NOTICE.md', 'LICENSE', 'requirements.txt'],
    output: 'src/examples/python/pacmanVisual.sources.generated.ts',
    exportName: 'PACMAN_VISUAL_SOURCES',
  },
  {
    directory: 'src/examples/python/pacman-visual',
    paths: ['opening.wav', 'collect.wav', 'power.wav', 'collision.wav'],
    output: 'src/examples/python/pacmanVisual.audio.generated.ts',
    exportName: 'PACMAN_VISUAL_AUDIO',
    mime: 'audio/wav',
  },
  {
    directory: 'src/examples/python/space-arena-visual',
    paths: ['main.py', 'README.md', 'NOTICE.md', 'LICENSE', 'requirements.txt'],
    output: 'src/examples/python/spaceArenaVisual.sources.generated.ts',
    exportName: 'SPACE_ARENA_VISUAL_SOURCES',
  },
  {
    directory: 'src/examples/python/space-arena-visual',
    paths: ['bgm.wav', 'explosion.wav', 'missile_fire.wav', 'powerup.wav', 'thruster.wav'],
    output: 'src/examples/python/spaceArenaVisual.audio.generated.ts',
    exportName: 'SPACE_ARENA_VISUAL_AUDIO',
    mime: 'audio/wav',
  },
] as const

// Studio is consumed as TypeScript source by Next, Vite and Bun. Serialize the
// authored Python once, without imposing a bundler-specific raw loader on hosts.
for (const bundle of bundles) {
  const sources: Record<string, string> = {}
  const revisions: string[] = []
  for (const path of bundle.paths) {
    const bytes = await readFile(join(studio, bundle.directory, path))
    if ('mime' in bundle) {
      sources[path] = `data:${bundle.mime};base64,${bytes.toString('base64')}`
      revisions.push(`${path}: ${createHash('sha256').update(bytes).digest('hex')}`)
    } else {
      const source = new TextDecoder('utf-8', { fatal: true })
        .decode(bytes)
        .replaceAll('\r\n', '\n')
      sources[path] = source
      revisions.push(`${path}: ${createHash('sha256').update(source).digest('hex')}`)
    }
  }
  const raw =
    '// Gerado por scripts/gen-python-text-sources.ts. Não edite este arquivo.\n' +
    `// Fontes: ${bundle.directory}\n` +
    revisions.map((revision) => `// ${revision}\n`).join('') +
    `export const ${bundle.exportName} = ${JSON.stringify(sources, null, 2)} as const\n`
  const formatter = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--stdin-file-path=${bundle.output}`,
    ],
    { cwd: studio, stdin: new Blob([raw]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, generated, errors] = await Promise.all([
    formatter.exited,
    new Response(formatter.stdout).text(),
    new Response(formatter.stderr).text(),
  ])
  if (code !== 0) throw new Error(`Falha ao formatar ${bundle.output}: ${errors}`)
  const output = join(studio, bundle.output)
  if (check) {
    const actual = await readFile(output, 'utf8')
    if (actual.replaceAll('\r\n', '\n') !== generated)
      throw new Error(
        `Fontes Python divergentes: ${bundle.output}. Execute bun run gen:python-text-sources.`,
      )
    console.log(`Conferido ${bundle.output} (${bundle.paths.length} arquivos).`)
  } else {
    await writeFile(output, generated, 'utf8')
    console.log(`Gerado ${bundle.output} (${bundle.paths.length} arquivos).`)
  }
}
