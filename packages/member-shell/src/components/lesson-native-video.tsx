'use client'

import type { VideoWatchCoverage } from '@sistemazero/core/learning'
import { useEffect, useRef } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import type { VideoBlock } from '../lib/types'
import { useLessonPlayer } from './lesson-player-context'

export function LessonNativeVideo({ content }: { content: VideoBlock }) {
  const player = useLessonPlayer()
  const element = useRef<HTMLVideoElement>(null)
  const audioOwner = useRef(Symbol('lesson-video'))
  useEffect(() => registerLessonMedia(audioOwner.current, () => element.current?.pause()), [])
  const coverage = (video: HTMLVideoElement) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return
    const ranges: VideoWatchCoverage['ranges'] = []
    for (let i = 0; i < video.played.length; i++)
      ranges.push([video.played.start(i), video.played.end(i)])
    player?.onVideoCoverage?.({ duration: video.duration, ranges })
  }
  return (
    // biome-ignore lint/a11y/useMediaCaption: uploaded caption tracks are rendered from the content array below.
    <video
      ref={element}
      onPlay={() => {
        void requestLessonMediaFocus(audioOwner.current)
      }}
      controls
      // Sem isto o Safari do iPhone ARRANCA o vídeo para a tela cheia nativa no
      // play, tirando a criança da aula (e da lista de seções) sem ela pedir.
      playsInline
      preload="metadata"
      poster={content.posterUrl}
      className="aspect-video w-full rounded-lg bg-black"
      onLoadedMetadata={(e) => {
        const video = e.currentTarget
        const position = player?.initialPositionSeconds
        if (position && position < video.duration) video.currentTime = position
      }}
      onTimeUpdate={(e) => {
        const video = e.currentTarget
        coverage(video)
        player?.onVideoProgress?.(
          video.currentTime,
          video.duration > 0 ? video.currentTime / video.duration : 0,
        )
      }}
      onPause={(e) => {
        coverage(e.currentTarget)
        player?.onVideoFlush?.(e.currentTarget.currentTime)
      }}
      onEnded={(e) => {
        coverage(e.currentTarget)
        player?.onVideoFlush?.(e.currentTarget.currentTime)
      }}
    >
      <source src={content.src} />
      {content.captions?.map((caption) => (
        <track
          key={caption.lang}
          kind="captions"
          srcLang={caption.lang}
          label={caption.lang}
          src={caption.url}
        />
      ))}
    </video>
  )
}
