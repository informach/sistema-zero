function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined
}

/** Texto para diagnóstico, nunca para inferir se uma transação foi paga ou cancelada. */
export function cardFailureReason(value: unknown): string | undefined {
  const data = record(value)
  if (!data) return undefined
  const payment = record(data.payment)
  const message = payment?.message
  let reason = typeof message === 'string' ? message : record(message)?.message
  if (typeof reason !== 'string' && Array.isArray(data.history)) {
    for (let index = data.history.length - 1; index >= 0; index--) {
      const text = record(data.history[index])?.message
      if (typeof text === 'string' && text.startsWith('Falha no pagamento')) {
        reason = text
        break
      }
    }
  }
  if (typeof reason !== 'string' || reason.length > 2048) return undefined
  // Não persistir payloads ou fragmentos de credenciais em erros inesperados.
  if (/payment_token|authorization|client_secret|password|cvv|card_number/i.test(reason))
    return undefined
  let safeReason = reason
  const customer = record(data.customer)
  const card = record(payment?.credit_card)
  for (const sensitive of [
    customer?.name,
    customer?.email,
    customer?.cpf,
    customer?.cnpj,
    customer?.phone_number,
    card?.holder_name,
    card?.holder_document,
  ]) {
    if (typeof sensitive === 'string' && sensitive.length >= 4)
      safeReason = safeReason.replaceAll(sensitive, '[redigido]')
  }
  const safe = safeReason
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[documento]')
    .replace(/\b\d{11,19}\b/g, '[documento]')
    .replace(/\p{Cc}/gu, ' ')
    .trim()
  return safe ? safe.slice(0, 512) : undefined
}
