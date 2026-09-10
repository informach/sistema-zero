'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'

import { LessonAttachments } from '@sistemazero/member-shell/components/lesson-attachments'
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
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Circle, Lock } from 'lucide-react'
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
  prevHref: string | null
  /** Próxima aula LIBERADA (travada → null): botão "Próxima" do rodapé. */
  nextHref: string | null
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
  prevHref,
  nextHref,
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

  return (
    <LessonPlayerProvider value={playerContext}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* mb-2: título → 1º bloco fica um pouco maior que o gap entre blocos */}
          <div className="mb-2">
            <Link
              href={courseHref}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              {course.title}
            </Link>
            <h1 className="sz-display mt-2 text-2xl">{lesson.title}</h1>
          </div>

          <LessonProgressBar progress={lesson.sectionProgress} />
          <LessonSections
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            renderBlocks={(blocks) => <LessonBlocks blocks={blocks} />}
          />

          {lesson.attachments.length > 0 ? (
            <LessonAttachments
              courseSlug={course.slug}
              lessonId={lesson.id}
              attachments={lesson.attachments}
            />
          ) : null}

          {/* Ações: concluir + navegação */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {lesson.completed ? (
              <span className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
                <CheckCircle2 className="size-4" />
                Aula concluída
              </span>
            ) : (
              <div className="flex flex-col gap-1">
                <Button onClick={() => complete()} disabled={completing || completeBlocked}>
                  {completing ? <Spinner /> : <CheckCircle2 className="size-4" />}
                  Concluir aula
                </Button>
                {blockedByLearning ? (
                  <p className="text-sm text-muted-foreground">
                    Termine as atividades essenciais das seções para concluir a aula.
                  </p>
                ) : blockedByPinta ? (
                  <p className="text-sm text-muted-foreground">
                    Envie seu desenho ao professor para concluir a aula.
                  </p>
                ) : blockedByComingSoon ? (
                  <p className="text-xs text-muted-foreground">
                    Esta aula ainda está sendo preparada.
                  </p>
                ) : blockedByQuiz ? (
                  <p className="text-xs text-muted-foreground">
                    Passe no quiz da aula para poder concluí-la.
                  </p>
                ) : blockedByStudio ? (
                  <p className="text-xs text-muted-foreground">
                    Envie o projeto do Estúdio para poder concluir a aula.
                  </p>
                ) : blockedByStudioNotPassed ? (
                  <p className="text-xs text-muted-foreground">
                    Atinja a nota mínima do Estúdio para poder concluir a aula.
                  </p>
                ) : null}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {prevHref ? (
                <Link href={prevHref} className={buttonVariants({ variant: 'outline' })}>
                  <ArrowLeft className="size-4" />
                  Anterior
                </Link>
              ) : null}
              {nextHref ? (
                <Link href={nextHref} className={buttonVariants({ variant: 'outline' })}>
                  Próxima
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Outline do curso (sidebar) */}
        {/* lg:mt-7 alinha o topo do card com o título da aula (breadcrumb 20px + mt-2 do h1) */}
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:mt-7 lg:w-72">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{course.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={course.progress.percent} className="flex-1" />
                <span className="sz-display text-xs">{course.progress.percent}%</span>
              </div>
              {/* Classificação do curso: o link some quando myRating != null. */}
              <CourseRatingFlow
                courseSlug={course.slug}
                initialRating={course.myRating}
                shareUrl={shareUrl}
                viewer={viewer}
              />
            </div>
            <nav className="scrollbar-subtle max-h-[28rem] overflow-y-auto">
              {course.modules.map((module) => (
                <div key={module.id}>
                  <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                              active
                                ? 'bg-muted font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                            aria-current={active ? 'page' : undefined}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-accent dark:text-primary" />
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
