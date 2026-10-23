/**
 * Regras PURAS do envio da gravação de um encontro ao Vimeo (14/10/2026). Quem tem as
 * credenciais do Vimeo e do R2 é o Admin: ao publicar a gravação revisada, ele pede ao members
 * onde está o MP4 (`recording/source` → `{ storageKey, bucket }`), assina uma URL GET temporária
 * e o Vimeo BAIXA o arquivo (`upload.approach: 'pull'`).
 */

/** Quanto tempo o Vimeo tem para baixar o MP4: gravação de até 4 h, fila do Vimeo incluída. */
export const RECORDING_LINK_TTL_SECONDS = 6 * 60 * 60

export type RecordingBucket = { ok: true; bucket: string } | { ok: false; message: string }

/**
 * Em qual bucket o Admin assina a URL. O gravador grava no bucket privado de gravações (a env
 * `R2_BUCKET` DELE); o members informa qual é. O Admin só assina em bucket que conhece:
 * `LIVE_RECORDING_BUCKET` (quando o gravador usa um bucket próprio) ou o privado de sempre
 * (`R2_PRIVATE_BUCKET`, que é o que a sala usa para tocar a gravação). Bucket desconhecido é
 * erro de CONFIGURAÇÃO, dito com o nome da env que falta, e nunca uma assinatura às cegas.
 */
export function resolveRecordingBucket(input: {
  requested: string | null | undefined
  privateBucket?: string
  recordingBucket?: string
}): RecordingBucket {
  const recording = input.recordingBucket?.trim()
  const privateBucket = input.privateBucket?.trim()
  const requested = input.requested?.trim()
  if (!requested) {
    const fallback = recording || privateBucket
    return fallback
      ? { ok: true, bucket: fallback }
      : {
          ok: false,
          message:
            'Envio ao Vimeo indisponível: configure LIVE_RECORDING_BUCKET (ou R2_PRIVATE_BUCKET) no Admin.',
        }
  }
  if (requested === recording || requested === privateBucket) return { ok: true, bucket: requested }
  return {
    ok: false,
    message: `A gravação está no bucket "${requested}", que o Admin não conhece. Configure LIVE_RECORDING_BUCKET=${requested} no Admin, com credenciais R2 que leiam esse bucket.`,
  }
}

/** A chave do objeto no bucket, sem o prefixo `r2priv:`. `null` = chave que não assinamos. */
export function recordingObjectKey(storageKey: unknown): string | null {
  if (typeof storageKey !== 'string') return null
  const key = storageKey.replace(/^r2priv:/, '').replace(/^\/+/, '')
  if (!key || key.length > 1024 || key.includes('..') || !/^[A-Za-z0-9/_.=-]+$/.test(key))
    return null
  return key
}

/** O nome do vídeo no Vimeo: o título que o members mandar, senão um nome que dá para achar. */
export function recordingVideoName(occurrenceId: string, title?: unknown): string {
  const clean = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  return clean
    ? `Oficina ao vivo · ${clean}`
    : `Oficina ao vivo · gravação ${occurrenceId.slice(0, 8)}`
}

/** Id de vídeo do Vimeo (só dígitos): o que a rota de status aceita do navegador. */
export function isVimeoVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,20}$/.test(value)
}
