/**
 * Draws the art of the Pygame-ce gallery games as Pinta documents and writes, per game:
 *   packages/studio/src/examples/python/pygame/<game>/assets/<name>.png   (what the game loads)
 *   packages/studio/src/examples/python/pygame/<game>/desenhos.pinta.json (the editable sources)
 *
 * bun scripts/pygame-gallery/generate.ts [game…] [--check] [--preview <folder>]
 * `--preview` also writes a contact sheet per game (every frame, enlarged) for review.
 * A drawing whose document id or name collides with another one's stops the generator.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { type Drawing, gameDocuments, gamePng, pintaDocuments } from './drawing'
import { Px, upscale } from './pixel'
import { encodePng, rgbaOf } from './png'

/** The import scale of every drawing: art is drawn at half size and played at double. */
const SCALE = 2
const examples = resolve(import.meta.dirname, '../../../studio/src/examples/python/pygame')
const args = process.argv.slice(2)
const check = args.includes('--check')
const previewAt = args.indexOf('--preview')
const preview = previewAt >= 0 ? resolve(args[previewAt + 1]!) : null
const chosen = args.filter(
  (arg, index) => !arg.startsWith('--') && (previewAt < 0 || index !== previewAt + 1),
)
const stale: string[] = []

/**
 * Every games/<game>.ts exports `drawings(): Drawing[]`; the file name is the game key. Only the
 * chosen games are imported, so a game being drawn elsewhere never breaks another one.
 */
const GAMES: Record<string, () => Promise<Drawing[]>> = {}
for (const file of (await readdir(resolve(import.meta.dirname, 'games'))).sort())
  if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
    const game = file.slice(0, -3)
    if (!chosen.length || chosen.includes(game))
      GAMES[game] = async () => (await import(`./games/${file}`)).drawings()
  }

async function put(path: string, bytes: Uint8Array | string) {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  if (check) {
    const current = await readFile(path).catch(() => null)
    if (!current || Buffer.compare(current, Buffer.from(data)) !== 0) stale.push(path)
    return
  }
  await mkdir(resolve(path, '..'), { recursive: true })
  await writeFile(path, data)
}

function contactSheet(drawings: Drawing[]): Px {
  const cells: Px[] = []
  for (const drawing of drawings) {
    if (drawing.kind === 'sprite')
      for (const animation of drawing.animations) cells.push(...animation.frames)
    else if (drawing.kind === 'background') cells.push(drawing.image)
    else if (drawing.kind === 'tileset') cells.push(...drawing.tiles.map((tile) => tile.image))
  }
  const zoom = 4
  const pad = 6
  const width = 1400
  let x = pad
  let y = pad
  let row = 0
  const placed: [Px, number, number][] = []
  for (const cell of cells) {
    const big = upscale(cell, zoom)
    if (x + big.width > width) {
      x = pad
      y += row + pad
      row = 0
    }
    placed.push([big, x, y])
    x += big.width + pad
    row = Math.max(row, big.height)
  }
  const sheet = new Px(width, y + row + pad, '#2b2433')
  for (const [big, px, py] of placed) {
    sheet.rect(px, py, big.width, big.height, '#3a2e3f')
    sheet.draw(big, px, py)
  }
  return sheet
}

for (const [game, draw] of Object.entries(GAMES)) {
  const drawings = await draw()
  const folder = resolve(examples, game)
  // Fails on a duplicate id or name before writing anything of this game.
  const unique = gameDocuments(drawings, game)
  for (const drawing of drawings)
    await put(
      resolve(folder, 'assets', `${drawing.name}.png`),
      await gamePng(pintaDocuments(drawing, game), SCALE),
    )
  await put(resolve(folder, 'desenhos.pinta.json'), galleryToPintaJson(unique))
  if (preview) {
    await mkdir(preview, { recursive: true })
    await writeFile(resolve(preview, `${game}.png`), encodePng(rgbaOf(contactSheet(drawings))))
  }
  console.log(`${game}: ${drawings.length} desenhos, ${unique.length} documentos do Pinta`)
}
if (stale.length) {
  console.error(`Arte da galeria desatualizada:\n${stale.join('\n')}`)
  process.exit(1)
}
