'use client'

import type { VideoBlock } from '../lib/types'
import { parseVimeo, youtubeId } from '../lib/video-ids'
import { LessonNativeVideo } from './lesson-native-video'
import { useLessonPlayer } from './lesson-player-context'
import { LessonYoutubeVideo } from './lesson-youtube-video'
import { VimeoPlayer } from './vimeo-player'

// ── video: URL canônica por provider (nunca interpola o src cru em iframe). Os ids
// vêm de `lib/video-ids` — o tutorial do "Como fazer" usa os mesmos.

export function LessonVideo({ content }: { content: VideoBlock }) {
  if (!content.src) return null
  if (content.provider === 'youtube') {
    const id = youtubeId(content.src)
    if (!id) return <p role="alert">Vídeo indisponível.</p>
    return <LessonYoutubeVideo videoId={id} />
  }
  if (content.provider === 'vimeo') {
    const parsed = parseVimeo(content.src)
    if (!parsed) return <p role="alert">Vídeo indisponível.</p>
    return <VimeoLessonVideo vimeoId={parsed.id} vimeoHash={parsed.hash} />
  }
  // `file`/`mux` (URL direta de vídeo) → player nativo.
  return <LessonNativeVideo content={content} />
}

/**
 * Vimeo com o player rico (SDK): watermark do aluno, fullscreen custom, retomar
 * posição por bloco — tudo vindo do LessonPlayerContext
 * (fora do player degrada para o embed sem callbacks).
 */
function VimeoLessonVideo({ vimeoId, vimeoHash }: { vimeoId: string; vimeoHash: string | null }) {
  const player = useLessonPlayer()
  return (
    <VimeoPlayer
      vimeoId={vimeoId}
      vimeoHash={vimeoHash}
      watermark={player?.viewerWatermark ?? null}
      initialPositionSeconds={player?.initialPositionSeconds ?? null}
      onProgress={player?.onVideoProgress}
      onFlush={player?.onVideoFlush}
      onCoverage={player?.onVideoCoverage}
    />
  )
}
