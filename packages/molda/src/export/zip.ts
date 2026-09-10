/**
 * "Baixar tudo": um ZIP com um arquivo PRONTO por criação, separado por tipo,
 * mais o backup completo re-importável e um LEIA-ME em português:
 *   modelos/<nome>.glb · texturas/<nome>.png · ceus/<nome>.hdr
 *   galeria.molda.json · LEIA-ME.txt
 * fflate carregado SOB DEMANDA (padrão do Pinta e do studio). Cada céu roda em
 * worker cancelável; os demais arquivos cedem a thread entre criações. O snapshot
 * da galeria não é alterado nem transferido durante a preparação.
 *
 * Uma criação que o Estúdio não aceitaria (modelo sem peça, atlas cheio, acima
 * do teto) fica FORA dos arquivos prontos, mas DENTRO do backup: o "Trazer de
 * volta" devolve tudo.
 */
import { COPY } from '../core/copy'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset, MoldaAssetKind } from '../core/model'
import { exportSkyHdrInWorker } from '../workers/skyExport'
import {
  MAX_BACKUP_FILE_BYTES,
  MAX_CLASSIC_ZIP_ENTRIES,
  MOLDA_GALLERY_ZIP_ENTRY,
} from './backupFormat'
import { exportModelGlb } from './modelGlb'
import { galleryToJsonText } from './projectJson'
import type { SkyHdrResult } from './skyHdr'
import { exportTexturePng } from './texturePng'

export const GALLERY_ZIP_FILE_NAME = 'minhas-criacoes-3d-molda.zip'
export const README_ENTRY = 'LEIA-ME.txt'

export type FileMap = Record<string, Uint8Array | string>

export interface SkippedEntry {
  name: string
  kind: MoldaAssetKind
  reason: 'empty' | 'atlas-full' | 'too-big'
}

export interface GalleryFileMapResult {
  files: FileMap
  readme: string[]
  skipped: SkippedEntry[]
}

export interface ZipGalleryOptions {
  /** Só para os testes: o céu num tamanho menor que o export real. */
  skySize?: { width: number; height: number }
  /** Cede a thread entre criações (default `setTimeout(0)`); `null` = não cede. */
  yieldBetween?: (() => Promise<void>) | null
  signal?: AbortSignal
  onProgress?: (progress: GalleryZipProgress) => void
  /** Tetos substituíveis em testes e integrações mais restritas. */
  maxEntries?: number
  maxReadyBytes?: number
  maxCompressedBytes?: number
  /**
   * As criações da geração seguinte, cada uma no arquivo NATIVO dela (o mesmo do
   * "Baixar projeto"). Elas não entram no envelope v1: o backup antigo continua sendo
   * exatamente o que sempre foi, e a volta delas é pela própria oficina.
   */
  scenes?: readonly { name: string; json: string }[]
}

export interface GalleryZipProgress {
  processed: number
  total: number
  readyBytes: number
  compressedBytes: number
}

export type GalleryZipErrorCode =
  | 'aborted'
  | 'too-many-entries'
  | 'ready-bytes'
  | 'compressed-bytes'

export class GalleryZipError extends Error {
  constructor(
    readonly code: GalleryZipErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'GalleryZipError'
  }
}

export const MAX_GALLERY_ZIP_READY_BYTES = MAX_BACKUP_FILE_BYTES * 2
export const MAX_GALLERY_ZIP_COMPRESSED_BYTES = MOLDA_LIMITS.maxGalleryBytes * 4

function defaultYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Nome de ARQUIVO dentro do ZIP. Os nomes já saem da galeria em kebab-case e
 * únicos; a régua só protege um registro fora do padrão de virar caminho.
 */
function safeEntryName(name: string, taken: Set<string>): string {
  const cleaned = name.replace(/[^a-z0-9-]/gi, '-').replace(/^-+|-+$/g, '') || 'criacao'
  let candidate = cleaned
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${cleaned}-${n}`
    n += 1
  }
  taken.add(candidate)
  return candidate
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GalleryZipError('aborted', 'A preparação do ZIP foi cancelada.')
}

type PreparedAsset =
  | { path: string; bytes: Uint8Array; readme: string }
  | { skipped: SkippedEntry; readme: string }

async function prepareAsset(
  asset: MoldaAsset,
  entryName: string,
  options: Pick<ZipGalleryOptions, 'skySize' | 'signal'>,
): Promise<PreparedAsset> {
  switch (asset.kind) {
    case 'model': {
      const result = exportModelGlb(asset)
      if (!result.ok) {
        return {
          skipped: { name: asset.name, kind: asset.kind, reason: result.reason },
          readme: COPY.gallery.readme.skipped(COPY.kinds.model.title, asset.name),
        }
      }
      return {
        path: `modelos/${entryName}.glb`,
        bytes: result.bytes,
        readme: COPY.gallery.readme.model(
          asset.name,
          entryName,
          asset.parts.length,
          result.triangles,
        ),
      }
    }
    case 'texture': {
      const result = exportTexturePng(asset)
      if (!result.ok) {
        return {
          skipped: { name: asset.name, kind: asset.kind, reason: result.reason },
          readme: COPY.gallery.readme.skipped(COPY.kinds.texture.title, asset.name),
        }
      }
      return {
        path: `texturas/${entryName}.png`,
        bytes: result.bytes,
        readme: COPY.gallery.readme.texture(asset.name, entryName, asset.size),
      }
    }
    case 'sky': {
      let result: SkyHdrResult
      try {
        result = await exportSkyHdrInWorker(asset, {
          size: options.skySize,
          signal: options.signal,
        })
      } catch (error) {
        throwIfAborted(options.signal)
        throw error
      }
      if (!result.ok) {
        return {
          skipped: { name: asset.name, kind: asset.kind, reason: result.reason },
          readme: COPY.gallery.readme.skipped(COPY.kinds.sky.title, asset.name),
        }
      }
      return {
        path: `ceus/${entryName}.hdr`,
        bytes: result.bytes,
        readme: COPY.gallery.readme.sky(asset.name, entryName, result.width, result.height),
      }
    }
  }
}

export async function buildGalleryFileMap(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<GalleryFileMapResult> {
  const yieldBetween = options.yieldBetween === undefined ? defaultYield : options.yieldBetween
  const files: FileMap = {}
  const readme: string[] = [...COPY.gallery.readme.intro, '']
  const skipped: SkippedEntry[] = []
  const taken = new Set<string>()

  throwIfAborted(options.signal)

  for (const [index, asset] of assets.entries()) {
    if (index > 0 && yieldBetween) await yieldBetween()
    const entryName = safeEntryName(asset.name, taken)
    throwIfAborted(options.signal)
    const prepared = await prepareAsset(asset, entryName, options)
    readme.push(prepared.readme)
    if ('skipped' in prepared) skipped.push(prepared.skipped)
    else files[prepared.path] = prepared.bytes
  }

  throwIfAborted(options.signal)
  files[MOLDA_GALLERY_ZIP_ENTRY] = galleryToJsonText(assets)
  return { files, readme, skipped }
}

interface GalleryZipChunks {
  chunks: Uint8Array[]
  compressedBytes: number
}

/** Produz o ZIP uma entrada de cada vez; só os chunks comprimidos permanecem vivos. */
async function buildGalleryZipChunks(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<GalleryZipChunks> {
  throwIfAborted(options.signal)
  const { strToU8, Zip, ZipDeflate } = await import('fflate')
  const yieldBetween = options.yieldBetween === undefined ? defaultYield : options.yieldBetween
  const maxEntries = options.maxEntries ?? MAX_CLASSIC_ZIP_ENTRIES
  const maxReadyBytes = options.maxReadyBytes ?? MAX_GALLERY_ZIP_READY_BYTES
  const maxCompressedBytes = options.maxCompressedBytes ?? MAX_GALLERY_ZIP_COMPRESSED_BYTES
  const chunks: Uint8Array[] = []
  const readme: string[] = [...COPY.gallery.readme.intro, '']
  const taken = new Set<string>()
  let entryCount = 0
  let readyBytes = 0
  let compressedBytes = 0
  let settled = false
  let callbackFailure: Error | null = null
  let resolveDone: (() => void) | undefined
  let rejectDone: ((error: Error) => void) | undefined
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })
  // A compressão pode recusar durante `entry.push`, antes de chegarmos ao `await done`.
  // Registra o observador já aqui para essa rejeição nunca virar unhandled.
  void done.catch(() => undefined)
  const zip = new Zip((error, data, final) => {
    if (settled) return
    if (error) {
      settled = true
      rejectDone?.(error)
      return
    }
    compressedBytes += data.byteLength
    if (compressedBytes > maxCompressedBytes) {
      callbackFailure = new GalleryZipError(
        'compressed-bytes',
        'O ZIP comprimido passou do limite seguro.',
      )
      settled = true
      zip.terminate()
      rejectDone?.(callbackFailure)
      return
    }
    chunks.push(data)
    if (final) {
      settled = true
      resolveDone?.()
    }
  })

  const add = (path: string, bytes: Uint8Array) => {
    throwIfAborted(options.signal)
    entryCount += 1
    if (entryCount > maxEntries) {
      throw new GalleryZipError('too-many-entries', 'O ZIP passou do limite seguro de arquivos.')
    }
    readyBytes += bytes.byteLength
    if (readyBytes > maxReadyBytes) {
      throw new GalleryZipError('ready-bytes', 'Os arquivos prontos passaram do limite seguro.')
    }
    const entry = new ZipDeflate(path, { level: 6 })
    zip.add(entry)
    entry.push(bytes, true)
    if (callbackFailure) throw callbackFailure
  }

  try {
    for (const [index, asset] of assets.entries()) {
      if (index > 0 && yieldBetween) await yieldBetween()
      throwIfAborted(options.signal)
      const prepared = await prepareAsset(asset, safeEntryName(asset.name, taken), options)
      readme.push(prepared.readme)
      if (!('skipped' in prepared)) add(prepared.path, prepared.bytes)
      options.onProgress?.({
        processed: index + 1,
        total: assets.length,
        readyBytes,
        compressedBytes,
      })
    }
    for (const [index, scene] of (options.scenes ?? []).entries()) {
      if (yieldBetween) await yieldBetween()
      throwIfAborted(options.signal)
      const file = safeEntryName(scene.name, taken)
      add(`projetos/${file}.molda.json`, strToU8(scene.json))
      readme.push(COPY.gallery.readme.project(scene.name, file))
      options.onProgress?.({
        processed: assets.length + index + 1,
        total: assets.length + (options.scenes?.length ?? 0),
        readyBytes,
        compressedBytes,
      })
    }
    add(MOLDA_GALLERY_ZIP_ENTRY, strToU8(galleryToJsonText(assets)))
    add(README_ENTRY, strToU8(readme.join('\n')))
    throwIfAborted(options.signal)
    zip.end()
    await done
    // O total inclui a geração seguinte: repetir só `assets.length` fazia o contador do
    // botão andar para TRÁS (5/5 e depois 3/5) no instante antes de sumir.
    const total = assets.length + (options.scenes?.length ?? 0)
    options.onProgress?.({ processed: total, total, readyBytes, compressedBytes })
    return { chunks, compressedBytes }
  } catch (error) {
    if (!settled) zip.terminate()
    if (options.signal?.aborted && !(error instanceof GalleryZipError)) {
      throw new GalleryZipError('aborted', 'A preparação do ZIP foi cancelada.')
    }
    throw error
  }
}

/** Caminho do navegador: o Blob recebe os chunks sem uma concatenação binária extra. */
export async function zipGalleryBlob(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<Blob> {
  const { chunks } = await buildGalleryZipChunks(assets, options)
  return new Blob(chunks as unknown as BlobPart[], { type: 'application/zip' })
}

/** API histórica para testes/importadores que precisam dos bytes contíguos. */
export async function zipGallery(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<Uint8Array> {
  const { chunks, compressedBytes } = await buildGalleryZipChunks(assets, options)
  const out = new Uint8Array(compressedBytes)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}
