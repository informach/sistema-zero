import type {
  AttachmentFetcher,
  FetchedAttachment,
} from '../../src/domain/ports/attachment-fetcher.port'
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

export class FakeAttachmentFetcher implements AttachmentFetcher {
  readonly fetched: string[] = []
  /** url → conteúdo devolvido (default: PDF fake). */
  readonly contents = new Map<string, FetchedAttachment>()
  fail: FailMode = 'none'

  async fetch(url: string): Promise<FetchedAttachment> {
    this.fetched.push(url)
    if (this.fail === 'transient') {
      throw new ProviderSendError('falha ao buscar anexo', {
        permanent: false,
        code: 'ATTACHMENT_FETCH_FAILED',
      })
    }
    if (this.fail === 'permanent') {
      throw new ProviderSendError('host de anexo não permitido', {
        permanent: true,
        code: 'ATTACHMENT_HOST_NOT_ALLOWED',
      })
    }
    return this.contents.get(url) ?? { contentBase64: 'UERG', contentType: 'application/pdf' }
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
