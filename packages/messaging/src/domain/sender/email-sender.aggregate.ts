import { AggregateRoot } from '../shared/aggregate-root'
import { ValidationError } from '../shared/errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmailSenderStatus = 'VERIFIED' | 'UNVERIFIED'

export interface EmailSenderProps {
  fromEmail: string
  fromName: string
  replyTo: string | null
  status: EmailSenderStatus
  enabled: boolean
  isDefault: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateEmailSenderInput {
  id: string
  fromEmail: string
  fromName: string
  replyTo?: string | null
  status?: EmailSenderStatus
  enabled?: boolean
  isDefault?: boolean
  now: Date
}

export interface UpdateEmailSenderInput {
  fromName?: string
  replyTo?: string | null
  status?: EmailSenderStatus
  enabled?: boolean
  isDefault?: boolean
}

/** Remetente de e-mail configurável (pool — o `from` não é fixo). */
export class EmailSender extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: EmailSenderProps,
  ) {
    super(id)
  }

  static create(input: CreateEmailSenderInput): EmailSender {
    const fromEmail = input.fromEmail?.trim().toLowerCase()
    if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
      throw new ValidationError('from_email inválido')
    }
    if (!input.fromName?.trim()) throw new ValidationError('from_name é obrigatório')
    const replyTo = input.replyTo?.trim() || null
    if (replyTo && !EMAIL_RE.test(replyTo)) throw new ValidationError('reply_to inválido')

    return new EmailSender(input.id, {
      fromEmail,
      fromName: input.fromName.trim(),
      replyTo,
      status: input.status ?? 'UNVERIFIED',
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
      version: 0,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static fromState(id: string, props: EmailSenderProps): EmailSender {
    return new EmailSender(id, props)
  }

  update(patch: UpdateEmailSenderInput, now: Date): void {
    if (patch.fromName !== undefined) {
      if (!patch.fromName.trim()) throw new ValidationError('from_name é obrigatório')
      this.props.fromName = patch.fromName.trim()
    }
    if (patch.replyTo !== undefined) {
      const replyTo = patch.replyTo?.trim() || null
      if (replyTo && !EMAIL_RE.test(replyTo)) throw new ValidationError('reply_to inválido')
      this.props.replyTo = replyTo
    }
    if (patch.status !== undefined) this.props.status = patch.status
    if (patch.enabled !== undefined) this.props.enabled = patch.enabled
    if (patch.isDefault !== undefined) this.props.isDefault = patch.isDefault
    this.props.updatedAt = now
  }

  get fromEmail(): string {
    return this.props.fromEmail
  }
  get isDefault(): boolean {
    return this.props.isDefault
  }
  get enabled(): boolean {
    return this.props.enabled
  }
  get version(): number {
    return this.props.version
  }
  get state(): Readonly<EmailSenderProps> {
    return this.props
  }
}
