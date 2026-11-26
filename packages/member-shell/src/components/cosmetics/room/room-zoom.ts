/**
 * O zoom do quarto Kids (26/11/2026), fora da cena para a tela não importar o three.js (a cena
 * chega por `next/dynamic`). O quarto inteiro na tela é o zoom 1; dá para chegar até 3x mais perto.
 */
export const ROOM_ZOOM_MAX = 3
export const ROOM_ZOOM_STEP = 1.35

/** Um pedido dos botões de zoom; o `id` muda a cada toque (o mesmo botão duas vezes conta duas). */
export interface RoomZoomRequest {
  id: number
  kind: 'in' | 'out' | 'reset'
}
