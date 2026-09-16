/**
 * Instante autoritativo em que o Payments aprovou a cobrança. Webhooks e
 * respostas de consulta podem omitir o campo em eventos legados; somente nesse
 * caso usamos o instante local de processamento como fallback.
 */
export function paymentApprovedAt(value: unknown, fallback: Date = new Date()): Date {
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : fallback
}
