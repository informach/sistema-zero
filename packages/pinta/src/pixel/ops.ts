/**
 * Operações de desenho PURAS sobre o bitmap indexado: clonam a entrada e
 * devolvem um bitmap NOVO (o history guarda snapshots por referência). Nada
 * aqui toca canvas/DOM — tudo testável com fixtures de string.
 *
 * Espelho (`mirrorX`): cada pixel plotado ganha o gêmeo refletido no eixo
 * vertical central — aplicado no PONTO de plotagem (vale para lápis, formas e
 * borracha), não no resultado.
 */

import { TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'
import { cloneBitmap, inBounds, setPixel, type Vec2 } from './bitmap'

export interface BrushOptions {
  /** Índice de paleta (0 = borracha/transparente). */
  color: number
  /** 1 = 1px, 2 = 2×2, 3 = 3×3 centrado. */
  size: number
  /** Espelha no eixo vertical central (esquerda↔direita). */
  mirrorX?: boolean
  /** Espelha no eixo horizontal central (cima↔baixo). */
  mirrorY?: boolean
}

/** Carimba o pincel (tamanho + espelhos) num bitmap MUTÁVEL — uso interno. */
function stamp(bitmap: PintaBitmap, x: number, y: number, opts: BrushOptions): void {
  const size = Math.min(Math.max(Math.round(opts.size), 1), 3)
  // 1 → só (x,y); 2 → quadrado 2×2 ancorado; 3 → 3×3 centrado.
  const from = size === 3 ? -1 : 0
  const to = size >= 2 ? 1 : 0
  for (let dy = from; dy <= to; dy += 1) {
    for (let dx = from; dx <= to; dx += 1) {
      const px = x + dx
      const py = y + dy
      const mx = bitmap.width - 1 - px
      const my = bitmap.height - 1 - py
      setPixel(bitmap, px, py, opts.color)
      if (opts.mirrorX) setPixel(bitmap, mx, py, opts.color)
      if (opts.mirrorY) setPixel(bitmap, px, my, opts.color)
      if (opts.mirrorX && opts.mirrorY) setPixel(bitmap, mx, my, opts.color)
    }
  }
}

/** Anda a linha de Bresenham chamando `plot` em cada ponto (incluindo extremos). */
function walkLine(from: Vec2, to: Vec2, plot: (x: number, y: number) => void): void {
  let x0 = Math.round(from.x)
  let y0 = Math.round(from.y)
  const x1 = Math.round(to.x)
  const y1 = Math.round(to.y)
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    plot(x0, y0)
    if (x0 === x1 && y0 === y1) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

/** Traço do lápis/borracha: segmento contínuo entre a posição anterior e a atual. */
export function drawStroke(
  bitmap: PintaBitmap,
  from: Vec2,
  to: Vec2,
  opts: BrushOptions,
): PintaBitmap {
  const next = cloneBitmap(bitmap)
  walkLine(from, to, (x, y) => stamp(next, x, y, opts))
  return next
}

export function drawLine(
  bitmap: PintaBitmap,
  from: Vec2,
  to: Vec2,
  opts: BrushOptions,
): PintaBitmap {
  return drawStroke(bitmap, from, to, opts)
}

export function drawRect(
  bitmap: PintaBitmap,
  a: Vec2,
  b: Vec2,
  opts: BrushOptions & { filled?: boolean },
): PintaBitmap {
  const next = cloneBitmap(bitmap)
  const x0 = Math.min(Math.round(a.x), Math.round(b.x))
  const x1 = Math.max(Math.round(a.x), Math.round(b.x))
  const y0 = Math.min(Math.round(a.y), Math.round(b.y))
  const y1 = Math.max(Math.round(a.y), Math.round(b.y))
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1
      if (opts.filled || edge) stamp(next, x, y, opts)
    }
  }
  return next
}

export function drawEllipse(
  bitmap: PintaBitmap,
  a: Vec2,
  b: Vec2,
  opts: BrushOptions & { filled?: boolean },
): PintaBitmap {
  const next = cloneBitmap(bitmap)
  const x0 = Math.min(Math.round(a.x), Math.round(b.x))
  const x1 = Math.max(Math.round(a.x), Math.round(b.x))
  const y0 = Math.min(Math.round(a.y), Math.round(b.y))
  const y1 = Math.max(Math.round(a.y), Math.round(b.y))
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = Math.max((x1 - x0) / 2, 0.5)
  const ry = Math.max((y1 - y0) / 2, 0.5)
  // Um pixel está DENTRO quando o centro dele cai na elipse; o contorno são os
  // pixels de dentro com pelo menos um vizinho-4 de fora (traço fechado de 1px,
  // engrossado pelo tamanho do pincel via stamp).
  const inside = (x: number, y: number): boolean => {
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    return nx * nx + ny * ny <= 1
  }
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!inside(x, y)) continue
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
      if (opts.filled || edge) stamp(next, x, y, opts)
    }
  }
  return next
}

/**
 * Balde de tinta: preenche a região contígua da cor sob o clique. Scanline
 * ITERATIVO (pilha de segmentos) — sem recursão, aguenta 512×512.
 *
 * Com camadas, a REGIÃO é lida do `reference` (o desenho que a criança vê,
 * todas as camadas achatadas) e a tinta cai no `bitmap` (a camada ativa). Sem
 * isso a tinta "vaza": a criança clica dentro de uma área que parece fechada,
 * mas cujas paredes estão em outra camada. `reference` ausente = o próprio
 * bitmap (comportamento de sempre).
 */
export function floodFill(
  bitmap: PintaBitmap,
  at: Vec2,
  color: number,
  reference?: PintaBitmap,
): PintaBitmap {
  const x = Math.round(at.x)
  const y = Math.round(at.y)
  if (!inBounds(bitmap, x, y)) return bitmap
  const source =
    reference && reference.width === bitmap.width && reference.height === bitmap.height
      ? reference
      : bitmap
  const target = source.data[y * source.width + x]
  if (target === undefined) return bitmap
  // Sem `reference`, pintar da cor nela mesma é no-op; com máscara, a região
  // pode estar vazia na camada ativa e ainda assim valer a pintura.
  if (source === bitmap && target === color) return bitmap
  const next = cloneBitmap(bitmap)
  const { width, height } = next
  const read = source.data
  const write = next.data
  // `seen` evita reprocessar quando a leitura e a escrita são arrays distintos
  // (pintar não muda mais o critério de parada da varredura).
  const seen = new Uint8Array(width * height)
  const stack: Array<[number, number]> = [[x, y]]
  while (stack.length > 0) {
    const seed = stack.pop()
    if (!seed) break
    let [sx] = seed
    const [, sy] = seed
    if (read[sy * width + sx] !== target || seen[sy * width + sx]) continue
    // Anda até a borda esquerda do trecho contíguo…
    while (sx > 0 && read[sy * width + (sx - 1)] === target) sx -= 1
    // …e pinta para a direita, semeando as linhas de cima/baixo por transição.
    let aboveSeeded = false
    let belowSeeded = false
    for (let cx = sx; cx < width && read[sy * width + cx] === target; cx += 1) {
      if (seen[sy * width + cx]) break
      seen[sy * width + cx] = 1
      write[sy * width + cx] = color
      if (sy > 0) {
        const above = read[(sy - 1) * width + cx] === target
        if (above && !aboveSeeded) {
          stack.push([cx, sy - 1])
          aboveSeeded = true
        } else if (!above) {
          aboveSeeded = false
        }
      }
      if (sy < height - 1) {
        const below = read[(sy + 1) * width + cx] === target
        if (below && !belowSeeded) {
          stack.push([cx, sy + 1])
          belowSeeded = true
        } else if (!below) {
          belowSeeded = false
        }
      }
    }
  }
  return next
}

/** Troca TODAS as ocorrências de uma cor por outra (sem contiguidade). */
export function replaceColor(bitmap: PintaBitmap, from: number, to: number): PintaBitmap {
  if (from === to) return bitmap
  const next = cloneBitmap(bitmap)
  for (let i = 0; i < next.data.length; i += 1) {
    if (next.data[i] === from) next.data[i] = to
  }
  return next
}

/**
 * Remove um índice da paleta: pixels com ele viram transparente e os índices
 * MAIORES descem 1 (a cor sai do array e as seguintes deslocam). Um passe
 * único — compor dois replaceColor não cobre o shift de N índices maiores.
 */
export function removeColorIndex(bitmap: PintaBitmap, index: number): PintaBitmap {
  const next = cloneBitmap(bitmap)
  for (let i = 0; i < next.data.length; i += 1) {
    const value = next.data[i] ?? TRANSPARENT_INDEX
    if (value === index) next.data[i] = TRANSPARENT_INDEX
    else if (value > index) next.data[i] = value - 1
  }
  return next
}

export function flipHorizontal(bitmap: PintaBitmap): PintaBitmap {
  const next = cloneBitmap(bitmap)
  const { width, height } = bitmap
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      next.data[y * width + x] = bitmap.data[y * width + (width - 1 - x)] ?? TRANSPARENT_INDEX
    }
  }
  return next
}

export function flipVertical(bitmap: PintaBitmap): PintaBitmap {
  const next = cloneBitmap(bitmap)
  const { width, height } = bitmap
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      next.data[y * width + x] = bitmap.data[(height - 1 - y) * width + x] ?? TRANSPARENT_INDEX
    }
  }
  return next
}

/** Gira 90° no sentido horário. Largura e altura TROCAM em bitmap retangular. */
export function rotate90(bitmap: PintaBitmap): PintaBitmap {
  const { width, height } = bitmap
  const next: PintaBitmap = { width: height, height: width, data: new Uint8Array(width * height) }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // (x,y) → (nova x = height-1-y, nova y = x)
      next.data[x * next.width + (height - 1 - y)] = bitmap.data[y * width + x] ?? TRANSPARENT_INDEX
    }
  }
  return next
}

/** Desloca o desenho com WRAP (o que sai por um lado volta pelo outro). */
export function shift(bitmap: PintaBitmap, dx: number, dy: number): PintaBitmap {
  const { width, height } = bitmap
  if (width === 0 || height === 0) return bitmap
  const sx = ((Math.round(dx) % width) + width) % width
  const sy = ((Math.round(dy) % height) + height) % height
  if (sx === 0 && sy === 0) return bitmap
  const next = cloneBitmap(bitmap)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tx = (x + sx) % width
      const ty = (y + sy) % height
      next.data[ty * width + tx] = bitmap.data[y * width + x] ?? TRANSPARENT_INDEX
    }
  }
  return next
}

/** Limpa o bitmap inteiro (tudo transparente). */
export function clearBitmap(bitmap: PintaBitmap): PintaBitmap {
  return { width: bitmap.width, height: bitmap.height, data: new Uint8Array(bitmap.data.length) }
}
