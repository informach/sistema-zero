import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { exampleDrawingDocumentId, exampleDrawingLibId } from '../../asset-library/exampleDrawings'
import { PYGAME_GAME_EXAMPLES } from './pygameGames'
import { PYGAME_GAME_BLOCKS } from './pygameGames.blocks.generated'
import { PYGAME_GAME_DRAWINGS } from './pygameGames.loaders.generated'
import { PYGAME_GAMES } from './pygameGames.manifest'

const root = new URL('./pygame/', import.meta.url)

/** The Pinta data block of a PNG (iTXt `pinta`), or null for a plain image. */
function pintaData(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  for (let at = 8; at + 8 <= png.length; ) {
    const length = view.getUint32(at)
    const type = new TextDecoder().decode(png.subarray(at + 4, at + 8))
    if (type === 'iTXt') {
      const body = png.subarray(at + 8, at + 8 + length)
      if (new TextDecoder().decode(body.subarray(0, 6)) === 'pinta\0')
        return JSON.parse(new TextDecoder().decode(inflateSync(body.subarray(10))))
    }
    at += 12 + length
  }
  return null
}

/** Every file of a game folder, relative and with `/` (the bundler's walk). */
async function walk(folder: URL, prefix = ''): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.startsWith('.')) continue
    if (entry.isDirectory())
      files.push(...(await walk(new URL(`${entry.name}/`, folder), `${prefix}${entry.name}/`)))
    else files.push(`${prefix}${entry.name}`)
  }
  return files.sort()
}

/** The subset of a `.pinta.json` document these tests read. */
interface PintaDocument {
  id: string
  name: string
  kind: string
  tilesetId?: string
  layers?: { kind?: string; tilesetId?: string; objects?: { id: string; name: string }[] }[]
}

/** The document kinds a PNG's data stands for (no data = a background picture). */
const KINDS: Record<string, string[]> = {
  sprite: ['pixel-sprite', 'vector-sprite'],
  tileset: ['tileset', 'vector-tileset'],
  map: ['tilemap'],
  background: ['pixel-background', 'vector-background'],
}

/** A map's tilesets in the Pinta's order: its own first, then each layer's, once each. */
function mapTilesetIds(map: PintaDocument): string[] {
  const ids = [map.tilesetId!]
  for (const layer of map.layers ?? [])
    if (layer.kind !== 'objects') {
      const id = layer.tilesetId ?? map.tilesetId!
      if (!ids.includes(id)) ids.push(id)
    }
  return ids
}

test('every game folder is in the gallery, in Blocks and in Code', async () => {
  const folders = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  expect(PYGAME_GAMES.map(({ key }) => String(key)).sort()).toEqual(folders)
  expect(PYGAME_GAME_EXAMPLES).toHaveLength(PYGAME_GAMES.length * 2)
})

for (const { key: game, name } of PYGAME_GAMES) {
  test(`${game}: Blocks and Code open the same game, with the files of its folder`, async () => {
    const blocks = PYGAME_GAME_EXAMPLES.find((entry) => entry.key === `python:${game}:blocks`)
    const code = PYGAME_GAME_EXAMPLES.find((entry) => entry.key === `python:${game}:code`)
    expect([blocks?.kind, blocks?.mode, blocks?.name]).toEqual([
      'classic',
      'blocks',
      `${name} (Blocos)`,
    ])
    expect([code?.kind, code?.mode, code?.name]).toEqual(['pro', 'code', `${name} (Código)`])
    // One game behind both doors: the very same loader, not two that happen to agree.
    expect(blocks!.load).toBe(code!.load)
    const payload = await blocks!.load()
    expect(payload.entrypoint).toBe('main.py')
    // The payload is the folder on disk: every text file, word for word, and every material,
    // byte for byte (and nothing else).
    const folder = new URL(`${game}/`, root)
    const disk = await walk(folder)
    const texts = disk.filter(
      (path) => !path.startsWith('assets/') && path !== 'desenhos.pinta.json',
    )
    expect(Object.keys(payload.files).sort()).toEqual(texts)
    for (const path of texts)
      expect(payload.files[path], path).toBe(
        (await readFile(new URL(path, folder), 'utf8')).replaceAll('\r\n', '\n'),
      )
    for (const required of ['main.py', 'README.md', 'NOTICE.md']) expect(texts).toContain(required)
    const materials = disk.filter((path) => path.startsWith('assets/'))
    expect((payload.assets ?? []).map((asset) => asset.proPath).sort()).toEqual(materials)
    for (const asset of payload.assets ?? []) {
      const bytes = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64')
      expect(bytes.equals(await readFile(new URL(asset.proPath!, folder))), asset.proPath).toBe(
        true,
      )
    }
    const drawings = await PYGAME_GAME_DRAWINGS[game]?.()
    const sources = await readFile(new URL('desenhos.pinta.json', folder), 'utf8').catch(
      () => undefined,
    )
    expect(drawings).toBe(sources)
  })

  test(`${game}: every drawing opens in Pinta as the document of its kind, and every sound is used`, async () => {
    const payload = await PYGAME_GAME_EXAMPLES.find(
      (entry) => entry.key === `python:${game}:blocks`,
    )!.load()
    const python = Object.entries(payload.files)
      .filter(([path]) => path.endsWith('.py'))
      .map(([, source]) => source)
      .join('\n')
    const drawings = await PYGAME_GAME_DRAWINGS[game]?.()
    const gallery = drawings
      ? (JSON.parse(drawings) as { format: string; assets: PintaDocument[] })
      : { format: 'pinta-gallery', assets: [] }
    expect(gallery.format).toBe('pinta-gallery')
    const byId = new Map(gallery.assets.map((document) => [document.id, document]))
    expect(byId.size, 'ids repetidos no desenhos.pinta.json').toBe(gallery.assets.length)
    expect(new Set(gallery.assets.map((document) => document.name)).size, 'nomes repetidos').toBe(
      gallery.assets.length,
    )
    const reached = new Set<string>()
    for (const asset of payload.assets ?? []) {
      // The path the game opens, exactly as in the original (pirate-maker keeps Explorer.ogg).
      expect(asset.proPath).toMatch(/^assets\/[A-Za-z0-9_-]+\.(png|wav|ogg)$/)
      const file = asset.proPath!.slice('assets/'.length)
      const stem = file.replace(/\.\w+$/, '')
      if (asset.kind === 'image') {
        // "Editar no Pinta" copies the document `<game>-<drawing>`: it must be THIS drawing, of
        // the kind the PNG's data says (a sprite never opens a tileset with the same name).
        const ref = { gallery: 'pygame' as const, game, drawing: stem }
        expect(asset.libId).toBe(exampleDrawingLibId(ref))
        const document = byId.get(exampleDrawingDocumentId(ref))
        if (!document) throw new Error(`${game}: ${file} não tem documento no desenhos.pinta.json`)
        reached.add(document.id)
        const data = pintaData(new Uint8Array(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64')))
        const kind = data ? data.kind : 'background'
        expect(KINDS[kind], `${file}: dado ${kind}`).toContain(document.kind)
        expect(document.name).toBe(stem)
        if (data) expect(data).toMatchObject({ format: 'pinta', version: 1, name: stem, scale: 2 })
        if (document.kind === 'tilemap') {
          // Every tileset the map points to exists, in the order and with the names of the atlas.
          const tilesets = mapTilesetIds(document).map((id) => {
            const tileset = byId.get(id)
            if (!tileset)
              throw new Error(`${game}: o mapa ${stem} aponta para ${id}, que não existe`)
            expect(KINDS.tileset).toContain(tileset.kind)
            reached.add(id)
            return tileset.name
          })
          expect(data.tilesets.map((tileset: { name: string }) => tileset.name)).toEqual(tilesets)
          // The objects the game reads are the document's: the same ids and names.
          const objects = (document.layers ?? []).filter((layer) => layer.kind === 'objects')
          const dataObjects = (
            data.layers as { type: string; objects?: { id: string; name: string }[] }[]
          ).filter((layer) => layer.type === 'objects')
          expect(
            dataObjects.map((layer) => layer.objects!.map((object) => [object.id, object.name])),
          ).toEqual(
            objects.map((layer) => layer.objects!.map((object) => [object.id, object.name])),
          )
        }
      } else {
        // A sound is opened by its file name, as a whole string ('laser.wav'), or by its name
        // from the folder of sounds when the game loads every sound of assets/ by name.
        const literal = new RegExp(`['"]${file.replace('.', '\\.')}['"]`)
        const folderOfSounds =
          /endswith\('\.(wav|ogg)'\)/.test(python) && python.includes(`.split('.')[0]`)
        expect(
          literal.test(python) || (folderOfSounds && new RegExp(`['"]${stem}['"]`).test(python)),
          `${game}: o som ${file} não é aberto pelo código`,
        ).toBe(true)
      }
    }
    // No orphan document: each one is a drawing with its PNG or a tileset of one of the maps.
    expect(gallery.assets.map((document) => document.id).filter((id) => !reached.has(id))).toEqual(
      [],
    )
  })

  test(`${game}: the Blocks entry asks for exactly the blocks its code uses`, async () => {
    const coverage = PYGAME_GAME_BLOCKS[game]
    expect(coverage).toBeDefined()
    const blocks = PYGAME_GAME_EXAMPLES.find((entry) => entry.key === `python:${game}:blocks`)
    expect(blocks?.requiredBlockIds).toEqual([...coverage!.blockIds])
    expect(coverage!.blockIds.some((id) => id.startsWith('sz_py_pygame_'))).toBe(true)
    const payload = await blocks!.load()
    const digest = createHash('sha256')
    for (const path of Object.keys(payload.files)
      .filter((path) => path.endsWith('.py'))
      .sort())
      digest.update(`${path}\0${payload.files[path]}\0`)
    expect(digest.digest('hex')).toBe(coverage!.sourceSha256)
  })
}
