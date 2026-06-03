import { ProviderSendError } from '../../../domain/ports/provider-error'
import type {
  SendWhatsAppInput,
  SendWhatsAppResult,
  WhatsAppGateway,
} from '../../../domain/ports/whatsapp-gateway.port'

export interface EvolutionConfig {
  baseUrl?: string
  apiKey?: string
  timeoutMs?: number
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Lê `key.id` da resposta da Evolution de forma defensiva. */
function readMessageId(data: unknown): string | null {
  if (data && typeof data === 'object' && 'key' in data) {
    const key = (data as { key?: unknown }).key
    if (key && typeof key === 'object' && 'id' in key) {
      const id = (key as { id?: unknown }).id
      if (typeof id === 'string') return id
    }
  }
  return null
}

/**
 * Adapter da Evolution API (`POST /message/sendText/{instance}`, header `apikey`)
 * via `fetch` nativo. O `delay` (ms) simula "digitando" antes de enviar. 400/404
 * (número inválido/instância) = permanente; rede/5xx/429 = transitório.
 * O RITMO/rotação entre instâncias é responsabilidade do worker, não daqui.
 */
export class EvolutionWhatsAppGateway implements WhatsAppGateway {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor(cfg: EvolutionConfig) {
    this.baseUrl = (cfg.baseUrl ?? '').replace(/\/$/, '')
    this.apiKey = cfg.apiKey ?? ''
    this.timeoutMs = cfg.timeoutMs ?? 20_000
  }

  async sendText(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ProviderSendError(
        'Evolution API não configurada (EVOLUTION_URL/EVOLUTION_API_KEY)',
        {
          permanent: false,
          code: 'NOT_CONFIGURED',
        },
      )
    }

    const body: Record<string, unknown> = { number: input.phoneNumber, text: input.text }
    if (input.typingDelayMs && input.typingDelayMs > 0) body.delay = input.typingDelayMs

    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(input.instanceName)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { apikey: this.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e) {
      throw new ProviderSendError(`Falha de rede ao enviar via Evolution: ${errMessage(e)}`, {
        permanent: false,
      })
    } finally {
      clearTimeout(timer)
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { providerMessageId: readMessageId(data) }
    }
    const detail = await res.text().catch(() => '')
    const permanent = res.status === 400 || res.status === 404
    throw new ProviderSendError(`Evolution respondeu ${res.status}: ${detail.slice(0, 300)}`, {
      permanent,
      status: res.status,
    })
  }
}
