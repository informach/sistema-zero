import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  VISUAL_REFERENCE_GAME_FILES,
  VISUAL_REFERENCE_GAMES,
  visualReferenceGameConstant,
} from '../src/examples/python/visualReferenceGames.manifest'

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
    directory: 'src/runtime/python/turtle',
    paths: ['formas_do_pinta.py'],
    output: 'src/runtime/python/turtle/formasDoPinta.generated.ts',
    exportName: 'TURTLE_PINTA_SHAPES_SOURCES',
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
  ...VISUAL_REFERENCE_GAMES.flatMap((game) => [
    {
      directory: `src/examples/python/${game.key}`,
      paths: VISUAL_REFERENCE_GAME_FILES,
      output: `src/examples/python/${game.stem}.sources.generated.ts`,
      exportName: `${visualReferenceGameConstant(game)}_SOURCES`,
    },
    {
      directory: `src/examples/python/${game.key}`,
      paths: game.sounds.map(({ path }) => path),
      output: `src/examples/python/${game.stem}.audio.generated.ts`,
      exportName: `${visualReferenceGameConstant(game)}_AUDIO`,
      mime: 'audio/wav',
    },
  ]),
]

/** Literal import() per game, so every bundler keeps one lazy chunk per payload. */
function visualReferenceGameLoaders() {
  const loaders = VISUAL_REFERENCE_GAMES.map((game) => {
    const constant = visualReferenceGameConstant(game)
    return `  '${game.key}': async () => {
    const [{ ${constant}_SOURCES }, { ${constant}_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./${game.stem}.sources.generated'),
        import('./${game.stem}.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: ${constant}_SOURCES,
      assets: referenceGameAssets('${game.key}', ${constant}_AUDIO),
    }
  },
`
  })
  return (
    '// Gerado por scripts/gen-python-text-sources.ts. Não edite este arquivo.\n' +
    '// Fonte: src/examples/python/visualReferenceGames.manifest.ts\n' +
    "import type { VisualReferenceGameKey } from './visualReferenceGames.manifest'\n\n" +
    'export const VISUAL_REFERENCE_GAME_LOADERS = {\n' +
    loaders.join('') +
    '} satisfies Record<VisualReferenceGameKey, () => Promise<unknown>>\n'
  )
}

// Studio is consumed as TypeScript source by Next, Vite and Bun. Serialize the
// authored Python once, without imposing a bundler-specific raw loader on hosts.
type Bundle = {
  directory: string
  paths: readonly string[]
  output: string
  exportName: string
  mime?: string
}
const outputs: { output: string; raw: string; count: number }[] = []
for (const bundle of bundles as readonly Bundle[]) {
  const sources: Record<string, string> = {}
  const revisions: string[] = []
  for (const path of bundle.paths) {
    const bytes = await readFile(join(studio, bundle.directory, path))
    if (bundle.mime) {
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
  outputs.push({ output: bundle.output, raw, count: bundle.paths.length })
}
outputs.push({
  output: 'src/examples/python/visualReferenceGames.loaders.generated.ts',
  raw: visualReferenceGameLoaders(),
  count: VISUAL_REFERENCE_GAMES.length,
})
for (const { output: outputName, raw, count } of outputs) {
  const formatter = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--stdin-file-path=${outputName}`,
    ],
    { cwd: studio, stdin: new Blob([raw]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, generated, errors] = await Promise.all([
    formatter.exited,
    new Response(formatter.stdout).text(),
    new Response(formatter.stderr).text(),
  ])
  if (code !== 0) throw new Error(`Falha ao formatar ${outputName}: ${errors}`)
  const output = join(studio, outputName)
  if (check) {
    const actual = await readFile(output, 'utf8')
    if (actual.replaceAll('\r\n', '\n') !== generated)
      throw new Error(
        `Fontes Python divergentes: ${outputName}. Execute bun run gen:python-text-sources.`,
      )
    console.log(`Conferido ${outputName} (${count} arquivos).`)
  } else {
    await writeFile(output, generated, 'utf8')
    console.log(`Gerado ${outputName} (${count} arquivos).`)
  }
}
