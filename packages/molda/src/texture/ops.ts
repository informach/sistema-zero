/**
 * Operações PURAS da TEXTURA (a folha quadrada de pixels indexados, índice 0 =
 * transparente) e o "Vestir a peça": copiar a folha para as peles de uma peça
 * do modelo (bake, texel a texel; 0 preserva a cor base), com a paleta
 * remapeada quando a textura e o modelo usam cores diferentes.
 *
 * "Sem emenda" liga o `wrap`: o traço e o balde atravessam a borda (a folha é
 * um toro). O deslocamento de meio bloco é só de VISTA (sessão), não mora aqui.
 */
import { hexToRgb } from '../core/color'
import { MOLDA_LIMITS } from '../core/limits'
import type {
  FaceId,
  MoldaModelAsset,
  MoldaPart,
  MoldaSkin,
  MoldaTextureAsset,
} from '../core/model'
import { firstPaintableIndex, PALETTE_SIZE } from '../core/palette'
import { resolvePaletteColors } from '../core/sanitize'
import { FACES_BY_SHAPE, faceSkinSize } from '../model/shapes'
import { cloneSkin, createSkin, isSkinBlank } from '../model/skinOps'
import { syncTwins } from '../model/twins'
import { type BrushSize, stampTexels, type Texel } from '../paint/skinPaint'

function mod(value: number, size: number): number {
  return ((value % size) + size) % size
}

export function textureColors(asset: MoldaTextureAsset): readonly string[] {
  return resolvePaletteColors(asset)
}

/** Pinta texels na folha; com `wrap`, coordenadas fora dão a volta. */
export function paintTexture(
  asset: MoldaTextureAsset,
  texels: readonly Texel[],
  color: number,
  brush: BrushSize,
  wrap: boolean,
): MoldaTextureAsset {
  const { bitmap } = asset
  let out: MoldaSkin | null = null
  for (const [tx, ty] of texels) {
    for (const [sx, sy] of stampTexels(tx, ty, brush)) {
      let x = sx
      let y = sy
      if (wrap) {
        x = mod(x, bitmap.width)
        y = mod(y, bitmap.height)
      } else if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) {
        continue
      }
      const index = y * bitmap.width + x
      if ((out ?? bitmap).data[index] === color) continue
      if (!out) out = cloneSkin(bitmap)
      out.data[index] = color
    }
  }
  return out ? { ...asset, bitmap: out } : asset
}

/**
 * Linha entre dois texels que, com `wrap`, pega o caminho MAIS CURTO pela
 * borda (de x = 31 para x = 0 anda um texel, não a folha inteira). Devolve
 * coordenadas "desdobradas"; quem pinta aplica o módulo.
 */
export function lineTexelsWrap(
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wrap: boolean,
): Texel[] {
  let dx = x1 - x0
  let dy = y1 - y0
  if (wrap) {
    if (dx > size / 2) dx -= size
    else if (dx < -size / 2) dx += size
    if (dy > size / 2) dy -= size
    else if (dy < -size / 2) dy += size
  }
  const tx = x0 + dx
  const ty = y0 + dy
  const out: Texel[] = []
  let x = x0
  let y = y0
  const adx = Math.abs(tx - x0)
  const ady = -Math.abs(ty - y0)
  const sx = x0 < tx ? 1 : -1
  const sy = y0 < ty ? 1 : -1
  let error = adx + ady
  for (;;) {
    out.push([x, y])
    if (x === tx && y === ty) break
    const e2 = error * 2
    if (e2 >= ady) {
      error += ady
      x += sx
    }
    if (e2 <= adx) {
      error += adx
      y += sy
    }
  }
  return out
}

/** Balde (4-conectado); com `wrap`, os vizinhos dão a volta pela borda. */
export function floodFillTexture(
  asset: MoldaTextureAsset,
  x: number,
  y: number,
  color: number,
  wrap: boolean,
): MoldaTextureAsset {
  const { bitmap } = asset
  const { width, height } = bitmap
  if (x < 0 || y < 0 || x >= width || y >= height) return asset
  const target = bitmap.data[y * width + x] ?? 0
  if (target === color) return asset
  const out = cloneSkin(bitmap)
  const stack: Texel[] = [[x, y]]
  while (stack.length > 0) {
    const next = stack.pop()
    if (!next) break
    let [cx, cy] = next
    if (wrap) {
      cx = mod(cx, width)
      cy = mod(cy, height)
    } else if (cx < 0 || cy < 0 || cx >= width || cy >= height) {
      continue
    }
    const index = cy * width + cx
    if (out.data[index] !== target) continue
    out.data[index] = color
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return { ...asset, bitmap: out }
}

export function sampleTexture(asset: MoldaTextureAsset, x: number, y: number): number {
  const { bitmap } = asset
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return 0
  return bitmap.data[y * bitmap.width + x] ?? 0
}

/** Cor extra nova na textura (índice ≥ 16). `null` = teto. */
export function addTextureColor(
  asset: MoldaTextureAsset,
  hex: string,
): { asset: MoldaTextureAsset; index: number } | null {
  const colors = textureColors(asset)
  const existing = colors.indexOf(hex)
  if (existing > 0) return { asset, index: existing }
  const extras = asset.extraColors ?? []
  if (extras.length >= MOLDA_LIMITS.maxExtraColors) return null
  return { asset: { ...asset, extraColors: [...extras, hex] }, index: colors.length }
}

/** Apaga uma cor extra: texels dela viram transparentes, as seguintes descem 1. */
export function removeTextureColor(
  asset: MoldaTextureAsset,
  index: number,
): MoldaTextureAsset | null {
  const extras = asset.extraColors ?? []
  if (index < PALETTE_SIZE || index >= PALETTE_SIZE + extras.length) return null
  const nextExtras = extras.filter((_hex, i) => i !== index - PALETTE_SIZE)
  const data = new Uint8Array(asset.bitmap.data.length)
  for (let i = 0; i < data.length; i += 1) {
    const value = asset.bitmap.data[i] ?? 0
    data[i] = value === index ? 0 : value > index ? value - 1 : value
  }
  const next: MoldaTextureAsset = {
    ...asset,
    bitmap: { width: asset.bitmap.width, height: asset.bitmap.height, data },
  }
  if (nextExtras.length > 0) next.extraColors = nextExtras
  else delete next.extraColors
  return next
}

// ── Vestir a peça ───────────────────────────────────────────────────────────

export type ApplyMode = 'tile' | 'stretch'

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

/**
 * Índice USADO da textura → índice do modelo: mesma cor = mesmo índice; cor
 * que o modelo não tem entra como extra (até o teto); sem vaga, a cor mais
 * parecida. Índices ausentes de `sourceIndices` ficam em 0 e nunca reservam
 * uma extra. Devolve o modelo (talvez com extras novas) e a tabela.
 */
export function buildColorRemap(
  sourceColors: readonly string[],
  sourceIndices: Iterable<number>,
  model: MoldaModelAsset,
): { model: MoldaModelAsset; map: number[] } {
  let next = model
  const map: number[] = Array.from({ length: sourceColors.length }, () => 0)
  const seen = new Set<number>([0])
  for (const i of sourceIndices) {
    if (!Number.isInteger(i) || i <= 0 || i >= sourceColors.length || seen.has(i)) continue
    seen.add(i)
    const hex = sourceColors[i]
    if (!hex) {
      continue
    }
    const colors = resolvePaletteColors(next)
    const same = colors.indexOf(hex)
    if (same > 0) {
      map[i] = same
      continue
    }
    const extras = next.extraColors ?? []
    if (extras.length < MOLDA_LIMITS.maxExtraColors) {
      next = { ...next, extraColors: [...extras, hex] }
      map[i] = colors.length
      continue
    }
    let best = firstPaintableIndex(colors)
    let bestDistance = Number.POSITIVE_INFINITY
    colors.forEach((candidate, index) => {
      if (index === 0 || !candidate) return
      const distance = colorDistance(candidate, hex)
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    map[i] = best
  }
  return { model: next, map }
}

function sampleTextureSkin(
  texture: MoldaTextureAsset,
  width: number,
  height: number,
  mode: ApplyMode,
): MoldaSkin {
  const skin = createSkin(width, height)
  const size = texture.bitmap.width
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = mode === 'tile' ? x % size : Math.min(size - 1, Math.floor((x * size) / width))
      const sy = mode === 'tile' ? y % size : Math.min(size - 1, Math.floor((y * size) / height))
      skin.data[y * width + x] = texture.bitmap.data[sy * size + sx] ?? 0
    }
  }
  return skin
}

function remapSkin(skin: MoldaSkin, map: readonly number[]): MoldaSkin | undefined {
  if (isSkinBlank(skin)) return undefined
  const data = Uint8Array.from(skin.data, (value) => (value === 0 ? 0 : (map[value] ?? 0)))
  const remapped = { ...skin, data }
  return isSkinBlank(remapped) ? undefined : remapped
}

/** Veste as faces pedidas (ou todas) da peça FONTE com a textura. Um commit só. */
export function applyTextureToPart(
  model: MoldaModelAsset,
  partId: string,
  texture: MoldaTextureAsset,
  mode: ApplyMode,
  faces?: readonly FaceId[],
): MoldaModelAsset {
  const part = model.parts.find((item) => item.id === partId)
  if (!part || part.mirrorOf) return model
  const targets = faces ?? FACES_BY_SHAPE[part.shape]
  const sampled: Array<{ face: FaceId; skin: MoldaSkin }> = []
  const usedIndices = new Set<number>()
  for (const face of targets) {
    const size = faceSkinSize(part, face, model.texelsPerUnit)
    if (!size) continue
    const skin = sampleTextureSkin(texture, size.width, size.height, mode)
    for (const value of skin.data) if (value > 0) usedIndices.add(value)
    sampled.push({ face, skin })
  }
  const { model: remapped, map } = buildColorRemap(textureColors(texture), usedIndices, model)
  const nextFaces: MoldaPart['faces'] = { ...part.faces }
  for (const { face, skin } of sampled) {
    const next = remapSkin(skin, map)
    if (next) nextFaces[face] = next
    else delete nextFaces[face]
  }
  const parts = remapped.parts.map((item) =>
    item.id === partId ? { ...item, faces: nextFaces } : item,
  )
  return syncTwins({ ...remapped, parts })
}
