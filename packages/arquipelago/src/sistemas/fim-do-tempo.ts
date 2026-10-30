/**
 * O fim do tempo livre no fim da ação (N07, regras puras): a proposta diz "acabou o tempo, o Zappy
 * põe o avatar para dormir no fim da ação". Com uma ação em andamento (uma corrida, o balão, a
 * montaria, o mergulho, o barco, um painel aberto como a conversa ou a cena da ponte), o jogo
 * espera ela terminar, no máximo `GRACA_DO_FIM_DO_TEMPO_MS`; sem ação, encerra na hora. O tempo
 * continua sendo controlado no serviço: a espera não ganha minutos.
 */

/** O máximo que o fim do tempo espera a ação acabar. */
export const GRACA_DO_FIM_DO_TEMPO_MS = 30_000

const MODOS_DE_ACAO = new Set(['balao', 'montar', 'mergulho', 'barco', 'cipo', 'escorregar'])

export function acaoEmCurso(s: {
  corrida: unknown
  modo: string
  painelAberto: string | null
}): boolean {
  return s.corrida !== null || MODOS_DE_ACAO.has(s.modo) || s.painelAberto !== null
}

/** O fim do tempo encerra agora? (sem ação, ou a espera já passou do máximo) */
export function encerraOTempo(desdeMs: number, agoraMs: number, emAcao: boolean): boolean {
  return !emAcao || agoraMs - desdeMs >= GRACA_DO_FIM_DO_TEMPO_MS
}

export const FALA_DO_TEMPO_ACABANDO =
  'O tempo de hoje acabou. Termine o que está fazendo e eu ponho você para dormir.'
export const FALA_DO_TEMPO_ACABOU = 'Hora de descansar. Amanhã a gente continua daqui.'
