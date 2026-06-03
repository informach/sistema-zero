/**
 * Erro de um provedor de envio (SendGrid/Evolution). `permanent` distingue uma
 * falha definitiva (4xx — destinatário/número inválido → não re-tentar, vira
 * FAILED) de uma transitória (rede/429/5xx → re-tentar com backoff).
 */
export class ProviderSendError extends Error {
  readonly permanent: boolean
  readonly code: string | null
  readonly status: number | null

  constructor(
    message: string,
    opts: { permanent?: boolean; code?: string | null; status?: number | null } = {},
  ) {
    super(message)
    this.name = 'ProviderSendError'
    this.permanent = opts.permanent ?? false
    this.code = opts.code ?? null
    this.status = opts.status ?? null
  }
}
