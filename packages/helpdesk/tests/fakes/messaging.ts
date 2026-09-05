import type {
  MessagingGateway,
  SendEmailInput,
} from '../../src/domain/ports/messaging-gateway.port'

/** Captura os avisos enviados; `failNext` simula uma tentativa transitória do worker. */
export class FakeMessagingGateway implements MessagingGateway {
  readonly sent: SendEmailInput[] = []
  failNext: Error | null = null

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (this.failNext) {
      const error = this.failNext
      this.failNext = null
      throw error
    }
    this.sent.push(structuredClone(input))
  }
}
