import type { EmailGateway, SendEmailInput } from '../../src/domain/ports/email-gateway.port'
import { ProviderSendError } from '../../src/domain/ports/provider-error'
import type {
  SendWhatsAppInput,
  WhatsAppGateway,
} from '../../src/domain/ports/whatsapp-gateway.port'

export type FailMode = 'none' | 'transient' | 'permanent'

export class FakeEmailGateway implements EmailGateway {
  readonly sent: SendEmailInput[] = []
  fail: FailMode = 'none'

  async sendEmail(input: SendEmailInput): Promise<{ providerMessageId: string | null }> {
    this.sent.push(input)
    if (this.fail === 'transient')
      throw new ProviderSendError('falha transitória', { permanent: false })
    if (this.fail === 'permanent')
      throw new ProviderSendError('endereço inválido', { permanent: true, status: 400 })
    return { providerMessageId: `sg-${this.sent.length}` }
  }
}

export class FakeWhatsAppGateway implements WhatsAppGateway {
  readonly sent: SendWhatsAppInput[] = []
  fail: FailMode = 'none'

  async sendText(input: SendWhatsAppInput): Promise<{ providerMessageId: string | null }> {
    this.sent.push(input)
    if (this.fail === 'transient')
      throw new ProviderSendError('falha transitória', { permanent: false })
    if (this.fail === 'permanent')
      throw new ProviderSendError('número inválido', { permanent: true, status: 400 })
    return { providerMessageId: `wamid-${this.sent.length}` }
  }
}
