/**
 * Packs the Pygame-ce gallery games (src/examples/python/pygame/<game>/) into lazy modules.
 *
 * Per game, one chunk with every text file of the folder (the Python modules, data/, README.md,
 * NOTICE.md) and the media in assets/ (PNG drawn in Pinta by packages/pinta/scripts/pygame-gallery,
 * sounds rendered here); and another with desenhos.pinta.json (the editable Pinta sources of the
 * drawings), downloaded only when a drawing is opened in Pinta.
 *
 * bun --no-env-file scripts/generate-pygame-games.ts [--check]
 * `.ogg` sounds need ffmpeg with libvorbis (FFMPEG env var or PATH); --check compares the digest
 * of the WAV they are encoded from, so it does not depend on the encoder build.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { formatGeneratedSource } from '../../../scripts/format-generated-source'
import { PYGAME_GAMES } from '../src/examples/python/pygameGames.manifest'
import { encodeOgg, songWav } from './python/pygame-audio'
import { loadGalleryAudio } from './python/pygame-gallery-audio'

const studio = join(import.meta.dirname, '..')
const root = join(studio, 'src/examples/python/pygame')
const output = join(studio, 'src/examples/python/pygameGames')
const digests = join(import.meta.dirname, 'python/pygame-audio-digests.json')
const check = process.argv.includes('--check')
const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const problems: string[] = []
const MIME: Record<string, string> = { png: 'image/png', wav: 'audio/wav', ogg: 'audio/ogg' }
const TEXT = /\.(py|md|txt|json|csv)$/

/** Chunk files written (or checked) in this run: anything else in the output folder is stale. */
const written = new Set<string>()
async function put(path: string, bytes: Uint8Array | string) {
  if (path.startsWith(output)) written.add(relative(output, path))
  if (path.endsWith('.ts') && typeof bytes === 'string')
    bytes = await formatGeneratedSource(bytes, path, studio)
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  if (check) {
    const current = await readFile(path).catch(() => null)
    if (!current || sha256(current) !== sha256(data)) problems.push(path)
    return
  }
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, data)
}

async function walk(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name.startsWith('.')) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files.sort()
}

const camel = (key: string) => key.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
const recorded: Record<string, string> = JSON.parse(
  await readFile(digests, 'utf8').catch(() => '{}'),
)
const nextDigests: Record<string, string> = {}
const loaders: string[] = []
const drawingLoaders: string[] = []
const PYGAME_GALLERY_AUDIO = await loadGalleryAudio()

for (const game of PYGAME_GAMES) {
  const folder = join(root, game.key)
  for (const [name, sound] of Object.entries(PYGAME_GALLERY_AUDIO[game.key] ?? {})) {
    const path = join(folder, 'assets', name)
    const wav = 'wav' in sound ? sound.wav() : songWav(sound.song)
    // The file name decides the format: a `.ogg` effect is ~6x smaller than the same `.wav`.
    if (!name.endsWith('.ogg')) await put(path, wav)
    else {
      const key = `${game.key}/${name}`
      nextDigests[key] = sha256(wav)
      if (check) {
        if (recorded[key] !== nextDigests[key]) problems.push(`${path} (som mudou)`)
      } else await put(path, await encodeOgg(wav))
    }
  }
  const sources: Record<string, string> = {}
  const media: Record<string, string> = {}
  let drawings = ''
  for (const file of await walk(folder)) {
    const path = relative(folder, file).replaceAll('\\', '/')
    if (path === 'desenhos.pinta.json') drawings = await readFile(file, 'utf8')
    else if (path.startsWith('assets/')) {
      const type = MIME[path.split('.').at(-1)!]
      if (!type) throw new Error(`Material sem tipo conhecido: ${game.key}/${path}`)
      media[path] = `data:${type};base64,${(await readFile(file)).toString('base64')}`
    } else if (TEXT.test(path))
      sources[path] = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')
    else throw new Error(`Arquivo inesperado no jogo: ${game.key}/${path}`)
  }
  if (!sources['main.py'] || !sources['README.md'] || !sources['NOTICE.md'])
    throw new Error(`O jogo ${game.key} precisa de main.py, README.md e NOTICE.md.`)
  const stem = camel(game.key)
  const header = (content: unknown) =>
    `// Gerado por scripts/generate-pygame-games.ts. Não edite este arquivo.\n// ${sha256(JSON.stringify(content))}\n`
  await put(
    join(output, `${stem}.generated.ts`),
    `${header([sources, media])}export const files: Readonly<Record<string, string>> = ${JSON.stringify(sources, null, 2)}\n\n` +
      `export const media: Readonly<Record<string, string>> = ${JSON.stringify(media, null, 2)}\n`,
  )
  loaders.push(`  '${game.key}': () => import('./pygameGames/${stem}.generated'),`)
  if (!drawings) continue
  await put(
    join(output, `${stem}.drawings.generated.ts`),
    `${header(drawings)}/** The Pinta documents of the drawings (pinta-gallery JSON), for editing them in Pinta. */\n` +
      `export const drawings = ${JSON.stringify(drawings)}\n`,
  )
  drawingLoaders.push(
    `  '${game.key}': () => import('./pygameGames/${stem}.drawings.generated').then((chunk) => chunk.drawings),`,
  )
}

await put(
  join(studio, 'src/examples/python/pygameGames.loaders.generated.ts'),
  `// Gerado por scripts/generate-pygame-games.ts. Não edite este arquivo.\n` +
    `/** What every game chunk exports (the files, and the media as data URLs). */\n` +
    `export interface PygameGameChunk {\n  files: Readonly<Record<string, string>>\n  media: Readonly<Record<string, string>>\n}\n\n` +
    `/** One chunk per game: opening a game never downloads the others. */\n` +
    `export const PYGAME_GAME_LOADERS: Readonly<Record<string, () => Promise<PygameGameChunk>>> = {\n${loaders.join('\n')}\n}\n\n` +
    `/** The Pinta documents of each game's drawings, in their own chunk: only "Editar no Pinta" needs them. */\n` +
    `export const PYGAME_GAME_DRAWINGS: Readonly<Record<string, () => Promise<string>>> = {\n${drawingLoaders.join('\n')}\n}\n`,
)
if (!check) await writeFile(digests, `${JSON.stringify(nextDigests, null, 2)}\n`)
for (const file of await readdir(output).catch(() => [] as string[]))
  if (!written.has(file)) {
    if (check) problems.push(join(output, file))
    else await rm(join(output, file))
  }
if (problems.length) {
  console.error(`Galeria Pygame-ce desatualizada:\n${problems.join('\n')}`)
  process.exit(1)
}
console.log(`${PYGAME_GAMES.length} jogos Pygame-ce empacotados.`)
