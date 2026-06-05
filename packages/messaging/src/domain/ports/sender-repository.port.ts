import type { EmailSender } from '../sender/email-sender.aggregate'

export interface SaveSenderOptions {
  /**
   * Desmarca o `is_default` dos DEMAIS remetentes na MESMA transação da gravação
   * (promoção atômica de default — falha no meio nunca deixa o sistema sem default).
   */
  clearOtherDefaults?: boolean
}

export interface SenderRepository {
  create(sender: EmailSender, opts?: SaveSenderOptions): Promise<void>
  update(sender: EmailSender, opts?: SaveSenderOptions): Promise<void>
  findById(id: string): Promise<EmailSender | null>
  findByEmail(fromEmail: string): Promise<EmailSender | null>
  /** Remetente default habilitado (usado quando o envio não especifica `senderId`). */
  findDefault(): Promise<EmailSender | null>
  list(query: { limit: number; offset: number }): Promise<{ items: EmailSender[]; total: number }>
}
