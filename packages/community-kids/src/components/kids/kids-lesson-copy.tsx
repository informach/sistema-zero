'use client'

import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import type { ReactNode } from 'react'
import { KIDS_LESSON_COPY } from '@/lib/lesson-copy'

/**
 * Veste as telas de aula do member-shell com o vocabulário da criança (fase, parte, guia). É um
 * componente de CLIENTE de propósito: o vocabulário tem funções (o texto do que falta para seguir,
 * a contagem da galeria), e função não atravessa a fronteira de um Server Component.
 */
export function KidsLessonCopy({ children }: { children: ReactNode }) {
  return <LessonCopyProvider value={KIDS_LESSON_COPY}>{children}</LessonCopyProvider>
}
