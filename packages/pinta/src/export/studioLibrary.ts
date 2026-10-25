/**
 * Galeria PARA O ESTÚDIO (subpath `@sistemazero/pinta/studio-library`) — o lado
 * de dados do fluxo "Trazer do Pinta": o Estúdio lista TODOS os desenhos do
 * perfil (resumos com miniatura leve) e importa um por id, sem o foguete.
 *
 * Consumido SÓ pelo host (community-kids), nunca pelo <PintaApp>: zero React
 * aqui dentro, para o import dinâmico do host não puxar o app inteiro. O
 * Estúdio declara tipos-espelho do lado de lá e o host liga as pontas
 * (invariante "zero import pinta↔studio", a mesma da ponte do foguete).
 */
import type {
  PintaImageDerivation,
  PintaImageRecipe,
  PintaImageSelectionKind,
  PintaImageSelectionSummary,
  PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
import {
  assetRole,
  assetStyle,
  isTilesetKind,
  type PintaAsset,
  type PintaAssetRole,
  type PintaAssetStyle,
  remapTilemapTilesetIds,
  resolveAssetPalette,
  sanitizeSourceRef,
  tilemapTilesetIds,
  type VectorFrame,
} from '../core/project'
import type { PintaExportedAsset } from '../core/types'
import { flattenCels } from '../pixel/layers'
import { planImport } from '../state/importPlan'
import {
  capturePintaAssetForImage,
  createPintaPersistence,
  getPintaStorageNamespace,
  isPintaStorageBudgetError,
} from '../state/persistence'
import { collectMapTilesets } from '../tiles/mapTilesets'
import { tilemapThumbnail } from '../tiles/renderTilemap'
import { vectorTilemapPortableSvg } from '../tiles/renderVectorTilemap'
import { visibleShapes } from '../vector/model'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { mapAtlasSourceSize, spritesheetSourceSize, tilesetSourceSize } from './portableImageData'
import { importPintaJson } from './projectJson'
import { buildStudioPayload, validateStudioPayloadSize } from './studioBridge'

export { capturePintaAssetForImage, setPintaStorageNamespace } from '../state/persistence'
export type { PintaPortableImage } from './portableImage'
export type { PintaExportedAsset }

/** Native fingerprints only. No canvas, export or personal-library write. `selection` is the
 * kind being checked: a `map` depends on every tileset of the map, the flat `tilemap` only on
 * the default one (absent = the historical answer, the default tileset for a map). */
export async function inspectImageForStudio(
  drawingId: string,
  options: { namespace?: string; signal?: AbortSignal; selection?: PintaImageSelectionKind } = {},
): Promise<PintaImageDerivation['provenance']> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const selection = options.selection
  signal?.throwIfAborted()
  const { inspectPintaImageForStudio } = await import('./portableImage')
  signal?.throwIfAborted()
  return inspectPintaImageForStudio(drawingId, {
    namespace,
    signal,
    ...(selection ? { selection } : {}),
  })
}

/** Loaded only when a host explicitly requests a portable image (PNG, or SVG when the recipe
 * asks for it); legacy JS exports stay unchanged. */
export async function exportImageForStudio(
  recipe: PintaImageRecipe,
  limits: PintaImageTargetLimits,
  options: {
    namespace?: string
    signal?: AbortSignal
    expectedProvenance?: PintaImageDerivation['provenance']
  } = {},
) {
  const input = structuredClone({
    recipe,
    limits,
    expectedProvenance: options.expectedProvenance,
  })
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const { exportPintaImageForStudio } = await import('./portableImage')
  signal?.throwIfAborted()
  return exportPintaImageForStudio(input.recipe, input.limits, {
    namespace,
    signal,
    expectedProvenance: input.expectedProvenance,
  })
}

/** The personal library keeps the JS representation; the project receives its selected PNG.
 * Both are derived from the very same native source/dependency transaction. */
export async function exportImageAndSourceForStudio(
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<
  | (Extract<ExportForStudioResult, { ok: true }> & {
      image: import('./portableImage').PintaPortableImage
    })
  | Extract<ExportForStudioResult, { ok: false }>
  | { ok: false; reason: 'source-changed' }
> {
  const { recipe, limits } = structuredClone({ recipe: recipeInput, limits: limitsInput })
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const captured = await capturePintaAssetForImage(recipe.drawingId, { namespace, signal })
  signal?.throwIfAborted()
  if (!captured.ok)
    return captured.reason === 'needs-tileset'
      ? { ok: false, reason: 'needs-tileset', message: NEEDS_TILESET_MESSAGE }
      : { ok: false, reason: captured.reason }
  const { deriveLoadedPintaImage } = await import('./portableImage')
  signal?.throwIfAborted()
  const image = await deriveLoadedPintaImage(captured.source, recipe, limits, {
    tilesets: captured.tilesets,
    signal,
  })
  signal?.throwIfAborted()
  // Todas as peças do mapa, como no caminho da galeria (`exportAssetForStudio`): o registro da
  // biblioteca pessoal é o mesmo, venha o desenho pela imagem ou pela ponte.
  const canonical = await exportResolvedForStudio(captured.source, captured.tilesets)
  signal?.throwIfAborted()
  return canonical.ok ? { ...canonical, image } : canonical
}

export interface StudioImportedDrawing {
  /** O id do documento no JSON de origem (o do jogo de exemplo). */
  sourceId: string
  /** O id do desenho na galeria do perfil. */
  id: string
  /** O nome na galeria (pode ter ganhado sufixo, como no restauro). */
  name: string
  /** A cópia já existia na galeria (de uma edição anterior) e foi reaproveitada. */
  reused: boolean
  /** Os fatos para escolher a imagem do Estúdio (a mesma régua do `listGalleryForStudio`). */
  imageSelection: PintaImageSelectionSummary
}

export type ImportDrawingsForStudioResult =
  | { ok: true; drawings: StudioImportedDrawing[] }
  | { ok: false; reason: 'invalid' | 'not-found' | 'storage'; message: string }

/** A marca de origem de um documento do arquivo: `<origem>/<id do documento>`. */
function studioSourceRef(origin: string, sourceId: string): string | undefined {
  return sanitizeSourceRef(`${origin}/${sourceId}`)
}

/**
 * Uma importação por vez em cada banco. A importação lê a galeria, decide o que reaproveitar e
 * só depois grava: duas chamadas juntas ("Editar" no mapa e logo nas peças dele) liam a mesma
 * galeria, sem a cópia da outra, e nasciam DUAS cópias do mesmo documento (pintar uma não mudava
 * o mapa). A fila FIFO cobre esta aba (como a das gravações, `runSerializedWrite`); entre ABAS,
 * a trava nomeada do navegador (Web Locks), quando ele tem. Sem ela, a escolha da cópia
 * (`pickCopy`) converge para UMA na importação seguinte e não cria mais nenhuma.
 */
const importChains = new Map<string, Promise<void>>()

function crossTabLocked<T>(namespace: string, task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (!locks || typeof locks.request !== 'function') return task()
  return locks.request(`pinta:studio-import:${namespace}`, task) as Promise<T>
}

function serializeImport<T>(namespace: string, task: () => Promise<T>): Promise<T> {
  const run = () => crossTabLocked(namespace, task)
  const previous = importChains.get(namespace)
  const next = previous ? previous.then(run, run) : run()
  const settled: Promise<void> = next.then(
    () => undefined,
    () => undefined,
  )
  importChains.set(namespace, settled)
  void settled.then(() => {
    if (importChains.get(namespace) === settled) importChains.delete(namespace)
  })
  return next
}

/**
 * Entre as cópias de um documento (da mais nova à mais antiga), a que serve: a mais recente
 * COMPATÍVEL (uma incompatível mais nova não esconde uma compatível mais antiga, senão cada
 * "Editar" criava outra). Nas peças, vence antes a cópia que um mapa copiado já usa: com cópias
 * repetidas (duas abas ao mesmo tempo), o "Editar" das peças cai nas peças do mapa, e todo
 * pedido seguinte escolhe a mesma.
 */
function pickCopy(
  candidates: readonly PintaAsset[] | undefined,
  source: PintaAsset,
  gallery: Map<string, PintaAsset>,
  usedByCopiedMaps: ReadonlySet<string>,
): PintaAsset | undefined {
  const compatible = (candidates ?? []).filter((copy) => reusable(copy, source, gallery))
  return compatible.find((copy) => usedByCopiedMaps.has(copy.id)) ?? compatible[0]
}

/**
 * A cópia já guardada pode SER este documento? Mesmo tipo; nas peças, o mesmo tamanho (a
 * grade do mapa é uma só); num mapa, as peças padrão dele ainda na galeria (sem elas a
 * imagem do mapa não sai).
 */
function reusable(copy: PintaAsset, source: PintaAsset, gallery: Map<string, PintaAsset>): boolean {
  if (copy.kind !== source.kind) return false
  if (isTilesetKind(copy) && isTilesetKind(source)) return copy.tileSize === source.tileSize
  if (copy.kind === 'tilemap') {
    const tileset = gallery.get(copy.tilesetId)
    return !!tileset && isTilesetKind(tileset)
  }
  return true
}

/**
 * Copia desenhos de um `.pinta.json` (os documentos de um jogo de exemplo) para a galeria do
 * perfil, só os pedidos por id: um MAPA leva junto as peças que ele usa (padrão e camadas, as
 * que vieram no arquivo); o resto, só o próprio documento.
 *
 * ⭐ Uma cópia por documento: com `origin`, cada cópia guarda de onde veio (`sourceRef`) e um
 * documento que JÁ tem cópia compatível na galeria é REAPROVEITADO — dois mapas sobre as
 * mesmas peças usam o MESMO conjunto, e pintar uma peça muda os dois. A cópia apagada (ou
 * incompatível) dá lugar a uma nova. O que é novo ganha id novo e nome único contra a galeria
 * (o plano do restauro, `planImport`), numa gravação atômica; os mapas novos apontam para as
 * peças novas OU reaproveitadas. A escolha entre cópias repetidas é a de `pickCopy`, e duas
 * importações nunca correm juntas no mesmo banco (`serializeImport`).
 */
export async function importDrawingsForStudio(
  json: string,
  sourceIds: readonly string[],
  options: { namespace?: string; signal?: AbortSignal; origin?: string } = {},
): Promise<ImportDrawingsForStudioResult> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  options.signal?.throwIfAborted()
  return serializeImport(namespace, () => importDrawingsNow(json, sourceIds, namespace, options))
}

async function importDrawingsNow(
  json: string,
  sourceIds: readonly string[],
  namespace: string,
  options: { signal?: AbortSignal; origin?: string },
): Promise<ImportDrawingsForStudioResult> {
  const signal = options.signal
  const origin = options.origin
  const wanted = [...new Set(sourceIds)]
  signal?.throwIfAborted()
  const parsed = importPintaJson(json)
  if (parsed.assets.length === 0 || parsed.warnings.length > 0)
    return {
      ok: false,
      reason: 'invalid',
      message: 'Os desenhos deste jogo não puderam ser lidos.',
    }
  const byId = new Map(parsed.assets.map((asset) => [asset.id, asset]))
  if (wanted.length === 0 || wanted.some((id) => !byId.has(id)))
    return { ok: false, reason: 'not-found', message: 'Este desenho não está entre os do jogo.' }
  // O pedido + as peças dos mapas pedidos, tilesets primeiro (o plano religa os mapas a elas).
  const chosen = new Map<string, PintaAsset>()
  for (const id of wanted) {
    const asset = byId.get(id)!
    if (asset.kind === 'tilemap')
      for (const tilesetId of tilemapTilesetIds(asset)) {
        const tileset = byId.get(tilesetId)
        if (tileset && isTilesetKind(tileset)) chosen.set(tilesetId, tileset)
      }
    chosen.set(id, asset)
  }
  const ordered = [...chosen.values()].sort(
    (a, b) => (a.kind === 'tilemap' ? 1 : 0) - (b.kind === 'tilemap' ? 1 : 0),
  )
  const chosenTilesetIds = new Set(ordered.filter(isTilesetKind).map((asset) => asset.id))
  if (ordered.some((asset) => asset.kind === 'tilemap' && !chosenTilesetIds.has(asset.tilesetId)))
    return {
      ok: false,
      reason: 'invalid',
      message: 'O mapa deste jogo veio sem o conjunto de peças dele.',
    }
  const persistence = createPintaPersistence({ namespace })
  const current = await persistence.listAllAssets()
  signal?.throwIfAborted()
  const gallery = new Map(current.map((asset) => [asset.id, asset]))
  // As cópias de cada documento, da mais nova à mais antiga (a ordem da lista), e as peças que
  // os mapas copiados de exemplos já usam.
  const copies = new Map<string, PintaAsset[]>()
  const usedByCopiedMaps = new Set<string>()
  for (const asset of current) {
    if (!asset.sourceRef) continue
    const list = copies.get(asset.sourceRef)
    if (list) list.push(asset)
    else copies.set(asset.sourceRef, [asset])
    if (asset.kind === 'tilemap')
      for (const tilesetId of tilemapTilesetIds(asset)) usedByCopiedMaps.add(tilesetId)
  }
  // Peças primeiro: um mapa só é reaproveitado depois de as peças dele estarem resolvidas.
  const reused = new Map<string, PintaAsset>()
  for (const source of ordered) {
    const ref = origin ? studioSourceRef(origin, source.id) : undefined
    const copy = ref ? pickCopy(copies.get(ref), source, gallery, usedByCopiedMaps) : undefined
    if (copy) reused.set(source.id, copy)
  }
  // Peças pedidas só por um mapa que foi reaproveitado não são copiadas de novo.
  const needed = new Set(wanted)
  for (const id of wanted) {
    const asset = byId.get(id)!
    if (asset.kind === 'tilemap' && !reused.has(id))
      for (const tilesetId of tilemapTilesetIds(asset)) needed.add(tilesetId)
  }
  const incoming = ordered.filter((asset) => needed.has(asset.id) && !reused.has(asset.id))
  const incomingTilesetIds = new Set(incoming.filter(isTilesetKind).map((asset) => asset.id))
  const plan = planImport(incoming, incomingTilesetIds, new Set(current.map((a) => a.name)))
  if (plan.pairs.length !== incoming.length)
    return {
      ok: false,
      reason: 'storage',
      message: plan.error ?? 'Não deu para copiar os desenhos para a sua galeria.',
    }
  const restored = plan.pairs.map(({ source, restored: asset }) => {
    const sourceId = [...plan.idMap].find(([, id]) => id === source.id)?.[0]
    const ref = origin && sourceId ? studioSourceRef(origin, sourceId) : undefined
    // Um mapa novo aponta para as peças reaproveitadas (as novas o plano já religou).
    const linked =
      asset.kind === 'tilemap'
        ? remapTilemapTilesetIds(asset, (id) => reused.get(id)?.id ?? id)
        : asset
    return ref ? { ...linked, sourceRef: ref } : linked
  })
  if (restored.length > 0) {
    try {
      await persistence.persistAssets(restored)
    } catch (error) {
      return {
        ok: false,
        reason: 'storage',
        message: isPintaStorageBudgetError(error)
          ? 'A sua galeria do Pinta está cheia. Apague alguns desenhos e tente de novo.'
          : 'Não deu para guardar os desenhos na sua galeria agora. Tente de novo.',
      }
    }
  }
  signal?.throwIfAborted()
  for (const asset of restored) gallery.set(asset.id, asset)
  const findAsset = (id: string) => gallery.get(id) ?? null
  return {
    ok: true,
    drawings: wanted.map((sourceId) => {
      const copy = reused.get(sourceId)
      const asset = copy ?? gallery.get(plan.idMap.get(sourceId)!)!
      return {
        sourceId,
        id: asset.id,
        name: asset.name,
        reused: copy !== undefined,
        imageSelection: imageSelectionSummary(asset, findAsset),
      }
    }),
  }
}

/** Maior lado da MINIATURA raster (só prévia da lista — o import re-exporta). */
const THUMB_MAX_PX = 128

/**
 * Teto do dataUrl de miniatura SVG: um cenário vetorial com dezenas de shapes
 * pode crescer — acima disso rasteriza pequeno; falhou, a UI cai no emoji.
 */
const SVG_THUMB_MAX_CHARS = 100_000

export interface PintaGallerySummary {
  id: string
  name: string
  role: PintaAssetRole
  /** null = tilemap (papel dos dois estilos). */
  style: PintaAssetStyle | null
  updatedAt: number
  /** Nome do jogo do Pensa (asset.projectRef), quando o desenho é de um jogo. */
  projectName?: string
  /** PNG ou `data:image/svg+xml` pequeno; null = irrasterizável (UI usa emoji). */
  thumbDataUrl: string | null
  /** Requested only by hosts choosing a portable image; omitted for historical JS callers. */
  imageSelection?: PintaImageSelectionSummary
}

export type ExportForStudioResult =
  | { ok: true; asset: PintaExportedAsset }
  | { ok: false; reason: 'not-found' | 'raster-failed' | 'asset-too-big' | 'sheet-too-big' }
  /** Só do `exportLoadedAssetForStudio`: o mapa chegou SEM o conjunto de peças dele. */
  | { ok: false; reason: 'needs-tileset'; message: string }

/**
 * A frase do mapa que chegou sozinho (o "Trazer da equipe" baixa UM desenho por vez, e o
 * mapa só se desenha com as peças que ele aponta). Pronta para a tela da criança.
 */
export const NEEDS_TILESET_MESSAGE =
  'Este mapa de peças precisa do conjunto de peças dele, e o conjunto não veio junto.'

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** SVG pequeno vai como texto (zero canvas); grande demais rasteriza capado. */
async function svgThumb(svg: string, width: number, height: number): Promise<string | null> {
  const asText = svgDataUrl(svg)
  if (asText.length <= SVG_THUMB_MAX_CHARS) return asText
  const scale = Math.min(1, THUMB_MAX_PX / Math.max(width, height, 1))
  return svgToPngDataUrl(svg, width, height, scale)
}

async function thumbFor(
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): Promise<string | null> {
  switch (asset.kind) {
    case 'pixel-sprite': {
      const frame = asset.animations[0]?.frames[0]
      const flat = frame ? flattenCels(frame, asset.layers) : null
      return flat ? bitmapToPngDataUrl(flat, resolveAssetPalette(asset)) : null
    }
    case 'pixel-background': {
      const flat = flattenCels(asset.cels, asset.layers)
      return flat ? bitmapToPngDataUrl(flat, resolveAssetPalette(asset)) : null
    }
    case 'tileset': {
      const tile = asset.tiles[0]
      return tile ? bitmapToPngDataUrl(tile, resolveAssetPalette(asset)) : null
    }
    case 'vector-sprite': {
      const frame = asset.animations[0]?.frames[0] ?? []
      const svg = await vectorToPortableSvg({
        width: asset.frameWidth,
        height: asset.frameHeight,
        shapes: frame,
      })
      return svgThumb(svg, asset.frameWidth, asset.frameHeight)
    }
    case 'vector-background': {
      const svg = await vectorToPortableSvg({
        width: asset.width,
        height: asset.height,
        shapes: asset.shapes,
      })
      return svgThumb(svg, asset.width, asset.height)
    }
    case 'vector-tileset': {
      const svg = await vectorToPortableSvg({
        width: asset.tileSize,
        height: asset.tileSize,
        shapes: asset.tiles[0] ?? [],
      })
      return svgThumb(svg, asset.tileSize, asset.tileSize)
    }
    case 'tilemap': {
      // Todas as peças do mapa: a miniatura mostra cada camada com as dela.
      const tilesets = collectMapTilesets(asset, findAsset)
      const tileset = tilesets[0]
      if (!tileset) return null
      if (tileset.kind === 'tileset') {
        return tilemapThumbnail(asset, tilesets, THUMB_MAX_PX)?.dataUrl ?? null
      }
      const svg = await vectorTilemapPortableSvg(asset, tilesets)
      return svgThumb(svg, asset.cols * tileset.tileSize, asset.rows * tileset.tileSize)
    }
  }
}

// Miniatura por asset, recomputada só quando o desenho muda (reabrir a modal
// fica ~zero). O carimbo do TILEMAP inclui o tileset — editar uma peça muda o
// mapa sem tocar o updatedAt dele.
const thumbCache = new Map<string, { stamp: string; thumb: string | null }>()
const THUMB_CACHE_MAX = 512

function thumbStamp(asset: PintaAsset, findAsset: (id: string) => PintaAsset | null): string {
  if (asset.kind !== 'tilemap') return String(asset.updatedAt)
  // Uma peça de QUALQUER tileset do mapa mudou → a miniatura muda (o padrão primeiro:
  // o carimbo de um mapa de peças únicas fica igual ao de antes).
  return [
    asset.updatedAt,
    ...tilemapTilesetIds(asset).map((id) => findAsset(id)?.updatedAt ?? 'sem-tileset'),
  ].join(':')
}

async function cachedThumb(
  namespace: string,
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): Promise<string | null> {
  const stamp = thumbStamp(asset, findAsset)
  const cacheKey = JSON.stringify([namespace, asset.id])
  const hit = thumbCache.get(cacheKey)
  if (hit && hit.stamp === stamp) return hit.thumb
  const thumb = await thumbFor(asset, findAsset).catch(() => null)
  if (thumbCache.size >= THUMB_CACHE_MAX) thumbCache.clear()
  thumbCache.set(cacheKey, { stamp, thumb })
  return thumb
}

/**
 * Resumos de TODOS os desenhos do perfil (mais recente primeiro), prontos para
 * a lista do "Trazer do Pinta". O host pode fornecer o namespace explicitamente;
 * sem ele, o perfil global é capturado uma única vez ao iniciar a operação.
 */
export async function listGalleryForStudio(
  options: { namespace?: string; signal?: AbortSignal; includeImageSelection?: boolean } = {},
): Promise<PintaGallerySummary[]> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const includeImageSelection = options.includeImageSelection === true
  signal?.throwIfAborted()
  const persistence = createPintaPersistence({ namespace })
  const assets = await persistence.listAllAssets()
  signal?.throwIfAborted()
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const findAsset = (id: string) => byId.get(id) ?? null
  const summaries: PintaGallerySummary[] = []
  for (const asset of assets) {
    const thumbDataUrl = await cachedThumb(namespace, asset, findAsset)
    signal?.throwIfAborted()
    summaries.push({
      id: asset.id,
      name: asset.name,
      role: assetRole(asset.kind),
      style: assetStyle(asset.kind),
      updatedAt: asset.updatedAt,
      ...(asset.projectRef?.name ? { projectName: asset.projectRef.name } : {}),
      thumbDataUrl,
      ...(includeImageSelection ? { imageSelection: imageSelectionSummary(asset, findAsset) } : {}),
    })
  }
  return summaries
}

/** Every frame is shapes only (no text, picture or mask): it can become a turtle shape. */
function turtleShapeFacts(frames: readonly VectorFrame[]) {
  const shapesOnly = frames.every((shapes) =>
    visibleShapes(shapes).every(
      (shape) => shape.type !== 'text' && shape.type !== 'image' && !shape.maskId,
    ),
  )
  return shapesOnly ? ({ turtleShape: true } as const) : {}
}

function imageSelectionSummary(
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): PintaImageSelectionSummary {
  // Only true is reported, so pixel facts keep the exact shape they always had.
  const vector = { vector: true } as const
  switch (asset.kind) {
    case 'pixel-sprite':
    case 'vector-sprite':
      return {
        kind: 'frame',
        width: asset.frameWidth,
        height: asset.frameHeight,
        animations: asset.animations.map(({ id, name, frames }) => ({
          id,
          name,
          frameCount: frames.length,
        })),
        // The whole sheet with its animations (`spritesheet`), for pygame projects.
        sheet: spritesheetSourceSize(asset),
        ...(asset.kind === 'vector-sprite'
          ? { ...vector, ...turtleShapeFacts(asset.animations.flatMap(({ frames }) => frames)) }
          : {}),
      }
    case 'pixel-background': {
      // Gallery records are sanitized: the first cel owns every layer's size,
      // including when that layer is hidden. This summary never flattens pixels.
      const first = asset.cels[0]
      if (!first) throw new Error('O cenário de pixels não tem uma camada válida.')
      return { kind: 'background', width: first.width, height: first.height }
    }
    case 'vector-background':
      return {
        kind: 'background',
        width: asset.width,
        height: asset.height,
        ...vector,
        ...turtleShapeFacts([asset.shapes]),
      }
    case 'tileset':
    case 'vector-tileset':
      return {
        kind: 'tile',
        width: asset.tileSize,
        height: asset.tileSize,
        tileCount: asset.tiles.length,
        sheet: tilesetSourceSize(asset),
        ...(asset.kind === 'vector-tileset' ? { ...vector, ...turtleShapeFacts(asset.tiles) } : {}),
      }
    case 'tilemap': {
      const tileset = findAsset(asset.tilesetId)
      if (!tileset || !isTilesetKind(tileset))
        return { kind: 'unavailable', reason: 'needs-tileset' }
      return {
        kind: 'tilemap',
        width: asset.cols * tileset.tileSize,
        height: asset.rows * tileset.tileSize,
        // The atlas of every tileset the map uses (`map`), the default first.
        sheet: mapAtlasSourceSize(asset, collectMapTilesets(asset, findAsset)),
        // A map is vector only through a vector tileset (its portable SVG path).
        ...(tileset.kind === 'vector-tileset' ? vector : {}),
      }
    }
  }
}

/**
 * Exporta UM desenho no formato da ponte (PNG achatado + metadados), já
 * validado pelos tetos do Estúdio — o mesmo payload do foguete "Usar no
 * Estúdio". `tilemapFront` fica de fora de propósito: a biblioteca pessoal do
 * Estúdio não o guarda (só o "Jogar meu mapa" o usa, e aquele caminho é outro).
 */
export async function exportAssetForStudio(
  id: string,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<ExportForStudioResult> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const persistence = createPintaPersistence({ namespace })
  const asset = await persistence.loadAssetById(id)
  signal?.throwIfAborted()
  if (!asset) return { ok: false, reason: 'not-found' }
  // buildStudioPayload só resolve OUTRO asset no caso tilemap→tileset; carregar
  // a galeria inteira aqui seria desperdício.
  const linked: PintaAsset[] = []
  if (asset.kind === 'tilemap') {
    for (const tilesetId of tilemapTilesetIds(asset)) {
      const tileset = await persistence.loadAssetById(tilesetId)
      if (tileset) linked.push(tileset)
    }
  }
  signal?.throwIfAborted()
  const result = await exportResolvedForStudio(asset, linked)
  signal?.throwIfAborted()
  return result
}

/**
 * O MESMO payload do `exportAssetForStudio`, a partir de um desenho JÁ carregado e sem
 * tocar o IndexedDB (14/10/2026, "Trazer da equipe"): o desenho é da COLEGA, desceu da
 * conta dela como `.pinta.json` e nunca passou pela galeria deste perfil. O mapa é o único
 * que precisa de outro desenho (as peças), e um documento só não o traz: sem ele a resposta
 * é `needs-tileset` com a frase, em vez do `raster-failed` mudo do caminho da galeria.
 */
export async function exportLoadedAssetForStudio(
  asset: PintaAsset,
): Promise<ExportForStudioResult> {
  if (asset.kind === 'tilemap') {
    return { ok: false, reason: 'needs-tileset', message: NEEDS_TILESET_MESSAGE }
  }
  return exportResolvedForStudio(asset, [])
}

async function exportResolvedForStudio(
  asset: PintaAsset,
  linked: readonly PintaAsset[],
): Promise<ExportForStudioResult> {
  const payload = await buildStudioPayload(
    asset,
    (assetId) => linked.find((candidate) => candidate.id === assetId) ?? null,
    { animationId: null, frameIndex: 0 },
  ).catch(() => null)
  if (!payload) return { ok: false, reason: 'raster-failed' }
  const size = validateStudioPayloadSize(payload)
  if (size !== 'ok') return { ok: false, reason: size }
  return {
    ok: true,
    asset: {
      id: asset.id,
      name: asset.name,
      dataUrl: payload.dataUrl,
      width: payload.width,
      height: payload.height,
      ...(payload.sprite ? { sprite: payload.sprite } : {}),
      ...(payload.tileset ? { tileset: payload.tileset } : {}),
      ...(payload.tilemap ? { tilemap: payload.tilemap } : {}),
    },
  }
}
