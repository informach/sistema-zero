import { staffCanonical } from '@sistemazero/core/staff'
import type { Message } from '../../domain/message/message.aggregate'
import { IdempotencyConflictError } from '../../domain/message/message.errors'
import { normalizeAddress } from '../../domain/services/address'
import type { SendMessageInput } from './send-message.service'

/** Enqueue and withdrawal must agree on the exact original request. */
export function assertSameMessageIntent(message: Message, input: SendMessageInput): void {
  const state = message.state
  const recipient = {
    name: input.recipient.name.trim(),
    email: input.recipient.email?.trim() ? normalizeAddress('email', input.recipient.email) : null,
    phone: input.recipient.phone?.trim()
      ? normalizeAddress('whatsapp', input.recipient.phone)
      : null,
  }
  const attachments = (input.attachments ?? []).map((item) => ({
    filename: item.filename.trim(),
    url: item.url.trim(),
    contentType: item.contentType?.trim() || null,
  }))
  if (
    state.channel !== input.channel ||
    state.templateKey !== input.templateKey ||
    staffCanonical(state.recipient) !== staffCanonical(recipient) ||
    staffCanonical(state.variables) !== staffCanonical(input.variables ?? {}) ||
    staffCanonical(state.attachments) !== staffCanonical(attachments) ||
    (input.senderId != null && state.senderId !== input.senderId) ||
    (input.priority !== undefined && state.priority !== input.priority) ||
    (input.scheduledAt !== undefined && state.scheduledAt.getTime() !== input.scheduledAt.getTime())
  )
    throw new IdempotencyConflictError(
      'A intenção já existe com conteúdo ou destinatário diferente',
    )
}
