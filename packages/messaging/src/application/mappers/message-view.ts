import type { Message } from '../../domain/message/message.aggregate'
import type { MessageStatus } from '../../domain/message/message.status'
import type { Channel } from '../../domain/shared/channel'

export interface MessageView {
  id: string
  channel: Channel
  templateKey: string
  status: MessageStatus
  recipient: { name: string; email: string | null; phone: string | null }
  senderId: string | null
  laneId: string | null
  providerMessageId: string | null
  failureReason: string | null
  priority: number
  attempts: number
  scheduledAt: string
  createdAt: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
}

export function toMessageView(message: Message): MessageView {
  const s = message.state
  return {
    id: message.id,
    channel: s.channel,
    templateKey: s.templateKey,
    status: s.status,
    recipient: { name: s.recipient.name, email: s.recipient.email, phone: s.recipient.phone },
    senderId: s.senderId,
    laneId: s.laneId,
    providerMessageId: s.providerMessageId,
    failureReason: s.failureReason,
    priority: s.priority,
    attempts: s.attempts,
    scheduledAt: s.scheduledAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    sentAt: s.sentAt?.toISOString() ?? null,
    deliveredAt: s.deliveredAt?.toISOString() ?? null,
    readAt: s.readAt?.toISOString() ?? null,
  }
}
