/**
 * Folha de quadros (spritesheet) COMPATÍVEL com o Studio por construção: o
 * runtime do Jogo 2D calcula `cols = floor(larguraDaImagem / frameW)` e indexa
 * os quadros row-major na folha inteira; a animação é uma faixa contígua
 * `from..to` a N fps. Empacotamos UMA LINHA POR ANIMAÇÃO com
 * `columns = max(frames)`: para a linha `r` com `n` quadros,
 * `from = r × columns` e `to = from + n − 1` — exatamente os números que a
 * criança digita no bloco "Animar sprite".
 *
 * `packSpritesheet` é PURA (geometria + metadados); a rasterização fica em
 * `png.ts` (composeSheetPngDataUrl).
 */
import type { PintaBitmap, PixelSpriteAsset } from '../core/project'
import { composeSheetPngDataUrl } from './png'

export interface SpritesheetAnimationMeta {
  name: string
  /** Linha da animação na folha (0-based). */
  row: number
  /** Número de quadros da animação. */
  frames: number
  /** Índices row-major na FOLHA INTEIRA — os números do bloco do Studio. */
  from: number
  to: number
  fps: number
  loop: boolean
}

export interface SpritesheetPack {
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
  animations: SpritesheetAnimationMeta[]
  /** Cada quadro posicionado na grade (col/row) — entrada da rasterização. */
  cells: Array<{ bitmap: PintaBitmap; col: number; row: number }>
}

export function packSpritesheet(asset: PixelSpriteAsset): SpritesheetPack {
  const columns = Math.max(...asset.animations.map((a) => a.frames.length), 1)
  const rows = asset.animations.length
  const cells: SpritesheetPack['cells'] = []
  const animations: SpritesheetAnimationMeta[] = asset.animations.map((animation, row) => {
    animation.frames.forEach((bitmap, col) => {
      cells.push({ bitmap, col, row })
    })
    const from = row * columns
    return {
      name: animation.name,
      row,
      frames: animation.frames.length,
      from,
      to: from + animation.frames.length - 1,
      fps: animation.fps,
      loop: animation.loop,
    }
  })
  return {
    frameWidth: asset.frameWidth,
    frameHeight: asset.frameHeight,
    columns,
    rows,
    animations,
    cells,
  }
}

/** O JSON de metadados que acompanha o PNG (receita do bloco). */
export function spritesheetMetadata(pack: SpritesheetPack): string {
  return JSON.stringify(
    {
      frameWidth: pack.frameWidth,
      frameHeight: pack.frameHeight,
      columns: pack.columns,
      rows: pack.rows,
      animations: pack.animations,
    },
    null,
    2,
  )
}

/** Rasteriza a folha. `null` sem canvas 2D (happy-dom). */
export function spritesheetPngDataUrl(
  asset: PixelSpriteAsset,
  pack: SpritesheetPack,
  scale = 1,
): string | null {
  return composeSheetPngDataUrl({
    cells: pack.cells,
    cellWidth: pack.frameWidth,
    cellHeight: pack.frameHeight,
    columns: pack.columns,
    rows: pack.rows,
    paletteId: asset.paletteId,
    scale,
  })
}

/**
 * Receita do bloco em PT, mostrada no ExportDialog e no LEIA-ME do ZIP — os
 * números que a criança usa no "Carregar folha de quadros" + "Animar sprite".
 */
export function spritesheetRecipe(pack: SpritesheetPack): string {
  const lines = [
    `Folha de quadros: cada quadro tem ${pack.frameWidth} × ${pack.frameHeight}.`,
    'No Estúdio, use "Carregar folha de quadros" com esses tamanhos.',
    '',
  ]
  for (const animation of pack.animations) {
    lines.push(
      `Animação "${animation.name}": do quadro ${animation.from} ao ${animation.to}, velocidade ${animation.fps}.`,
    )
  }
  return lines.join('\n')
}
