import { type PintaAsset, type TilemapAsset, withPintaSchemaStamp } from '../../core/project'
import { MAX_BACKUP_FILE_BYTES } from '../../export/projectJson'
import { RegionBackupSizeCache } from '../../export/regionBackupSize'
import { createEditorStore } from '../../state/editorStore'
import type { AuthorMap } from '../mapCellEdits'
import { type AutomapBook, readAutomapBook } from './book'
import { checkAutomapBindings } from './engine'
import {
  type AutomapEditorMap,
  type AutomapRegionEditorDocument,
  isAutomapEditorMap,
} from './model'
import {
  type AutomapGallery,
  automapDocumentEnvelope,
  automapSheetIndex,
  decodeAutomapGallery,
  encodeAutomapGallery,
} from './native'
import type { AutomapRepository } from './repository'

export { type AutomapEditorMap, isAutomapEditorMap } from './model'

export interface AutomapEditorOptions {
  gallery: AutomapGallery
  mapId: string
  repository: AutomapRepository
  autosaveDelayMs?: number
}
function mapContent(asset: AutomapEditorMap): TilemapAsset {
  const { schema: _schema, automapping: _book, ...body } = asset
  return withPintaSchemaStamp(body)
}

async function openAutomapDocument({ mapId, repository, gallery: initial }: AutomapEditorOptions) {
  let expected = await repository.read()
  const gallery = expected === null ? initial : await decodeAutomapGallery(expected)
  if (!gallery) throw Error('O arquivo preservado não é um mapa de regras compatível.')
  const map = gallery.assets.find((asset) => asset.id === mapId)
  const book: AutomapBook = gallery.books.get(mapId) ?? {
    format: 'pinta-regras',
    version: 1,
    seed: 1,
    rules: [],
  }
  if (map?.kind !== 'tilemap') throw Error('O mapa de regras não está na galeria.')
  const sheets = await automapSheetIndex(map, gallery.assets)
  const sizes = new RegionBackupSizeCache()
  const validated = new WeakSet<AutomapBook>()
  function snapshot(candidate: AuthorMap, rules: AutomapBook) {
    const assets = gallery!.assets.map((item) => (item.id === mapId ? candidate : item))
    const books = new Map(gallery!.books)
    books.set(mapId, rules)
    return { assets, books }
  }
  function accepts(candidate: AuthorMap, rules: AutomapBook) {
    if (candidate.id !== mapId || !rules || typeof rules !== 'object') return false
    if (!validated.has(rules)) {
      if (!readAutomapBook(JSON.stringify(rules))) return false
      validated.add(rules)
    }
    if (checkAutomapBindings(candidate, rules, sheets)) return false
    const next = snapshot(candidate, rules)
    return (
      sizes.byteLength(next.assets, (assets) => automapDocumentEnvelope(assets, next.books)) <=
      MAX_BACKUP_FILE_BYTES
    )
  }
  if (!accepts(map, book))
    throw Error('As regras, os recursos ou o tamanho deste mapa são incompatíveis.')
  async function persist(candidate: AuthorMap, rules: AutomapBook) {
    const text = await encodeAutomapGallery(snapshot(candidate, rules))
    if (!text) throw Error('O mapa e suas regras não puderam ser gravados juntos.')
    if (!(await repository.compareAndSet(expected, text)))
      throw Error('O mapa mudou em outra janela. A edição continua aberta para recuperação.')
    expected = text
  }
  return { map, book, accepts, persist }
}

/** The dense workshop reads a qualified map. History and autosave operate on the whole document. */
export async function createAutomapEditor(options: AutomapEditorOptions) {
  const host = await openAutomapDocument(options)
  if ('origin' in host.map) throw Error('Abra este mapa no editor de regiões.')
  return createEditorStore<PintaAsset>({
    asset: { ...host.map, schema: 9, automapping: host.book } as AutomapEditorMap,
    acceptEdit: (asset) =>
      isAutomapEditorMap(asset) && host.accepts(mapContent(asset), asset.automapping),
    autosaveDelayMs: options.autosaveDelayMs,
    persist: async (asset) => {
      if (!isAutomapEditorMap(asset)) throw Error('O gravador exige o documento de regras.')
      await host.persist(mapContent(asset), asset.automapping)
    },
  })
}

/** The regional editor keeps chunks, origin and rulebook in the same undo and persistence record. */
export async function createAutomapRegionEditor(options: AutomapEditorOptions) {
  const host = await openAutomapDocument(options)
  if (!('origin' in host.map)) throw Error('Abra este mapa na oficina de mapas.')
  return createEditorStore<AutomapRegionEditorDocument>({
    asset: {
      kind: 'automap-document',
      schema: 9,
      id: host.map.id,
      updatedAt: host.map.updatedAt,
      map: host.map,
      book: host.book,
    },
    acceptEdit: (doc) =>
      doc.kind === 'automap-document' &&
      doc.schema === 9 &&
      doc.map.id === doc.id &&
      host.accepts(doc.map, doc.book),
    autosaveDelayMs: options.autosaveDelayMs,
    persist: (doc) => host.persist({ ...doc.map, updatedAt: doc.updatedAt }, doc.book),
  })
}
