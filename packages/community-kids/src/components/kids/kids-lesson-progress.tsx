import type { SectionProgressView } from '@sistemazero/core/learning'
import { LessonProgressBar } from '@sistemazero/member-shell/components/lesson-progress-bar'
import type { AtividadeDaAula, PosicaoNaAula } from '@/lib/lesson-progress'

export function KidsLessonProgress({
  progress,
  posicao,
  atividades,
}: {
  progress?: SectionProgressView
  posicao: PosicaoNaAula | null
  atividades?: readonly AtividadeDaAula[]
}) {
  return (
    <LessonProgressBar progress={progress} position={posicao} activities={atividades} compact />
  )
}
