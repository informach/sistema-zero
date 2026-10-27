/**
 * Regras puras da câmera em terceira pessoa (sem three nem física): quanto ela pode se afastar
 * quando algo sólido fica atrás do personagem, e o quanto o "lá no alto" vale.
 */

/**
 * A distância da câmera neste quadro. `livre` é até onde o raio vai sem bater (ou a distância
 * desejada, se não bateu). Encostar é na hora (nunca atravessa a parede, nem por um quadro); voltar
 * para longe é aos poucos, `volta` por segundo, para não dar tranco quando a parede sai da frente.
 * `minima` só segura a câmera fora da cabeça do avatar: ela nunca vence a parede.
 */
export function distanciaDaCamera(
  atual: number,
  desejada: number,
  livre: number,
  dt: number,
  volta: number,
  minima: number,
): number {
  const alvo = Math.min(desejada, Math.max(livre, minima))
  if (alvo <= atual) return alvo
  return atual + (alvo - atual) * (1 - Math.exp(-dt * volta))
}

/** Quanto o personagem está "lá no alto" (0 no chão, 1 a um andar acima), para a câmera descer. */
export function pesoNoAlto(alturaAcimaDoChao: number, limite: number): number {
  return Math.max(0, Math.min(1, (alturaAcimaDoChao - limite * 0.6) / (limite * 0.4)))
}
