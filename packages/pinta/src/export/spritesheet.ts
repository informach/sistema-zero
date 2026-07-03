/**
 * Folha de quadros (spritesheet) COMPATÍVEL com o Studio por construção: o
 * runtime do Jogo 2D calcula `cols = floor(larguraDaImagem / frameW)` e indexa
 * os quadros row-major na folha inteira; a animação é uma faixa contígua
 * `from..to` a N fps. Empacotamos UMA LINHA POR ANIMAÇÃO com
 * `columns = max(frames)`: para a linha `r` com `n` quadros,
 * `from = r × columns` e `to = from + n − 1` — exatamente os números que a
 * criança digita no bloco "Animar sprite".
 *
 * A GEOMETRIA (`SheetGeometry`) é independente do conteúdo do quadro: pixel e
 * vetor (`export/vectorSheet.ts`) produzem a MESMA folha e compartilham
 * metadados/receita — o teste-guarda do runtime vale para os dois.
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

/** A folha SEM o conteúdo dos quadros — o que metadados/receita precisam. */
export interface SheetGeometry {
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
  animations: SpritesheetAnimationMeta[]
}

export interface SpritesheetPack extends SheetGeometry {
  /** Cada quadro posicionado na grade (col/row) — entrada da rasterização. */
  cells: Array<{ bitmap: PintaBitmap; col: number; row: number }>
}

/** A geometria da folha a partir das CONTAGENS (uma linha por animação). */
export function packAnimationsGeometry(
  frameWidth: number,
  frameHeight: number,
  animations: Array<{ name: string; fps: number; loop: boolean; frameCount: number }>,
): SheetGeometry {
  const columns = Math.max(...animations.map((a) => a.frameCount), 1)
  const rows = animations.length
  const metas: SpritesheetAnimationMeta[] = animations.map((animation, row) => {
    const from = row * columns
    return {
      name: animation.name,
      row,
      frames: animation.frameCount,
      from,
      to: from + animation.frameCount - 1,
      fps: animation.fps,
      loop: animation.loop,
    }
  })
  return { frameWidth, frameHeight, columns, rows, animations: metas }
}

export function packSpritesheet(asset: PixelSpriteAsset): SpritesheetPack {
  const geometry = packAnimationsGeometry(
    asset.frameWidth,
    asset.frameHeight,
    asset.animations.map((a) => ({
      name: a.name,
      fps: a.fps,
      loop: a.loop,
      frameCount: a.frames.length,
    })),
  )
  const cells: SpritesheetPack['cells'] = []
  asset.animations.forEach((animation, row) => {
    animation.frames.forEach((bitmap, col) => {
      cells.push({ bitmap, col, row })
    })
  })
  return { ...geometry, cells }
}

/** O JSON de metadados que acompanha o PNG (receita do bloco). */
export function spritesheetMetadata(geometry: SheetGeometry): string {
  return JSON.stringify(
    {
      frameWidth: geometry.frameWidth,
      frameHeight: geometry.frameHeight,
      columns: geometry.columns,
      rows: geometry.rows,
      animations: geometry.animations,
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
export function spritesheetRecipe(geometry: SheetGeometry): string {
  const lines = [
    `Folha de quadros: cada quadro tem ${geometry.frameWidth} × ${geometry.frameHeight}.`,
    'No Estúdio, use "Carregar folha de quadros" com esses tamanhos.',
    '',
  ]
  for (const animation of geometry.animations) {
    lines.push(
      `Animação "${animation.name}": do quadro ${animation.from} ao ${animation.to}, velocidade ${animation.fps}.`,
    )
  }
  return lines.join('\n')
}
