import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RAYLIB_GAME_FILES,
  RAYLIB_GAMES,
  type RaylibGame,
} from '../src/examples/python/raylibGames.manifest'
import { RAYLIB_UPSTREAM } from '../src/runtime/python/raylib/contract'
import { readVisualExampleBlockMetadata } from './python/generate-visual-example-block-metadata'
import { PRESS_START_2P_OFL, RAYLIB_GAME_ART } from './python/raylib-art'
import { renderReferenceSound } from './python/reference-game-audio'

/**
 * Writes every Raylib example from its manifest entry: texts, images and fonts
 * (raylib-art), sounds and music, then the lazy TypeScript payloads the gallery loads.
 * `--check` writes nothing. `--media-only` writes only the example folder (while a game is
 * being made, before its block receipt exists). Music is encoded once to OGG with ffmpeg (an
 * encoder is not reproducible byte for byte); the check proves the committed OGG still comes
 * from the current score through its WAV digest.
 */
const studio = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')
const mediaOnly = process.argv.includes('--media-only')
const root = join(studio, 'src/examples/python/raylib')
const scores = join(studio, 'scripts/python/fixtures/raylib-music')
const encoder = new TextEncoder()
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const constant = (game: Pick<RaylibGame, 'stem'>) =>
  game.stem.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()
const MEDIA_FOLDERS = ['images', 'sounds', 'music', 'fonts', 'models']

const LICENSE = `MIT License

Copyright (c) 2026 Sistema Zero

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`

function readme(game: RaylibGame, media: readonly string[]) {
  return `# ${game.name}

${game.description}

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
\`raylib\`, com os módulos \`pyray\` e \`raylib\`): o programa inteiro está em \`main.py\` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

${game.howToPlay}

## Ideias para mudar

${game.ideas.map((idea) => `- ${idea}`).join('\n')}
${
  media.length
    ? `
## Imagens, sons e fontes

O raylib abre cada arquivo pelo caminho, com a extensão: \`load_texture('images/nave.png')\`
abre \`images/nave.png\` (a barra \`/\` funciona também no Windows). As imagens ficam em \`images/\`, os sons em
\`sounds/\`, as músicas em \`music/\` e as fontes em \`fonts/\`. Para trocar um desenho,
faça o seu no Pinta e traga para o jogo pelo menu ⋯ → Imagens → "Trazer do Pinta"; depois
use no código o caminho que o painel mostra em "nome no código". Um desenho animado é uma
folha de quadros, igual à que o Pinta exporta: uma linha por animação, com os quadros lado a
lado, e o jogo recorta um quadro de cada vez. Cada desenho fica com o tamanho que tem no Pinta,
e \`ESCALA\`, no começo do \`main.py\`, diz quantas vezes ele aparece maior na tela.
`
    : ''
}
## Jogar no computador

\`\`\`
python -m pip install ${RAYLIB_UPSTREAM.package}==${RAYLIB_UPSTREAM.version}
python main.py
\`\`\`
`
}

function notice(game: RaylibGame, hasFont: boolean) {
  return `# Autoria e recursos

Copyright (c) 2026 Sistema Zero. O código, os desenhos, os sons e a música deste exemplo
são originais, distribuídos sob a licença MIT em \`LICENSE\`. Os desenhos foram escritos
como código (\`scripts/python/raylib-art.ts\` no repositório do Sistema Zero), e os sons
foram sintetizados a partir de partituras.
${
  hasFont
    ? `
A fonte \`fonts/pressstart2p.ttf\` é a Press Start 2P, de CodeMan38, distribuída sob a SIL
Open Font License 1.1 em \`LICENSE-fonte.txt\`.
`
    : ''
}
A mecânica do jogo se inspira em "${game.inspiration}" do curso de raylib em Python do canal
Clear Code. Nenhum código, texto, imagem ou som do curso foi incorporado. Este é um projeto
educacional independente, sem afiliação ao Clear Code nem aos autores do raylib.

O programa usa a API do raylib-python-cffi ${RAYLIB_UPSTREAM.version} (EPL-2.0) e do raylib
(zlib), e roda no computador com \`pip install ${RAYLIB_UPSTREAM.package}==${RAYLIB_UPSTREAM.version}\`.
`
}

async function encodeOgg(wav: Uint8Array) {
  const folder = await mkdtemp(join(tmpdir(), 'sz-raylib-music-'))
  try {
    await writeFile(join(folder, 'in.wav'), wav)
    const result = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        join(folder, 'in.wav'),
        '-map_metadata',
        '-1',
        '-fflags',
        '+bitexact',
        '-c:a',
        'libvorbis',
        '-q:a',
        '4',
        join(folder, 'out.ogg'),
      ],
      { encoding: 'utf8' },
    )
    if (result.status !== 0) throw new Error(`ffmpeg falhou: ${result.stderr || result.error}`)
    return new Uint8Array(await readFile(join(folder, 'out.ogg')))
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

const problems: string[] = []
async function put(path: string, bytes: Uint8Array) {
  if (check) {
    let actual: Uint8Array | undefined
    try {
      actual = new Uint8Array(await readFile(path))
    } catch {}
    const normalized =
      actual && /\.(md|py|txt)$|LICENSE$/.test(path)
        ? encoder.encode(new TextDecoder().decode(actual).replaceAll('\r\n', '\n'))
        : actual
    if (!normalized || sha256(normalized) !== sha256(bytes)) problems.push(path)
    return
  }
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, bytes)
}

const MIME: Record<string, string> = {
  png: 'image/png',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  ttf: 'font/ttf',
  otf: 'font/otf',
  glb: 'model/gltf-binary',
}

const generated: { output: string; raw: string }[] = []
for (const game of RAYLIB_GAMES as readonly RaylibGame[]) {
  const folder = join(root, game.key)
  const art = RAYLIB_GAME_ART[game.key]
  if (!art) throw new Error(`Falta a arte de ${game.key} em scripts/python/raylib-art.ts.`)
  const media: Record<string, Uint8Array> = { ...art() }
  for (const sound of game.sounds)
    media[`sounds/${sound.path}`] = renderReferenceSound({ ...sound, game: 'pong-visual' })
  for (const track of game.music) {
    const wav = renderReferenceSound({ ...track, game: 'pong-visual' })
    const digest = join(scores, `${game.key}-${track.path}.sha256`)
    const oggPath = join(folder, 'music', track.path)
    if (check) {
      const recorded = (await readFile(digest, 'utf8').catch(() => '')).trim()
      if (recorded !== sha256(wav)) problems.push(digest)
      media[`music/${track.path}`] = new Uint8Array(await readFile(oggPath))
    } else {
      const ogg = await encodeOgg(wav)
      await mkdir(scores, { recursive: true })
      await writeFile(digest, `${sha256(wav)}\n`)
      media[`music/${track.path}`] = ogg
    }
  }
  const hasFont = Object.keys(media).some((path) => path.startsWith('fonts/'))
  const texts: Record<string, string> = {
    'README.md': readme(game, Object.keys(media)),
    'NOTICE.md': notice(game, hasFont),
    LICENSE,
    ...(hasFont ? { 'LICENSE-fonte.txt': PRESS_START_2P_OFL } : {}),
  }
  for (const [name, text] of Object.entries(texts))
    await put(join(folder, name), encoder.encode(text))
  for (const [path, bytes] of Object.entries(media)) await put(join(folder, path), bytes)
  // A media file the example no longer makes would still show up in the materials panel
  // (and editing it would change nothing in the game): it goes away, and --check reports it.
  for (const kind of MEDIA_FOLDERS) {
    const files = await readdir(join(folder, kind)).catch(() => [] as string[])
    for (const file of files) {
      const path = `${kind}/${file}`
      if (path in media || path in texts) continue
      if (check) problems.push(join(folder, kind, file))
      else await rm(join(folder, kind, file))
    }
  }
  if (mediaOnly) continue

  const sources: Record<string, string> = {}
  for (const name of [...RAYLIB_GAME_FILES, ...(hasFont ? ['LICENSE-fonte.txt'] : [])])
    sources[name] =
      name in texts
        ? texts[name]!
        : (await readFile(join(folder, name), 'utf8')).replaceAll('\r\n', '\n')
  const dataUrls = Object.fromEntries(
    Object.entries(media).map(([path, bytes]) => {
      const mime = MIME[path.slice(path.lastIndexOf('.') + 1)]
      if (!mime) throw new Error(`Formato sem MIME no exemplo ${game.key}: ${path}`)
      return [path, `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`]
    }),
  )
  const name = constant(game)
  const header = (kind: string, revisions: string[]) =>
    `// Gerado por scripts/generate-raylib-games.ts. Não edite este arquivo.\n// ${kind}: src/examples/python/raylib/${game.key}\n${revisions.map((revision) => `// ${revision}\n`).join('')}`
  generated.push({
    output: `src/examples/python/${game.stem}.sources.generated.ts`,
    raw: `${header(
      'Fontes',
      Object.entries(sources).map(([path, text]) => `${path}: ${sha256(encoder.encode(text))}`),
    )}export const ${name}_SOURCES = ${JSON.stringify(sources, null, 2)} as const\n`,
  })
  generated.push({
    output: `src/examples/python/${game.stem}.media.generated.ts`,
    raw: `${header(
      'Materiais',
      Object.entries(media).map(([path, bytes]) => `${path}: ${sha256(bytes)}`),
    )}export const ${name}_MEDIA: Readonly<Record<string, string>> = ${JSON.stringify(dataUrls, null, 2)}\n`,
  })
}

if (!mediaOnly) {
  // Block evidence: the receipt must qualify the current main.py exactly.
  const evidence = join(studio, '../../docs/continuity/2026-10-24-python-raylib-games-evidence')
  const blocks: Record<string, ReturnType<typeof readVisualExampleBlockMetadata>> = {}
  for (const game of RAYLIB_GAMES as readonly RaylibGame[]) {
    const receipt: unknown = JSON.parse(await readFile(join(evidence, game.receipt), 'utf8'))
    const source = (await readFile(join(root, game.key, 'main.py'), 'utf8')).replaceAll(
      '\r\n',
      '\n',
    )
    blocks[game.key] = readVisualExampleBlockMetadata(receipt, source)
  }
  generated.push({
    output: 'src/examples/python/raylibGames.blocks.generated.ts',
    raw: `// Gerado por scripts/generate-raylib-games.ts. Não edite este arquivo.
// Evidência de autoria visual; disponibilidade e autorização continuam pertencendo ao host.
import type { RaylibGameKey } from './raylibGames.manifest'

export const RAYLIB_GAME_BLOCKS = ${JSON.stringify(blocks, null, 2)} as const satisfies Record<
  RaylibGameKey,
  { sourceSha256: string; blockIds: readonly string[] }
>
`,
  })
  generated.push({
    output: 'src/examples/python/raylibGames.loaders.generated.ts',
    raw: `// Gerado por scripts/generate-raylib-games.ts. Não edite este arquivo.
// Fonte: src/examples/python/raylibGames.manifest.ts
import type { RaylibGameKey } from './raylibGames.manifest'

/** Literal import() per game, so every bundler keeps one lazy chunk per payload. */
export const RAYLIB_GAME_LOADERS = {
${(RAYLIB_GAMES as readonly RaylibGame[])
  .map((game) => {
    const name = constant(game)
    return `  '${game.key}': async () => {
    const [{ ${name}_SOURCES }, { ${name}_MEDIA }, { raylibGameAssets }] = await Promise.all([
      import('./${game.stem}.sources.generated'),
      import('./${game.stem}.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ${name}_SOURCES,
      assets: raylibGameAssets('${game.key}', ${name}_MEDIA),
    }
  },
`
  })
  .join('')}} satisfies Record<RaylibGameKey, () => Promise<unknown>>
`,
  })
}

for (const { output, raw } of generated) {
  const formatter = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--stdin-file-path=${output}`,
    ],
    { cwd: studio, stdin: new Blob([raw]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, formatted, errors] = await Promise.all([
    formatter.exited,
    new Response(formatter.stdout).text(),
    new Response(formatter.stderr).text(),
  ])
  if (code !== 0) throw new Error(`Falha ao formatar ${output}: ${errors}`)
  await put(join(studio, output), encoder.encode(formatted))
}
if (problems.length)
  throw new Error(
    `Exemplos Raylib desatualizados:\n${problems.join('\n')}\nExecute bun run gen:raylib-games.`,
  )
console.log(
  `${check ? 'Conferidos' : 'Gerados'} ${RAYLIB_GAMES.length} exemplos Raylib${mediaOnly ? ' (só as pastas)' : ''}.`,
)
