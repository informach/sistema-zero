'use client'
import { Button } from '@sistemazero/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { liveRequest } from '../../lib/live/client'
import { sessionFetch as fetch } from '../../lib/session-fetch'

export function LiveReplay({
  sessionId,
  teacherPreview = false,
  occurrenceId,
}: {
  sessionId: string
  teacherPreview?: boolean
  occurrenceId?: string
}) {
  const [source, setSource] = useState<{ url: string; version: number; expiresAt: string } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const player = useRef<HTMLVideoElement>(null)
  const position = useRef(0)
  const currentVersion = useRef<number | null>(null)
  const loadedSession = useRef(sessionId)
  const wasPlaying = useRef(false)
  const saveProgress = useCallback(() => {
    if (teacherPreview || currentVersion.current === null || !player.current) return
    const positionSeconds = Math.max(0, Math.floor(player.current.currentTime))
    void fetch(`/api/live/sessions/${sessionId}/replay-progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: currentVersion.current, positionSeconds }),
      keepalive: true,
    }).catch(() => undefined)
  }, [sessionId, teacherPreview])
  useEffect(() => {
    const timer = setInterval(saveProgress, 15_000)
    const hide = () => {
      if (document.visibilityState === 'hidden') saveProgress()
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      saveProgress()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [saveProgress])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately renews the private replay URL.
  useEffect(() => {
    const controller = new AbortController()
    if (loadedSession.current !== sessionId) {
      loadedSession.current = sessionId
      currentVersion.current = null
      position.current = 0
      wasPlaying.current = false
      setSource(null)
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const next = await liveRequest<{ url: string; version: number; expiresAt: string }>(
          `/api/live/sessions/${sessionId}/recording${occurrenceId ? `?occurrenceId=${encodeURIComponent(occurrenceId)}` : ''}`,
          undefined,
          'GET',
          controller.signal,
        )
        if (controller.signal.aborted) return
        wasPlaying.current = !!player.current && !player.current.paused
        if (currentVersion.current !== next.version) {
          position.current = 0
          wasPlaying.current = false
          if (!teacherPreview) {
            const progress = await liveRequest<{ positionSeconds: number }>(
              `/api/live/sessions/${sessionId}/replay-progress?version=${next.version}`,
              undefined,
              'GET',
              controller.signal,
            ).catch(() => null)
            if (controller.signal.aborted) return
            position.current = progress?.positionSeconds ?? 0
          }
        } else position.current = player.current?.currentTime ?? position.current
        currentVersion.current = next.version
        setSource(next)
        setError(null)
        timer = setTimeout(
          () => void load(),
          Math.max(1000, Date.parse(next.expiresAt) - Date.now() - 15_000),
        )
      } catch (cause) {
        if (!controller.signal.aborted) {
          setSource(null)
          setError(cause instanceof Error ? cause.message : 'A gravação não está disponível agora.')
        }
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [sessionId, occurrenceId, retry, teacherPreview])
  return (
    <section className="space-y-3">
      <h2 className="sz-display text-xl font-bold">Rever a explicação</h2>
      <p className="text-sm text-muted-foreground">
        A gravação reúne a professora e a demonstração. Os momentos de ajuda individual ficam de
        fora.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button className="mt-2" variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : source ? (
        // biome-ignore lint/a11y/useMediaCaption: Live recordings do not yet have reviewed caption assets; do not create empty or inaccurate captions.
        <video
          ref={player}
          key={source.url}
          src={source.url}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-black"
          onLoadedMetadata={() => {
            if (player.current && position.current > 0)
              player.current.currentTime = Math.min(
                position.current,
                Math.max(0, player.current.duration - 0.1),
              )
            if (wasPlaying.current) void player.current?.play().catch(() => undefined)
          }}
          onPause={saveProgress}
          onEnded={saveProgress}
          onError={() => setError('A gravação foi interrompida. Tente carregar novamente.')}
        />
      ) : (
        <p role="status">Preparando a gravação…</p>
      )}
    </section>
  )
}
