import {
  normalizarRoteiroDoZappy,
  ZAPPY_PRONUNCIATION_PROFILE_VERSION,
} from '@sistemazero/core/learning/scene'

/**
 * Partes puras do pedido de síntese. Moram fora de `server-only` para que o contrato tenha teste
 * direto, sem abrir uma rota nem chamar o ElevenLabs.
 */
export function assinaturaDoCacheDaVozDoZappy({
  voiceId,
  model,
  roteiro,
}: {
  voiceId: string
  model: string
  roteiro: string
}): string {
  return `${voiceId}\n${model}\n${ZAPPY_PRONUNCIATION_PROFILE_VERSION}\n${normalizarRoteiroDoZappy(roteiro)}`
}

/** A forma exata do texto que o ElevenLabs recebe. */
export function payloadDaSinteseDoZappy(roteiro: string, model: string) {
  return { text: normalizarRoteiroDoZappy(roteiro), model_id: model }
}
