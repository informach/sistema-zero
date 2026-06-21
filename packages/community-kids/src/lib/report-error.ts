/**
 * Envia um erro de RENDER do cliente ao beacon `/api/client-error` (ver a rota, que
 * espelha p/ o Sentry com redação de PII). Os error boundaries só faziam
 * `console.error` — invisível na telemetria, que via apenas erros de SERVIDOR
 * (`onRequestError`). Best-effort: `keepalive` sobrevive ao `reset()`/navegação e
 * qualquer falha é engolida — telemetria NUNCA atrapalha a recuperação da criança.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  try {
    if (typeof window === 'undefined') return
    const body = JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      path: window.location.pathname,
    })
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // nunca propaga
  }
}
