/**
 * As medidas do corpo do personagem (a cápsula do Rapier), divididas entre o personagem, as
 * regras do cipó e da escalada e os testes que leem o `bosque.glb`.
 */
export const CORPO = {
  meiaAltura: 0.55,
  raio: 0.35,
  /** Do centro da cápsula até os pés. */
  doCentroAoPe: 0.9,
  /**
   * O corpo como o avatar é desenhado, para as cordas encostarem nele (metros a partir dos pés,
   * no meio do corpo): o tronco e as pernas como uma cápsula e a cabeça, que é grande e sai da
   * cápsula do Rapier (vai de 1,28 m a 2,13 m do pé, com 0,98 m de largura), como uma bola.
   */
  desenho: { de: 0.45, ate: 1.05, raio: 0.37, cabeca: 1.7, raioDaCabeca: 0.45 },
  /**
   * Velocidades no chão (m/s), casadas com as pernas curtas do avatar (0,5 m): andando o passo é o
   * do clipe "Andar" misturado com o "Correr"; correndo, o "Correr" no ritmo certo, sem patinar.
   */
  andar: 2.2,
  correr: 4.6,
  nadar: 2.6,
  /** Velocidade para cima ao pular (m/s): com a gravidade do jogo, sobe uns 1,5 m. */
  pulo: 8.5,
  /** O degrau mais alto que o corpo sobe sozinho, andando (m). */
  degrau: 0.45,
  /** A rampa mais inclinada que ele sobe andando (graus). */
  sobeAte: 52,
  /** Acima desta inclinação ele escorrega (graus); entre `sobeAte` e esta, não sobe nem escorrega. */
  escorregaAcimaDe: 60,
  /**
   * O controlador do Rapier mantém esta folga entre a cápsula e o chão. O desenho desce o mesmo
   * tanto para o pé encostar (sem ela o avatar anda flutuando), e os modos que põem o corpo direto
   * num lugar (o tronco caído) deixam a mesma folga.
   */
  folga: 0.06,
} as const

/** Até onde chega um pulo no plano, saindo a `velocidade` (m/s): o tempo no ar vezes ela. */
export function alcanceDoPulo(velocidade: number, gravidade: number): number {
  return (velocidade * 2 * CORPO.pulo) / gravidade
}

/** A altura do pulo (m), do pé no chão ao pé no alto. */
export function alturaDoPulo(gravidade: number): number {
  return CORPO.pulo ** 2 / (2 * gravidade)
}

/**
 * O vão mais largo que um pulo atravessa saindo a `velocidade`, com as duas ajudas do corpo: o
 * degrau automático também vale no ar (o pé ainda sobe na outra borda até `degrau` abaixo dela) e
 * o pé redondo pega a borda antes do meio do corpo chegar (um raio de cada lado). Para desenhar
 * vãos: abaixo de `alcanceDoPulo` passa sempre; acima deste, nunca.
 */
export function alcanceMaximoDoPulo(velocidade: number, gravidade: number): number {
  const v = CORPO.pulo
  const noAr = (v + Math.sqrt(v * v + 2 * gravidade * CORPO.degrau)) / gravidade
  return velocidade * noAr + 2 * CORPO.raio
}

/** A beirada mais alta que um pulo alcança (o degrau automático vale no alto do pulo). */
export function beiradaMaximaDoPulo(gravidade: number): number {
  return alturaDoPulo(gravidade) + CORPO.degrau
}
