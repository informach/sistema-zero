/**
 * Máquina PURA de ferramenta: o canvas converte pointer events em posições de
 * pixel e delega aqui; a máquina devolve o bitmap de PREVIEW a cada passo e o
 * commit no fim do gesto (1 entrada de undo por gesto). Sem DOM — testável.
 *
 * Regras por ferramenta:
 * - pencil/eraser: acumulam traço contínuo no bitmap de trabalho a cada move.
 * - line/rect/ellipse: preview = base + forma do ponto inicial ao atual
 *   (redesenhada do zero a cada move); commit no pointerup.
 * - fill: aplica no pointer DOWN (gesto de um toque).
 * - picker: não desenha; devolve a cor sob o dedo no down.
 */

import { TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'
import { bitmapsEqual, clampToBitmap, getPixel, type Vec2 } from './bitmap'
import { drawEllipse, drawLine, drawRect, drawStroke, floodFill, replaceColor } from './ops'

export type PixelToolId =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'recolor'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'picker'

export interface ToolSettings {
  tool: PixelToolId
  /** Índice de paleta selecionado (ignorado pela borracha, que usa 0). */
  color: number
  /** 1–3. */
  brushSize: number
  mirrorX: boolean
  mirrorY: boolean
  /** Formas preenchidas (vale p/ rect/ellipse). */
  filled: boolean
}

export interface ToolGesture {
  settings: ToolSettings
  /** Snapshot no início do gesto (base do preview de formas + dedup do commit). */
  base: PintaBitmap
  /** Bitmap de trabalho (o traço do lápis acumula aqui). */
  working: PintaBitmap
  start: Vec2
  last: Vec2
}

export interface ToolDownResult {
  /** null = gesto de um toque (fill/picker) — nada a acompanhar no move/up. */
  gesture: ToolGesture | null
  /** O que renderizar já (fill devolve o resultado; picker devolve a base). */
  preview: PintaBitmap
  /** Preenchido só pelo conta-gotas. */
  pickedColor?: number
  /** Preenchido quando o down JÁ commitou (fill). */
  commit?: PintaBitmap
}

function brushOf(settings: ToolSettings): {
  color: number
  size: number
  mirrorX: boolean
  mirrorY: boolean
} {
  return {
    color: settings.tool === 'eraser' ? TRANSPARENT_INDEX : settings.color,
    size: settings.brushSize,
    mirrorX: settings.mirrorX,
    mirrorY: settings.mirrorY,
  }
}

export function toolPointerDown(
  bitmap: PintaBitmap,
  settings: ToolSettings,
  rawPos: Vec2,
  /**
   * O desenho que a criança VÊ (camadas achatadas). Conta-gotas e balde leem
   * daqui — "pego a cor que vejo, pinto na camada em que estou". Ausente = o
   * próprio bitmap.
   */
  reference?: PintaBitmap,
): ToolDownResult {
  const pos = clampToBitmap(bitmap, rawPos)
  switch (settings.tool) {
    case 'picker': {
      const picked = getPixel(reference ?? bitmap, pos.x, pos.y)
      return { gesture: null, preview: bitmap, pickedColor: picked < 0 ? undefined : picked }
    }
    case 'fill': {
      const next = floodFill(bitmap, pos, settings.color, reference)
      return {
        gesture: null,
        preview: next,
        commit: bitmapsEqual(next, bitmap) ? undefined : next,
      }
    }
    case 'recolor': {
      // Troca TODA a cor sob o dedo pela cor selecionada (não é contíguo como o
      // balde) — gesto de um toque, igual ao fill.
      const from = getPixel(bitmap, pos.x, pos.y)
      if (from < 0) return { gesture: null, preview: bitmap }
      const next = replaceColor(bitmap, from, settings.color)
      return {
        gesture: null,
        preview: next,
        commit: bitmapsEqual(next, bitmap) ? undefined : next,
      }
    }
    case 'pencil':
    case 'eraser': {
      const working = drawStroke(bitmap, pos, pos, brushOf(settings))
      return {
        gesture: { settings, base: bitmap, working, start: pos, last: pos },
        preview: working,
      }
    }
    case 'line':
    case 'rect':
    case 'ellipse': {
      const working = previewShape(bitmap, settings, pos, pos)
      return {
        gesture: { settings, base: bitmap, working, start: pos, last: pos },
        preview: working,
      }
    }
  }
}

function previewShape(
  base: PintaBitmap,
  settings: ToolSettings,
  start: Vec2,
  current: Vec2,
): PintaBitmap {
  const brush = brushOf(settings)
  if (settings.tool === 'line') return drawLine(base, start, current, brush)
  if (settings.tool === 'rect') {
    return drawRect(base, start, current, { ...brush, filled: settings.filled })
  }
  return drawEllipse(base, start, current, { ...brush, filled: settings.filled })
}

export function toolPointerMove(gesture: ToolGesture, rawPos: Vec2): ToolGesture {
  const pos = clampToBitmap(gesture.base, rawPos)
  if (pos.x === gesture.last.x && pos.y === gesture.last.y) return gesture
  const { settings } = gesture
  if (settings.tool === 'pencil' || settings.tool === 'eraser') {
    // Traço contínuo: liga a posição anterior à atual sobre o TRABALHO.
    const working = drawStroke(gesture.working, gesture.last, pos, brushOf(settings))
    return { ...gesture, working, last: pos }
  }
  // Formas: redesenha do zero sobre a BASE.
  const working = previewShape(gesture.base, settings, gesture.start, pos)
  return { ...gesture, working, last: pos }
}

/** Fecha o gesto. `null` = nada mudou (não gastar uma entrada de undo). */
export function toolPointerUp(gesture: ToolGesture, rawPos?: Vec2): PintaBitmap | null {
  const settled = rawPos ? toolPointerMove(gesture, rawPos) : gesture
  return bitmapsEqual(settled.working, settled.base) ? null : settled.working
}
