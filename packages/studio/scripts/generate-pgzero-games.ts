import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PGZERO_GAME_FILES,
  PGZERO_GAMES,
  type PgzeroGame,
} from '../src/examples/python/pgzeroGames.manifest'
import { PGZERO_UPSTREAM } from '../src/runtime/python/pgzero/contract'
import { readVisualExampleBlockMetadata } from './python/generate-visual-example-block-metadata'
import { PGZERO_GAME_ART } from './python/pgzero-art-index'
import { renderReferenceSound } from './python/reference-game-audio'

/**
 * Writes every Pygame Zero example from its manifest entry: texts, images (pgzero-art), sounds
 * and music, then the lazy TypeScript payloads the gallery loads. `--check` writes nothing.
 * Music is encoded once to OGG with ffmpeg (an encoder is not reproducible byte for byte); the
 * check proves the committed OGG still comes from the current score through its WAV digest.
 */
const studio = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')
const root = join(studio, 'src/examples/python/pgzero')
const scores = join(studio, 'scripts/python/fixtures/pgzero-music')
const encoder = new TextEncoder()
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const constant = (game: Pick<PgzeroGame, 'stem'>) =>
  game.stem.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()

/** The one font a game can bring (`font: 'pressstart2p'`): Press Start 2P, under the SIL OFL. */
const FONTS = join(studio, 'scripts/raylib/scenes/assets/fonts')
const FONT_FILE = 'pressstart2p.ttf'

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

function readme(game: PgzeroGame, media: readonly string[]) {
  return `# ${game.name}

${game.description}

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em \`main.py\` e é o mesmo nas versões de Blocos e de Código da
galeria.
${
  game.dataFiles?.length
    ? `
O jogo também lê ${game.dataFiles.map((name) => `\`${name}\``).join(' e ')} quando começa: dá
para mudar o jogo editando esse arquivo de texto, sem mexer no código. No computador, abra o
terminal dentro da pasta do jogo e use \`python -X utf8 main.py\`: assim ele acha o arquivo e
lê os acentos certos.
`
    : ''
}
## Como jogar

${game.howToPlay}

## Ideias para mudar

${game.ideas.map((idea) => `- ${idea}`).join('\n')}
${
  media.length
    ? `
## Imagens e sons

O Pygame Zero procura as imagens em \`images/\`, os sons em \`sounds/\` e as músicas em
\`music/\`, pelo nome do arquivo sem a extensão: \`Actor('nave')\` usa \`images/nave\`.
Para trocar um desenho, edite-o no Pinta pelo Estúdio, ou traga outro e use no código o
nome que o painel mostra em "nome no código".${
        game.font
          ? `
A letra dos textos vem de \`fonts/${FONT_FILE}\`: \`screen.draw.text(..., fontname='pressstart2p')\`.`
          : ''
      }
`
    : ''
}
## Jogar no computador

O Pygame Zero roda no computador com o pygame-ce:

\`\`\`
python -m pip install pygame-ce==${PGZERO_UPSTREAM.pygameCe} numpy
python -m pip install --no-deps pgzero==${PGZERO_UPSTREAM.pgzero}
python main.py
\`\`\`

O programa termina com \`pgzrun.go()\`, então \`python main.py\` já abre o jogo. Num programa
sem essa linha, use \`python -X utf8 -m pgzero main.py\` (o \`-X utf8\` mantém os acentos
certos no Windows).

Ao baixar o projeto pelo Estúdio, os desenhos em SVG ganham uma cópia em PNG, que é o
formato que o Pygame Zero do computador abre.
`
}

function inspirationText(game: PgzeroGame) {
  if ('book' in game && game.book === 'watkiss')
    return `A mecânica do jogo se inspira no projeto "${game.inspiration}" do livro *Beginning Game
Programming with Pygame Zero* (Stewart Watkiss, Apress, 2020). Nenhum código, texto ou imagem
do livro foi incorporado. Este é um projeto educacional independente, sem afiliação ao autor
nem à Apress.`
  if ('book' in game && game.book === 'classics')
    return `A mecânica do jogo se inspira no jogo "${game.inspiration}" do livro *Code the Classics,
Volume 1* (Raspberry Pi Press, 2019). Nenhum código, texto, imagem ou som do livro foi
incorporado. Este é um projeto educacional independente, sem afiliação à Raspberry Pi Ltd
nem aos autores do livro.`
  if ('book' in game && game.book === 'wireframe')
    return `A mecânica do jogo se inspira na receita "${game.inspiration}" da série "Source Code"
da revista *Wireframe* (reunida no *Wireframe Game Dev Cookbook*, Raspberry Pi Press). Nenhum
código, texto ou imagem da revista foi incorporado. Este é um projeto educacional
independente, sem afiliação à Raspberry Pi Ltd nem aos donos dos jogos que inspiraram a
receita.`
  return `A mecânica do jogo se inspira no projeto "${game.inspiration}" do livro *Coding Games in
Python* (DK, 2018). Nenhum código, texto ou imagem do livro foi incorporado. Este é um
projeto educacional independente, sem afiliação à DK.`
}

function notice(game: PgzeroGame) {
  return `# Autoria e recursos

Copyright (c) 2026 Sistema Zero. O código, os desenhos, os sons e a música deste exemplo
são originais, distribuídos sob a licença MIT em \`LICENSE\`. Os desenhos foram escritos
como código (\`scripts/python/pgzero-art*.ts\` no repositório do Sistema Zero), e os sons
foram sintetizados a partir de partituras.
${
  game.font
    ? `
A fonte \`fonts/${FONT_FILE}\` é a Press Start 2P, de CodeMan38, distribuída sob a SIL
Open Font License 1.1 em \`LICENSE-fonte.txt\`.
`
    : ''
}
${inspirationText(game)}

O programa usa a API do Pygame Zero (pgzero 1.2.1, LGPL-3.0) e roda no computador com o
pygame-ce.
`
}

function music(path: string, notes: readonly number[], noteMilliseconds: number) {
  return renderReferenceSound({ path, notes, noteMilliseconds, game: 'pong-visual' })
}

async function encodeOgg(wav: Uint8Array) {
  const folder = await mkdtemp(join(tmpdir(), 'sz-pgzero-music-'))
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

/**
 * On Windows an indexer or an antivirus can hold a file for a moment while it is scanned
 * (EUNKNOWN, EBUSY): the same open works a little later.
 */
async function patiently<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work()
    } catch (error) {
      const code = (error as { code?: string }).code ?? ''
      if (attempt >= 8 || !['EUNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(code)) throw error
      await Bun.sleep(100 * attempt)
    }
  }
}

const problems: string[] = []
async function put(path: string, bytes: Uint8Array) {
  if (check) {
    let actual: Uint8Array | undefined
    try {
      actual = new Uint8Array(await patiently(() => readFile(path)))
    } catch {}
    const normalized =
      actual && /\.(md|py|svg|txt)$|LICENSE$/.test(path)
        ? encoder.encode(new TextDecoder().decode(actual).replaceAll('\r\n', '\n'))
        : actual
    if (!normalized || sha256(normalized) !== sha256(bytes)) problems.push(path)
    return
  }
  await mkdir(join(path, '..'), { recursive: true })
  await patiently(() => writeFile(path, bytes))
}

const generated: { output: string; raw: string }[] = []
for (const game of PGZERO_GAMES as readonly PgzeroGame[]) {
  const folder = join(root, game.key)
  const media: Record<string, Uint8Array> = {}
  for (const [name, bytes] of Object.entries(PGZERO_GAME_ART[game.key]!()))
    media[`images/${name}`] = bytes
  if (game.font)
    media[`fonts/${FONT_FILE}`] = new Uint8Array(
      await patiently(() => readFile(join(FONTS, FONT_FILE))),
    )
  for (const sound of game.sounds)
    media[`sounds/${sound.path}`] = renderReferenceSound({ ...sound, game: 'pong-visual' })
  for (const track of game.music) {
    const wav = music(track.path, track.notes, track.noteMilliseconds)
    const digest = join(scores, `${game.key}-${track.path}.sha256`)
    const oggPath = join(folder, 'music', track.path)
    if (check) {
      const recorded = (await patiently(() => readFile(digest, 'utf8')).catch(() => '')).trim()
      if (recorded !== sha256(wav)) problems.push(digest)
      media[`music/${track.path}`] = new Uint8Array(await patiently(() => readFile(oggPath)))
    } else {
      const ogg = await encodeOgg(wav)
      await mkdir(scores, { recursive: true })
      await writeFile(digest, `${sha256(wav)}\n`)
      media[`music/${track.path}`] = ogg
    }
  }
  const texts: Record<string, string> = {
    'README.md': readme(game, Object.keys(media)),
    'NOTICE.md': notice(game),
    LICENSE,
    ...(game.font
      ? {
          'LICENSE-fonte.txt': (
            await patiently(() => readFile(join(FONTS, 'OFL-pressstart2p.txt'), 'utf8'))
          ).replaceAll('\r\n', '\n'),
        }
      : {}),
  }
  for (const [name, text] of Object.entries(texts))
    await put(join(folder, name), encoder.encode(text))
  for (const [path, bytes] of Object.entries(media)) await put(join(folder, path), bytes)
  // A media file the example no longer makes would still show up in the materials panel
  // (and editing it would change nothing in the game): it goes away, and --check reports it.
  for (const kind of ['images', 'sounds', 'music', 'fonts']) {
    const files = await patiently(() => readdir(join(folder, kind))).catch(() => [] as string[])
    for (const file of files)
      if (!(`${kind}/${file}` in media)) {
        if (check) problems.push(join(folder, kind, file))
        else await patiently(() => rm(join(folder, kind, file)))
      }
  }

  const sources: Record<string, string> = {}
  for (const name of PGZERO_GAME_FILES)
    sources[name] =
      name in texts
        ? texts[name]!
        : (await patiently(() => readFile(join(folder, name), 'utf8'))).replaceAll('\r\n', '\n')
  // The license of the font travels with the project, next to the font.
  if (game.font) sources['LICENSE-fonte.txt'] = texts['LICENSE-fonte.txt']!
  // Text files the game reads with open(), written by hand next to main.py.
  for (const name of game.dataFiles ?? [])
    sources[name] = (await patiently(() => readFile(join(folder, name), 'utf8'))).replaceAll(
      '\r\n',
      '\n',
    )
  const mime = (path: string) =>
    path.endsWith('.svg')
      ? 'image/svg+xml'
      : path.endsWith('.png')
        ? 'image/png'
        : path.endsWith('.ogg')
          ? 'audio/ogg'
          : path.endsWith('.ttf')
            ? 'font/ttf'
            : 'audio/wav'
  const dataUrls = Object.fromEntries(
    Object.entries(media).map(([path, bytes]) => [
      path,
      `data:${mime(path)};base64,${Buffer.from(bytes).toString('base64')}`,
    ]),
  )
  const name = constant(game)
  const header = (kind: string, revisions: string[]) =>
    `// Gerado por scripts/generate-pgzero-games.ts. Não edite este arquivo.\n// ${kind}: src/examples/python/pgzero/${game.key}\n${revisions.map((revision) => `// ${revision}\n`).join('')}`
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
// Block evidence: the receipt must qualify the current main.py exactly.
const evidence = join(studio, '../../docs/continuity/2026-10-24-python-pgzero-games-evidence')
const blocks: Record<string, ReturnType<typeof readVisualExampleBlockMetadata>> = {}
for (const game of PGZERO_GAMES as readonly PgzeroGame[]) {
  const receipt: unknown = JSON.parse(
    await patiently(() => readFile(join(evidence, game.receipt), 'utf8')),
  )
  const source = (
    await patiently(() => readFile(join(root, game.key, 'main.py'), 'utf8'))
  ).replaceAll('\r\n', '\n')
  blocks[game.key] = readVisualExampleBlockMetadata(receipt, source)
}
generated.push({
  output: 'src/examples/python/pgzeroGames.blocks.generated.ts',
  raw: `// Gerado por scripts/generate-pgzero-games.ts. Não edite este arquivo.
// Evidência de autoria visual; disponibilidade e autorização continuam pertencendo ao host.
import type { PgzeroGameKey } from './pgzeroGames.manifest'

export const PGZERO_GAME_BLOCKS = ${JSON.stringify(blocks, null, 2)} as const satisfies Record<
  PgzeroGameKey,
  { sourceSha256: string; blockIds: readonly string[] }
>
`,
})
generated.push({
  output: 'src/examples/python/pgzeroGames.loaders.generated.ts',
  raw: `// Gerado por scripts/generate-pgzero-games.ts. Não edite este arquivo.
// Fonte: src/examples/python/pgzeroGames.manifest.ts
import type { PgzeroGameKey } from './pgzeroGames.manifest'

/** Literal import() per game, so every bundler keeps one lazy chunk per payload. */
export const PGZERO_GAME_LOADERS = {
${(PGZERO_GAMES as readonly PgzeroGame[])
  .map((game) => {
    const name = constant(game)
    return `  '${game.key}': async () => {
    const [{ ${name}_SOURCES }, { ${name}_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./${game.stem}.sources.generated'),
      import('./${game.stem}.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ${name}_SOURCES,
      assets: pgzeroGameAssets('${game.key}', ${name}_MEDIA),
    }
  },
`
  })
  .join('')}} satisfies Record<PgzeroGameKey, () => Promise<unknown>>
`,
})

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
    `Exemplos Pygame Zero desatualizados:\n${problems.join('\n')}\nExecute bun run gen:pgzero-games.`,
  )
console.log(`${check ? 'Conferidos' : 'Gerados'} ${PGZERO_GAMES.length} exemplos Pygame Zero.`)
