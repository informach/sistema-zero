'use client'

import type { VideoBlock } from '../lib/types'
import { LessonNativeVideo } from './lesson-native-video'
import { useLessonPlayer } from './lesson-player-context'
import { LessonYoutubeVideo } from './lesson-youtube-video'
import { VimeoPlayer } from './vimeo-player'

// ── video: URL canônica por provider (nunca interpola o src cru em iframe) ────
function youtubeId(src: string): string | null {
  const m = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  )
  return m?.[1] ?? null
}

/**
 * Extrai o ID numérico do Vimeo e, quando presente, o HASH de privacidade (`h`)
 * dos vídeos NÃO LISTADOS — forma de caminho (`vimeo.com/<id>/<hash>`) ou de query
 * (`?h=<hash>`). Sem o hash, o SDK não consegue tocar um vídeo unlisted. Tanto o id
 * (dígitos) quanto o hash (alfanumérico) são validados pela regex — nunca o src cru.
 */
function parseVimeo(src: string): { id: string; hash: string | null } | null {
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})(?:\/([A-Za-z0-9]{4,40}))?/)
  const id = m?.[1]
  if (!id) return null
  const queryHash = src.match(/[?&]h=([A-Za-z0-9]{4,40})/)?.[1] ?? null
  return { id, hash: m[2] ?? queryHash }
}

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
