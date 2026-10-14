/**
 * Recompensas das oficinas AO VIVO (14/10/2026), chamadas pelo `LiveService` quando a criança é
 * recebida num encontro que está (ou fica) ao vivo. Melhor esforço: fora da transação da sala,
 * e nunca derruba o comando que a disparou.
 *
 * Idempotente por criança + ocorrência (o ledger deduplica `live_encounter` por `occurrenceId`).
 * Dá a conquista `live-first-encounter` e o progresso da missão semanal `live_encounter`. SEM XP
 * de presença: o XP do curso ao vivo vem das rotas de aula de sempre, com a mesma régua do
 * gravado.
 */
export interface LiveRewardsPort {
  encounterAttended(input: {
    learnerId: string
    accountId: string
    occurrenceId: string
    courseId: string
    audience: 'adult' | 'kids'
  }): Promise<void>
}
