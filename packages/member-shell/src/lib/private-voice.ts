/**
 * As frases do botão "Ouvir" da voz privada do Zappy (full review de 14/10/2026). O botão mostrava
 * o `cause.message` cru: "Failed to fetch" numa queda de rede, o erro do parser de JSON quando a
 * borda devolvia a página HTML de um 502. Agora a criança só lê a frase da NOSSA rota (código
 * `VOICE_UNAVAILABLE`, que é escrita para ela) ou a frase gentil fixa; o resto vai ao console.
 */

export const PRIVATE_VOICE_GENTLE = 'Não consegui preparar a voz agora. Você pode continuar lendo.'
export const PRIVATE_VOICE_TAP_AGAIN = 'A fala está pronta. Toque em Ouvir para tocar.'

/** Recusa da rota da voz, com a frase que ela escreveu para a criança. */
export class PrivateVoiceRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrivateVoiceRequestError'
  }
}

/** A URL assinada da fala, ou a recusa com a frase certa. Nunca lança o erro do parser. */
export async function readPrivateVoiceUrl(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    url?: unknown
    error?: { code?: unknown; message?: unknown }
  } | null
  if (response.ok && typeof body?.url === 'string' && body.url) return body.url
  const message = body?.error?.message
  throw new PrivateVoiceRequestError(
    body?.error?.code === 'VOICE_UNAVAILABLE' &&
      typeof message === 'string' &&
      message.trim() &&
      message.length <= 200
      ? message
      : PRIVATE_VOICE_GENTLE,
  )
}

/** O que a criança lê quando a fala não sai. O detalhe técnico fica só no console. */
export function privateVoiceErrorText(cause: unknown): string {
  if (cause instanceof Error && cause.name === 'NotAllowedError') return PRIVATE_VOICE_TAP_AGAIN
  if (cause instanceof PrivateVoiceRequestError) return cause.message
  console.warn('[voz-privada] a fala não saiu', {
    name: cause instanceof Error ? cause.name : typeof cause,
  })
  return PRIVATE_VOICE_GENTLE
}
