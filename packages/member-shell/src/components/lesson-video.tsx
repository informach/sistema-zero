'use client'

import type { VideoBlock } from '../lib/types'
import { parseVimeo, youtubeId } from '../lib/video-ids'
import { LessonNativeVideo } from './lesson-native-video'
import { useLessonPlayer } from './lesson-player-context'
import { LessonVideoFrame } from './lesson-video-float'
import { LessonYoutubeVideo } from './lesson-youtube-video'
import { VimeoPlayer } from './vimeo-player'

// ── video: URL canônica por provider (nunca interpola o src cru em iframe). Os ids
// vêm de `lib/video-ids` — o tutorial do "Como fazer" usa os mesmos.

/**
 * ⚠️ Só o PLAYER entra na `LessonVideoFrame` (o vídeo flutuante): o cartão de cada app em volta
 * (o chip, o título) fica no lugar. Fora da aula a moldura não existe e o player sai cru.
 */
export function LessonVideo({ content }: { content: VideoBlock }) {
  if (!content.src) return null
  if (content.provider === 'youtube') {
    const id = youtubeId(content.src)
    if (!id) return <p role="alert">Vídeo indisponível.</p>
    return (
      <LessonVideoFrame>
        <LessonYoutubeVideo videoId={id} />
      </LessonVideoFrame>
    )
  }
  if (content.provider === 'vimeo') {
    const parsed = parseVimeo(content.src)
    if (!parsed) return <p role="alert">Vídeo indisponível.</p>
    return (
      <LessonVideoFrame>
        <VimeoLessonVideo vimeoId={parsed.id} vimeoHash={parsed.hash} />
      </LessonVideoFrame>
    )
  }
  // `file`/`mux` (URL direta de vídeo) → player nativo.
  return (
    <LessonVideoFrame>
      <LessonNativeVideo content={content} />
    </LessonVideoFrame>
  )
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
      onPlayingChange={player?.onVideoPlayingChange}
      onControls={player?.registerVideoControls}
    />
  )
}
