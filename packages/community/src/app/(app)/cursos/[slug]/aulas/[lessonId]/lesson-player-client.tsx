'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import { LessonProgressBar } from '@sistemazero/member-shell/components/lesson-progress-bar'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { LessonActionEvidence } from '@sistemazero/member-shell/components/lesson-ui/action-evidence'
import { CreatorBackButton } from '@sistemazero/member-shell/components/lesson-ui/back-button'
import { CreatorLessonBlocks } from '@sistemazero/member-shell/components/lesson-ui/blocks'
import { LessonCelebration } from '@sistemazero/member-shell/components/lesson-ui/celebration'
import { ZappyAnimated } from '@sistemazero/member-shell/components/lesson-ui/mascot-animated'
import { upToDateWorkspaceIds } from '@sistemazero/member-shell/lib/lesson-draft-cloud'
import { lessonDraftCloudFor } from '@sistemazero/member-shell/lib/lesson-draft-transport'
import type {
  CourseProgressView,
  GamificationDelta,
  LessonCompleteResult,
} from '@sistemazero/member-shell/lib/types'
import { useLessonRefresh } from '@sistemazero/member-shell/lib/use-lesson-refresh'
import videoGateVoice from '@sistemazero/member-shell/lib/zappy-video-gate-voice.json'
import { EdgePanelHandle } from '@sistemazero/ui/edge-panel-handle'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { RatingViewer } from '@/components/community/course-rating-flow'
import { useAdultGamification } from '@/components/community/gamification-provider'
import { LessonOutlineContent } from '@/components/community/lesson-outline-content'
import { lessonZappy } from '@/components/community/lesson-zappy'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { CourseDetailView, LessonDetailView } from '@/lib/types'

interface Props {
  course: CourseDetailView
  lesson: LessonDetailView
  /**
   * Próxima aula na ORDEM, ignorando a trava — destino do avanço APÓS concluir
   * (concluir a atual destrava a próxima). `null` só na última aula do curso.
   */
  nextLessonHref: string | null
  /** Rótulo do watermark do player de vídeo (adulto = e-mail do aluno). */
  viewerWatermark: string | null
  /** Id da sessão (conta) — isola o rascunho LOCAL do Estúdio por usuário. */
  viewerId: string | null
  lessonDraftsEnabled: boolean
  creationSharingEnabled: boolean
  /** Identidade exibida no agradecimento do rating (avatar + nome). */
  viewer: RatingViewer
  /** Página de vendas do curso (salesPageUrl ?? FUNNEL_URL) — modal Compartilhar. */
  shareUrl: string | null
}

export function LessonPlayer({
  course,
  lesson,
  nextLessonHref,
  viewerWatermark,
  viewerId,
  lessonDraftsEnabled,
  creationSharingEnabled,
  viewer,
  shareUrl,
}: Props) {
  const router = useRouter()
  const gamification = useAdultGamification()
  // Junta os pedidos e espera a atividade ampliada fechar (ver `use-lesson-refresh`).
  const refreshLesson = useLessonRefresh(() => router.refresh())
  const learning = useLessonLearning(lesson, viewerId)
  const lessonDrafts = useMemo(
    () =>
      lessonDraftsEnabled && viewerId && typeof window !== 'undefined'
        ? lessonDraftCloudFor(viewerId, 'adult')
        : undefined,
    [lessonDraftsEnabled, viewerId],
  )
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const missing = (reason: string) => requirements.some((r) => !r.complete && r.reason === reason)
  const blockedByLearning =
    missing('LEARNING_GATE_INCOMPLETE') || missing('SECTION_GATE_INCOMPLETE')
  const blockedByPinta = missing('PINTA_GATE_NOT_SUBMITTED')

  const [celebration, setCelebration] = useState<{
    progress: CourseProgressView
    progressAfter: CourseProgressView
    publicationPending: boolean
    gamification: GamificationDelta | null
  } | null>(null)
  const [completing, setCompleting] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [sectionPosition, setSectionPosition] = useState<{ index: number; total: number } | null>(
    () => {
      const sections = lesson.sections ?? []
      if (sections.length === 0) return null
      const savedIndex = sections.findIndex(
        (section) => section.id === lesson.learningProgress?.sectionId,
      )
      return { index: savedIndex >= 0 ? savedIndex : 0, total: sections.length }
    },
  )
  const courseHref = `/cursos/${encodeURIComponent(course.slug)}`

  const blockedByQuiz = missing('QUIZ_GATE_NOT_PASSED')
  const blockedByStudio = missing('STUDIO_GATE_NOT_SUBMITTED')
  const blockedByComingSoon = missing('LESSON_COMING_SOON')

  const completeBlocked = requirements.some((r) => !r.complete)

  const completedRef = useRef(lesson.completed)
  const complete = useCallback(async () => {
    if (completedRef.current) return
    setCompleting(true)
    try {
      const sendCompletion = () =>
        apiSend<LessonCompleteResult>(
          `/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`,
          'POST',
        )
      const sections = lesson.sections ?? []
      const result = lessonDrafts
        ? await lessonDrafts.withSavedDrafts(lesson.id, sendCompletion, {
            confirm: upToDateWorkspaceIds(sections, sectionPosition?.index ?? 0, sections.length),
          })
        : await sendCompletion()
      gamification?.reward(result.gamification)
      completedRef.current = true
      setCelebration({
        progress: course.progress,
        progressAfter: result,
        publicationPending:
          !course.curriculum &&
          typeof course.careerSlot === 'number' &&
          result.percent === 100 &&
          course.milestones?.showcased === false,
        gamification: result.gamification ?? null,
      })
    } catch (error) {
      const apiError = error as ApiError
      toast.error(apiError.message || 'Não foi possível concluir a aula. Tente novamente.')
    } finally {
      setCompleting(false)
    }
  }, [
    lesson.id,
    lesson.sections,
    lessonDrafts,
    sectionPosition?.index,
    course.progress,
    course.curriculum,
    course.careerSlot,
    course.milestones?.showcased,
    gamification,
  ])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      dialogueMascot: lessonZappy,
      showActivityRequirement: false,
      renderActionEvidence: (result) => <LessonActionEvidence result={result} />,
      videoGateMascot: <ZappyAnimated expression="happy" className="size-20 sm:size-24" />,
      videoGateAudioUrl: videoGateVoice.url,
      renderInstruction: (text, pose = 'speaking', speech) => (
        <DialogueBlockView
          content={{ kind: 'dialogue', text, pose }}
          speech={speech}
          mascot={<ZappyAnimated expression={pose} className="size-16 sm:size-20" />}
        />
      ),
      courseSlug: course.slug,
      viewerWatermark,
      viewerId,
      lessonDrafts,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      refreshAfterLearning: refreshLesson,
      refreshAfterQuiz: refreshLesson,
      refreshAfterStudio: refreshLesson,
    }),
    [
      lesson.id,
      lesson.positionSeconds,
      learning.progress,
      learning.onProgress,
      course.slug,
      viewerWatermark,
      viewerId,
      lessonDrafts,
      refreshLesson,
    ],
  )

  const completionAction = lesson.completed ? (
    <span className="inline-flex items-center gap-2 font-extrabold text-[0.9375rem]">
      <CheckCircle2 className="size-5 text-(--success-foreground)" aria-hidden />
      Aula concluída
    </span>
  ) : (
    <button
      type="button"
      className="sz-btn-gradient h-12 gap-2 px-7 text-base disabled:cursor-not-allowed disabled:opacity-55"
      onClick={() => complete()}
      disabled={completing || completeBlocked}
    >
      {completing ? <Spinner /> : <CheckCircle2 className="size-5" aria-hidden />}
      Concluir aula
    </button>
  )
  // Em TEXTO: vira um item da faixa "o que falta para seguir" do rodapé (`LessonSectionStatus`),
  // só quando a parte não tem itens próprios (aula legada, equipe).
  const completionMessage = lesson.completed
    ? null
    : blockedByLearning
      ? 'Termine as atividades desta aula para concluir'
      : blockedByPinta
        ? 'Envie seu desenho ao professor para concluir a aula'
        : blockedByComingSoon
          ? 'Esta aula ainda está sendo preparada'
          : blockedByQuiz
            ? 'Passe no quiz da aula para concluir'
            : blockedByStudio
              ? 'Envie seu projeto do Estúdio para concluir a aula'
              : null

  return (
    <LessonPlayerProvider value={playerContext}>
      {/* `sz-aula-adulto`: gancho do fundo alternativo da aula (a régua do Pen), aplicado no
          invólucro do app pelo `globals.css` sem mexer no layout. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 md:gap-4">
            <CreatorBackButton href={courseHref} label={`Voltar ao curso ${course.title}`} />
            <div className="min-w-0 flex-1">
              <LessonProgressBar
                progress={lesson.sectionProgress}
                position={sectionPosition}
                activities={blockedByComingSoon ? [] : requirements}
                compact
              />
            </div>
          </div>
          <LessonSections
            kids
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            lessonTitle={lesson.title}
            immersive
            onSectionChange={setSectionPosition}
            completionAction={completionAction}
            completionMessage={completionMessage}
            renderBlocks={(blocks) => (
              <CreatorLessonBlocks blocks={blocks} enableStudioShare={creationSharingEnabled} />
            )}
          />
        </div>

        {/* A alça usa a mesma largura responsiva da gaveta e permanece visível fechada. */}
        <EdgePanelHandle
          side="right"
          open={outlineOpen}
          openOffset="var(--lesson-outline-width)"
          label={outlineOpen ? 'Esconder lista de aulas' : 'Mostrar lista de aulas'}
          controlsId="kids-lesson-outline"
          onToggle={() => setOutlineOpen((open) => !open)}
          className="z-[62] border-border bg-card text-foreground lg:z-[42]"
        />
        {/* Lista de aulas sob demanda: gaveta no celular, lateral contínua no desktop. */}
        <button
          type="button"
          onClick={() => setOutlineOpen(false)}
          aria-label="Fechar lista de aulas"
          aria-hidden={!outlineOpen}
          inert={!outlineOpen}
          className={cn(
            'fixed inset-0 z-[60] bg-foreground/25 transition-opacity duration-300 motion-reduce:transition-none lg:hidden',
            outlineOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
        <aside
          id="kids-lesson-outline"
          aria-hidden={!outlineOpen}
          inert={!outlineOpen}
          className={cn(
            'fixed inset-y-0 right-0 z-[61] flex w-(--lesson-outline-width) flex-col overflow-hidden border-border border-l bg-card transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:z-40',
            !outlineOpen ? 'pointer-events-none translate-x-full' : 'translate-x-0',
          )}
        >
          <button
            type="button"
            onClick={() => setOutlineOpen(false)}
            aria-label="Fechar lista de aulas"
            className="ml-auto flex size-11 items-center justify-center lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
          <LessonOutlineContent
            course={course}
            courseHref={courseHref}
            currentLessonId={lesson.id}
            shareUrl={shareUrl}
            viewer={viewer}
          />
        </aside>
      </div>
      {celebration ? (
        <LessonCelebration
          progressBefore={celebration.progress}
          progressAfter={celebration.progressAfter}
          publicationPending={celebration.publicationPending}
          gamification={celebration.gamification}
          nextHref={nextLessonHref}
          courseHref={courseHref}
          onClose={() => {
            setCelebration(null)
            router.refresh()
          }}
        />
      ) : null}
    </LessonPlayerProvider>
  )
}
