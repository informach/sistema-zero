'use client'

import { cn } from '../lib/cn'

/**
 * Progresso DA AULA, em segmentos (um por seção), no lugar de barra contínua.
 *
 * O progresso do CURSO a criança já vê de fora: na trilha, no card do curso e na
 * celebração. Aqui dentro o que ela precisa saber é quanto falta desta aula.
 *
 * A régua é POSICIONAL (a seção em que ela está, de quantas). Não dá para medir
 * por requisito: seção puramente expositiva (vídeo, texto) não gera requisito
 * nenhum, e uma aula de seis seções apareceria completa depois de duas
 * atividades. Em compensação, a barra cheia não pode mentir: o segmento de uma
 * seção com atividade pendente fica MARCADO, e o menu "O que falta para
 * concluir" continua contando o dever. A barra mede o percurso; ele, a tarefa.
 */
export function LessonProgress({
  sections,
  index,
  pendingSectionIds,
  hasPendingWithoutSection = false,
  kids = false,
}: {
  sections: { id: string; title: string }[]
  index: number
  pendingSectionIds: Set<string>
  /** Há atividade pendente que não pertence a nenhuma seção (sem segmento a marcar). */
  hasPendingWithoutSection?: boolean
  kids?: boolean
}) {
  if (sections.length < 2) return null
  return (
    <div className="space-y-1.5">
      {/* A tira é decorativa: quem conta a história para o leitor de tela é a
          linha de texto abaixo. Sem isto ele anunciaria N caixas vazias. */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {sections.map((section, i) => {
          const pendente = pendingSectionIds.has(section.id)
          return (
            <span
              key={section.id}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                i < index && (kids ? 'bg-(--kids-lime)' : 'bg-primary'),
                i === index && (kids ? '[background-image:var(--sz-gradient)]' : 'bg-primary/60'),
                i > index && 'bg-muted',
                // Seção já passada que ainda deve atividade: fica riscada de
                // aviso, para a barra cheia não virar mentira.
                pendente && i <= index && 'ring-2 ring-destructive/40 ring-offset-1',
              )}
            />
          )
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Seção {index + 1} de {sections.length}
        {pendingSectionIds.size > 0 || hasPendingWithoutSection
          ? ' · ainda tem atividade para fazer'
          : ''}
      </p>
    </div>
  )
}
