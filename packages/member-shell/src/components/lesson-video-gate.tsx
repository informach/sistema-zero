'use client'

import { Button } from '@sistemazero/ui/button'
import { Play } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import type { VideoGate } from '../lib/video-gate'
import { KIDS_VIDEO_GATE_COPY } from '../lib/video-gate-copy'
import { ZappyOuvirButton } from './zappy-ouvir-button'

/** Quanto tempo o "Pronto!" fica à vista depois que a atividade abre. */
export const VIDEO_GATE_DONE_MS = 8000

/**
 * "Assistir ao vídeo antes da atividade" (03/10/2026): a atividade da direita trancada, com um
 * aviso por cima, até a criança ver o vídeo da seção uma vez. Decisão da dona, a partir de uma
 * criança testando o Cadê Todo Mundo?: ela quis fazer junto já na primeira vez e se perdeu. Desde
 * 06/10/2026 a tranca vale só para o jogo pronto e a experiência, onde o vídeo é uma demonstração
 * que explica: primeiro ela entende, depois é a vez dela. No Estúdio e no Pinta ela monta junto.
 *
 * ⚠️ O invólucro existe SEMPRE (com a tranca desligada ele só passa os filhos): ele embrulha os
 * editores da aula, que ficam montados entre as seções, e trocar a árvore os remontaria.
 *
 * Só ganchos e utilitárias sóbrias (invariante 8): o kids veste `sz-lesson-video-gate*` no
 * `globals.css` dele, e o adulto sob `.sz-aula-adulto`.
 */
export function LessonVideoGate({
  gate,
  kids,
  mascot,
  audioUrl,
  sectionId,
  onWatch,
  children,
}: {
  gate: VideoGate
  kids: boolean
  mascot?: ReactNode
  /** Gravação do aviso, fornecida pelo app que possui o arquivo do Zappy. */
  audioUrl?: string
  sectionId: string
  /** "Ver o vídeo": leva a criança até ele (e tenta dar play). */
  onWatch: (videoBlockId: string) => void
  children: ReactNode
}) {
  const titleId = useId()
  const percent = Math.floor(gate.watchedFraction * 100)
  const videoBlockId = gate.videoBlockId

  return (
    <div className={cn('sz-lesson-video-gate-host relative', gate.locked && 'min-h-[22rem]')}>
      <div className="space-y-6" inert={gate.locked || undefined}>
        {children}
      </div>
      {gate.locked && videoBlockId ? (
        <div className="sz-lesson-video-gate absolute inset-0 z-10 flex justify-center px-4 py-6">
          <div
            aria-hidden
            className="sz-lesson-video-gate-veil absolute inset-0 rounded-2xl bg-background/75"
          />
          <section
            aria-labelledby={titleId}
            className="sz-lesson-video-gate-card sticky top-6 flex h-fit w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-lg"
          >
            {kids && mascot ? <div className="sz-lesson-video-gate-mascot">{mascot}</div> : null}
            <h3 id={titleId} className="sz-lesson-video-gate-title font-semibold text-xl">
              {kids ? (
                <>
                  {KIDS_VIDEO_GATE_COPY.title} <span aria-hidden>🎬</span>
                </>
              ) : (
                'Assista ao vídeo primeiro'
              )}
            </h3>
            <p className="sz-lesson-video-gate-text text-muted-foreground">
              {kids
                ? KIDS_VIDEO_GATE_COPY.text
                : 'A atividade abre depois que você assistir ao vídeo uma vez.'}
            </p>
            {kids && audioUrl ? (
              <ZappyOuvirButton
                // Trocar de parte encerra a fala sem remontar a atividade atrás do aviso.
                key={sectionId}
                textos={[KIDS_VIDEO_GATE_COPY.title, KIDS_VIDEO_GATE_COPY.text]}
                audioUrl={audioUrl}
                rotulo="Ouvir a orientação"
              />
            ) : null}
            {percent > 0 ? (
              <p className="sz-lesson-video-gate-progress rounded-full bg-muted px-3 py-1 font-semibold text-sm">
                {kids
                  ? `Você já viu ${percent}% do vídeo`
                  : `Você já assistiu ${percent}% do vídeo`}
              </p>
            ) : null}
            <Button
              type="button"
              className="sz-lesson-video-gate-action min-h-11 gap-2"
              onClick={() => onWatch(videoBlockId)}
            >
              <Play aria-hidden className="size-4" />
              Ver o vídeo
            </Button>
          </section>
        </div>
      ) : null}
    </div>
  )
}

/**
 * O "Pronto! Agora é a sua vez" que acende quando a atividade ABRE nesta visita (a transição
 * trancada → aberta NA MESMA SEÇÃO; abrir a aula já destrancada ou trocar de seção não acende
 * nada). Só a cena e o jogo pronto trancam (06/10/2026): o vídeo mostrou e explicou, e quem testa
 * agora é ela.
 *
 * ⚠️⚠️ Fica FORA do fluxo e FORA do painel da atividade (full review de 03/10/2026). Dentro do
 * fluxo, sumir no primeiro toque puxava a atividade ~60px para cima entre o toque e o soltar, e o
 * clique caía em outro lugar; dentro do painel, na aba "Ver exemplo" (onde a criança está vendo o
 * vídeo) ele ficava em `display: none` e ninguém o via. Hoje é um aviso fixo acima do rodapé da
 * aula, que deixa o toque passar e some em 8 s ou no primeiro toque em qualquer lugar.
 */
export function LessonVideoGateDone({
  gate,
  sectionId,
  kids,
}: {
  gate: VideoGate
  sectionId: string
  kids: boolean
}) {
  const [opened, setOpened] = useState<string | null>(null)
  const before = useRef({ sectionId, locked: gate.locked })
  useEffect(() => {
    const previous = before.current
    before.current = { sectionId, locked: gate.locked }
    if (previous.sectionId === sectionId && previous.locked && !gate.locked) setOpened(sectionId)
  }, [sectionId, gate.locked])
  const done = opened === sectionId && !gate.locked
  useEffect(() => {
    if (!done) return
    const close = () => setOpened(null)
    const timer = setTimeout(close, VIDEO_GATE_DONE_MS)
    document.addEventListener('pointerdown', close, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', close, true)
    }
  }, [done])

  return (
    // Região viva SEMPRE montada: montada junto do texto, ela não é anunciada.
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(var(--sz-lesson-nav-height, 6rem) + 0.75rem)' }}
    >
      {done ? (
        <p className="sz-lesson-video-gate-done flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-medium shadow-lg">
          {kids ? (
            <>
              Pronto! Agora é a sua vez <span aria-hidden>🎉</span>
            </>
          ) : (
            'Atividade liberada.'
          )}
        </p>
      ) : null}
    </div>
  )
}
