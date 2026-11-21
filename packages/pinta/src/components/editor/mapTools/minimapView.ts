/**
 * As contas do minimapa, PURAS: a cor de cada casa (com a cor de cada peça guardada por
 * conjunto de peças) e o retângulo do que aparece na tela.
 */
export {
  cachedTilemapMinimapColors as cachedMinimapColors,
  tilemapOverview as cachedMinimapOverview,
  tilesetMinimapColors,
} from '../../../tiles/minimap'

export interface MinimapViewRect {
  /** Frações de 0 a 1 do tamanho do mapa. */
  left: number
  top: number
  width: number
  height: number
}

/**
 * A parte do mapa que aparece no palco, em frações do mapa. `null` quando o palco ainda não
 * tem tamanho ou quando o mapa inteiro já cabe na tela (não há o que mostrar).
 */
export function minimapViewRect(
  stage: { scrollLeft: number; scrollTop: number; clientWidth: number; clientHeight: number },
  cellPx: number,
  pad: number,
  cols: number,
  rows: number,
): MinimapViewRect | null {
  if (stage.clientWidth <= 0 || stage.clientHeight <= 0 || cellPx <= 0 || !cols || !rows)
    return null
  const clamp = (v: number): number => Math.max(0, Math.min(1, v))
  const left = clamp((stage.scrollLeft / cellPx - pad) / cols),
    top = clamp((stage.scrollTop / cellPx - pad) / rows),
    right = clamp(((stage.scrollLeft + stage.clientWidth) / cellPx - pad) / cols),
    bottom = clamp(((stage.scrollTop + stage.clientHeight) / cellPx - pad) / rows)
  if (right - left >= 1 && bottom - top >= 1) return null
  return { left, top, width: right - left, height: bottom - top }
}
