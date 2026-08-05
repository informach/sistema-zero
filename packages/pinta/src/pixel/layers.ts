/**
 * Operações PURAS sobre as CAMADAS de um desenho de pixel (cenário e sprite
 * animado). Mesmo contrato das demais ops do pacote: devolvem um asset novo
 * (structural sharing) ou o MESMO asset quando nada muda — é assim que a UI
 * detecta o teto (`next === asset` → toast de limite).
 *
 * Invariante que o resto do motor assume: `cels[i]` é o desenho da `layers[i]`.
 * No sprite isso vale POR QUADRO (a mesma camada tem um cel em cada quadro de
 * cada animação), então adicionar/remover/reordenar camada mexe em todos eles.
 *
 * Índice 0 = FUNDO; no achatamento a de cima vence (bitmap indexado não tem
 * alpha: só dá para "índice opaco cobre"). A UI lista ao contrário.
 */
import { COPY } from '../core/copy'
import { TRANSPARENT_INDEX } from '../core/palette'
import {
  createBitmap,
  createPixelLayer,
  PINTA_LIMITS,
  type PintaBitmap,
  type PintaPixelFrame,
  type PintaPixelLayer,
  type PixelLayeredAsset,
} from '../core/project'

/** Dimensão dos cels do asset (sprite: o quadro; cenário: o 1º cel). */
export function celDims(asset: PixelLayeredAsset): { width: number; height: number } {
  if (asset.kind === 'pixel-sprite') {
    return { width: asset.frameWidth, height: asset.frameHeight }
  }
  const first = asset.cels[0]
  return { width: first?.width ?? 1, height: first?.height ?? 1 }
}

/** Aplica `fn` em TODOS os quadros do asset (cenário = um só). */
function mapCels<A extends PixelLayeredAsset>(
  asset: A,
  fn: (cels: PintaPixelFrame) => PintaPixelFrame,
): A {
  if (asset.kind === 'pixel-background') {
    return { ...asset, cels: fn(asset.cels) }
  }
  return {
    ...asset,
    animations: asset.animations.map((animation) => ({
      ...animation,
      frames: animation.frames.map(fn),
    })),
  }
}

/**
 * O desenho VISÍVEL de um quadro: as camadas visíveis achatadas, a de cima
 * vencendo. Com uma só camada visível devolve o PRÓPRIO cel (sem cópia) — o
 * caminho comum não paga nada e a identidade serve de chave de memo.
 */
export function flattenCels(
  cels: PintaPixelFrame,
  layers: readonly PintaPixelLayer[],
): PintaBitmap | null {
  const visible = cels.filter((_, index) => layers[index]?.visible !== false)
  if (visible.length === 0) return null
  const first = visible[0]
  if (!first) return null
  if (visible.length === 1) return first
  const out = createBitmap(first.width, first.height)
  for (const cel of visible) {
    if (cel.width !== first.width || cel.height !== first.height) continue
    for (let i = 0; i < out.data.length; i += 1) {
      const value = cel.data[i] ?? TRANSPARENT_INDEX
      if (value !== TRANSPARENT_INDEX) out.data[i] = value
    }
  }
  return out
}

/** Prévia nunca reutiliza pixels antigos: tudo escondido vira quadro vazio. */
export function flattenCelsOrBlank(
  cels: PintaPixelFrame,
  layers: readonly PintaPixelLayer[],
): PintaBitmap {
  const flattened = flattenCels(cels, layers)
  if (flattened) return flattened
  const first = cels[0]
  return createBitmap(first?.width ?? 1, first?.height ?? 1)
}

/**
 * Empilha bitmaps já achatados (nulos ignorados), o de cima vencendo. É o
 * composto "de baixo + ativa + de cima" que o balde e o conta-gotas leem.
 */
export function stackBitmaps(parts: ReadonlyArray<PintaBitmap | null | undefined>): PintaBitmap {
  const list = parts.filter((part): part is PintaBitmap => Boolean(part))
  const first = list[0]
  if (!first) return createBitmap(1, 1)
  if (list.length === 1) return first
  const out = createBitmap(first.width, first.height)
  for (const part of list) {
    if (part.width !== first.width || part.height !== first.height) continue
    for (let i = 0; i < out.data.length; i += 1) {
      const value = part.data[i] ?? TRANSPARENT_INDEX
      if (value !== TRANSPARENT_INDEX) out.data[i] = value
    }
  }
  return out
}

/** Composto que ferramentas de leitura enxergam, respeitando o olho da ativa. */
export function visibleComposite(
  active: PintaBitmap,
  activeVisible: boolean,
  under: PintaBitmap | null | undefined,
  over: PintaBitmap | null | undefined,
): PintaBitmap {
  if (!under && !over && activeVisible) return active
  if (!under && !over) return createBitmap(active.width, active.height)
  return stackBitmaps([under, activeVisible ? active : null, over])
}

/** Achatado de uma FATIA das camadas (usado no render: abaixo/acima da ativa). */
export function flattenCelsRange(
  cels: PintaPixelFrame,
  layers: readonly PintaPixelLayer[],
  from: number,
  to: number,
): PintaBitmap | null {
  if (to <= from) return null
  return flattenCels(cels.slice(from, to), layers.slice(from, to))
}

/** Índice da camada ativa (id inexistente → a de CIMA, que é onde a criança está). */
export function layerIndexOf(asset: PixelLayeredAsset, layerId: string | null): number {
  const found = layerId ? asset.layers.findIndex((layer) => layer.id === layerId) : -1
  return found >= 0 ? found : asset.layers.length - 1
}

/**
 * Camada nova NO TOPO (é o que a criança espera ao clicar no "+"), com um cel
 * vazio em todos os quadros. No teto devolve o MESMO asset.
 */
export function addPixelLayer<A extends PixelLayeredAsset>(asset: A): A {
  if (asset.layers.length >= PINTA_LIMITS.maxPixelLayers) return asset
  const dims = celDims(asset)
  const layer = createPixelLayer(asset.layers.length)
  const withCel = mapCels(asset, (cels) => [...cels, createBitmap(dims.width, dims.height)])
  return { ...withCel, layers: [...asset.layers, layer] }
}

/** Remove a camada e o cel dela em todos os quadros — nunca deixa o desenho sem nenhuma. */
export function removePixelLayer<A extends PixelLayeredAsset>(asset: A, layerId: string): A {
  if (asset.layers.length <= 1) return asset
  const index = asset.layers.findIndex((layer) => layer.id === layerId)
  if (index === -1) return asset
  const without = mapCels(asset, (cels) => cels.filter((_, i) => i !== index))
  return { ...without, layers: asset.layers.filter((_, i) => i !== index) }
}

export function togglePixelLayerVisible<A extends PixelLayeredAsset>(asset: A, layerId: string): A {
  const index = asset.layers.findIndex((layer) => layer.id === layerId)
  const layer = asset.layers[index]
  if (!layer) return asset
  return {
    ...asset,
    layers: asset.layers.map((l, i) => (i === index ? { ...l, visible: !l.visible } : l)),
  }
}

export function renamePixelLayer<A extends PixelLayeredAsset>(
  asset: A,
  layerId: string,
  name: string,
): A {
  const trimmed = name.trim().slice(0, PINTA_LIMITS.maxAnimationNameChars)
  if (!trimmed) return asset
  const index = asset.layers.findIndex((layer) => layer.id === layerId)
  const layer = asset.layers[index]
  if (!layer || layer.name === trimmed) return asset
  return {
    ...asset,
    layers: asset.layers.map((l, i) => (i === index ? { ...l, name: trimmed } : l)),
  }
}

/**
 * Move a camada para outra posição do empilhamento, levando os cels junto em
 * TODOS os quadros (senão o desenho trocaria de camada). `to` fora da faixa ou
 * igual → MESMO asset.
 */
export function movePixelLayer<A extends PixelLayeredAsset>(
  asset: A,
  layerId: string,
  to: number,
): A {
  const from = asset.layers.findIndex((layer) => layer.id === layerId)
  if (from === -1 || to < 0 || to >= asset.layers.length || to === from) return asset
  const reorder = <T>(list: readonly T[]): T[] => {
    const next = [...list]
    const [moved] = next.splice(from, 1)
    if (moved !== undefined) next.splice(to, 0, moved)
    return next
  }
  const moved = mapCels(asset, (cels) => reorder(cels))
  return { ...moved, layers: reorder(asset.layers) }
}

/** Nome automático da próxima camada (usado só na UI de renomear vazio). */
export function defaultLayerName(index: number): string {
  return `${COPY.layers.namePrefix} ${index + 1}`
}
