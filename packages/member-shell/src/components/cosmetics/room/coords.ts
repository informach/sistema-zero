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

// ── Itens de PAREDE (janela, quadro, espelho…) — sobem na parede, não no chão ──
/** Altura útil das paredes em células (itens de parede sobem até aqui). Espelha o members. */
export const WALL_H_CELLS = 4
/** Distância do painel à face da parede (p/ ficar visível na frente dela). */
const PANEL_OFFSET = 0.14

/** Células horizontais da parede: `left` corre ao longo de Z (linhas), `right` de X (colunas). */
export function wallLength(wall: 'left' | 'right'): number {
  return wall === 'left' ? ROWS : COLS
}

/** Centro do mundo (X,Y,Z) de um item de parede no canto (u,v), footprint w(horizontal)×h(altura). */
export function wallToWorld(
  wall: 'left' | 'right',
  u: number,
  v: number,
  w: number,
  h: number,
): { x: number; y: number; z: number } {
  const y = v + h / 2
  return wall === 'right'
    ? { x: u + w / 2 - FLOOR_HALF_X, y, z: -FLOOR_HALF_Z + PANEL_OFFSET }
    : { x: -FLOOR_HALF_X + PANEL_OFFSET, y, z: u + w / 2 - FLOOR_HALF_Z }
}

/** Ponto na parede (coord horizontal do mundo + altura Y) → canto (u,v) clampado ao footprint. */
export function worldToWallCell(
  wall: 'left' | 'right',
  along: number,
  worldY: number,
  w: number,
  h: number,
): { u: number; v: number } {
  const len = wallLength(wall)
  const half = wall === 'right' ? FLOOR_HALF_X : FLOOR_HALF_Z
  return {
    u: Math.max(0, Math.min(len - w, Math.round(along + half - w / 2))),
    v: Math.max(0, Math.min(WALL_H_CELLS - h, Math.round(worldY - h / 2))),
  }
}

/** Dois retângulos de grade (x,y,w,h) se sobrepõem? Base da colisão de footprints. */
export function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}
