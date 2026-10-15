'use client'
import { Button } from '@sistemazero/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { readReplayProgress, writeReplayProgress } from '../../lib/live/replay-progress'
import type { LessonVideoControls } from '../lesson-player-context'
import { VimeoPlayer } from '../vimeo-player'

interface ReplayProps {
  sessionId: string
  version: number
  vimeoId: string
  vimeoHash?: string | null
  watermark: string | null
  onControls(value: LessonVideoControls | null): void
}

/** A new attempt or recording gets fresh loading state; progress stays keyed on the server. */
export function LiveVimeoReplay(props: ReplayProps) {
  const [attempt, setAttempt] = useState(0)
  return (
    <ReplayAttempt
      key={`${props.sessionId}:${props.version}:${attempt}`}
      {...props}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  )
}
function ReplayAttempt({
  sessionId,
  version,
  vimeoId,
  vimeoHash,
  watermark,
  onControls,
  onRetry,
}: ReplayProps & { onRetry(): void }) {
  const [initial, setInitial] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const position = useRef<number | null>(null)
  const dirty = useRef(false)
  const flush = useCallback(
    (seconds?: number) => {
      if (seconds !== undefined) {
        position.current = seconds
        dirty.current = true
      }
      if (position.current === null || !dirty.current) return
      const saved = position.current
      dirty.current = false
      void writeReplayProgress(sessionId, version, saved)
        .then(() => setError(null))
        .catch(() => {
          dirty.current = true
          setError('Sua posição ainda não foi guardada. Vamos tentar novamente.')
        })
    },
    [sessionId, version],
  )
  useEffect(() => {
    const controller = new AbortController()
    void readReplayProgress(sessionId, version, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        position.current = value.positionSeconds
        setInitial(value.positionSeconds)
        setError(null)
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Não foi possível recuperar sua posição. Tente novamente.')
      })
    return () => controller.abort()
  }, [sessionId, version])
  useEffect(() => {
    const timer = setInterval(flush, 15_000)
    const hide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', hide)
      flush()
    }
  }, [flush])
  return (
    <div>
      {initial === null ? (
        <div
          role="status"
          className="grid aspect-video place-items-center rounded-xl bg-black p-6 text-white"
        >
          Preparando a gravação…
        </div>
      ) : (
        <VimeoPlayer
          vimeoId={vimeoId}
          vimeoHash={vimeoHash}
          watermark={watermark}
          initialPositionSeconds={initial}
          onControls={onControls}
          onProgress={(seconds) => {
            position.current = seconds
            dirty.current = true
          }}
          onFlush={flush}
        />
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm">
          {error}
          {initial === null ? (
            <Button variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
