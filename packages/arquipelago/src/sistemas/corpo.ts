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
} as const
