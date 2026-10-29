/**
 * Regras puras da câmera em terceira pessoa (sem three nem física): quanto ela pode se afastar
 * quando algo sólido fica atrás do personagem, e o quanto o "lá no alto" vale.
 */

/**
 * A distância da câmera neste quadro. `livre` é até onde o raio vai sem bater (ou a distância
 * desejada, se não bateu). Encostar é na hora (nunca atravessa a parede, nem por um quadro); voltar
 * para longe é aos poucos, `volta` por segundo, para não dar tranco quando a parede sai da frente.
 * `minima` limita a distância desejada por conforto; a distância livre sempre tem prioridade.
 */
export function distanciaDaCamera(
  atual: number,
  desejada: number,
  livre: number,
  dt: number,
  volta: number,
  minima: number,
): number {
  const alvo = Math.min(Math.max(desejada, minima), Math.max(0, livre))
  if (alvo <= atual) return alvo
  return atual + (alvo - atual) * (1 - Math.exp(-dt * volta))
}

/** Aplica à posição já interpolada o espaço livre medido a partir do alvo. */
export function limitarPosicaoDaCamera(
  alvo: { x: number; y: number; z: number },
  posicao: { x: number; y: number; z: number },
  livre: number,
): void {
  const dx = posicao.x - alvo.x
  const dy = posicao.y - alvo.y
  const dz = posicao.z - alvo.z
  const distancia = Math.hypot(dx, dy, dz)
  if (distancia === 0 || livre >= distancia) return
  const proporcao = Math.max(0, livre) / distancia
  posicao.x = alvo.x + dx * proporcao
  posicao.y = alvo.y + dy * proporcao
  posicao.z = alvo.z + dz * proporcao
}

/** Quanto o personagem está "lá no alto" (0 no chão, 1 a um andar acima), para a câmera descer. */
export function pesoNoAlto(alturaAcimaDoChao: number, limite: number): number {
  return Math.max(0, Math.min(1, (alturaAcimaDoChao - limite * 0.6) / (limite * 0.4)))
}

/**
 * Sem saída para os lados, compara passar por baixo com subir por cima do obstáculo.
 * Só troca com ganho suficiente de espaço. O retorno é um desvio do ângulo escolhido pela pessoa;
 * não altera a preferência e pode ser suavizado enquanto entra ou sai de um teto baixo.
 */
export function desvioVerticalDaCamera(
  inclinacao: number,
  inclinacaoBaixa: number,
  medir: (angulo: number) => number,
  subidas: readonly number[],
  maxima: number,
  ganhoMinimo: number,
): number {
  let melhor = medir(inclinacao)
  let desvio = 0
  const baixo = medir(inclinacaoBaixa)
  if (baixo > melhor + ganhoMinimo) {
    melhor = baixo
    desvio = inclinacaoBaixa - inclinacao
  }
  for (const extra of subidas) {
    const angulo = Math.min(inclinacao + extra, maxima)
    const livre = medir(angulo)
    if (livre > melhor + ganhoMinimo) {
      melhor = livre
      desvio = angulo - inclinacao
    }
  }
  return desvio
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
