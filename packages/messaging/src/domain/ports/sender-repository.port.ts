import type { EmailSender } from '../sender/email-sender.aggregate'

export interface SenderRepository {
  create(sender: EmailSender): Promise<void>
  update(sender: EmailSender): Promise<void>
  findById(id: string): Promise<EmailSender | null>
  findByEmail(fromEmail: string): Promise<EmailSender | null>
  /** Remetente default habilitado (usado quando o envio não especifica `senderId`). */
  findDefault(): Promise<EmailSender | null>
  /** Desmarca o flag `is_default` de todos (antes de promover um novo default). */
  clearDefault(): Promise<void>
  list(query: { limit: number; offset: number }): Promise<{ items: EmailSender[]; total: number }>
}
