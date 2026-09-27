'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'

import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import { LessonProgressBar } from '@sistemazero/member-shell/components/lesson-progress-bar'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { EdgePanelHandle } from '@sistemazero/ui/edge-panel-handle'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2, ChevronLeft, Circle, Lock, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CourseRatingFlow, type RatingViewer } from '@/components/community/course-rating-flow'
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
  viewer,
  shareUrl,
}: Props) {
  const router = useRouter()
  const learning = useLessonLearning(lesson, viewerId)
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const missing = (reason: string) => requirements.some((r) => !r.complete && r.reason === reason)
  const blockedByLearning =
    missing('LEARNING_GATE_INCOMPLETE') || missing('SECTION_GATE_INCOMPLETE')
  const blockedByPinta = missing('PINTA_GATE_NOT_SUBMITTED')

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
  const blockedByStudioNotPassed = missing('STUDIO_GATE_NOT_PASSED')
  const blockedByComingSoon = missing('LESSON_COMING_SOON')

  const completeBlocked = requirements.some((r) => !r.complete)

  const completedRef = useRef(lesson.completed)
  const complete = useCallback(async () => {
    if (completedRef.current) return
    setCompleting(true)
    try {
      await apiSend(`/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`, 'POST')
      completedRef.current = true
      toast.success('Aula concluída!')
      if (nextLessonHref) router.push(nextLessonHref)
      router.refresh()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(apiError.message || 'Não foi possível concluir a aula. Tente novamente.')
    } finally {
      setCompleting(false)
    }
  }, [lesson.id, nextLessonHref, router])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: course.slug,
      viewerWatermark,
      viewerId,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      refreshAfterLearning: () => router.refresh(),
      refreshAfterQuiz: () => router.refresh(),
      refreshAfterStudio: () => router.refresh(),
    }),
    [
      lesson.id,
      lesson.positionSeconds,
      learning.progress,
      learning.onProgress,
      course.slug,
      viewerWatermark,
      viewerId,
      router,
    ],
  )

  const completionAction = lesson.completed ? (
    <span className="inline-flex items-center gap-2 font-semibold text-accent text-sm">
      <CheckCircle2 className="size-4" />
      Aula concluída
    </span>
  ) : (
    <Button onClick={() => complete()} disabled={completing || completeBlocked}>
      {completing ? <Spinner /> : <CheckCircle2 className="size-4" />}
      Concluir aula
    </Button>
  )
  const completionMessage = lesson.completed ? null : blockedByLearning ? (
    <p>Termine as atividades essenciais das seções para concluir a aula.</p>
  ) : blockedByPinta ? (
    <p>Envie seu desenho ao professor para concluir a aula.</p>
  ) : blockedByComingSoon ? (
    <p>Esta aula ainda está sendo preparada.</p>
  ) : blockedByQuiz ? (
    <p>Passe no quiz da aula para poder concluí-la.</p>
  ) : blockedByStudio ? (
    <p>Envie o projeto do Estúdio para poder concluir a aula.</p>
  ) : blockedByStudioNotPassed ? (
    <p>Atinja a nota mínima do Estúdio para poder concluir a aula.</p>
  ) : null

  return (
    <LessonPlayerProvider value={playerContext}>
      {/* `sz-aula-adulto`: gancho do fundo alternativo da aula (a régua do Pen), aplicado no
          invólucro do app pelo `globals.css` sem mexer no layout. */}
      <div className="sz-aula-adulto flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 md:gap-4">
            <Link
              href={courseHref}
              aria-label={`Voltar ao curso ${course.title}`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <LessonProgressBar progress={lesson.sectionProgress} compact />
            </div>
            {sectionPosition ? (
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                Seção {sectionPosition.index + 1} de {sectionPosition.total}
              </span>
            ) : null}
          </div>
          <LessonSections
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            lessonTitle={lesson.title}
            immersive
            onSectionChange={setSectionPosition}
            completionAction={completionAction}
            completionMessage={completionMessage}
            renderBlocks={(blocks) => <LessonBlocks blocks={blocks} />}
          />
        </div>

        {/* A alça usa a mesma largura responsiva da gaveta e permanece visível fechada. */}
        <EdgePanelHandle
          side="right"
          open={outlineOpen}
          openOffset="var(--lesson-outline-width)"
          label={outlineOpen ? 'Esconder lista de aulas' : 'Mostrar lista de aulas'}
          controlsId="adult-lesson-outline"
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
          id="adult-lesson-outline"
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
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 lg:rounded-none lg:border-0 lg:shadow-none">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{course.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={course.progress.percent} className="flex-1" />
                <span className="sz-display text-primary text-xs">{course.progress.percent}%</span>
              </div>
              {/* Classificação do curso: o link some quando myRating != null. */}
              <CourseRatingFlow
                courseSlug={course.slug}
                initialRating={course.myRating}
                shareUrl={shareUrl}
                viewer={viewer}
              />
            </div>
            <nav className="scrollbar-subtle max-h-[28rem] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {course.modules.map((module) => (
                <div key={module.id}>
                  <p className="bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {module.title}
                  </p>
                  <ul>
                    {module.lessons.map((item) => {
                      const active = item.id === lesson.id
                      if (item.locked) {
                        return (
                          <li key={item.id}>
                            <div
                              aria-disabled="true"
                              title="Conclua a aula anterior para liberar"
                              className="flex cursor-not-allowed items-center gap-2 px-4 py-2 text-sm text-muted-foreground opacity-70"
                            >
                              <Lock className="size-3.5 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                          </li>
                        )
                      }
                      return (
                        <li key={item.id}>
                          <Link
                            href={`${courseHref}/aulas/${encodeURIComponent(item.id)}`}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                              // Aula atual: o tom da linha de cartão com a barrinha na cor de
                              // ação à esquerda (o "você está aqui" do Pen).
                              active
                                ? 'bg-muted font-medium text-foreground shadow-[inset_3px_0_0_var(--primary)]'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                            aria-current={active ? 'page' : undefined}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                            ) : (
                              <Circle className="size-3.5 shrink-0" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </Card>
        </aside>
      </div>
    </LessonPlayerProvider>
  )
}
