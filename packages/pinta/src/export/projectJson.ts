/**
 * Backup completo da galeria — `.pinta.json`: todos os assets do perfil com os
 * bitmaps em RLE+base64 (`core/bitmapCodec.ts`) e as células dos tilemaps como
 * arrays. O import devolve `{ assets, warnings }` (padrão studio: nunca lança,
 * descarta o inválido AVISANDO) e o chamador re-persiste com ids/nomes tratados.
 */
import { decodeBitmap, type EncodedBitmap, encodeBitmap } from '../core/bitmapCodec'
import { PINTA_LIMITS, type PintaAsset, sanitizePintaAsset } from '../core/project'

const FORMAT = 'pinta-gallery'
const VERSION = 1

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
  return JSON.stringify(
    { format: FORMAT, version: VERSION, assets: assets.map((a) => encodeAsset(a)) },
    null,
    2,
  )
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
    if (assets.length >= PINTA_LIMITS.maxAssets) {
      warnings.push('O backup tem mais desenhos do que o limite; alguns ficaram de fora.')
      break
    }
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
