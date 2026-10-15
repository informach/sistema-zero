'use client'

import type { LiveRecordingChapter, LiveRecordingVimeo } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { PlayCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { chapterSeconds } from '../../lib/live/sections'
import { parseVimeo } from '../../lib/video-ids'
import { type LessonVideoControls, useLessonPlayer } from '../lesson-player-context'
import { LiveReplay } from './live-replay'
import { LiveVimeoReplay } from './live-vimeo-replay'

/**
 * A GRAVAÇÃO no lugar da transmissão (fora do encontro, durante o prazo, 14/10/2026). A gravação
 * publicada no Vimeo toca no player das aulas, com a marca d'água de quem assiste (a do player da
 * aula, `viewerWatermark`); até o Vimeo terminar de processar, o MP4 da plataforma.
 *
 * Capítulos por parte: abrir uma parte leva o vídeo ao trecho dela (só na TROCA, nunca na
 * abertura da página: tocar sozinho ao entrar assustaria) e "Ver este trecho" leva quando a
 * criança pedir. A linha do botão fica reservada quando a gravação tem capítulos (trocar para uma
 * parte sem trecho não sobe a aula).
 */
export function LiveRecordingStage({
  sessionId,
  version,
  occurrenceId,
  chapters,
  vimeo: published,
  sectionId,
}: {
  sessionId: string
  version: number
  occurrenceId: string | undefined
  chapters: LiveRecordingChapter[] | undefined
  vimeo: LiveRecordingVimeo | null | undefined
  /** A parte aberta agora na aula (relatada pelo player). */
  sectionId: string | null
}) {
  const player = useLessonPlayer()
  const controls = useRef<LessonVideoControls | null>(null)
  const seconds = chapterSeconds(chapters, sectionId)
  const lastSection = useRef(sectionId)
  useEffect(() => {
    if (sectionId === lastSection.current) return
    lastSection.current = sectionId
    if (seconds !== null) controls.current?.seek?.(seconds)
  }, [sectionId, seconds])
  const vimeo = published?.status === 'ready' ? parseVimeo(published.embedUrl ?? '') : null
  return (
    <div className="space-y-2">
      {vimeo ? (
        <LiveVimeoReplay
          key={`${sessionId}:${occurrenceId}:${version}`}
          sessionId={sessionId}
          version={version}
          vimeoId={vimeo.id}
          vimeoHash={vimeo.hash}
          watermark={player?.viewerWatermark ?? null}
          onControls={(value) => {
            controls.current = value
          }}
        />
      ) : (
        <LiveReplay
          key={`${sessionId}:${occurrenceId}:${version}`}
          sessionId={sessionId}
          occurrenceId={occurrenceId}
          bare
          onControls={(value) => {
            controls.current = value
          }}
        />
      )}
      {chapters?.length ? (
        <Button
          variant="outline"
          className={`sz-live-chapter min-h-11 ${seconds === null ? 'invisible' : ''}`}
          aria-hidden={seconds === null || undefined}
          tabIndex={seconds === null ? -1 : undefined}
          onClick={() => {
            if (seconds !== null) controls.current?.seek?.(seconds)
          }}
        >
          <PlayCircle className="size-5" aria-hidden />
          Ver este trecho
        </Button>
      ) : null}
    </div>
  )
}
