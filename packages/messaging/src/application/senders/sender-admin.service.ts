import type { Clock } from '../../domain/ports/clock.port'
import type { SenderRepository } from '../../domain/ports/sender-repository.port'
import {
  EmailSender,
  type EmailSenderStatus,
  type UpdateEmailSenderInput,
} from '../../domain/sender/email-sender.aggregate'
import { SenderNotFoundError } from '../../domain/sender/sender.errors'
import { ValidationError } from '../../domain/shared/errors'
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
    if (existing) throw new ValidationError(`Remetente ${input.fromEmail} já existe`)
    if (input.isDefault) await this.senders.clearDefault()
    const sender = EmailSender.create({ id: this.idGen(), ...input, now: this.clock.now() })
    await this.senders.create(sender)
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
    if (patch.isDefault === true) await this.senders.clearDefault()
    sender.update(patch, this.clock.now())
    await this.senders.update(sender)
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
