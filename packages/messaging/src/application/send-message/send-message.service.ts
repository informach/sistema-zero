import type { Message } from '../../domain/message/message.aggregate'
import { Message as MessageAggregate } from '../../domain/message/message.aggregate'
import {
  IdempotencyConflictError,
  RecipientSuppressedError,
} from '../../domain/message/message.errors'
import type { Clock } from '../../domain/ports/clock.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { SenderRepository } from '../../domain/ports/sender-repository.port'
import type { SuppressionRepository } from '../../domain/ports/suppression-repository.port'
import type { TemplateRepository } from '../../domain/ports/template-repository.port'
import { NoSenderAvailableError, SenderNotFoundError } from '../../domain/sender/sender.errors'
import { renderTemplate } from '../../domain/services/render-template'
import type { Channel } from '../../domain/shared/channel'
import { TemplateNotFoundError } from '../../domain/template/template.errors'
import { type MessageView, toMessageView } from '../mappers/message-view'

export interface SendMessageInput {
  channel: Channel
  templateKey: string
  recipient: { name: string; email?: string | null; phone?: string | null }
  variables?: Record<string, string>
  /** Anexos por URL (e-mail): só METADADOS — o worker busca os bytes no envio. */
  attachments?: Array<{ filename: string; url: string; contentType?: string | null }>
  senderId?: string | null
  scheduledAt?: Date
  priority?: number
  /** Idempotência da SOLICITAÇÃO (com `consumerId`) — retry não duplica o envio. */
  consumerId?: string | null
  idempotencyKey?: string | null
}

/**
 * Enfileira uma mensagem: resolve o template (ativo), renderiza com as variáveis,
 * resolve o remetente (e-mail) e persiste em QUEUED — o worker envia depois,
 * respeitando o ritmo. NÃO chama o provedor aqui (desacopla a borda do envio).
 */
export class SendMessageService {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly messages: MessageRepository,
    private readonly senders: SenderRepository,
    private readonly suppressions: SuppressionRepository,
    private readonly clock: Clock,
    private readonly idGen: () => string,
    private readonly maxSendAttempts: number,
  ) {}

  async execute(input: SendMessageInput): Promise<MessageView> {
    const consumerId = input.consumerId ?? null
    const idempotencyKey = input.idempotencyKey ?? null

    // Idempotência: mesma (consumerId, key) → devolve o que já existe.
    if (consumerId && idempotencyKey) {
      const existing = await this.messages.findByIdempotency(consumerId, idempotencyKey)
      if (existing) return toMessageView(existing)
    }

    const template = await this.templates.findByChannelAndKey(input.channel, input.templateKey)
    if (!template?.active) {
      throw new TemplateNotFoundError(
        `Template ${input.channel}/${input.templateKey} não encontrado ou inativo`,
      )
    }

    const rendered = renderTemplate(template.toRenderable(), input.variables ?? {})
    if (!rendered.ok) throw rendered.error

    const senderId = await this.resolveSenderId(input.channel, input.senderId ?? null)

    const address = input.channel === 'email' ? input.recipient.email : input.recipient.phone
    if (address && (await this.suppressions.isSuppressed(input.channel, address))) {
      throw new RecipientSuppressedError(`Destinatário suprimido neste canal (${input.channel})`)
    }

    const message: Message = MessageAggregate.create({
      id: this.idGen(),
      channel: input.channel,
      templateKey: input.templateKey,
      templateId: template.id,
      recipient: input.recipient,
      variables: input.variables ?? {},
      attachments: input.attachments,
      renderedSubject: rendered.value.subject,
      renderedBody: rendered.value.body,
      senderId,
      priority: input.priority,
      scheduledAt: input.scheduledAt,
      maxAttempts: this.maxSendAttempts,
      consumerId,
      idempotencyKey,
      now: this.clock.now(),
    })

    try {
      await this.messages.create(message)
    } catch (error) {
      // Corrida da idempotência (duas requisições concorrentes com a mesma chave):
      // quem perdeu o insert devolve a mensagem que o vencedor criou — mesma
      // resposta 202 do caminho feliz, sem 500.
      if (error instanceof IdempotencyConflictError && consumerId && idempotencyKey) {
        const existing = await this.messages.findByIdempotency(consumerId, idempotencyKey)
        if (existing) return toMessageView(existing)
      }
      throw error
    }
    return toMessageView(message)
  }

  /** E-mail precisa de um remetente; WhatsApp não. */
  private async resolveSenderId(
    channel: Channel,
    requested: string | null,
  ): Promise<string | null> {
    if (channel !== 'email') return null
    if (requested) {
      const sender = await this.senders.findById(requested)
      if (!sender) throw new SenderNotFoundError(`Remetente ${requested} não encontrado`)
      if (!sender.enabled) throw new NoSenderAvailableError('Remetente desabilitado')
      return sender.id
    }
    const def = await this.senders.findDefault()
    if (!def) throw new NoSenderAvailableError('Nenhum remetente de e-mail default configurado')
    return def.id
  }
}
