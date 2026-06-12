import type {
  AttachmentFetcher,
  FetchedAttachment,
} from '../../domain/ports/attachment-fetcher.port'
import { ProviderSendError } from '../../domain/ports/provider-error'

export interface HttpAttachmentFetcherConfig {
  /** Teto de bytes por anexo (confere content-length E o tamanho real lido). */
  maxBytes: number
  /**
   * Allowlist de hostnames (anti-SSRF). VAZIA = qualquer host (dev); quando
   * setada, host fora da lista é falha PERMANENTE (não adianta re-tentar).
   */
  allowedHosts: string[]
  timeoutMs?: number
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Busca o conteúdo de um anexo por URL via `fetch` nativo. Política de erros:
 * timeout/rede/4xx/5xx/tamanho = TRANSITÓRIA (mesmo retry/backoff de um erro do
 * SendGrid — o anexo pode ainda não estar disponível); URL inválida/protocolo
 * não-http(s)/host fora da allowlist = PERMANENTE (determinístico, FAILED).
 * `redirect: 'error'` — seguir redirect driblaria a allowlist (SSRF clássico).
 */
export class HttpAttachmentFetcher implements AttachmentFetcher {
  private readonly maxBytes: number
  private readonly allowedHosts: Set<string>
  private readonly timeoutMs: number

  constructor(cfg: HttpAttachmentFetcherConfig) {
    this.maxBytes = cfg.maxBytes
    this.allowedHosts = new Set(cfg.allowedHosts.map((h) => h.trim().toLowerCase()))
    this.timeoutMs = cfg.timeoutMs ?? 15_000
  }

  async fetch(url: string): Promise<FetchedAttachment> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new ProviderSendError(`URL de anexo inválida: ${url}`, {
        permanent: true,
        code: 'ATTACHMENT_URL_INVALID',
      })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ProviderSendError(`URL de anexo deve ser http(s): ${url}`, {
        permanent: true,
        code: 'ATTACHMENT_URL_INVALID',
      })
    }
    if (this.allowedHosts.size > 0 && !this.allowedHosts.has(parsed.hostname.toLowerCase())) {
      throw new ProviderSendError(`Host de anexo não permitido: ${parsed.hostname}`, {
        permanent: true,
        code: 'ATTACHMENT_HOST_NOT_ALLOWED',
      })
    }

    let res: Response
    try {
      res = await fetch(parsed, {
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      })
    } catch (e) {
      throw new ProviderSendError(`Falha ao buscar anexo (${url}): ${errMessage(e)}`, {
        permanent: false,
        code: 'ATTACHMENT_FETCH_FAILED',
      })
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {})
      throw new ProviderSendError(`Anexo respondeu ${res.status} (${url})`, {
        permanent: false,
        status: res.status,
        code: 'ATTACHMENT_FETCH_FAILED',
      })
    }

    // Teto declarado (content-length) — corta cedo sem baixar o corpo.
    const declared = Number(res.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > this.maxBytes) {
      await res.body?.cancel().catch(() => {})
      throw this.tooLarge(url, declared)
    }

    // Teto REAL lido (streaming): content-length ausente/mentiroso não fura o cap.
    const chunks: Uint8Array[] = []
    let total = 0
    const reader = res.body?.getReader()
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          total += value.byteLength
          if (total > this.maxBytes) {
            await reader.cancel().catch(() => {})
            throw this.tooLarge(url, total)
          }
          chunks.push(value)
        }
      } catch (e) {
        if (e instanceof ProviderSendError) throw e
        throw new ProviderSendError(`Falha ao ler o anexo (${url}): ${errMessage(e)}`, {
          permanent: false,
          code: 'ATTACHMENT_FETCH_FAILED',
        })
      }
    }

    return {
      contentBase64: Buffer.concat(chunks).toString('base64'),
      contentType: res.headers.get('content-type'),
    }
  }

  private tooLarge(url: string, bytes: number): ProviderSendError {
    return new ProviderSendError(
      `Anexo acima do teto de ${this.maxBytes} bytes (${bytes}+ em ${url})`,
      { permanent: false, code: 'ATTACHMENT_TOO_LARGE' },
    )
  }
}
