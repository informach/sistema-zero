import type { GmailConnection } from '../connection/gmail-connection'

export interface ConnectionRepository {
  /**
   * Ativa esta conexão como a ÚNICA caixa que o worker pode sincronizar. A
   * operação é transacional para que dois callbacks concorrentes não deixem
   * caixas distintas lendo a fila de atendimento.
   */
  activate(connection: GmailConnection): Promise<void>
  byId(id: string): Promise<GmailConnection | null>
  byExternalId(externalId: string): Promise<GmailConnection | null>
  /** A conexão ativa (status connected/needs_reauth mais recente) ou null. */
  current(): Promise<GmailConnection | null>
  update(connection: GmailConnection): Promise<void>
  /**
   * Claim do gmail-sync-worker: UMA conexão `connected` com `sync_next_at`
   * vencido (FOR UPDATE SKIP LOCKED), lease aplicado na mesma operação.
   */
  claimDue(leaseMs: number, at: Date): Promise<GmailConnection | null>
}
