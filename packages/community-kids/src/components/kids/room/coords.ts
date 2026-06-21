/**
 * Geometria de coordenadas do quarto — PURO (sem three; testável isolado). A grade é
 * 12×8 (espelha `ROOM_GRID` do members/lib); 1 célula = 1 unidade de mundo; o chão é
 * CENTRADO na origem (X = colunas, Z = linhas). Um item ocupa w×h células a partir do
 * canto (x,y); seu CENTRO no mundo posiciona o grupo (a rotação gira o grupo pelo centro).
 * 90°/270° trocam w↔h (footprint efetivo) — usado p/ limitar a posição e desenhar.
 */
export const COLS = 12
export const ROWS = 8

export type Rot = 0 | 1 | 2 | 3

/** Footprint EFETIVO: rotação ímpar (90°/270°) troca largura×altura. */
export function effectiveFootprint(w: number, h: number, rot: Rot): { w: number; h: number } {
  return rot === 1 || rot === 3 ? { w: h, h: w } : { w, h }
}

/** Mantém o canto (x,y) dentro da grade para um footprint efetivo ew×eh (arredonda). */
export function clampCell(x: number, y: number, ew: number, eh: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(COLS - ew, Math.round(x))),
    y: Math.max(0, Math.min(ROWS - eh, Math.round(y))),
  }
}

/** Centro do mundo (X,Z) do footprint ew×eh ancorado no canto (x,y) da grade. */
export function cellToWorld(
  x: number,
  y: number,
  ew: number,
  eh: number,
): { x: number; z: number } {
  return { x: x + ew / 2 - COLS / 2, z: y + eh / 2 - ROWS / 2 }
}

/** Ponto do mundo (px,pz) → canto (x,y) clampado, centrando o footprint sob o cursor. */
export function worldToCell(
  px: number,
  pz: number,
  ew: number,
  eh: number,
): { x: number; y: number } {
  return clampCell(px + COLS / 2 - ew / 2, pz + ROWS / 2 - eh / 2, ew, eh)
}

/** Meia-extensão do chão em X e Z (paredes do fundo, plano de arraste). */
export const FLOOR_HALF_X = COLS / 2
export const FLOOR_HALF_Z = ROWS / 2
