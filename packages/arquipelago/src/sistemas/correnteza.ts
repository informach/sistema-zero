/**
 * A correnteza mansa: o limite do mar, sem castigo (pedido da dona em 28/10/2026). Cada ilha onde
 * se pode nadar tem uma roda de boias (`RodaDeNado`); dentro dela o mar é livre. Passando das
 * boias, a água empurra de volta para a ilha mais perto, de leve primeiro e firme o bastante, mais
 * para fora, para ninguém avançar: o mar aberto entre as ilhas fica fechado e o caminho para as
 * outras ilhas é a ponte (e, mais tarde, o barco). Ninguém se machuca, nada se perde e quem caiu de
 * uma ponte é levado para a beira mais perto.
 *
 * Regras puras (sem three nem Rapier): o modo chão soma a velocidade da correnteza ao passo de quem
 * nada no mar (`sistemas/modos/chao.ts`); o desenho das boias usa as mesmas rodas.
 */

export interface RodaDeNado {
  x: number
  z: number
  /** Raio da linha de boias: até aqui o mar é livre. */
  livre: number
}

export const CORRENTEZA = {
  /**
   * Metros depois das boias até a correnteza chegar na força toda. Nadando (2,6 m/s, até 2,9 com o
   * humor ótimo) ninguém passa de uns 80% da faixa.
   */
  faixa: 6,
  /** Velocidade da correnteza na força toda (m/s): mais que o nado mais rápido. */
  forca: 3.6,
  /** A partir desta força (0 a 1) o Zappy avisa, uma vez por vez que o jogo abre. */
  aviso: 0.25,
} as const

/** O que o Zappy diz na primeira vez que a correnteza segura a criança (uma vez por abertura do jogo). */
export const AVISO_DA_CORRENTEZA =
  'A correnteza aqui é forte e leva a gente de volta para a praia. Para ir às outras ilhas, o caminho é pela ponte.'

/** A linha de boias da sua ilha: depois da parte rasa (que acaba a 36 m do centro). */
export const BOIAS_DA_ILHA_CENTRAL = 42
/** A roda da sua ilha (o centro do mundo): vale sempre. */
export const RODA_DA_ILHA_CENTRAL: RodaDeNado = { x: 0, z: 0, livre: BOIAS_DA_ILHA_CENTRAL }
/**
 * A linha de boias de cada ilha do anel aberta, a contar do centro dela: passa por fora do Bosque
 * completo (uns 15 m). Ao ligar outra ilha completa, confira: o cais do Recife vai a 21,6 m e o
 * navio e o labirinto também ficam no mar, então a roda dele vai precisar crescer.
 */
export const BOIAS_DA_ILHA_DO_ANEL = 19

/**
 * A velocidade da correnteza em (x, z), gravada em `saida` (m/s, no chão), e a força de 0 a 1. Dentro
 * de qualquer roda, zero. Fora de todas, empurra para o centro da roda de que se está mais perto
 * (pela distância até a linha de boias), crescendo de 0 na boia até `forca` no fim da `faixa`.
 */
export function correnteza(
  rodas: readonly RodaDeNado[],
  x: number,
  z: number,
  saida: { x: number; z: number },
): number {
  saida.x = 0
  saida.z = 0
  let maisPerto: RodaDeNado | null = null
  let menorExcesso = Number.POSITIVE_INFINITY
  let distancia = 0
  for (const r of rodas) {
    const d = Math.hypot(x - r.x, z - r.z)
    const excesso = d - r.livre
    if (excesso <= 0) return 0
    if (excesso < menorExcesso) {
      menorExcesso = excesso
      maisPerto = r
      distancia = d
    }
  }
  if (!maisPerto || distancia < 1e-6) return 0
  const t = Math.min(1, menorExcesso / CORRENTEZA.faixa)
  // Suave na boia (quem só encosta nela quase não sente) e firme no fim da faixa.
  const forca = t * t * (3 - 2 * t)
  const v = CORRENTEZA.forca * forca
  saida.x = ((maisPerto.x - x) / distancia) * v
  saida.z = ((maisPerto.z - z) / distancia) * v
  return forca
}

/** Distância entre duas boias vizinhas na linha (m). */
export const ESPACO_ENTRE_BOIAS = 6

/** As boias de uma roda: pontos em volta da linha, a cada uns `ESPACO_ENTRE_BOIAS` metros. */
export function pontosDasBoias(roda: RodaDeNado): { x: number; z: number }[] {
  const n = Math.max(6, Math.round((2 * Math.PI * roda.livre) / ESPACO_ENTRE_BOIAS))
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return { x: roda.x + Math.cos(a) * roda.livre, z: roda.z + Math.sin(a) * roda.livre }
  })
}
