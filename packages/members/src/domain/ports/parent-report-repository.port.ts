/**
 * Persistência do REPORT SEMANAL dos pais (Fase 5, 07/2026): dedupe de envio por
 * (conta, semana) + preferência de opt-out. O job marca o envio APÓS o e-mail
 * sair (crash-safety — o dedupe do messaging por idempotencyKey absorve o retry).
 */
export interface ParentReportRepository {
  /** Contas do lote que JÁ receberam o report da semana. */
  listSentAccounts(weekKey: string, accountIds: string[]): Promise<Set<string>>
  /** Marca o envio (APÓS enviar). Idempotente (conflito é inócuo). */
  markSent(accountId: string, weekKey: string, now: Date): Promise<void>
  /** Contas do lote com o report DESATIVADO (opt-out da área dos pais). */
  listDisabledAccounts(accountIds: string[]): Promise<Set<string>>
  /** O report está desativado para a conta? (default false = recebe). */
  isDisabled(accountId: string): Promise<boolean>
  /** Liga/desliga o report da conta (upsert). */
  setDisabled(accountId: string, disabled: boolean, now: Date): Promise<void>
}
