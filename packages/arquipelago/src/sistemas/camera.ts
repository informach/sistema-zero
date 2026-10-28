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

/** A distância pedida pela pinça: abrir os dedos aproxima, fechar afasta (na mesma proporção). */
export function zoomDaPinca(
  distanciaNoComeco: number,
  separacaoNoComeco: number,
  separacaoAgora: number,
  minima: number,
  maxima: number,
): number {
  if (separacaoAgora <= 0 || separacaoNoComeco <= 0) return distanciaNoComeco
  const d = (distanciaNoComeco * separacaoNoComeco) / separacaoAgora
  return Math.max(minima, Math.min(maxima, d))
}

/** O menor giro de `de` até `para` (radianos, entre −π e π). */
export function giroMaisCurto(de: number, para: number): number {
  const d = para - de
  return Math.atan2(Math.sin(d), Math.cos(d))
}

/** A roda do mouse em pixels (algumas rodas contam linhas ou páginas). */
export function rodaEmPixels(delta: number, modo: number): number {
  if (modo === 1) return delta * 16
  if (modo === 2) return delta * 400
  return delta
}
