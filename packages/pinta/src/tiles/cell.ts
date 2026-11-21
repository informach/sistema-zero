/**
 * O valor de uma CÉLULA do mapa. É o único lugar que sabe como ele é montado.
 *
 * Uma célula guarda a peça E como ela está virada, num `Int16Array`:
 *
 *   -1                    vazia
 *   bits 0 a 11           o índice da peça no conjunto (0 a 4095)
 *   bit 12 / 13 / 14      espelhada na horizontal / na vertical / na diagonal
 *
 * Os três bits são os mesmos do Tiled (diagonal + espelhos compõem os giros de 90°). Ficam
 * DENTRO da célula, e não num vetor ao lado, de propósito: histórico, cópia, redimensionar,
 * seleção, carimbo, área de transferência e os serializadores já carregam `cells` inteiro, então
 * a peça virada atravessa todos eles sem uma linha nova. Um vetor paralelo esquecido em qualquer
 * um desses lugares perderia o giro em silêncio.
 *
 * Mapa sem peça virada tem exatamente os números de antes (bits altos em zero): nada migra.
 *
 * ⚠️ Quem precisa do ÍNDICE da peça (desenhar, exportar, remapear, colidir) lê por `cellTile`.
 * Quem só move ou compara células inteiras (copiar, preencher, redimensionar) usa o valor cru.
 * `tests/cellAccess.test.ts` lista os arquivos que tocam `cells[` e reprova um arquivo novo.
 */
export const EMPTY_CELL = -1

const TILE_BITS = 12
const TILE_MASK = (1 << TILE_BITS) - 1

/** Quantas peças a célula consegue endereçar. O teto do conjunto fica bem abaixo disto. */
export const CELL_MAX_TILES = TILE_MASK + 1

export const CELL_FLIP_H = 1 << TILE_BITS
export const CELL_FLIP_V = 1 << (TILE_BITS + 1)
export const CELL_FLIP_D = 1 << (TILE_BITS + 2)
export const CELL_FLAGS_MASK = CELL_FLIP_H | CELL_FLIP_V | CELL_FLIP_D

/** O maior valor que uma célula válida pode ter (cabe no `Int16Array`). */
export const CELL_MAX_VALUE = TILE_MASK | CELL_FLAGS_MASK

export const isEmptyCell = (cell: number): boolean => cell < 0

/** O índice da peça, ou -1 se a célula está vazia. */
export const cellTile = (cell: number): number => (cell < 0 ? EMPTY_CELL : cell & TILE_MASK)

/** Os bits de espelho e giro (0 numa célula vazia). */
export const cellFlags = (cell: number): number => (cell < 0 ? 0 : cell & CELL_FLAGS_MASK)

/** Monta a célula. Peça negativa é célula vazia, com ou sem bits. */
export function makeCell(tile: number, flags = 0): number {
  if (tile < 0) return EMPTY_CELL
  return (tile & TILE_MASK) | (flags & CELL_FLAGS_MASK)
}

/** A mesma célula com outra peça, virada do mesmo jeito. Vazia continua vazia se a peça for -1. */
export const withCellTile = (cell: number, tile: number): number => makeCell(tile, cellFlags(cell))

/** A mesma peça com outros bits. Célula vazia não vira nada. */
export const withCellFlags = (cell: number, flags: number): number =>
  cell < 0 ? EMPTY_CELL : makeCell(cellTile(cell), flags)

/** Um valor lido de fora é uma célula bem formada? (inteiro, vazio ou dentro dos bits). */
export const isValidCell = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= EMPTY_CELL &&
  value <= CELL_MAX_VALUE

/** The bit layout can address more tiles than a particular map format permits. */
export const isValidCellForTiles = (value: unknown, tileCount: number): value is number =>
  Number.isSafeInteger(tileCount) &&
  tileCount >= 0 &&
  tileCount <= CELL_MAX_TILES &&
  isValidCell(value) &&
  cellTile(value) < tileCount
