import 'server-only'
import { createHash } from 'node:crypto'
import type { LiveRecordingVimeo } from '@sistemazero/core/live'
import { z } from 'zod'
import {
  RECORDING_LINK_TTL_SECONDS,
  recordingObjectKey,
  recordingVideoName,
  resolveRecordingBucket,
} from '@/lib/live-recording-vimeo'
import { mapVimeoStatus } from '@/lib/vimeo-helpers'
import type { CallOpts, GatewayResponse } from './gateway'
import type { VimeoUploadJournal } from './live-vimeo-journal'
import { MediaNotConfiguredError } from './r2'
import { VimeoApiError } from './vimeo'

/**
 * A gravação de um encontro vai para o Vimeo (14/10/2026), como os vídeos dos cursos gravados:
 * mesma privacidade, mesma pasta. O members guarda o resultado em `recording.vimeo`; a sala da
 * criança passa a tocar o player do Vimeo quando ele fica `ready`.
 *
 * Tudo entra por injeção para os testes rodarem com fakes (gateway, R2 e Vimeo).
 */
export interface RecordingVimeoDeps {
  journal: VimeoUploadJournal
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

const stateSchema = z.object({
  recording: z.object({
    vimeo: z
      .object({
        videoId: z.string().regex(/^\d+$/),
        embedUrl: z.string().url(),
        status: z.enum(['processing', 'ready', 'failed']),
      })
      .nullish(),
  }),
})

export function createRecordingVimeoService(deps: RecordingVimeoDeps) {
  const read = async (id: string) => {
    const response = await deps.gatewayFetch(`${base(id)}/vimeo`)
    if (response.status !== 200) return { response, vimeo: null }
    return { response, vimeo: stateSchema.parse(response.body).recording.vimeo ?? null }
  }
  const save = (id: string, vimeo: LiveRecordingVimeo) =>
    deps.gatewayFetch(`${base(id)}/vimeo`, { method: 'PUT', body: vimeo })

  async function startOnce(
    id: string,
    previous: LiveRecordingVimeo | null,
  ): Promise<RecordingVimeoOutcome> {
    const source = await deps.gatewayFetch(`${base(id)}/source`)
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
    // A failed provider upload can be retried explicitly; all other retries reuse its receipt.
    const fingerprint = createHash('sha256')
      .update(`${key}:${previous?.videoId ?? ''}`)
      .digest('hex')
    const receipt = `live/vimeo-uploads/${id}/${fingerprint}.json`
    let pending = await deps.journal.read(resolved.bucket, receipt)
    if (!pending) {
      const { sizeBytes } = await deps.headObject(resolved.bucket, key)
      if (!sizeBytes)
        return {
          kind: 'invalid',
          status: 409,
          code: 'RECORDING_EMPTY',
          message: 'O arquivo da gravação está vazio. Confira a gravação antes de publicar.',
        }
      const link = await deps.presignGet(resolved.bucket, key, RECORDING_LINK_TTL_SECONDS)
      const claimed = await deps.journal.write(resolved.bucket, receipt, { vimeo: null }, true)
      if (claimed) {
        // An ambiguous creation keeps the claim: never automatically create another paid video.
        const video = await deps
          .createPullUpload({ link, sizeBytes, name: recordingVideoName(id, title) })
          .catch(async (error: unknown) => {
            // Explicit rejection means no video was created. Network errors and 5xx remain ambiguous.
            if (
              error instanceof VimeoApiError &&
              [400, 401, 403, 404, 413, 415, 422, 429].includes(error.status)
            )
              await deps.journal.remove(resolved.bucket, receipt)
            throw error
          })
        pending = {
          vimeo: { videoId: video.vimeoVideoId, embedUrl: video.embedUrl, status: 'processing' },
        }
        try {
          await deps.journal.write(resolved.bucket, receipt, pending)
        } catch (error) {
          console.error('[live-recording-vimeo] recuperar recibo antes de reenviar', {
            occurrenceId: id,
            videoId: video.vimeoVideoId,
            error,
          })
          throw error
        }
      } else pending = await deps.journal.read(resolved.bucket, receipt)
    }
    const vimeo = pending?.vimeo
    if (!vimeo)
      return {
        kind: 'invalid',
        status: 409,
        code: 'RECORDING_UPLOAD_PENDING',
        message:
          'O envio já foi iniciado. Aguarde e atualize. Se persistir, peça à administração para conferir o envio no Vimeo antes de tentar novamente.',
      }
    await deps.finishSetup(vimeo.videoId)
    let saved: GatewayResponse
    try {
      saved = await save(id, vimeo)
    } catch {
      // The PUT may have committed. Read back before retrying; the durable receipt also
      // survives a second outage or a process restart, so the next POST reuses this ID.
      const current = await read(id)
      if (current.response.status !== 200) return { kind: 'upstream', response: current.response }
      if (current.vimeo?.videoId === vimeo.videoId) return { kind: 'ok', vimeo: current.vimeo }
      saved = await save(id, vimeo)
    }
    if (saved.status < 200 || saved.status >= 300) {
      // Keep the recoverable receipt on any refusal. Do not delete on an ambiguous save.
      return { kind: 'upstream', response: saved }
    }
    return { kind: 'ok', vimeo }
  }

  return {
    async start(id: string): Promise<RecordingVimeoOutcome> {
      // Authorization is request-scoped, BEFORE joining any other caller's work.
      const authorized = await read(id)
      if (authorized.response.status !== 200)
        return { kind: 'upstream', response: authorized.response }
      if (authorized.vimeo && authorized.vimeo.status !== 'failed')
        return { kind: 'ok', vimeo: authorized.vimeo }
      const running = inFlight()
      const current = running.get(id)
      if (current) return current
      const promise = startOnce(id, authorized.vimeo).finally(() => running.delete(id))
      running.set(id, promise)
      return promise
    },
    async refresh(id: string, requestedVideoId: string): Promise<RecordingVimeoOutcome> {
      const authorized = await read(id)
      if (authorized.response.status !== 200)
        return { kind: 'upstream', response: authorized.response }
      const bound = authorized.vimeo
      if (!bound || bound.videoId !== requestedVideoId)
        return {
          kind: 'invalid',
          status: 404,
          code: 'NOT_FOUND',
          message: 'Gravação não encontrada.',
        }
      const video = await deps.getVideo(bound.videoId)
      const vimeo: LiveRecordingVimeo = {
        videoId: bound.videoId,
        embedUrl: video.embedUrl,
        status: mapVimeoStatus(video.status),
      }
      if (vimeo.status === 'processing') return { kind: 'ok', vimeo }
      const saved = await save(id, vimeo)
      if (saved.status < 200 || saved.status >= 300) return { kind: 'upstream', response: saved }
      return { kind: 'ok', vimeo }
    },
  }
}
