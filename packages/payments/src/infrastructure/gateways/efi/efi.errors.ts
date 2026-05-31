/** Erro de infraestrutura ao comunicar com a Efí (rede, autenticação, schema). */
export class EfiGatewayError extends Error {
  readonly code = 'EFI_GATEWAY_ERROR'

  constructor(
    message: string,
    readonly providerCode?: string,
    override readonly cause?: unknown,
    /** Status HTTP da resposta da Efí (quando houver) — usado para decidir retry. */
    readonly status?: number,
  ) {
    super(message)
    this.name = 'EfiGatewayError'
  }
}

/** Normaliza os diferentes formatos de erro do SDK/HTTP num `EfiGatewayError`. */
export function toEfiGatewayError(error: unknown): EfiGatewayError {
  if (error instanceof EfiGatewayError) return error

  const e = error as Record<string, unknown> | null
  const providerCode = e?.nome ?? e?.error ?? e?.code
  const message = e?.mensagem ?? e?.error_description ?? e?.message ?? 'Erro ao comunicar com a Efí'

  return new EfiGatewayError(
    String(message),
    providerCode != null ? String(providerCode) : undefined,
    error,
  )
}
