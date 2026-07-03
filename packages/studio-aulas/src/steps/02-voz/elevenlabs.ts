import type { Emocao } from '../../roteiro/schema'

// Cliente REST mínimo do ElevenLabs (text-to-speech). Sem SDK: um POST por cena.
// Doc: https://elevenlabs.io/docs/api-reference/text-to-speech
// ⚠️ Antes de evoluir este cliente, confira a doc atual (Context7) — o contrato
// de `voice_settings`/modelos muda com o tempo.

const API_BASE = 'https://api.elevenlabs.io/v1'

export interface VozSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

/** Ponto de partida por emoção. Ajustável por aula via `meta.voz`. */
export function settingsParaEmocao(emocao: Emocao): VozSettings {
  const base = { similarity_boost: 0.75, use_speaker_boost: true }
  switch (emocao) {
    case 'empolgado':
      return { ...base, stability: 0.3, style: 0.7 }
    case 'calmo':
      return { ...base, stability: 0.7, style: 0.2 }
    case 'curioso':
      return { ...base, stability: 0.45, style: 0.5 }
    case 'comemorando':
      return { ...base, stability: 0.25, style: 0.85 }
    default:
      return { ...base, stability: 0.5, style: 0.3 }
  }
}

export interface ElevenLabsClientOptions {
  apiKey: string
  voiceId: string
  modelId?: string
}

export class ElevenLabsClient {
  private readonly apiKey: string
  private readonly voiceId: string
  private readonly modelId: string

  constructor(opts: ElevenLabsClientOptions) {
    this.apiKey = opts.apiKey
    this.voiceId = opts.voiceId
    this.modelId = opts.modelId?.trim() || 'eleven_multilingual_v2'
  }

  /** Sintetiza um trecho e devolve o MP3 como bytes. */
  async sintetizar(text: string, settings: VozSettings): Promise<Uint8Array> {
    const res = await fetch(
      `${API_BASE}/text-to-speech/${this.voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: settings,
        }),
      },
    )
    if (!res.ok) {
      const detalhe = await res.text().catch(() => '')
      throw new Error(`ElevenLabs ${res.status}: ${detalhe.slice(0, 400)}`)
    }
    return new Uint8Array(await res.arrayBuffer())
  }
}
