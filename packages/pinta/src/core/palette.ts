/**
 * Paletas do Pinta. SEMPRE 16 entradas, com o índice 0 = TRANSPARENTE — isso
 * trava o bitmap em 1 byte por pixel (Uint8Array de índices) e simplifica
 * tudo: balde, conta-gotas, export PNG e o xadrez de transparência.
 *
 * A `arcade` espelha a paleta padrão do MakeCode Arcade (referência explícita
 * do produto) — cores conferidas contra o pxt-arcade. As extras dão variedade
 * sem quebrar o modelo de 16 cores.
 */
export type PaletteId = 'arcade' | 'pastel' | 'cinzas'

export interface PintaPalette {
  id: PaletteId
  /** Nome amigável em português, mostrado no seletor. */
  name: string
  /**
   * 16 cores hex `#rrggbb`. A posição 0 é o slot transparente — o valor aqui é
   * ignorado pelo render (fica `''` por convenção).
   */
  colors: readonly string[]
}

export const TRANSPARENT_INDEX = 0
export const PALETTE_SIZE = 16

const ARCADE: PintaPalette = {
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

const PASTEL: PintaPalette = {
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

const CINZAS: PintaPalette = {
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

export const PALETTES: readonly PintaPalette[] = [ARCADE, PASTEL, CINZAS]

export const DEFAULT_PALETTE_ID: PaletteId = 'arcade'

export function getPalette(id: PaletteId | string | undefined): PintaPalette {
  return PALETTES.find((p) => p.id === id) ?? ARCADE
}

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && PALETTES.some((p) => p.id === value)
}
