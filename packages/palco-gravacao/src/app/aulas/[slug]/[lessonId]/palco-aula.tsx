'use client'

import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningAnswers,
  type LearningBlockProgress,
  type LearningResult,
  lessonCompletionRequirements,
} from '@sistemazero/core/learning'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import {
  type LearningExecutionAdapter,
  LearningExecutionProvider,
} from '@sistemazero/member-shell/components/learning-execution-context'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FocusModeProvider } from '@/components/kids/focus-mode'
import { KidsLessonBlocks } from '@/components/kids/kids-lesson-blocks'
import { KidsLessonCopy } from '@/components/kids/kids-lesson-copy'
import { KidsLessonProgress } from '@/components/kids/kids-lesson-progress'
import { LessonActionEvidence } from '@/components/kids/lesson-action-evidence'
import { LessonCelebration } from '@/components/kids/lesson-celebration'
import { LessonCompletionRefreshProvider } from '@/components/kids/lesson-completion-refresh'
import { KidsMascotAnimated } from '@/components/kids/mascot-animated'
import type { PosicaoNaAula } from '@/lib/lesson-progress'
import type { CourseDetailView, CourseProgressView, LessonDetailView } from '@/lib/types'
import { PonteDeGravacao } from '~/lib/ponte'

/**
 * A aula no palco: os mesmos componentes do player do Kids
 * (`community-kids/.../lesson-player-client.tsx`), sem nada que grave. As atividades são
 * conferidas aqui mesmo (como o ensaio do admin), o rascunho na conta fica desligado e concluir
 * a aula só mostra a comemoração. O que ainda vai ao servidor passa pelas rotas do palco
 * (`src/app/api`), que respondem sem salvar.
 */
export function PalcoAula({
  course,
  lesson,
  viewerId,
}: {
  course: CourseDetailView
  lesson: LessonDetailView
  viewerId: string
}) {
  return (
    <FocusModeProvider viewerId={viewerId}>
      <LessonCompletionRefreshProvider>
        <KidsLessonCopy>
          <main id="main-content" className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8">
            <Aula course={course} lesson={lesson} viewerId={viewerId} />
          </main>
        </KidsLessonCopy>
      </LessonCompletionRefreshProvider>
    </FocusModeProvider>
  )
}

/** Uma atividade conferida no navegador: o resultado de sempre, sem tentativa guardada. */
function evaluate(
  block: LessonDetailView['blocks'][number] | undefined,
  answers: LearningAnswers,
): LearningResult {
  const content = block?.content as { kind?: string } | undefined
  try {
    if (content?.kind === 'interactive')
      return evaluateLearning(content as unknown as InteractiveBlock, answers)
  } catch {
    // Uma atividade que só o servidor confere passa no palco: a tomada mostra o caminho feliz.
  }
  return { participated: true, passed: true, feedback: '', verifiedBy: 'client' }
}

function Aula({
  course,
  lesson,
  viewerId,
}: {
  course: CourseDetailView
  lesson: LessonDetailView
  viewerId: string
}) {
  const learning = useLessonLearning(lesson, viewerId)
  const [secao, setSecao] = useState<PosicaoNaAula | null>(null)
  const aoTrocarSecao = useCallback((p: PosicaoNaAula) => {
    setSecao((antes) => (antes && antes.index === p.index && antes.total === p.total ? antes : p))
  }, [])
  const [celebration, setCelebration] = useState<CourseProgressView | null>(null)
  const [completed, setCompleted] = useState(false)
  const attempts = useRef(0)

  const execution = useMemo<LearningExecutionAdapter>(() => {
    const progressOf = (
      blockId: string,
      input: {
        revision: string
        answers: LearningAnswers
        hintsUsed: number
        positionSeconds?: number | null
      },
      result: LearningResult | null,
    ): LearningBlockProgress => ({
      blockId,
      revision: input.revision,
      positionSeconds: input.positionSeconds ?? null,
      answers: input.answers,
      hintsUsed: input.hintsUsed,
      attemptsCount: attempts.current,
      result,
      updatedAt: new Date().toISOString(),
    })
    return {
      context: 'recorded',
      viewerId,
      scopeId: lesson.id,
      progress: learning.progress.blocks,
      onProgress: learning.onProgress,
      saveProgress: async (blockId, input) => {
        const saved = learning.progress.blocks.find((p) => p.blockId === blockId)
        return progressOf(blockId, input, saved?.result ?? null)
      },
      attempt: async (blockId, input) => {
        attempts.current += 1
        const result = evaluate(
          lesson.blocks.find((b) => b.id === blockId),
          input.answers,
        )
        const progress = progressOf(blockId, { ...input, positionSeconds: null }, result)
        return {
          attempt: {
            id: input.id,
            blockId,
            revision: input.revision,
            answers: input.answers,
            hintsUsed: input.hintsUsed,
            result,
            createdAt: progress.updatedAt,
          },
          progress,
        }
      },
    }
  }, [lesson.id, lesson.blocks, learning.progress.blocks, learning.onProgress, viewerId])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: course.slug,
      showActivityRequirement: false,
      viewerWatermark: null,
      viewerId,
      voiceInput: false,
      initialPositionSeconds: null,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      lessonDrafts: null,
      renderActionEvidence: (result) => <LessonActionEvidence result={result} />,
      videoGateMascot: <KidsMascotAnimated expression="happy" className="size-20 sm:size-24" />,
      renderInstruction: (text, pose = 'speaking', speech) => (
        <DialogueBlockView
          content={{ kind: 'dialogue', text, pose }}
          speech={speech}
          mascot={<KidsMascotAnimated expression={pose} className="size-16 sm:size-20" />}
        />
      ),
    }),
    [lesson.id, course.slug, viewerId, learning.progress, learning.onProgress],
  )

  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const posicaoInicial = useMemo<PosicaoNaAula | null>(() => {
    const total = lesson.sections?.length ?? 0
    return total ? { index: 0, total } : null
  }, [lesson.sections])

  // Concluir só comemora: a próxima aula e o curso continuam como estavam na conta.
  const completionAction = completed ? (
    <span className="inline-flex items-center gap-2 font-extrabold text-[0.9375rem]">
      <CheckCircle2 className="size-5 text-(--success-foreground)" aria-hidden />
      Aula concluída
    </span>
  ) : (
    <button
      type="button"
      onClick={() => {
        setCompleted(true)
        setCelebration(course.progress)
      }}
      className="sz-btn-gradient h-12 gap-2 px-7 text-base"
    >
      <CheckCircle2 className="size-5" aria-hidden />
      Concluir aula
    </button>
  )

  const after = celebration
    ? {
        ...celebration,
        completedLessons: Math.min(celebration.totalLessons, celebration.completedLessons + 1),
        percent: Math.min(
          100,
          Math.round(
            ((celebration.completedLessons + 1) / Math.max(1, celebration.totalLessons)) * 100,
          ),
        ),
        lastCompletedAt: new Date().toISOString(),
      }
    : null

  return (
    <LessonPlayerProvider value={playerContext}>
      <LearningExecutionProvider value={execution}>
        <PonteDeGravacao lesson={lesson} />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 md:gap-4">
            <KidsLessonProgress
              progress={lesson.sectionProgress}
              posicao={secao ?? posicaoInicial}
              atividades={requirements}
            />
          </div>
          <LessonSections
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            kids
            lessonTitle={lesson.title}
            immersive
            completionAction={completionAction}
            completionMessage={null}
            onSectionChange={aoTrocarSecao}
            renderBlocks={(blocks) => <KidsLessonBlocks blocks={blocks} />}
          />
        </div>
        {celebration && after ? (
          <LessonCelebration
            progressBefore={celebration}
            progressAfter={after}
            publicationPending={false}
            gamification={null}
            nextHref={null}
            courseHref="/"
            onClose={() => setCelebration(null)}
          />
        ) : null}
      </LearningExecutionProvider>
    </LessonPlayerProvider>
  )
}
