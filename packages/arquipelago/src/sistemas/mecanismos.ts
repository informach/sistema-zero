export const MECANISMOS = {
  alcanceDaPlaca: 0.5,
  alturaDaCaixa: 0.39,
  abrir: 1.25,
  fechar: 0,
  rigidez: 8,
  amortecimento: 4,
} as const
/** A placa lê o peso do caixote na superfície, não a proximidade do personagem. */
export function caixaNaPlaca(
  x: number,
  y: number,
  z: number,
  px: number,
  py: number,
  pz: number,
): boolean {
  return (
    Math.abs(x - px) < MECANISMOS.alcanceDaPlaca &&
    Math.abs(z - pz) < MECANISMOS.alcanceDaPlaca &&
    Math.abs(y - py - MECANISMOS.alturaDaCaixa) < 0.18
  )
}
export function alvoDoAlcapao(temCaixa: boolean): number {
  return temCaixa ? MECANISMOS.abrir : MECANISMOS.fechar
}
