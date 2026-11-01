'use client'

import { useEffect } from 'react'
import type { LessonDetailView } from '@/lib/types'
import { paginaDe } from './pagina'
import { agir, type JogoDaAula, ocupado, VERBOS } from './verbos'

/** Os jogos prontos da aula, com o palco e os alvos de cada um (para `achar`). */
export function jogosDa(lesson: Pick<LessonDetailView, 'blocks'>): JogoDaAula[] {
  return lesson.blocks.flatMap((block) => {
    const content = block.content as {
      kind?: string
      activity?: { type?: string; stage?: JogoDaAula['stage']; targets?: JogoDaAula['targets'] }
    }
    const activity = content.kind === 'interactive' ? content.activity : undefined
    return activity?.type === 'project-play' && activity.stage
      ? [{ stage: activity.stage, targets: activity.targets ?? [] }]
      : []
  })
}

/**
 * A ponte de gravação na página do palco: `window.__gravacao`, versão 1, o contrato que o modo
 * guiado do EdiAula usa. Existe só aqui, nunca no Kids.
 */
export function PonteDeGravacao({ lesson }: { lesson: Pick<LessonDetailView, 'blocks'> }) {
  useEffect(() => {
    const jogos = jogosDa(lesson)
    const ponte = {
      versao: 1,
      verbos: () => VERBOS,
      agir: (acao: string) => agir(acao, jogos, paginaDe(document)),
      ocupado: () => ocupado(document),
    }
    Object.assign(window, { __gravacao: ponte })
    return () => {
      if ((window as { __gravacao?: unknown }).__gravacao === ponte)
        delete (window as { __gravacao?: unknown }).__gravacao
    }
  }, [lesson])
  return null
}
