/**
 * Backup completo da galeria — `.pinta.json`: todos os assets do perfil com os
 * bitmaps em RLE+base64 (`core/bitmapCodec.ts`) e as células dos tilemaps como
 * arrays. O import devolve `{ assets, warnings }` (padrão studio: nunca lança,
 * descarta o inválido AVISANDO) e o chamador re-persiste com ids/nomes tratados.
 */
import { decodeBitmap, type EncodedBitmap, encodeBitmap } from '../core/bitmapCodec'
import { type PintaAsset, sanitizePintaAsset } from '../core/project'

const FORMAT = 'pinta-gallery'
const VERSION = 1
const UTF8 = new TextEncoder()
const JSON_HEADER = [
  '{',
  `  "format": ${JSON.stringify(FORMAT)},`,
  `  "version": ${VERSION},`,
  '  "assets": [',
].join('\n')
const EMPTY_JSON = `${JSON_HEADER}]\n}`
const NON_EMPTY_PREFIX = `${JSON_HEADER}\n`
const NON_EMPTY_SUFFIX = '\n  ]\n}'
const ASSET_SEPARATOR = ',\n'

interface EncodedAssetBase {
  id: string
  kind: string
  name: string
  createdAt: number
  updatedAt: number
  paletteId?: string
}

/** Um asset com os bitmaps CODIFICADOS (estrutura espelha o modelo). */
type EncodedAsset = EncodedAssetBase & Record<string, unknown>

function encodeAsset(asset: PintaAsset): EncodedAsset {
  switch (asset.kind) {
    // Backup PRESERVA as camadas (não achata): um quadro é a lista de cels.
    case 'pixel-sprite':
      return {
        ...asset,
        animations: asset.animations.map((a) => ({
          ...a,
          frames: a.frames.map((cels) => cels.map((cel) => encodeBitmap(cel))),
        })),
      }
    case 'pixel-background':
      return { ...asset, cels: asset.cels.map((cel) => encodeBitmap(cel)) }
    case 'tileset':
      return { ...asset, tiles: asset.tiles.map((t) => encodeBitmap(t)) }
    case 'tilemap':
      return {
        ...asset,
        layers: asset.layers.map((l) => ({ ...l, cells: Array.from(l.cells) })),
      }
    // Shapes vetoriais já são JSON puro — passam direto, sem codec.
    case 'vector-sprite':
    case 'vector-background':
    case 'vector-tileset':
      return { ...asset }
  }
}

function utf8ByteLength(value: string): number {
  return UTF8.encode(value).byteLength
}

/** Um asset com a indentação exata que ocupa dentro de `assets: [...]`. */
function assetJsonFragment(asset: PintaAsset): string {
  return JSON.stringify(encodeAsset(asset), null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
}

const EMPTY_JSON_BYTES = utf8ByteLength(EMPTY_JSON)
const NON_EMPTY_FIXED_BYTES = utf8ByteLength(NON_EMPTY_PREFIX) + utf8ByteLength(NON_EMPTY_SUFFIX)
const ASSET_SEPARATOR_BYTES = utf8ByteLength(ASSET_SEPARATOR)

interface CachedAssetBytes {
  updatedAt: number
  bytes: number
}

/** Um asset do inventário: bytes medidos, ou PENDENTES (o asset fica guardado até medir). */
interface InventoryEntry {
  updatedAt: number
  bytes: number | null
  asset: PintaAsset | null
}

/**
 * Medidor incremental do backup. A chave `{id, updatedAt}` cobre leituras do
 * IndexedDB; `refreshIds` força os assets recebidos numa mutação, inclusive se
 * um chamador externo reutilizar o mesmo timestamp com conteúdo diferente.
 *
 * INVENTÁRIO (revisão de desempenho, 19/08/2026): além do cache por asset, o medidor
 * guarda a galeria INTEIRA (`seed` na carga da galeria) com um total corrente, para o
 * autosave projetar o orçamento com `totalBytes() − bytes(tocados) + bytes(novos)` SEM
 * reler e sanitizar a galeria do IndexedDB a cada gravação (antes: 500 desenhos ×
 * 1 autosave/s = 500 registros crus relidos por segundo enquanto a criança desenhava).
 * Os bytes de cada asset são medidos sob demanda (ou em fatias ociosas, `warmUp`), então
 * semear é barato e o custo da medição sai do primeiro traço da criança.
 */
export class GalleryBackupSizeCache {
  readonly #assets = new Map<string, CachedAssetBytes>()
  readonly #inventory = new Map<string, InventoryEntry>()
  #seeded = false

  byteLength(assets: readonly PintaAsset[], refreshIds: ReadonlySet<string> = new Set()): number {
    if (assets.length === 0) return EMPTY_JSON_BYTES
    let bytes = NON_EMPTY_FIXED_BYTES + ASSET_SEPARATOR_BYTES * (assets.length - 1)
    for (const asset of assets) bytes += this.#measure(asset, refreshIds.has(asset.id))
    return bytes
  }

  invalidate(ids: Iterable<string>): void {
    for (const id of ids) this.#assets.delete(id)
  }

  /** O inventário já representa a galeria? (`seed` já rodou.) */
  get seeded(): boolean {
    return this.#seeded
  }

  /** Quantos itens do inventário ainda não foram medidos. */
  get pendingCount(): number {
    let pending = 0
    for (const entry of this.#inventory.values()) if (entry.bytes === null) pending += 1
    return pending
  }

  /**
   * Substitui o inventário pela galeria dada (a carga da galeria, ou a primeira gravação
   * sem carga). Bytes já medidos para o mesmo `{id, updatedAt}` são reaproveitados; o
   * resto fica PENDENTE (medido em `totalBytes`/`warmUp`).
   */
  seed(assets: readonly PintaAsset[]): void {
    this.#inventory.clear()
    for (const asset of assets) this.#inventoryEntry(asset)
    this.#seeded = true
  }

  /**
   * Alinha o inventário aos ids que existem no disco (outra aba/descida de outra instância
   * gravou ou apagou): ids novos entram via `loadMissing` (só eles são lidos), ids sumidos saem.
   */
  async syncIds(
    ids: Iterable<string>,
    loadMissing: (missing: readonly string[]) => Promise<readonly PintaAsset[]>,
  ): Promise<void> {
    const present = new Set(ids)
    for (const id of [...this.#inventory.keys()]) if (!present.has(id)) this.#inventory.delete(id)
    const missing = [...present].filter((id) => !this.#inventory.has(id))
    if (missing.length === 0) return
    for (const asset of await loadMissing(missing)) this.#inventoryEntry(asset)
  }

  /** O backup da galeria como está no inventário (mede o que ainda estiver pendente). */
  totalBytes(): number {
    if (this.#inventory.size === 0) return EMPTY_JSON_BYTES
    let bytes = NON_EMPTY_FIXED_BYTES + ASSET_SEPARATOR_BYTES * (this.#inventory.size - 1)
    for (const entry of this.#inventory.values()) bytes += this.#entryBytes(entry)
    return bytes
  }

  /**
   * O backup DEPOIS de gravar `changed` (substituindo/adicionando), SEM mexer no inventário.
   * Os tocados são medidos de novo (é a mutação: o conteúdo mudou).
   */
  projectedBytes(changed: readonly PintaAsset[]): number {
    const changedIds = new Set(changed.map((asset) => asset.id))
    let count = 0
    let bytes = 0
    for (const [id, entry] of this.#inventory) {
      if (changedIds.has(id)) continue
      count += 1
      bytes += this.#entryBytes(entry)
    }
    for (const asset of changed) {
      count += 1
      bytes += this.#measure(asset, true)
    }
    if (count === 0) return EMPTY_JSON_BYTES
    return NON_EMPTY_FIXED_BYTES + ASSET_SEPARATOR_BYTES * (count - 1) + bytes
  }

  /** A gravação de `changed` deu certo: entram no inventário com os bytes já medidos. */
  commit(changed: readonly PintaAsset[]): void {
    for (const asset of changed) {
      const bytes = this.#measure(asset, false)
      this.#inventory.set(asset.id, { updatedAt: asset.updatedAt, bytes, asset: null })
    }
  }

  remove(id: string): void {
    this.#inventory.delete(id)
    this.#assets.delete(id)
  }

  /**
   * Mede os pendentes em fatias (`deadline` = ms de orçamento por fatia; devolve `true`
   * quando acabou). Para rodar em tempo ocioso depois da carga da galeria.
   */
  warmUp(deadlineMs = 8, now: () => number = () => performance.now()): boolean {
    const start = now()
    for (const entry of this.#inventory.values()) {
      if (entry.bytes !== null) continue
      this.#entryBytes(entry)
      if (now() - start > deadlineMs) return false
    }
    return true
  }

  #inventoryEntry(asset: PintaAsset): void {
    const cached = this.#assets.get(asset.id)
    const known = cached?.updatedAt === asset.updatedAt ? cached.bytes : null
    this.#inventory.set(asset.id, {
      updatedAt: asset.updatedAt,
      bytes: known,
      asset: known === null ? asset : null,
    })
  }

  #entryBytes(entry: InventoryEntry): number {
    if (entry.bytes !== null) return entry.bytes
    // Pendente: mede agora e solta a referência ao asset.
    const bytes = entry.asset ? this.#measure(entry.asset, false) : 0
    entry.bytes = bytes
    entry.asset = null
    return bytes
  }

  #measure(asset: PintaAsset, force: boolean): number {
    const cached = this.#assets.get(asset.id)
    if (!force && cached?.updatedAt === asset.updatedAt) return cached.bytes
    const fragmentBytes = utf8ByteLength(assetJsonFragment(asset))
    this.#assets.set(asset.id, { updatedAt: asset.updatedAt, bytes: fragmentBytes })
    return fragmentBytes
  }
}

/**
 * Um quadro de pixel do backup → lista de cels. Aceita o formato ANTIGO (um
 * bitmap solto, antes das camadas): o sanitize também tolera, mas normalizar
 * aqui deixa o decode previsível.
 */
function decodeFrame(raw: unknown): unknown[] {
  const list = Array.isArray(raw) ? raw : [raw]
  return list.map((cel) => decodeBitmap(cel as EncodedBitmap))
}

/** Reverte a codificação p/ o shape que o `sanitizePintaAsset` valida. */
function decodeAsset(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const a = raw as Record<string, unknown>
  switch (a.kind) {
    case 'pixel-sprite': {
      if (!Array.isArray(a.animations)) return a
      return {
        ...a,
        animations: a.animations.map((animation) => {
          if (!animation || typeof animation !== 'object') return animation
          const anim = animation as Record<string, unknown>
          if (!Array.isArray(anim.frames)) return anim
          // Backup ANTIGO: o quadro era um bitmap só (o sanitize também aceita).
          return { ...anim, frames: anim.frames.map((f) => decodeFrame(f)) }
        }),
      }
    }
    case 'pixel-background':
      return { ...a, cels: decodeFrame(a.cels ?? a.bitmap) }
    case 'tileset':
      return {
        ...a,
        tiles: Array.isArray(a.tiles) ? a.tiles.map((t) => decodeBitmap(t)) : [],
      }
    case 'tilemap': {
      if (!Array.isArray(a.layers)) return a
      return {
        ...a,
        layers: a.layers.map((layer) => {
          if (!layer || typeof layer !== 'object') return layer
          const l = layer as Record<string, unknown>
          return { ...l }
        }),
      }
    }
    default:
      return a
  }
}

/** Teto do arquivo comprimido em texto antes de carregá-lo inteiro na memória. */
export const MAX_BACKUP_FILE_BYTES = 32 * 1024 * 1024

/** A galeria inteira → texto do `.pinta.json`. */
export function galleryToPintaJson(assets: PintaAsset[]): string {
  if (assets.length === 0) return EMPTY_JSON
  return `${NON_EMPTY_PREFIX}${assets.map(assetJsonFragment).join(ASSET_SEPARATOR)}${NON_EMPTY_SUFFIX}`
}

/** Tamanho EXATO do backup que a galeria produziria, medido em bytes UTF-8. */
export function galleryBackupByteLength(assets: PintaAsset[]): number {
  return new GalleryBackupSizeCache().byteLength(assets)
}

export interface PintaImportResult {
  assets: PintaAsset[]
  /** Descartes explicados (padrão studio: nada some em silêncio). */
  warnings: string[]
}

/** Parse + decode + sanitize. NUNCA lança. */
export function importPintaJson(text: string): PintaImportResult {
  const warnings: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { assets: [], warnings: ['O arquivo não é um .pinta.json válido.'] }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { assets: [], warnings: ['O arquivo não é um .pinta.json válido.'] }
  }
  const doc = parsed as Record<string, unknown>
  if (doc.format !== FORMAT || !Array.isArray(doc.assets)) {
    return { assets: [], warnings: ['O arquivo não parece um backup do Pinta.'] }
  }
  if (doc.version !== VERSION) {
    return {
      assets: [],
      warnings: ['A versão deste backup não é compatível com esta versão do Pinta.'],
    }
  }
  const assets: PintaAsset[] = []
  for (const raw of doc.assets) {
    // Cinturão extra do contrato "nunca lança": um registro que exploda no
    // decode vira descarte-com-aviso, sem derrubar o restauro inteiro.
    let decoded: PintaAsset | null = null
    try {
      decoded = sanitizePintaAsset(decodeAsset(raw))
    } catch {
      decoded = null
    }
    if (decoded) {
      assets.push(decoded)
    } else {
      const name =
        raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string'
          ? ((raw as { name: string }).name ?? '')
          : ''
      warnings.push(
        name
          ? `O desenho "${name}" estava corrompido e foi pulado.`
          : 'Um desenho corrompido foi pulado.',
      )
    }
  }
  return { assets, warnings }
}
