/**
 * Os recados do Guia do Pensa dentro das oficinas (14/10/2026).
 *
 * O guia mora nos PACOTES (Estúdio, Pinta) e não conhece o servidor; a convenção entre os dois
 * é o campo `childMessage` na rejeição: com ele o guia mostra a frase, sem ele trata como falha
 * de REDE ("Confira a internet"). Antes toda recusa virava "Confira a internet", inclusive a
 * dependência não cumprida e o plano alterado, e a criança ficava conferindo um Wi-Fi que estava
 * bom. Quem decide o que é frase de criança é o HOST, aqui, porque é ele que fala com o servidor.
 */
export type GuideError = Error & { code?: string; childMessage?: string }

/** Uma recusa com frase para a criança. */
export function guideError(message: string, code?: string): GuideError {
  return Object.assign(new Error(message), {
    childMessage: message,
    ...(code ? { code } : {}),
  })
}

/** Opening and mutation failures preserve the server's child-facing refusal. */
export const RECUSA_AO_ABRIR = 'Não consegui abrir esta missão agora. Tente novamente.'

export function progressRefusal(
  status: number,
  body: unknown,
  fallback = 'Não consegui guardar esta missão. Tente novamente.',
): GuideError {
  const envelope = body && typeof body === 'object' && 'error' in body ? body.error : null
  const code =
    envelope &&
    typeof envelope === 'object' &&
    'code' in envelope &&
    typeof envelope.code === 'string'
      ? envelope.code
      : undefined
  const message =
    envelope &&
    typeof envelope === 'object' &&
    'message' in envelope &&
    typeof envelope.message === 'string'
      ? envelope.message
      : null
  if (status === 404)
    return guideError('Esta missão não está mais neste caminho. Volte ao plano.', code)
  if (status === 409)
    return guideError(message ?? 'O caminho mudou. Confira a missão atual e tente novamente.', code)
  if (status === 403)
    return guideError(
      message ?? 'Esta missão não está disponível para você agora. Volte ao plano para conferir.',
      code,
    )
  if (status >= 500)
    return guideError('Não consegui falar com seu plano. Tente novamente daqui a pouco.', code)
  return guideError(message ?? fallback, code)
}

/**
 * A espera da nuvem antes de concluir (`cloud.confirm`). A fila rejeita com a frase da criança
 * (`CLOUD_MESSAGES`) e o `code` do servidor quando o item FALHOU; sem `code` é o prazo vencido
 * ou a fila desligada, que quase sempre é falta de internet: a frase diz as duas coisas.
 */
export function cloudConfirmRefusal(cause: unknown, what: string): GuideError {
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    'message' in cause &&
    typeof cause.code === 'string' &&
    typeof cause.message === 'string'
  )
    return guideError(cause.message, cause.code)
  return guideError(`${what} ainda não chegou à conta. Confira a internet e tente de novo.`)
}
