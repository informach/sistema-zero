/**
 * A cinza quente do Vale (B11, 31/10/2026; o pedido: "a pé, a cinza quente empurra a criança de
 * volta, sem dano; montado, o dino atravessa"). Uma área (a caixa da âncora `cinza-quente-area`,
 * no mundo) que, no modo chão (a pé, de patins ou no ar de um pulo), empurra o corpo para fora do
 * lado do terraço do segredo, mais rápido do que se corre de patins. Montado no dino (o modo
 * `montar`), nada empurra. Regras puras, sem three nem Rapier.
 */
export interface AreaQueEmpurra {
  id: string
  /** O ponto (no mundo) está dentro da área? */
  contem(x: number, y: number, z: number): boolean
  /** Para onde empurra, no chão (unitário). */
  direcao: { x: number; z: number }
}

export const CINZA_QUENTE = {
  /** m/s: mais que o patins correndo (6,0), para ninguém subir a pé. */
  forca: 7,
} as const

export const FALA_DA_CINZA_QUENTE =
  'A cinza quente empurra quem vai a pé, sem machucar. Montado no dino dá para subir.'

/** O empurrão das áreas que contêm o ponto (zero fora delas), sem alocar. */
export function empurraoDasAreas(
  areas: readonly AreaQueEmpurra[] | undefined,
  x: number,
  y: number,
  z: number,
  saida: { x: number; z: number },
): boolean {
  saida.x = 0
  saida.z = 0
  if (!areas) return false
  for (const a of areas)
    if (a.contem(x, y, z)) {
      saida.x = a.direcao.x * CINZA_QUENTE.forca
      saida.z = a.direcao.z * CINZA_QUENTE.forca
      return true
    }
  return false
}
