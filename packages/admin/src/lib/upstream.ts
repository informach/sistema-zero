interface ErrorEnvelope {
  error: { code: string; message: string }
}

/**
 * Normaliza o corpo de erro vindo do upstream (gateway/serviço) para o envelope
 * `{ error: { code, message } }` que a UI espera. Só deixa passar `code`+`message`
 * quando o envelope conhecido está presente; qualquer outro shape (stack, HTML,
 * texto cru de um serviço) vira um erro genérico — não vaza detalhe interno na
 * borda do painel em produção. Achado do 3º full review.
 */
export function normalizeUpstreamError(body: unknown): ErrorEnvelope {
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error
  if (error && typeof error.message === 'string' && error.message.trim() !== '') {
    return {
      error: {
        code: typeof error.code === 'string' && error.code !== '' ? error.code : 'UPSTREAM_ERROR',
        message: error.message,
      },
    }
  }
  return {
    error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível completar a operação.' },
  }
}
