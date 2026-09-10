'use client'

import type { VideoBlock } from '../lib/types'
import { useLessonPlayer } from './lesson-player-context'

export function LessonNativeVideo({ content }: { content: VideoBlock }) {
  const player = useLessonPlayer()
  return (
    // biome-ignore lint/a11y/useMediaCaption: uploaded caption tracks are rendered from the content array below.
    <video
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
        player?.onVideoProgress?.(
          video.currentTime,
          video.duration > 0 ? video.currentTime / video.duration : 0,
        )
      }}
      onPause={(e) => player?.onVideoFlush?.(e.currentTarget.currentTime)}
      onEnded={(e) => player?.onVideoFlush?.(e.currentTarget.currentTime)}
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
