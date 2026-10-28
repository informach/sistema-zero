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
   * Velocidades no chão (m/s), casadas com as pernas curtas do avatar (0,5 m): andando o passo é o
   * do clipe "Andar" misturado com o "Correr"; correndo, o "Correr" no ritmo certo, sem patinar.
   */
  andar: 2.2,
  correr: 4.6,
} as const
