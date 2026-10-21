/**
 * Recusa do Hub ao publicar no Mural, do jeito que a autora (muitas vezes uma criança) pode ler.
 *
 * ⚠️ A validação de schema do Hub (Elysia) devolve `VALIDATION_ERROR` com a mensagem CRUA do
 * validador: um JSON com `type`, `on`, `property`, `expected`... Repassado como veio, a tela de
 * publicar mostrava esse JSON para a criança (ex.: capa fora de `https`). O `code` continua na
 * resposta para o diagnóstico; só a mensagem vira uma frase.
 */
export const SHOWCASE_FAILURE_MESSAGE =
  'Não deu para publicar no Mural agora. Tente de novo daqui a pouco.'

/** Códigos cuja mensagem é técnica por natureza (schema, corpo, falha interna). */
const TECHNICAL_CODES = new Set(['VALIDATION_ERROR', 'PARSE_ERROR', 'INTERNAL_ERROR'])

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown }
}

function envelopeOf(body: unknown): ErrorEnvelope['error'] {
  if (!body || typeof body !== 'object' || !('error' in body)) return undefined
  const error = (body as ErrorEnvelope).error
  return error && typeof error === 'object' ? error : undefined
}

/** Uma frase para gente: sem JSON, sem quebra de linha, sem relatório de validador. */
function isHumanMessage(message: unknown): message is string {
  if (typeof message !== 'string') return false
  const text = message.trim()
  return text.length > 0 && text.length <= 240 && !/^[[{]/.test(text) && !/[\n\r]/.test(text)
}

/** A mensagem que a tela de publicar pode mostrar, a partir do corpo de erro recebido. */
export function showcaseErrorMessage(body: unknown, fallback = SHOWCASE_FAILURE_MESSAGE): string {
  const error = envelopeOf(body)
  if (!error) return fallback
  if (typeof error.code === 'string' && TECHNICAL_CODES.has(error.code)) return fallback
  return isHumanMessage(error.message) ? error.message.trim() : fallback
}

/** Corpo de erro seguro para devolver ao navegador: mantém o `code`, troca só a mensagem. */
export function showcaseFailureBody(
  body: unknown,
  fallbackCode: string,
): { error: { code: string; message: string } } {
  const error = envelopeOf(body)
  const code = typeof error?.code === 'string' && error.code ? error.code : fallbackCode
  return { error: { code, message: showcaseErrorMessage(body) } }
}
