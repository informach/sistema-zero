import 'server-only'
import type { LiveRecordingVimeo } from '@sistemazero/core/live'
import {
  RECORDING_LINK_TTL_SECONDS,
  recordingObjectKey,
  recordingVideoName,
  resolveRecordingBucket,
} from '@/lib/live-recording-vimeo'
import { mapVimeoStatus } from '@/lib/vimeo-helpers'
import type { CallOpts, GatewayResponse } from './gateway'
import { MediaNotConfiguredError } from './r2'

/**
 * A gravação de um encontro vai para o Vimeo (14/10/2026), como os vídeos dos cursos gravados:
 * mesma privacidade, mesma pasta. O members guarda o resultado em `recording.vimeo`; a sala da
 * criança passa a tocar o player do Vimeo quando ele fica `ready`.
 *
 * Tudo entra por injeção para os testes rodarem com fakes (gateway, R2 e Vimeo).
 */
export interface RecordingVimeoDeps {
  gatewayFetch: (path: string, opts?: CallOpts) => Promise<GatewayResponse>
  headObject: (bucket: string, key: string) => Promise<{ sizeBytes: number }>
  presignGet: (bucket: string, key: string, expiresInSeconds: number) => Promise<string>
  createPullUpload: (input: {
    link: string
    sizeBytes: number
    name: string
  }) => Promise<{ vimeoVideoId: string; embedUrl: string }>
  /** Whitelist de domínios + pasta (best-effort, como nos vídeos das aulas). */
  finishSetup: (vimeoVideoId: string) => Promise<void>
  getVideo: (vimeoVideoId: string) => Promise<{ status: string; embedUrl: string }>
  deleteVideo: (vimeoVideoId: string) => Promise<void>
  buckets: () => { privateBucket?: string; recordingBucket?: string }
}

export type RecordingVimeoOutcome =
  | { kind: 'ok'; vimeo: LiveRecordingVimeo }
  /** O members recusou (sem acesso, gravação não revisada, versão…): o recado dele vai à tela. */
  | { kind: 'upstream'; response: GatewayResponse }
  | { kind: 'invalid'; status: number; code: string; message: string }

interface RecordingSource {
  storageKey?: unknown
  bucket?: unknown
  title?: unknown
}

const base = (occurrenceId: string) =>
  `/members/admin/live/occurrences/${encodeURIComponent(occurrenceId)}/recording`

/** Dois cliques (ou duas abas) no mesmo encontro dividem UM envio: nunca dois vídeos no Vimeo. */
const IN_FLIGHT = Symbol.for('@sistemazero/admin:live-recording-vimeo')
function inFlight(): Map<string, Promise<RecordingVimeoOutcome>> {
  const registry = globalThis as unknown as Record<
    symbol,
    Map<string, Promise<RecordingVimeoOutcome>> | undefined
  >
  registry[IN_FLIGHT] ??= new Map()
  return registry[IN_FLIGHT]
}

export function createRecordingVimeoService(deps: RecordingVimeoDeps) {
  async function save(occurrenceId: string, vimeo: LiveRecordingVimeo) {
    return deps.gatewayFetch(`${base(occurrenceId)}/vimeo`, { method: 'PUT', body: vimeo })
  }

  async function startOnce(occurrenceId: string): Promise<RecordingVimeoOutcome> {
    const source = await deps.gatewayFetch(`${base(occurrenceId)}/source`)
    if (source.status !== 200 || !source.body || typeof source.body !== 'object')
      return { kind: 'upstream', response: source }
    const { storageKey, bucket, title } = source.body as RecordingSource
    const key = recordingObjectKey(storageKey)
    if (!key)
      return {
        kind: 'invalid',
        status: 409,
        code: 'RECORDING_NOT_READY',
        message: 'A gravação revisada ainda não está disponível para enviar ao Vimeo.',
      }
    const resolved = resolveRecordingBucket({
      requested: typeof bucket === 'string' ? bucket : null,
      ...deps.buckets(),
    })
    if (!resolved.ok) throw new MediaNotConfiguredError(resolved.message)
    const { sizeBytes } = await deps.headObject(resolved.bucket, key)
    if (!sizeBytes)
      return {
        kind: 'invalid',
        status: 409,
        code: 'RECORDING_EMPTY',
        message: 'O arquivo da gravação está vazio. Confira a gravação antes de publicar.',
      }
    const link = await deps.presignGet(resolved.bucket, key, RECORDING_LINK_TTL_SECONDS)
    const video = await deps.createPullUpload({
      link,
      sizeBytes,
      name: recordingVideoName(occurrenceId, title),
    })
    await deps.finishSetup(video.vimeoVideoId)
    const vimeo: LiveRecordingVimeo = {
      videoId: video.vimeoVideoId,
      embedUrl: video.embedUrl,
      status: 'processing',
    }
    const saved = await save(occurrenceId, vimeo)
    if (saved.status < 200 || saved.status >= 300) {
      // O members não registrou: o vídeo ficaria órfão na conta (e um novo envio faria outro).
      await deps.deleteVideo(video.vimeoVideoId).catch((error) =>
        console.error('[live-recording-vimeo] não apagou o vídeo órfão', {
          vimeoVideoId: video.vimeoVideoId,
          error,
        }),
      )
      return { kind: 'upstream', response: saved }
    }
    return { kind: 'ok', vimeo }
  }

  return {
    /** Cria o vídeo no Vimeo por `pull` e grava `recording.vimeo` (processando). */
    start(occurrenceId: string): Promise<RecordingVimeoOutcome> {
      const running = inFlight()
      const current = running.get(occurrenceId)
      if (current) return current
      const promise = startOnce(occurrenceId).finally(() => running.delete(occurrenceId))
      running.set(occurrenceId, promise)
      return promise
    },

    /**
     * Acompanha o processamento (a reconciliação dos vídeos das aulas: sem webhook, a tela
     * pergunta). Quando o Vimeo termina, `ready` ou `failed` vai ao members.
     */
    async refresh(occurrenceId: string, videoId: string): Promise<RecordingVimeoOutcome> {
      const video = await deps.getVideo(videoId)
      const vimeo: LiveRecordingVimeo = {
        videoId,
        embedUrl: video.embedUrl,
        status: mapVimeoStatus(video.status),
      }
      if (vimeo.status === 'processing') return { kind: 'ok', vimeo }
      const saved = await save(occurrenceId, vimeo)
      if (saved.status < 200 || saved.status >= 300) return { kind: 'upstream', response: saved }
      return { kind: 'ok', vimeo }
    },
  }
}
