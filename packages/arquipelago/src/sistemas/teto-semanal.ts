/**
 * O teto semanal de moedas do jogo (§6.28, A32): uma regra só para tudo o que paga moedas
 * (desafios, turnos, pedidos e a banca). O que passa do teto espera a semana seguinte e nunca se
 * perde: o serviço credita de novo, com a mesma chave, quando o jogo abre numa semana nova.
 */
export const FALA_DO_TETO =
  'O limite de moedas desta semana já foi alcançado. As moedas ficam guardadas para a semana que vem.'
