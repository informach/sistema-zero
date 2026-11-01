import type { LessonDetailView } from '@/lib/types'

/**
 * A aula com o projeto de cada Estúdio já enviado, para gravar uma parte que vem depois do envio
 * (`?enviado=1`): o Compartilhar da última parte só libera depois dele. No palco nada foi enviado
 * de verdade; é só o estado que a aula mostra.
 */
export function enviada(lesson: LessonDetailView, now: Date): LessonDetailView {
  return {
    ...lesson,
    blocks: lesson.blocks.map((block) =>
      block.kind === 'studio'
        ? { ...block, studioState: { submitted: true, submittedAt: now.toISOString() } }
        : block,
    ),
  }
}
