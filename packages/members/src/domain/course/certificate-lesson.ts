import type { LessonSection } from '@sistemazero/core/learning'
import { isCompletionGatingBlock, type LessonBlockContent } from './lesson-block'

/** A revisão obrigatória precisa ser concluível antes de alcançar a emissão. */
export function certificateLessonIssues(
  sections: readonly LessonSection[],
  blocks: readonly { id: string; content: LessonBlockContent }[],
): string[] {
  const certificate = blocks.find((b) => b.content.kind === 'certificate')
  if (!certificate) return []
  const certificateIndex = sections.findIndex((s) => s.blockIds.includes(certificate.id))
  const issues: string[] = []
  for (const block of blocks) {
    if (!isCompletionGatingBlock(block.content)) continue
    const index = sections.findIndex((s) => s.blockIds.includes(block.id))
    const section = sections[index]
    if (
      block.content.kind === 'quiz' &&
      index >= 0 &&
      index < certificateIndex &&
      section?.completion?.blockIds.includes(block.id) &&
      sections[certificateIndex]?.completion?.blockIds.includes(certificate.id)
    )
      continue
    issues.push(
      block.content.kind === 'quiz'
        ? 'O quiz obrigatório precisa ser critério de uma seção anterior à seção do certificado.'
        : 'A aula de certificado aceita revisão por quiz em seção anterior; separe as outras atividades obrigatórias em outra aula.',
    )
  }
  return [...new Set(issues)]
}
