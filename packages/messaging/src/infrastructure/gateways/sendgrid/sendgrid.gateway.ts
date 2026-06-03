import type {
  EmailGateway,
  SendEmailInput,
  SendEmailResult,
} from '../../../domain/ports/email-gateway.port'
import { ProviderSendError } from '../../../domain/ports/provider-error'

export interface SendGridConfig {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Adapter do SendGrid (`POST /v3/mail/send`) via `fetch` nativo — sem SDK (evita
 * o risco de SDKs sob Bun e dependências extras). 202 = aceito; o id da mensagem
 * vem no header `X-Message-Id` (casa com o webhook de status). 429/5xx/rede =
 * transitório (re-tentar); 4xx (≠429) = permanente.
 */
export class SendGridEmailGateway implements EmailGateway {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(cfg: SendGridConfig) {
    this.apiKey = cfg.apiKey ?? ''
    this.baseUrl = cfg.baseUrl ?? 'https://api.sendgrid.com'
    this.timeoutMs = cfg.timeoutMs ?? 15_000
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.apiKey) {
      throw new ProviderSendError('SENDGRID_API_KEY ausente', {
        permanent: false,
        code: 'NOT_CONFIGURED',
      })
    }

    const body = {
      personalizations: [
        { to: [input.toName ? { email: input.to, name: input.toName } : { email: input.to }] },
      ],
      from: { email: input.from, name: input.fromName },
      ...(input.replyTo ? { reply_to: { email: input.replyTo } } : {}),
      subject: input.subject,
      content: [{ type: 'text/html', value: input.html }],
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/v3/mail/send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e) {
      throw new ProviderSendError(`Falha de rede ao enviar via SendGrid: ${errMessage(e)}`, {
        permanent: false,
      })
    } finally {
      clearTimeout(timer)
    }

    if (res.ok) {
      return { providerMessageId: res.headers.get('x-message-id') }
    }
    const detail = await res.text().catch(() => '')
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 429
    throw new ProviderSendError(`SendGrid respondeu ${res.status}: ${detail.slice(0, 300)}`, {
      permanent,
      status: res.status,
    })
  }
}
