'use client'

import type { ReactNode } from 'react'
import { FocusModeProvider } from '@/components/kids/focus-mode'
import { KidsLessonCopy } from '@/components/kids/kids-lesson-copy'
import { LessonCompletionRefreshProvider } from '@/components/kids/lesson-completion-refresh'
import { ParentShell } from '../../../../_components/parent-shell'

/**
 * A moldura da aula dos cursos para pais (14/11/2026): os mesmos provedores que o layout da área
 * da criança dá à aula (modo foco com a lista de aulas, a atualização depois de concluir e o
 * vocabulário da aula do Kids), dentro do menu da área dos pais, no regime de aula.
 */
export function ParentLessonFrame({
  viewerId,
  parentName,
  children,
}: {
  viewerId: string
  parentName?: string
  children: ReactNode
}) {
  return (
    <FocusModeProvider viewerId={viewerId}>
      <ParentShell active="cursos" parentName={parentName} variant="lesson">
        <LessonCompletionRefreshProvider key={viewerId}>
          <KidsLessonCopy>{children}</KidsLessonCopy>
        </LessonCompletionRefreshProvider>
      </ParentShell>
    </FocusModeProvider>
  )
}
