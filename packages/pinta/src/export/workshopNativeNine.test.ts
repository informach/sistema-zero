/**
 * Uma política só para o nativo 9: o documento de um item, o backup da galeria e o manifesto
 * causal abrem e regravam as três variantes (livro sem projeção, projeção com livro, projeção sem
 * livro). A entrada são as fixtures congeladas; a saída tem de ser byte a byte a mesma.
 */
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { isWorkshopProjectedMap } from '../core/workshopAsset'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { CELL_FLIP_D } from '../tiles/cell'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import { pintaBackupFromEncoded } from './projectJson'
import {
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
  pintaWorkshopBackup,
  readPintaWorkshopBackup,
} from './workshopDocument'
import { decodeWorkshopProjectedMap } from './workshopProjection'

const fixture = (name: string) =>
  gunzipSync(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))).toString('utf8')
const HEX = fixture('pinta-nativo-9-projecao-livro.json.gz')
const ISO = fixture('pinta-nativo-9-projecao.json.gz')
const BOOK_GALLERY = fixture('pinta-nativo-9-livro.json.gz')

function projected(text: string) {
  const map = decodeWorkshopProjectedMap(JSON.parse(text).assets[0])
  if (!map) throw Error('Fixture projetada recusada')
  return map
}

async function bookGallery() {
  const { assets, warnings } = await readPintaWorkshopBackup(BOOK_GALLERY)
  expect(warnings).toEqual([])
  const [sheet, authored, plain] = assets
  if (!sheet || !authored || !plain || !isPintaAuthoredMap(authored))
    throw Error('Fixture do livro')
  return { sheet, authored, plain }
}

/** The single raw entry of a one-item native-9 document. */
function entryOf(text: string): Record<string, unknown> & { map: Record<string, unknown> } {
  return JSON.parse(text).assets[0]
}
const oneItem = (entry: unknown) => pintaBackupFromEncoded([entry], 9)

test('as três variantes do nativo 9 abrem e voltam com os mesmos bytes pela parte de um item', async () => {
  const { authored } = await bookGallery()
  const book = pintaWorkshopAssetToJson(authored)
  if (!book) throw Error('Parte com livro recusada')
  for (const [text, expected] of [
    [book, authored],
    [HEX, projected(HEX)],
    [ISO, projected(ISO)],
  ] as const) {
    const opened = pintaWorkshopAssetFromJson(text)
    expect(opened).toEqual(expected)
    if (!opened) throw Error('Parte nativa 9 recusada')
    expect(pintaWorkshopAssetToJson(opened)).toBe(text)
    const spec = { itemId: opened.id, kind: 'tilemap', formatVersion: 8, allowWorkshop: true }
    expect(inspectPintaCausalDocument(text, spec)?.asset).toEqual(opened)
  }
  expect(projected(HEX).automapping?.rules).toHaveLength(1)
  expect(projected(ISO)).not.toHaveProperty('automapping')
})

test('o backup da galeria leva o livro e as duas projeções na ordem e reabre os mesmos bytes', async () => {
  const { sheet, authored, plain } = await bookGallery()
  const gallery: PintaWorkshopAsset[] = [sheet, projected(HEX), authored, projected(ISO), plain]
  const text = await pintaWorkshopBackup(gallery)
  if (!text) throw Error('Backup com projeções recusado')
  expect(JSON.parse(text)).toMatchObject({ format: 'pinta-gallery', version: 9 })
  const reopened = await readPintaWorkshopBackup(text)
  expect(reopened.warnings).toEqual([])
  expect(reopened.assets).toEqual(gallery)
  expect(await pintaWorkshopBackup(reopened.assets)).toBe(text)
  // Each projected entry in the gallery is the same envelope as its one-item document.
  const entries: unknown[] = JSON.parse(text).assets
  expect(entries[1]).toEqual(entryOf(HEX))
  expect(entries[3]).toEqual(entryOf(ISO))
  // Only projections, without any rulebook map, are still a native-9 gallery.
  const onlyProjected = await pintaWorkshopBackup([sheet, projected(ISO)])
  if (!onlyProjected) throw Error('Backup só com projeção recusado')
  expect(JSON.parse(onlyProjected).version).toBe(9)
  expect((await readPintaWorkshopBackup(onlyProjected)).assets).toEqual([sheet, projected(ISO)])
  // The frozen rulebook gallery: its native-9 envelope comes back byte for byte, the whole file
  // keeps its content, and writing it again is stable. (Legacy sheet/map entries never fixed
  // their key order on a reread; that was already so before this policy and is not native 9.)
  const again = await pintaWorkshopBackup((await readPintaWorkshopBackup(BOOK_GALLERY)).assets)
  if (!again) throw Error('Galeria do livro recusada')
  const frozenEntries: unknown[] = JSON.parse(BOOK_GALLERY).assets
  const againEntries: unknown[] = JSON.parse(again).assets
  expect(JSON.stringify(againEntries[1])).toBe(JSON.stringify(frozenEntries[1]))
  expect(againEntries).toEqual(frozenEntries)
  expect(await pintaWorkshopBackup((await readPintaWorkshopBackup(again)).assets)).toBe(again)
})

test('as recusas do nativo 9 continuam valendo para as projeções, sozinhas ou na galeria', async () => {
  const { sheet } = await bookGallery()
  const hex = entryOf(HEX)
  const flipped = structuredClone(hex) as typeof hex & {
    book: { rules: { outputs: { cells: number[] }[][] }[] }
  }
  flipped.book.rules[0]!.outputs[0]![0]!.cells[0] = CELL_FLIP_D
  const otherSheet = structuredClone(hex) as typeof hex & {
    book: { rules: { input: { sheet: string }[] }[] }
  }
  otherSheet.book.rules[0]!.input[0]!.sheet = 'outra-folha'
  const layers = hex.map.layers as { cells?: { chunks: unknown[] } }[]
  const chunk = layers[0]!.cells!.chunks[0]
  const overBudget = {
    ...hex,
    map: {
      ...hex.map,
      layers: [{ ...layers[0], cells: { ...layers[0]!.cells, chunks: Array(8193).fill(chunk) } }],
    },
  }
  const refused = [
    flipped,
    otherSheet,
    overBudget,
    { ...hex, id: 'outro-id' },
    { ...hex, extra: true },
    { ...hex, map: { ...hex.map, unread: true } },
    { ...hex, capability: 'regions' },
    { ...entryOf(ISO), book: null },
  ]
  for (const entry of refused) {
    expect(pintaWorkshopAssetFromJson(oneItem(entry))).toBeNull()
    const gallery = pintaBackupFromEncoded(
      [JSON.parse(pintaWorkshopAssetToJson(sheet)!).assets[0], entry],
      9,
    )
    const read = await readPintaWorkshopBackup(gallery)
    expect(read.assets).toEqual([])
    expect(read.warnings).not.toEqual([])
  }
  // A hexagonal rulebook stays limited to plain indices, also on the way out.
  const turned = projected(HEX)
  const rotated = structuredClone(turned.automapping!)
  rotated.rules[0]!.outputs[0]![0]!.cells[0] = CELL_FLIP_D
  expect(pintaWorkshopAssetToJson({ ...turned, automapping: rotated })).toBeNull()
  expect(await pintaWorkshopBackup([sheet, { ...turned, automapping: rotated }])).toBeNull()
  // The gallery keeps one entry per ID across both envelopes.
  const twice = pintaBackupFromEncoded([hex, hex], 9)
  expect((await readPintaWorkshopBackup(twice)).assets).toEqual([])
  expect(isWorkshopProjectedMap(projected(ISO))).toBe(true)
})
