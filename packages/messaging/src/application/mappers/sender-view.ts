import type { EmailSender, EmailSenderStatus } from '../../domain/sender/email-sender.aggregate'

export interface SenderView {
  id: string
  fromEmail: string
  fromName: string
  replyTo: string | null
  status: EmailSenderStatus
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export function toSenderView(sender: EmailSender): SenderView {
  const s = sender.state
  return {
    id: sender.id,
    fromEmail: s.fromEmail,
    fromName: s.fromName,
    replyTo: s.replyTo,
    status: s.status,
    enabled: s.enabled,
    isDefault: s.isDefault,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}
