import { expect, test } from 'bun:test'
import { pintaAssetToWire } from '../../assets/wire'
import {
  sanitizePintaAsset,
  sanitizeRegionTilemapAsset,
  withPintaSchemaStamp,
} from '../../core/project'
import { galleryToPintaJson, importPintaJson } from '../../export/projectJson'
import { decodeRegionGalleryBackup } from '../../export/regionBackup'
import { automapFixture } from '../../testing/automapFixture'
import { prepareMapRegions } from '../regionMap'
import { cellAt, setCell } from '../tilemapOps'
import { createAutomapEditor, isAutomapEditorMap } from './editor'
import { previewAutomapStroke } from './engine'
import { importAutomapCopy } from './importCopy'
import {
  automapSheetIndex,
  copyAutomapDocument,
  decodeAutomapGallery,
  encodeAutomapGallery,
} from './native'

test('documento nativo 9 preserva autoria e os recursos do mapa denso e do regional', async () => {
  const { sheet, map, book } = await automapFixture()
  const prepared = prepareMapRegions(map)
  if (!prepared.ok) throw Error(prepared.reason)
  for (const candidate of [map, prepared.map]) {
    const text = await encodeAutomapGallery({
      assets: [sheet, candidate],
      books: new Map([[candidate.id, book]]),
    })
    if (!text) throw Error('encoding')
    const raw = JSON.parse(text)
    const wrapper = raw.assets.find((v: { schema?: number }) => v.schema === 9)
    expect(wrapper.map.id).toBe(map.id)
    expect(importPintaJson(text).assets).toHaveLength(0)
    expect(decodeRegionGalleryBackup(text).assets).toHaveLength(0)
    expect(sanitizePintaAsset(wrapper)).toBeNull()
    expect(sanitizeRegionTilemapAsset(wrapper)).toBeNull()
    const reopened = await decodeAutomapGallery(text)
    expect(reopened?.books.get(map.id)).toEqual(book)
    expect(JSON.parse((await encodeAutomapGallery(reopened!))!)).toEqual(raw)
    wrapper.projection = 'hex'
    expect(await decodeAutomapGallery(JSON.stringify(raw))).toBeNull()
    delete wrapper.projection
    wrapper.map.projection = 'hex'
    expect(await decodeAutomapGallery(JSON.stringify(raw))).toBeNull()
    delete wrapper.map.projection
    raw.assets = raw.assets.filter((a: { id: string }) => a.id !== sheet.id)
    expect(await decodeAutomapGallery(JSON.stringify(raw))).toBeNull()
  }
})
test('duplicar renova os IDs de camadas e religa a folha com a mesma identidade de peças', async () => {
  const { sheet, map, book } = await automapFixture()
  const gallery = { assets: [sheet, map], books: new Map([[map.id, book]]) }
  const text = await copyAutomapDocument(gallery, map.id)
  if (!text) throw Error('copy')
  const result = await importAutomapCopy(text, gallery)
  if (!result) throw Error('import')
  const copy = result.gallery.assets.find((asset) => asset.id === result.idMap.get(map.id))
  const newSheet = result.gallery.assets.find((asset) => asset.id === result.idMap.get(sheet.id))
  if (copy?.kind !== 'tilemap' || newSheet?.kind !== 'tileset') throw Error('copies')
  const copied = result.gallery.books.get(copy.id)!
  expect(copied.rules[0]!.input[0]!.layer).toBe(copy.layers[0]!.id)
  expect(copy.layers[0]!.id).not.toBe(map.layers[0]!.id)
  expect(copied.rules[0]!.outputs[0]![0]!.sheet).toBe(newSheet.id)
  expect(await encodeAutomapGallery(result.gallery)).toBeTruthy()
  const changed = { ...newSheet, solid: newSheet.solid.map(() => true) }
  expect(
    await encodeAutomapGallery({
      ...result.gallery,
      assets: result.gallery.assets.map((asset) => (asset === newSheet ? changed : asset)),
    }),
  ).toBeNull()
})
test('escritores atuais recusam 9 e 99, e o carimbo conserva a versão futura', async () => {
  const { map, sheet, book } = await automapFixture()
  for (const schema of [9, 99]) {
    const unknown = { ...map, schema }
    const unrelated = { ...map, id: 'desconhecido', schema }
    expect(
      await encodeAutomapGallery({
        assets: [sheet, map, unrelated],
        books: new Map([[map.id, book]]),
      }),
    ).toBeNull()
    expect(withPintaSchemaStamp(unknown)).toBe(unknown)
    expect(sanitizePintaAsset(unknown)).toBeNull()
    expect(() => pintaAssetToWire(unknown)).toThrow()
    expect(() => galleryToPintaJson([unknown])).toThrow()
  }
})
test('pincel + regras confirmados juntos no histórico real; autosave e reabertura conservam o livro', async () => {
  const { gallery, map, book } = await automapFixture()
  let durable = ''
  const editor = await createAutomapEditor({
    gallery,
    mapId: map.id,
    repository: {
      read: async () => durable || null,
      compareAndSet: async (previous, text) => {
        if (previous !== (durable || null)) return false
        durable = text
        return true
      },
    },
    autosaveDelayMs: 60000,
  })
  try {
    const base = editor.getState().asset
    if (!isAutomapEditorMap(base)) throw Error('map')
    const staged = setCell(base, 'chao', 1, 0, 0)
    const sheets = await automapSheetIndex(map, gallery.assets)
    const result = previewAutomapStroke(
      base,
      { ...staged, schema: 9, automapping: book },
      'chao',
      book,
      sheets,
    )
    if (!result.ok) throw Error(result.reason)
    expect(editor.getState().asset).toBe(base)
    expect(editor.getState().canUndo).toBe(false)
    expect(editor.getState().commit(result.map)).toBe(true)
    expect(editor.getState().canUndo).toBe(true)
    editor.getState().undo()
    expect(editor.getState().canUndo).toBe(false)
    const reverted = editor.getState().asset
    if (!isAutomapEditorMap(reverted)) throw Error('undo')
    expect(cellAt(reverted, 'chao', 1, 0)).toBe(-1)
    expect(cellAt(reverted, 'frente', 1, 0)).toBe(-1)
    editor.getState().redo()
    await editor.getState().flush()
    const reopened = await decodeAutomapGallery(durable)
    expect(reopened?.books.get(map.id)).toEqual(book)
    const saved = reopened?.assets.find((a) => a.id === map.id)
    if (saved?.kind !== 'tilemap') throw Error('saved')
    expect(cellAt(saved, 'frente', 1, 0)).toBe(0)
  } finally {
    await editor.getState().flush()
  }
})

test('uma cópia portátil religa portas por nome e por ID, conservando as regras dos dois mapas', async () => {
  const { sheet, map, book } = await automapFixture()
  const { createMapObject } = await import('../mapObjects')
  const cabin = { ...map, id: 'cabana', name: 'pousada' }
  const door = (destino: string) => ({
    id: 'portas',
    kind: 'objects' as const,
    name: 'Portas',
    visible: false,
    objects: [createMapObject({ role: 'door', properties: { destino } })],
  })
  map.layers = [...map.layers, door(cabin.name)]
  cabin.layers = [...cabin.layers, door(map.id)]
  const gallery = {
    assets: [sheet, map, cabin],
    books: new Map([
      [map.id, book],
      [cabin.id, book],
    ]),
  }
  const text = await copyAutomapDocument(gallery, map.id)
  if (!text) throw Error('copy')
  expect(await copyAutomapDocument({ ...gallery, assets: [sheet, map] }, map.id)).toBeNull()
  const restored = await decodeAutomapGallery(text)
  expect(restored?.books.size).toBe(2)
  const copied = await importAutomapCopy(text, gallery)
  if (!copied) throw Error('restore')
  const a = copied.gallery.assets.find((asset) => asset.id === copied.idMap.get(map.id))
  const b = copied.gallery.assets.find((asset) => asset.id === copied.idMap.get(cabin.id))
  if (a?.kind !== 'tilemap' || b?.kind !== 'tilemap') throw Error('maps')
  const firstDoor = a.layers.find((l) => l.kind === 'objects'),
    secondDoor = b.layers.find((l) => l.kind === 'objects')
  expect(firstDoor?.objects[0]?.properties.destino).toBe(b.name)
  expect(secondDoor?.objects[0]?.properties.destino).toBe(a.id)
  expect(copied.gallery.books.get(a.id)?.rules[0]?.input[0]?.layer).toBe(a.layers[0]?.id)
  expect(copied.gallery.books.get(b.id)?.rules[0]?.input[0]?.layer).toBe(b.layers[0]?.id)
  expect(
    (await decodeAutomapGallery((await encodeAutomapGallery(copied.gallery))!))?.books.size,
  ).toBe(4)
})
test('regiões negativas reabrem com a regra original e revivem a mesma edição após desfazer e refazer', async () => {
  const { sheet, map, book } = await automapFixture()
  const { expandRegionMap } = await import('../regionMap')
  const { createAutomapRegionEditor } = await import('./editor')
  const { previewAutomapping } = await import('./engine')
  const base = prepareMapRegions(map)
  if (!base.ok) throw Error(base.reason)
  const expanded = expandRegionMap(base.map, { col: -40, row: -4, cols: 85, rows: 11 })
  if (!expanded.ok) throw Error(expanded.reason)
  const source = setCell(expanded.map, 'chao', -33, -1, 0)
  const gallery = { assets: [sheet, source], books: new Map([[source.id, book]]) }
  let value: string | null = null
  const repository = {
    read: async () => value,
    compareAndSet: async (expected: string | null, next: string) => {
      if (value !== expected) return false
      value = next
      return true
    },
  }
  const options = { gallery, mapId: source.id, repository, autosaveDelayMs: 60000 }
  const session = await createAutomapRegionEditor(options),
    other = await createAutomapRegionEditor(options)
  const original = session.getState().asset
  const idx = await automapSheetIndex(source, gallery.assets)
  const preview = previewAutomapping(source, book, idx, { col: -33, row: -1, cols: 1, rows: 1 })
  if (!preview.ok) throw Error(preview.reason)
  expect(
    session.getState().commit({ ...original, map: preview.map, book: { ...book, seed: 17 } }),
  ).toBe(true)
  session.getState().undo()
  expect(session.getState().asset).toBe(original)
  expect(session.getState().canUndo).toBe(false)
  session.getState().redo()
  expect((await session.getState().flush()).ok).toBe(true)
  const saved = value
  expect(other.getState().commit({ ...other.getState().asset, book: { ...book, seed: 99 } })).toBe(
    true,
  )
  expect((await other.getState().flush()).ok).toBe(false)
  expect(other.getState().dirty).toBe(true)
  expect(value).toBe(saved)
  const current = (await createAutomapRegionEditor(options)).getState().asset
  expect(current.book.seed).toBe(17)
  expect(current.map.origin).toEqual(source.origin)
  expect(cellAt(current.map, 'frente', -33, -1)).toBe(0)
})

test('um nome normalizado pela leitura antiga não pode alterar uma porta ao gravar o arquivo nativo', async () => {
  const { gallery, map } = await automapFixture()
  const altered = { ...map, name: 'Pousada' }
  expect(
    await encodeAutomapGallery({
      ...gallery,
      assets: gallery.assets.map((asset) => (asset.id === map.id ? altered : asset)),
    }),
  ).toBeNull()
})
