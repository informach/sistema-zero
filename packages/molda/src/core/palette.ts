/**
 * Paletas do Molda — cópia por VALOR das do Pinta (a criança reconhece as
 * mesmas cores nas duas ferramentas; nenhum import entre os pacotes). SEMPRE 16
 * entradas, com o índice 0 reservado: na TEXTURA ele é o transparente (como no
 * Pinta); na PELE de uma peça ele significa "usa a cor base da peça".
 */
export type PaletteId = 'arcade' | 'pastel' | 'cinzas'

export interface MoldaPalette {
  id: PaletteId
  /** Nome amigável em português, mostrado no seletor. */
  name: string
  /**
   * 16 cores hex `#rrggbb`. A posição 0 é o slot reservado — o valor aqui é
   * ignorado pelo render (fica `''` por convenção).
   */
  colors: readonly string[]
}

export const RESERVED_INDEX = 0
export const PALETTE_SIZE = 16

const ARCADE: MoldaPalette = {
  id: 'arcade',
  name: 'Arcade',
  colors: [
    '',
    '#ffffff',
    '#ff2121',
    '#ff93c4',
    '#ff8135',
    '#fff609',
    '#249ca3',
    '#78dc52',
    '#003fad',
    '#87f2ff',
    '#8e2ec4',
    '#a4839f',
    '#5c406c',
    '#e5cdc4',
    '#91463d',
    '#000000',
  ],
}

const PASTEL: MoldaPalette = {
  id: 'pastel',
  name: 'Doces',
  colors: [
    '',
    '#fffaf5',
    '#ffb3ba',
    '#ffd6e0',
    '#ffdfba',
    '#fff5ba',
    '#a8e6cf',
    '#baffc9',
    '#a3c4f3',
    '#bae1ff',
    '#d0b3ff',
    '#e0c3fc',
    '#b28dff',
    '#f1e3d3',
    '#c9ada7',
    '#4a4e69',
  ],
}

const CINZAS: MoldaPalette = {
  id: 'cinzas',
  name: 'Lápis e carvão',
  colors: [
    '',
    '#ffffff',
    '#f2f2f2',
    '#e0e0e0',
    '#cccccc',
    '#b8b8b8',
    '#a3a3a3',
    '#8f8f8f',
    '#7a7a7a',
    '#666666',
    '#525252',
    '#3d3d3d',
    '#292929',
    '#1a1a1a',
    '#0d0d0d',
    '#000000',
  ],
}

export const PALETTES: readonly MoldaPalette[] = [ARCADE, PASTEL, CINZAS]

export const DEFAULT_PALETTE_ID: PaletteId = 'arcade'

export function getPalette(id: PaletteId | string | undefined): MoldaPalette {
  return PALETTES.find((p) => p.id === id) ?? ARCADE
}

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && PALETTES.some((p) => p.id === value)
}

/**
 * O primeiro índice PINTÁVEL de uma paleta (ignora o 0 reservado e slots
 * vazios `''`). É o clamp obrigatório ao trocar para uma paleta personalizada
 * com buracos. Paleta toda vazia (não existe pelo sanitize) cai no 1.
 */
export function firstPaintableIndex(colors: readonly string[]): number {
  for (let i = RESERVED_INDEX + 1; i < colors.length; i += 1) {
    if (colors[i]) return i
  }
  return RESERVED_INDEX + 1
}
