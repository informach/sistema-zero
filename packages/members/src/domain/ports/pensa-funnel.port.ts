/**
 * Onde as crianças param no Pensa v2 (15/10/2026): contagens da PRIMEIRA versão dos jogos criados
 * no período, para saber se as perguntas com respostas ajudaram ou atrapalharam. Só números: nada
 * do que a criança escreveu sai daqui.
 */
export interface PensaFunnelCounts {
  /** Jogos v2 criados no período (a primeira versão de cada um). */
  games: number
  /** Contaram a ideia (mandaram a primeira mensagem). */
  told: number
  /** Receberam ao menos uma pergunta do Zappy com respostas. */
  asked: number
  /** Perguntas com respostas feitas, no total. */
  questions: number
  /** Respondidas tocando numa resposta pronta. */
  answeredByChoice: number
  /** Respondidas com "Tanto faz, escolhe você". */
  answeredAny: number
  /** Ainda sem resposta (a última mensagem do jogo é a pergunta). */
  waitingOnQuestion: number
  /** Chegaram a uma proposta. */
  proposal: number
  /** Escolheram o começo. */
  accepted: number
  /** Concluíram ao menos uma missão. */
  firstMission: number
  /** Contaram ao menos um teste. */
  tested: number
  /** Guardaram a versão pronta. */
  versionDone: number
}

export interface PensaFunnelReader {
  funnel(since: Date): Promise<PensaFunnelCounts>
}
