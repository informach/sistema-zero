/**
 * Núcleo PURO do "trazer uma foto": reduzir (downscale) e fatiar uma imagem
 * RGBA. Sem dithering — previsível e explicável. Testável sem canvas (a
 * decodificação da imagem vive à parte).
 *
 * ⚠️ Desde 08/2026 a QUANTIZAÇÃO da foto vive em
 * `import/paletteFromImage.ts` (`quantizeToPhotoPalette`): o desenho importado
 * nasce com a `customPalette` PRÓPRIA da foto (≤15 cores + transparente, teto
 * de 16 da criação de paleta) em vez de arcade + até 48 extras. O
 * `quantizeToIndexed` daqui ficou SEM consumidor de produção (só os testes) —
 * candidato a remoção num lote de limpeza futuro.
 */
import { getPalette, TRANSPARENT_INDEX } from '../core/palette'
import { PINTA_LIMITS, type PintaBitmap, TILE_SIZES } from '../core/project'
import { hexToRgb } from '../pixel/render'

export interface RGBAImage {
  data: Uint8ClampedArray | readonly number[]
  width: number
  height: number
}

type RGB = [number, number, number]

/** Distância de cor ponderada por luminância (verde pesa mais que azul/vermelho). */
function colorDist2(a: RGB, b: RGB): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db
}

/**
 * Raio de FUSÃO de cores extras (distância²): balde novo mais longe que isto de
 * TODAS as candidatas vira cor extra; senão funde na mais próxima. Constante
 * única (afinada por teste) — subir agrupa mais, descer cria mais extras.
 */
const FUSION_RADIUS_SQ = 1600

function rgbToHex([r, g, b]: RGB): string {
  const h = (v: number) =>
    Math.min(255, Math.max(0, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/**
 * Reduz a imagem para `targetW × targetH` por MÉDIA de bloco (box filter) com
 * alpha PREMULTIPLICADO — silhuetas limpas em foto; equivalente ao nearest em
 * razão inteira de pixel art.
 */
export function downscaleRGBA(
  input: RGBAImage,
  targetW: number,
  targetH: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const { data, width, height } = input
  const out = new Uint8ClampedArray(targetW * targetH * 4)
  for (let ty = 0; ty < targetH; ty += 1) {
    const sy0 = Math.floor((ty * height) / targetH)
    const sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * height) / targetH))
    for (let tx = 0; tx < targetW; tx += 1) {
      const sx0 = Math.floor((tx * width) / targetW)
      const sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * width) / targetW))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let count = 0
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const i = (sy * width + sx) * 4
          const al = data[i + 3] ?? 0
          r += (data[i] ?? 0) * al
          g += (data[i + 1] ?? 0) * al
          b += (data[i + 2] ?? 0) * al
          a += al
          count += 1
        }
      }
      const o = (ty * targetW + tx) * 4
      if (a > 0) {
        out[o] = r / a
        out[o + 1] = g / a
        out[o + 2] = b / a
      }
      out[o + 3] = count > 0 ? a / count : 0
    }
  }
  return { data: out, width: targetW, height: targetH }
}

/**
 * Redimensiona por COVER: recorta o centro no aspecto do alvo e reduz para
 * `targetW × targetH` (sem distorcer, sem borda) — o caminho do cenário.
 */
export function resizeCover(
  input: RGBAImage,
  targetW: number,
  targetH: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const { width: sw, height: sh, data } = input
  const targetAspect = targetW / targetH
  const srcAspect = sw / sh
  let cropW = sw
  let cropH = sh
  if (srcAspect > targetAspect) cropW = Math.round(sh * targetAspect)
  else cropH = Math.round(sw / targetAspect)
  cropW = Math.max(1, Math.min(cropW, sw))
  cropH = Math.max(1, Math.min(cropH, sh))
  const cx = Math.floor((sw - cropW) / 2)
  const cy = Math.floor((sh - cropH) / 2)
  const crop = new Uint8ClampedArray(cropW * cropH * 4)
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const si = ((cy + y) * sw + (cx + x)) * 4
      const di = (y * cropW + x) * 4
      crop[di] = data[si] ?? 0
      crop[di + 1] = data[si + 1] ?? 0
      crop[di + 2] = data[si + 2] ?? 0
      crop[di + 3] = data[si + 3] ?? 0
    }
  }
  return downscaleRGBA({ data: crop, width: cropW, height: cropH }, targetW, targetH)
}

/**
 * Redimensiona por CONTAIN: a imagem INTEIRA cabe em `targetW × targetH` sem
 * distorcer nem cortar (escala proporcional, centralizada, sobra transparente) —
 * o caminho do PERSONAGEM. O cover do cenário cortaria braço/orelha de um boneco;
 * aqui nada some, e o fundo transparente do PNG continua transparente (alfa 0
 * nas bordas que sobram). Imagem menor que o quadro é AMPLIADA (o
 * `downscaleRGBA` amplia por nearest quando o alvo é maior que a origem).
 */
export function resizeContain(
  input: RGBAImage,
  targetW: number,
  targetH: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const { width: sw, height: sh } = input
  const out = new Uint8ClampedArray(targetW * targetH * 4)
  if (sw <= 0 || sh <= 0 || targetW <= 0 || targetH <= 0) {
    return { data: out, width: targetW, height: targetH }
  }
  const scale = Math.min(targetW / sw, targetH / sh)
  const fitW = Math.max(1, Math.min(targetW, Math.round(sw * scale)))
  const fitH = Math.max(1, Math.min(targetH, Math.round(sh * scale)))
  const fitted = downscaleRGBA(input, fitW, fitH)
  const ox = Math.floor((targetW - fitW) / 2)
  const oy = Math.floor((targetH - fitH) / 2)
  for (let y = 0; y < fitH; y += 1) {
    const srcRow = y * fitW * 4
    const dstRow = ((oy + y) * targetW + ox) * 4
    out.set(fitted.data.subarray(srcRow, srcRow + fitW * 4), dstRow)
  }
  return { data: out, width: targetW, height: targetH }
}

export interface QuantizeOptions {
  /** Paleta base (16 cores, índice 0 transparente); default = arcade. */
  baseColors?: readonly string[]
  maxExtraColors?: number
  /** Pixel com alpha abaixo disto vira transparente (índice 0). */
  alphaThreshold?: number
}

/**
 * RGBA → bitmap INDEXADO + cores extras. As candidatas são as 15 cores base
 * (índices 1–15) mais até `maxExtraColors` cores extras escolhidas por
 * frequência (posterizadas a 4 bits/canal p/ agrupar ruído de JPEG). Cada pixel
 * cai na candidata mais próxima; alpha baixo → transparente.
 */
export function quantizeToIndexed(
  input: RGBAImage,
  opts: QuantizeOptions = {},
): { bitmap: PintaBitmap; extraColors: string[] } {
  const base = opts.baseColors ?? getPalette('arcade').colors
  const alphaThreshold = opts.alphaThreshold ?? 128
  const maxExtra = opts.maxExtraColors ?? PINTA_LIMITS.maxExtraColors
  const { data, width, height } = input
  const pixels = width * height

  // Candidatas base: cores 1..15 (0 é transparente) → [rgb, índice na paleta].
  const baseRgb: RGB[] = []
  const baseIndex: number[] = []
  for (let i = 1; i < base.length; i += 1) {
    const hex = base[i]
    if (hex) {
      baseRgb.push(hexToRgb(hex))
      baseIndex.push(i)
    }
  }

  // Histograma de cores OPACAS posterizadas (12 bits) → frequência.
  const hist = new Map<number, { rgb: RGB; count: number }>()
  for (let p = 0; p < pixels; p += 1) {
    if ((data[p * 4 + 3] ?? 0) < alphaThreshold) continue
    const r = data[p * 4] ?? 0
    const g = data[p * 4 + 1] ?? 0
    const b = data[p * 4 + 2] ?? 0
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const entry = hist.get(key)
    if (entry) entry.count += 1
    // Centro do balde (determinístico): (n>>4)*16 + 8.
    else
      hist.set(key, {
        rgb: [((r >> 4) << 4) + 8, ((g >> 4) << 4) + 8, ((b >> 4) << 4) + 8],
        count: 1,
      })
  }

  // Cores EXTRAS por frequência: um balde vira extra se está longe de TODAS as
  // candidatas já aceitas (base + extras).
  const extrasRgb: RGB[] = []
  const extras: string[] = []
  const buckets = [...hist.values()].sort((a, b) => b.count - a.count)
  for (const bucket of buckets) {
    if (extras.length >= maxExtra) break
    let nearest = Number.POSITIVE_INFINITY
    for (const c of baseRgb) nearest = Math.min(nearest, colorDist2(bucket.rgb, c))
    for (const c of extrasRgb) nearest = Math.min(nearest, colorDist2(bucket.rgb, c))
    if (nearest > FUSION_RADIUS_SQ) {
      extrasRgb.push(bucket.rgb)
      extras.push(rgbToHex(bucket.rgb))
    }
  }

  // Candidatas finais com o índice de paleta (base 1..15, extras 16..).
  const candidates: Array<{ rgb: RGB; index: number }> = [
    ...baseRgb.map((rgb, k) => ({ rgb, index: baseIndex[k] ?? 1 })),
    ...extrasRgb.map((rgb, j) => ({ rgb, index: 16 + j })),
  ]

  const out = new Uint8Array(pixels)
  for (let p = 0; p < pixels; p += 1) {
    if ((data[p * 4 + 3] ?? 0) < alphaThreshold) {
      out[p] = TRANSPARENT_INDEX
      continue
    }
    const c: RGB = [data[p * 4] ?? 0, data[p * 4 + 1] ?? 0, data[p * 4 + 2] ?? 0]
    let best = candidates[0]?.index ?? TRANSPARENT_INDEX
    let bestD = Number.POSITIVE_INFINITY
    for (const cand of candidates) {
      const d = colorDist2(c, cand.rgb)
      if (d < bestD) {
        bestD = d
        best = cand.index
      }
    }
    out[p] = best
  }
  return { bitmap: { width, height, data: out }, extraColors: extras }
}

/**
 * Fatia um bitmap indexado em peças `tileSize × tileSize`, DEDUPLICANDO peças
 * idênticas (byte a byte) e PULANDO as 100% transparentes. `tooMany` quando
 * passa do teto de peças (a UI pede um tamanho de peça maior).
 */
export function sliceIndexedTiles(
  bitmap: PintaBitmap,
  tileSize: number,
): { tiles: PintaBitmap[]; tooMany: boolean } {
  const cols = Math.floor(bitmap.width / tileSize)
  const rows = Math.floor(bitmap.height / tileSize)
  const seen = new Map<string, PintaBitmap>()
  let tooMany = false
  for (let ty = 0; ty < rows && !tooMany; ty += 1) {
    for (let tx = 0; tx < cols && !tooMany; tx += 1) {
      const tile = new Uint8Array(tileSize * tileSize)
      let nonEmpty = false
      for (let y = 0; y < tileSize; y += 1) {
        for (let x = 0; x < tileSize; x += 1) {
          const v = bitmap.data[(ty * tileSize + y) * bitmap.width + (tx * tileSize + x)] ?? 0
          tile[y * tileSize + x] = v
          if (v !== TRANSPARENT_INDEX) nonEmpty = true
        }
      }
      if (!nonEmpty) continue
      const key = tile.join(',')
      if (seen.has(key)) continue
      if (seen.size >= PINTA_LIMITS.maxTiles) {
        tooMany = true
        break
      }
      seen.set(key, { width: tileSize, height: tileSize, data: tile })
    }
  }
  return { tiles: [...seen.values()], tooMany }
}

/**
 * Adivinha o tamanho de peça: candidatos de `TILE_SIZES` que dividem largura E
 * altura; entre eles, o MENOR que ainda dá ≤ `maxTiles` peças — uma imagem de
 * tileset quase sempre quer ser fatiada nas peças MENORES (mais peças). Se
 * nenhum couber no teto, o MAIOR divisor (menos peças). Nenhum divisor → `null`
 * (a criança escolhe; a sobra é cortada com floor no fatiamento).
 */
export function detectTileSize(width: number, height: number): number | null {
  const divisors = TILE_SIZES.filter((ts) => width % ts === 0 && height % ts === 0)
  if (divisors.length === 0) return null
  const fitting = divisors
    .filter((ts) => (width / ts) * (height / ts) <= PINTA_LIMITS.maxTiles)
    .sort((a, b) => a - b)
  return fitting[0] ?? Math.max(...divisors)
}
