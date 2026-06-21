import type { Clock } from '../../domain/ports/clock.port'
import type { SenderRepository } from '../../domain/ports/sender-repository.port'
import {
  EmailSender,
  type EmailSenderStatus,
  type UpdateEmailSenderInput,
} from '../../domain/sender/email-sender.aggregate'
import { SenderAlreadyExistsError, SenderNotFoundError } from '../../domain/sender/sender.errors'
import { type SenderView, toSenderView } from '../mappers/sender-view'

export interface CreateSenderInput {
  fromEmail: string
  fromName: string
  replyTo?: string | null
  status?: EmailSenderStatus
  enabled?: boolean
  isDefault?: boolean
}

export class CreateSenderService {
  constructor(
    private readonly senders: SenderRepository,
    private readonly clock: Clock,
    private readonly idGen: () => string,
  ) {}

  async execute(input: CreateSenderInput): Promise<SenderView> {
    const existing = await this.senders.findByEmail(input.fromEmail)
    if (existing) throw new SenderAlreadyExistsError(`Remetente ${input.fromEmail} já existe`)
    const sender = EmailSender.create({ id: this.idGen(), ...input, now: this.clock.now() })
    // Promoção de default atômica (limpa os demais NA MESMA transação da gravação).
    await this.senders.create(sender, { clearOtherDefaults: input.isDefault === true })
    return toSenderView(sender)
  }
}

export class UpdateSenderService {
  constructor(
    private readonly senders: SenderRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, patch: UpdateEmailSenderInput): Promise<SenderView> {
    const sender = await this.senders.findById(id)
    if (!sender) throw new SenderNotFoundError(`Remetente ${id} não encontrado`)
    sender.update(patch, this.clock.now())
    // Promoção de default atômica (limpa os demais NA MESMA transação da gravação).
    await this.senders.update(sender, { clearOtherDefaults: patch.isDefault === true })
    return toSenderView(sender)
  }
}

export class ListSendersService {
  constructor(private readonly senders: SenderRepository) {}

  async execute(query: { limit: number; offset: number }): Promise<{
    items: SenderView[]
    total: number
  }> {
    const { items, total } = await this.senders.list(query)
    return { items: items.map(toSenderView), total }
  }
}
