'use client'

import { useEffect } from 'react'
import type { LessonDetailView } from '@/lib/types'
import { arrumacao } from './arrumacao'
import { paginaDe, pilhasDaArea } from './pagina'
import {
  agirNaPagina,
  type JogoDaAula,
  jogoVoltando,
  novoJogoNoEstudio,
  ocupado,
  VERBOS,
} from './verbos'

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
 * guiado do EdiAula usa. Existe só aqui, nunca no Kids. Junto dela, a arrumação de quando o
 * Estúdio abre: blocos um por cima do outro são organizados antes de a gravação começar.
 */
export function PonteDeGravacao({ lesson }: { lesson: Pick<LessonDetailView, 'blocks'> }) {
  useEffect(() => {
    const jogos = jogosDa(lesson)
    // O jogo ao lado dos blocos: o roteiro pode fixá-lo, e o zoom dado ao escondê-lo é lembrado.
    const jogo = novoJogoNoEstudio()
    const arrumar = arrumacao<Element>()
    const vez = setInterval(() => {
      const { area, caixas } = pilhasDaArea(document)
      void arrumar.passo(area, caixas, () => paginaDe(document).organizar())
    }, 250)
    const ponte = {
      versao: 1,
      verbos: () => VERBOS,
      agir: (acao: string) => agirNaPagina(acao, jogos, paginaDe(document), jogo),
      ocupado: () => {
        const { area, caixas } = pilhasDaArea(document)
        return (
          ocupado(document) ||
          arrumar.pendente(area, caixas) ||
          jogoVoltando(jogo, paginaDe(document))
        )
      },
    }
    Object.assign(window, { __gravacao: ponte })
    return () => {
      clearInterval(vez)
      if ((window as { __gravacao?: unknown }).__gravacao === ponte)
        delete (window as { __gravacao?: unknown }).__gravacao
    }
  }, [lesson])
  return null
}
