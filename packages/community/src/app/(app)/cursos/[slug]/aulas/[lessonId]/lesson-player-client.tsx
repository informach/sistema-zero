'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Circle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CourseRatingFlow, type RatingViewer } from '@/components/community/course-rating-flow'
import { LessonAttachments } from '@/components/community/lesson-attachments'
import { LessonBlocks } from '@/components/community/lesson-blocks'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@/components/community/lesson-player-context'
import { ProgressBar } from '@/components/community/progress-bar'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { CourseDetailView, LessonDetailView, QuizBlock } from '@/lib/types'

interface Props {
  course: CourseDetailView
  lesson: LessonDetailView
  prevHref: string | null
  nextHref: string | null
  /** E-mail do aluno (sessão) — watermark do player de vídeo. */
  viewerEmail: string | null
  /** Identidade exibida no agradecimento do rating (avatar + nome). */
  viewer: RatingViewer
  /** Página de vendas do curso (salesPageUrl ?? FUNNEL_URL) — modal Compartilhar. */
  shareUrl: string | null
}

/** Persistência da posição: salva no máximo a cada N segundos durante o playback. */
const POSITION_SAVE_INTERVAL_MS = 12_000

export function LessonPlayer({
  course,
  lesson,
  prevHref,
  nextHref,
  viewerEmail,
  viewer,
  shareUrl,
}: Props) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const courseHref = `/cursos/${encodeURIComponent(course.slug)}`

  // Há quiz com nota de corte ainda não aprovado? (bloqueia o concluir — 409 no backend)
  const blockedByQuiz = useMemo(
    () =>
      lesson.blocks.some((b) => {
        if (b.kind !== 'quiz') return false
        const content = b.content as QuizBlock | null
        return content?.passingScore != null && !b.quizState?.passed
      }),
    [lesson.blocks],
  )

  // ── Posição do vídeo: refs (sem re-render) + throttle + flush por beacon ────
  const positionUrl = `/api/members/lessons/${encodeURIComponent(lesson.id)}/position`
  const lastPosRef = useRef(lesson.positionSeconds ?? 0)
  const lastSavedAtRef = useRef(0)
  const lastSavedPosRef = useRef(lesson.positionSeconds ?? 0)

  const savePosition = useCallback(
    (seconds: number) => {
      lastSavedAtRef.current = Date.now()
      lastSavedPosRef.current = seconds
      // keepalive: sobrevive à navegação client-side; erros são silenciosos
      // (posição é best-effort, nunca atrapalha a aula).
      fetch(positionUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ courseSlug: course.slug, positionSeconds: Math.floor(seconds) }),
        keepalive: true,
      }).catch(() => {})
    },
    [positionUrl, course.slug],
  )

  const onVideoProgress = useCallback(
    (seconds: number) => {
      lastPosRef.current = seconds
      const now = Date.now()
      if (
        now - lastSavedAtRef.current >= POSITION_SAVE_INTERVAL_MS &&
        Math.abs(seconds - lastSavedPosRef.current) >= 3
      ) {
        savePosition(seconds)
      }
    },
    [savePosition],
  )

  const onVideoFlush = useCallback((seconds: number) => savePosition(seconds), [savePosition])

  // Flush ao sair (troca de aba/fechar/navegar): sendBeacon sobrevive ao unload.
  useEffect(() => {
    const flushBeacon = () => {
      const seconds = Math.floor(lastPosRef.current)
      if (seconds <= 0 || seconds === Math.floor(lastSavedPosRef.current)) return
      lastSavedPosRef.current = seconds
      navigator.sendBeacon(
        positionUrl,
        new Blob([JSON.stringify({ courseSlug: course.slug, positionSeconds: seconds })], {
          type: 'application/json',
        }),
      )
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushBeacon()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushBeacon)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushBeacon)
      flushBeacon() // troca de aula (unmount) também persiste
    }
  }, [positionUrl, course.slug])

  // ── Concluir aula (botão manual + auto a ~90% do vídeo) ─────────────────────
  const completedRef = useRef(lesson.completed)

  const complete = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (completedRef.current) return
      if (!opts.silent) setCompleting(true)
      try {
        await apiSend(`/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`, 'POST')
        completedRef.current = true
        toast.success('Aula concluída!')
        if (!opts.silent && nextHref) router.push(nextHref)
        router.refresh()
      } catch (err) {
        const apiErr = err as ApiError
        if (apiErr?.code === 'QUIZ_GATE_NOT_PASSED') {
          // Auto-conclusão silenciada: a aula só conclui passando no quiz.
          if (!opts.silent) {
            toast.error('Conclua o quiz da aula com a nota mínima para finalizá-la.')
          }
        } else if (!opts.silent) {
          toast.error('Não foi possível marcar a aula. Tente de novo.')
        }
      } finally {
        if (!opts.silent) setCompleting(false)
      }
    },
    [lesson.id, nextHref, router],
  )

  const onVideoReachedThreshold = useCallback(() => {
    // Auto-marca ao assistir ~90% (sem navegar); bloqueio por quiz é silencioso.
    void complete({ silent: true })
  }, [complete])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: course.slug,
      viewerEmail,
      initialPositionSeconds: lesson.completed ? null : lesson.positionSeconds,
      onVideoProgress,
      onVideoFlush,
      onVideoReachedThreshold,
      refreshAfterQuiz: () => router.refresh(),
    }),
    [
      lesson.id,
      lesson.completed,
      lesson.positionSeconds,
      course.slug,
      viewerEmail,
      onVideoProgress,
      onVideoFlush,
      onVideoReachedThreshold,
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

          <LessonBlocks blocks={lesson.blocks} />

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
                <Button onClick={() => complete()} disabled={completing || blockedByQuiz}>
                  {completing ? <Spinner /> : <CheckCircle2 className="size-4" />}
                  Concluir aula
                </Button>
                {blockedByQuiz ? (
                  <p className="text-xs text-muted-foreground">
                    Passe no quiz da aula para poder concluí-la.
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
