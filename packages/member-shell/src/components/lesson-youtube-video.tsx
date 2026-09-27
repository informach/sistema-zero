'use client'

import { mergeVideoCoverage, type VideoWatchCoverage } from '@sistemazero/core/learning'
import { useEffect, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import { useLessonPlayer } from './lesson-player-context'

interface YouTubePlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlaybackRate(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  pauseVideo(): void
  destroy(): void
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      events: {
        onReady(event: { target: YouTubePlayer }): void
        onStateChange(event: { data: number; target: YouTubePlayer }): void
        onError(): void
      }
    },
  ) => YouTubePlayer
}
declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YouTubeApi> | undefined
function youtubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        if (window.YT?.Player) resolve(window.YT)
        else reject(new Error('O player do YouTube não carregou.'))
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => {
        apiPromise = undefined
        script.remove()
        reject(new Error('Não foi possível carregar o YouTube.'))
      }
      document.head.append(script)
    })
  }
  return apiPromise
}

/** YouTube exposes no played ranges. Sample only uninterrupted playback; seeks start a new range. */
export function LessonYoutubeVideo({ videoId }: { videoId: string }) {
  const context = useLessonPlayer()
  const callbacks = useRef(context)
  callbacks.current = context
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const container = host.current
    if (!container) return
    let disposed = false
    let player: YouTubePlayer | undefined
    const audioOwner = Symbol('youtube')
    const unregisterAudio = registerLessonMedia(audioOwner, () => player?.pauseVideo())
    let timer: ReturnType<typeof setInterval> | undefined
    let previous: { seconds: number; at: number } | undefined
    let coverage: VideoWatchCoverage = { duration: 0, ranges: [] }
    const sample = (target: YouTubePlayer) => {
      const seconds = target.getCurrentTime(),
        duration = target.getDuration(),
        at = performance.now()
      if (duration <= 0 || !Number.isFinite(duration)) return
      const elapsed = previous ? (at - previous.at) / 1000 : 0
      const delta = previous ? seconds - previous.seconds : 0
      if (
        previous &&
        elapsed <= 1 &&
        delta > 0 &&
        delta <= elapsed * target.getPlaybackRate() + 0.1
      ) {
        coverage = mergeVideoCoverage(coverage, { duration, ranges: [[previous.seconds, seconds]] })
        callbacks.current?.onVideoCoverage?.(coverage)
      }
      previous = { seconds, at }
      callbacks.current?.onVideoProgress?.(seconds, seconds / duration)
    }
    void youtubeApi()
      .then((api) => {
        if (disposed) return
        // The SDK owns this iframe and may remove it on destroy; React owns only the host.
        const iframe = document.createElement('iframe')
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
        iframe.title = 'Vídeo da aula'
        iframe.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        iframe.allowFullscreen = true
        iframe.className = 'h-full w-full'
        container.append(iframe)
        player = new api.Player(iframe, {
          events: {
            onReady: ({ target }) => {
              const initial = callbacks.current?.initialPositionSeconds
              if (initial && initial < target.getDuration()) target.seekTo(initial, true)
              setError(false)
            },
            onStateChange: ({ data, target }) => {
              if (timer) clearInterval(timer)
              timer = undefined
              if (data === 1) {
                void requestLessonMediaFocus(audioOwner)
                previous = { seconds: target.getCurrentTime(), at: performance.now() }
                timer = setInterval(() => sample(target), 250)
              } else {
                if (previous) sample(target)
                previous = undefined
                callbacks.current?.onVideoFlush?.(target.getCurrentTime())
              }
            },
            onError: () => setError(true),
          },
        })
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    return () => {
      disposed = true
      unregisterAudio()
      if (timer) clearInterval(timer)
      player?.destroy()
      container.replaceChildren()
    }
  }, [videoId])
  return (
    <div className="space-y-2">
      <div
        ref={host}
        className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black"
      />
      {error && (
        <p role="alert">
          Não foi possível carregar o vídeo. Confira sua conexão e reabra a aula para continuar.
        </p>
      )}
    </div>
  )
}
