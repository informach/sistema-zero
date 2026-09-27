import { isPublicInteractiveBlock, type LessonLearningProgress } from '@sistemazero/core/learning'
import type { LessonBlockView } from './types'

export function isExperimentBlock(block: LessonBlockView): boolean {
  return (
    (block.kind === 'studio' || block.kind === 'pinta') &&
    typeof block.content === 'object' &&
    block.content !== null &&
    'purpose' in block.content &&
    block.content.purpose === 'experiment'
  )
}
export function unfinishedLearning(
  blocks: LessonBlockView[],
  progress?: LessonLearningProgress,
): boolean {
  return blocks.some(
    (b) =>
      isPublicInteractiveBlock(b.content) &&
      b.content.required &&
      !progress?.blocks.some(
        (p) => p.blockId === b.id && p.revision === b.blockRevision && p.result?.passed,
      ),
  )
}
