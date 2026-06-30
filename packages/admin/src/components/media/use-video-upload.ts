'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as tus from 'tus-js-client'
import { type ApiError, apiGet, apiSend } from '@/lib/api'

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024
const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const POLL_INTERVAL_MS = 5_000
const POLL_MAX_MS = 10 * 60_000 // ~10min de transcode; depois o editor re-checa sob demanda

export type VideoUploadPhase =
  | 'idle'
  | 'requesting-ticket'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error'

export interface ReadyVideo {
  vimeoVideoId: string
  embedUrl: string
  durationSeconds: number | null
  captions: { lang: string; url: string }[]
}

interface VideoStatusResponse {
  status: 'processing' | 'ready' | 'failed'
  durationSeconds: number | null
  embedUrl: string
  captions?: { lang: string; url: string }[]
}

/**
 * Upload de vídeo p/ o Vimeo: ticket TUS via BFF → upload resumável DIRETO do
 * browser (chunks de 128MB, retry) → polling de status até o transcode terminar
 * (quando ready, o BFF já sincronizou a transcrição p/ o R2).
 */
export function useVideoUpload(onReady: (video: ReadyVideo) => void) {
  const [phase, setPhase] = useState<VideoUploadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStartedAt = useRef(0)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = null
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const poll = useCallback(async (id: string) => {
    try {
      const status = await apiGet<VideoStatusResponse>(`/api/media/videos/${id}/status`)
      if (status.status === 'ready') {
        setPhase('ready')
        setEmbedUrl(status.embedUrl)
        onReadyRef.current({
          vimeoVideoId: id,
          embedUrl: status.embedUrl,
          durationSeconds: status.durationSeconds,
          captions: status.captions ?? [],
        })
        return
      }
      if (status.status === 'failed') {
        setPhase('error')
        setError('O Vimeo não conseguiu processar o vídeo. Tente reenviar.')
        return
      }
    } catch {
      // Falha transitória de rede/status — continua tentando até o cap.
    }
    if (Date.now() - pollStartedAt.current < POLL_MAX_MS) {
      pollTimer.current = setTimeout(() => void poll(id), POLL_INTERVAL_MS)
    }
    // Cap atingido: permanece "processing" — o botão "verificar" re-checa.
  }, [])

  /** Re-checa o status manualmente (ex.: reabriu o editor com vídeo processando). */
  const checkStatus = useCallback(
    (id: string) => {
      stopPolling()
      setVideoId(id)
      setPhase('processing')
      pollStartedAt.current = Date.now()
      void poll(id)
    },
    [poll, stopPolling],
  )

  const upload = useCallback(
    async (file: File) => {
      setError(null)
      setProgress(0)
      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Formato inválido. Envie um vídeo MP4, WebM ou MOV.')
        setPhase('error')
        return
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setError('Vídeo excede o limite de 5 GB.')
        setPhase('error')
        return
      }

      setPhase('requesting-ticket')
      let ticket: { vimeoVideoId: string; uploadLink: string; embedUrl: string }
      try {
        ticket = await apiSend<{ vimeoVideoId: string; uploadLink: string; embedUrl: string }>(
          '/api/media/videos/ticket',
          'POST',
          { filename: file.name, sizeBytes: file.size, mimeType: file.type },
        )
      } catch (err) {
        setError((err as ApiError).message ?? 'Falha ao preparar o upload no Vimeo.')
        setPhase('error')
        return
      }

      setVideoId(ticket.vimeoVideoId)
      setEmbedUrl(ticket.embedUrl)
      setPhase('uploading')
      try {
        await new Promise<void>((resolve, reject) => {
          const up = new tus.Upload(file, {
            uploadUrl: ticket.uploadLink,
            endpoint: ticket.uploadLink,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            chunkSize: 128 * 1024 * 1024,
            metadata: { filename: file.name, filetype: file.type },
            onError: (err) => reject(err),
            onProgress: (sent, total) => {
              if (total > 0) setProgress(sent / total)
            },
            onSuccess: () => resolve(),
          })
          up.start()
        })
      } catch {
        setError('Falha no upload para o Vimeo. Tente novamente.')
        setPhase('error')
        return
      }

      setProgress(1)
      // Já propaga o `src` (embedUrl do ticket) ASSIM QUE o upload termina — antes de
      // o transcode acabar. Sem isto, salvar o bloco durante "processando" gravava sem
      // vídeo (o `src` só era preenchido no `onReady` do status `ready`). Duração/
      // legendas entram depois, quando o polling chegar a `ready` (o callback do editor
      // só sobrescreve esses campos quando vêm preenchidos).
      onReadyRef.current({
        vimeoVideoId: ticket.vimeoVideoId,
        embedUrl: ticket.embedUrl,
        durationSeconds: null,
        captions: [],
      })
      checkStatus(ticket.vimeoVideoId)
    },
    [checkStatus],
  )

  const reset = useCallback(() => {
    stopPolling()
    setPhase('idle')
    setProgress(0)
    setError(null)
    setVideoId(null)
    setEmbedUrl(null)
  }, [stopPolling])

  return { phase, progress, error, videoId, embedUrl, upload, checkStatus, reset }
}
