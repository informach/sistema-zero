/**
 * Redução de cores compartilhada — PURA (recebe RGBA, devolve índices).
 *
 * O desenho de PIXEL já é indexado e nem passa por aqui. Quem precisa é o
 * VETORIAL: ele é rasterizado com anti-serrilhado, então uma borda que a criança
 * vê como "um traço preto" chega aqui como algumas dezenas de cinzas, e o GIF só
 * carrega 256 cores por arquivo.
 *
 * São dois caminhos, e o primeiro é o que quase sempre roda:
 *
 * 1. **Cabe tudo** — desenho de formas chapadas costuma ter bem menos de 255
 *    cores distintas. Nesse caso a paleta são as cores EXATAS: zero perda.
 * 2. **Não cabe** — corte mediano (median cut) sobre um histograma de 5 bits por
 *    canal: divide repetidamente a caixa mais populosa pelo eixo mais largo, e
 *    cada caixa vira a média PONDERADA das cores EXATAS que caíram nela. Cor que
 *    aparece muito puxa o representante para si, que é o que preserva o traço
 *    chapado.
 *
 * ⚠️⚠️ **O histograma tem teto FIXO de 32768 caixas, e isso é desempenho, não
 * capricho.** A primeira versão guardava uma caixa por cor EXATA (até 2²⁴) e
 * media **7,2 s** de aba congelada no pior caso real do produto — um sprite
 * vetorial de 128 px exportado em ×4 com 24 quadros (6,3 M pixels de degradê) —
 * porque o corte mediano ordenava sub-listas de centenas de milhares de entradas
 * a cada uma das 255 divisões. Com o teto, a mesma exportação leva uma fração
 * disso e a memória para de depender do desenho. Perder 3 bits por canal não
 * custa nada: o resultado já vai ser aproximado para ≤255 cores de qualquer
 * jeito, e as SOMAS dentro de cada caixa continuam sendo as cores exatas, então
 * o representante não perde precisão.
 *
 * ⚠️ O caminho SEM perda não passa pelo histograma grosso (duas cores quase
 * iguais podem cair na mesma caixa): ele guarda as cores exatas enquanto elas
 * couberem na paleta e DESISTE na primeira que não couber.
 *
 * O GIF só tem transparência de 1 bit. No caminho vetorial, um padrão Bayer
 * ordenado converte o alfa em cobertura espacial estável entre quadros; chamadas
 * sem dithering preservam o corte por limiar do contrato legado.
 */

export type Rgb = [number, number, number]

export interface QuantizeResult {
  /** A posição 0 é SEMPRE o slot transparente (a cor ali é ignorada). */
  palette: Rgb[]
  /** Um array de índices por quadro, na mesma ordem da entrada. */
  frames: Uint8Array[]
  /** `false` quando as cores exatas couberam na paleta (nada foi aproximado). */
  approximated: boolean
}

/** Limiar do caminho legado/sem dithering (o GIF não tem meio-termo por pixel). */
export const ALPHA_THRESHOLD = 128

export interface QuantizeOptions {
  /** Largura do quadro RGBA, necessária para o padrão espacial de dithering. */
  width: number
  /** Ativa cobertura de alfa e suavização de cor determinísticas. */
  dither: boolean
  alphaThreshold?: number
}

/** Bayer 8×8: padrão ordenado, estável entre quadros e sem ruído aleatório. */
const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24,
  36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6,
  54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21,
] as const

function ditherCell(pixel: number, width: number): number {
  const safeWidth = Math.max(1, Math.round(width))
  const x = pixel % safeWidth
  const y = Math.floor(pixel / safeWidth)
  return BAYER_8[(y % 8) * 8 + (x % 8)] as number
}

function paintAlpha(
  alpha: number,
  pixel: number,
  width: number,
  dither: boolean,
  threshold: number,
): boolean {
  if (!dither) return alpha >= threshold
  if (alpha <= 0) return false
  if (alpha >= 255) return true
  // (cell + 0,5) / 64 é o limiar local. A cobertura média converge para
  // alpha/255, que é a melhor aproximação possível no alfa binário do GIF.
  return alpha * 128 > (ditherCell(pixel, width) * 2 + 1) * 255
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/** 5 bits por canal → 32768 caixas possíveis (teto do histograma). */
const COARSE_SIZE = 1 << 15

function coarseKey(r: number, g: number, b: number): number {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
}

/**
 * Histograma grosso em arrays DENSOS (a chave é o índice — sem hash, sem
 * alocação por cor). `count` zero = caixa não usada.
 */
interface CoarseHistogram {
  count: Int32Array
  sumR: Float64Array
  sumG: Float64Array
  sumB: Float64Array
}

/** Uma caixa do corte mediano: a chave grossa + as somas EXATAS que caíram nela. */
interface ColorBucket {
  key: number
  count: number
  r: number
  g: number
  b: number
}

function bucketAverage(buckets: readonly ColorBucket[]): Rgb {
  let count = 0
  let r = 0
  let g = 0
  let b = 0
  for (const bucket of buckets) {
    count += bucket.count
    r += bucket.r
    g += bucket.g
    b += bucket.b
  }
  if (count === 0) return [0, 0, 0]
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

/**
 * O eixo (0=R, 1=G, 2=B) em que as cores da caixa estão mais espalhadas.
 * Mede na resolução GROSSA (é a que define o corte), o que basta: o
 * representante continua saindo das somas exatas.
 */
function widestAxis(buckets: readonly ColorBucket[]): 0 | 1 | 2 {
  let minR = 31
  let maxR = 0
  let minG = 31
  let maxG = 0
  let minB = 31
  let maxB = 0
  for (const bucket of buckets) {
    const r = (bucket.key >> 10) & 0x1f
    const g = (bucket.key >> 5) & 0x1f
    const b = bucket.key & 0x1f
    if (r < minR) minR = r
    if (r > maxR) maxR = r
    if (g < minG) minG = g
    if (g > maxG) maxG = g
    if (b < minB) minB = b
    if (b > maxB) maxB = b
  }
  const spread: [number, number, number] = [maxR - minR, maxG - minG, maxB - minB]
  if (spread[0] >= spread[1] && spread[0] >= spread[2]) return 0
  return spread[1] >= spread[2] ? 1 : 2
}

interface ColorBox {
  buckets: ColorBucket[]
  /** Pixels na caixa — guardado, e não recontado: a busca roda a cada corte. */
  total: number
}

function boxOf(buckets: ColorBucket[]): ColorBox {
  let total = 0
  for (const bucket of buckets) total += bucket.count
  return { buckets, total }
}

/** Corte mediano até chegar em `maxBoxes` caixas (ou acabarem as divisíveis). */
function medianCut(buckets: ColorBucket[], maxBoxes: number): ColorBucket[][] {
  const boxes: ColorBox[] = [boxOf(buckets)]
  while (boxes.length < maxBoxes) {
    // A caixa mais POPULOSA (e ainda divisível) é a que mais ganha em ser
    // partida: dividir por volume sozinho gasta cor em pixel que quase não existe.
    let target = -1
    let best = 0
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i] as ColorBox
      if (box.buckets.length < 2) continue
      if (box.total > best) {
        best = box.total
        target = i
      }
    }
    if (target < 0) break

    const box = boxes[target] as ColorBox
    const axis = widestAxis(box.buckets)
    const shift = axis === 0 ? 10 : axis === 1 ? 5 : 0
    const sorted = [...box.buckets].sort(
      (a, b) => ((a.key >> shift) & 0x1f) - ((b.key >> shift) & 0x1f),
    )
    // Corta na MEDIANA por população (metade dos pixels de cada lado), com pelo
    // menos uma cor em cada caixa.
    let running = 0
    let cut = 1
    for (let i = 0; i < sorted.length - 1; i += 1) {
      running += (sorted[i] as ColorBucket).count
      cut = i + 1
      if (running >= box.total / 2) break
    }
    boxes.splice(target, 1, boxOf(sorted.slice(0, cut)), boxOf(sorted.slice(cut)))
  }
  return boxes.map((box) => box.buckets)
}

/**
 * Reduz os quadros a uma paleta ÚNICA (o GIF aqui usa tabela global) de no
 * máximo `maxColors` entradas, contando o slot transparente da posição 0.
 *
 * Todos os quadros precisam ter o mesmo número de pixels.
 */
export function quantizeFrames(
  frames: ReadonlyArray<Uint8ClampedArray>,
  maxColors: number,
  options?: QuantizeOptions,
): QuantizeResult {
  const alphaThreshold = options?.alphaThreshold ?? ALPHA_THRESHOLD
  const dither = options?.dither === true
  const width = options?.width ?? Math.max(1, (frames[0]?.length ?? 4) / 4)
  const available = Math.max(1, Math.min(maxColors, 256) - 1)

  const histogram: CoarseHistogram = {
    count: new Int32Array(COARSE_SIZE),
    sumR: new Float64Array(COARSE_SIZE),
    sumG: new Float64Array(COARSE_SIZE),
    sumB: new Float64Array(COARSE_SIZE),
  }
  /** Cores EXATAS enquanto couberem; `null` = desistiu (vai aproximar). */
  let exactColors: Set<number> | null = new Set()

  for (const rgba of frames) {
    for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
      if (!paintAlpha(rgba[i + 3] ?? 0, p, width, dither, alphaThreshold)) continue
      const r = rgba[i] ?? 0
      const g = rgba[i + 1] ?? 0
      const b = rgba[i + 2] ?? 0
      const key = coarseKey(r, g, b)
      histogram.count[key] = (histogram.count[key] as number) + 1
      histogram.sumR[key] = (histogram.sumR[key] as number) + r
      histogram.sumG[key] = (histogram.sumG[key] as number) + g
      histogram.sumB[key] = (histogram.sumB[key] as number) + b
      if (exactColors) {
        const exact = (r << 16) | (g << 8) | b
        if (exactColors.has(exact)) continue
        if (exactColors.size >= available) exactColors = null
        else exactColors.add(exact)
      }
    }
  }

  const approximated = exactColors === null
  // Posição 0 reservada: é o buraco da animação, e o índice tem que existir na
  // tabela mesmo num desenho sem nenhum pixel transparente.
  const palette: Rgb[] = [[0, 0, 0]]
  /** Índice na paleta por cor EXATA — só no caminho sem perda. */
  const byExact = new Map<number, number>()
  /** Índice na paleta por caixa GROSSA — só no caminho aproximado. */
  const byCoarse = new Uint8Array(COARSE_SIZE)

  if (exactColors) {
    for (const exact of exactColors) {
      byExact.set(exact, palette.length)
      palette.push([(exact >> 16) & 0xff, (exact >> 8) & 0xff, exact & 0xff])
    }
  } else {
    const buckets: ColorBucket[] = []
    for (let key = 0; key < COARSE_SIZE; key += 1) {
      const count = histogram.count[key] as number
      if (count === 0) continue
      buckets.push({
        key,
        count,
        r: histogram.sumR[key] as number,
        g: histogram.sumG[key] as number,
        b: histogram.sumB[key] as number,
      })
    }
    for (const box of medianCut(buckets, available)) {
      if (box.length === 0) continue
      const index = palette.length
      palette.push(bucketAverage(box))
      for (const bucket of box) byCoarse[bucket.key] = index
    }
  }

  /** Cache global: a paleta é a mesma em todos os quadros. */
  const nearestByCoarse = new Uint8Array(COARSE_SIZE)
  const nearest = (r: number, g: number, b: number): number => {
    const key = coarseKey(r, g, b)
    const cached = nearestByCoarse[key] as number
    if (cached > 0) return cached
    let best = 1
    let bestDistance = Number.POSITIVE_INFINITY
    for (let index = 1; index < palette.length; index += 1) {
      const color = palette[index] as Rgb
      const dr = r - color[0]
      const dg = g - color[1]
      const db = b - color[2]
      const distance = dr * dr + dg * dg + db * db
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    }
    nearestByCoarse[key] = best
    return best
  }

  const out = frames.map((rgba) => {
    const indices = new Uint8Array(rgba.length / 4)
    for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
      if (!paintAlpha(rgba[i + 3] ?? 0, p, width, dither, alphaThreshold)) continue
      let r = rgba[i] ?? 0
      let g = rgba[i + 1] ?? 0
      let b = rgba[i + 2] ?? 0
      if (approximated && dither) {
        // ±16 níveis: suficiente para misturar vizinhos nas bordas de uma
        // faixa sem transformar cores chapadas dominantes em ruído pesado.
        const offset = ((ditherCell(p, width) + 0.5) / 64 - 0.5) * 32
        r = clampByte(r + offset)
        g = clampByte(g + offset)
        b = clampByte(b + offset)
      }
      indices[p] = approximated
        ? dither
          ? nearest(r, g, b)
          : (byCoarse[coarseKey(r, g, b)] as number)
        : (byExact.get((r << 16) | (g << 8) | b) ?? 1)
    }
    return indices
  })

  return { palette, frames: out, approximated }
}
