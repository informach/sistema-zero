'use client'

import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CourseRatingFlow, type RatingViewer } from '@/components/kids/course-rating-flow'
import { KidsLessonAttachments } from '@/components/kids/kids-lesson-attachments'
import {
  GuidedCreationMode,
  KidsLessonBlocks,
  lessonSupportsGuided,
} from '@/components/kids/kids-lesson-blocks'
import { LessonCelebration } from '@/components/kids/lesson-celebration'
import { UNIT_THEME_CLASS, unitThemeAt } from '@/components/kids/unit-theme'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type {
  CourseDetailView,
  CourseProgressView,
  GamificationDelta,
  LessonCompleteResult,
  LessonDetailView,
  QuizBlock,
  StudioBlock,
} from '@/lib/types'

interface Props {
  course: CourseDetailView
  lesson: LessonDetailView
  prevHref: string | null
  /** Próxima aula LIBERADA (travada → null): botão "Próxima" do rodapé. */
  nextHref: string | null
  /**
   * Próxima aula na ORDEM, ignorando a trava — destino do botão "Próxima aula" da
   * COMEMORAÇÃO (ao concluir, a aula atual já destravou a próxima). `null` na última.
   */
  nextLessonHref: string | null
  /** Rótulo do watermark do player de vídeo (kids = "Perfil <id8>", sem PII do responsável). */
  viewerWatermark: string | null
  /** Id da sessão (perfil ativo no kids) — isola o rascunho LOCAL do Estúdio por perfil. */
  viewerId: string | null
  /** Aluno exibido no agradecimento da classificação (avatar + nome). */
  ratingViewer: RatingViewer
  /** Página de vendas do curso (Compartilhar) — `null` oculta o botão. */
  shareUrl: string | null
}

/** Persistência da posição: salva no máximo a cada N segundos durante o playback. */
const POSITION_SAVE_INTERVAL_MS = 12_000

export function LessonPlayer({
  course,
  lesson,
  prevHref,
  nextHref,
  nextLessonHref,
  viewerWatermark,
  viewerId,
  ratingViewer,
  shareUrl,
}: Props) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  // Modo criação guiada (vídeo + estúdio lado a lado) — só quando a aula tem AMBOS os blocos.
  const [guided, setGuided] = useState(false)
  const canGuide = useMemo(() => lessonSupportsGuided(lesson.blocks), [lesson.blocks])
  // Snapshot do progresso ANTES do refresh (a celebração anima antes→depois)
  // + delta de gamificação vindo na RESPOSTA do complete; null = overlay fechado.
  const [celebration, setCelebration] = useState<{
    progress: CourseProgressView
    gamification: GamificationDelta | null
  } | null>(null)
  const courseHref = `/cursos/${encodeURIComponent(course.slug)}`

  // Numeração global da aula ("AULA N DE M" + círculos da mini-trilha).
  const flatLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules])
  const lessonNumber = flatLessons.findIndex((l) => l.id === lesson.id) + 1
  const moduleStartIndexes = useMemo(() => {
    const starts: number[] = []
    let acc = 0
    for (const m of course.modules) {
      starts.push(acc)
      acc += m.lessons.length
    }
    return starts
  }, [course.modules])

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

  // Há bloco de estúdio cujo projeto ainda não foi enviado? (mesmo gate do backend — 409)
  const blockedByStudioNotSubmitted = useMemo(
    () => lesson.blocks.some((b) => b.kind === 'studio' && !b.studioState?.submitted),
    [lesson.blocks],
  )
  // Atividades do Estúdio com nota mínima exigem aprovação, não só envio.
  const blockedByStudioNotPassed = useMemo(
    () =>
      lesson.blocks.some((b) => {
        if (b.kind !== 'studio' || !b.studioState?.submitted) return false
        const content = b.content as StudioBlock | null
        return content?.activity?.passingScore !== undefined && !b.studioState?.passed
      }),
    [lesson.blocks],
  )
  const completeBlocked = blockedByQuiz || blockedByStudioNotSubmitted || blockedByStudioNotPassed

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
        const res = await apiSend<LessonCompleteResult>(
          `/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`,
          'POST',
        )
        completedRef.current = true
        const gamification = res?.gamification ?? null
        if (opts.silent) {
          // Auto-conclusão a ~90% do vídeo: só o toast (com o XP ganho) —
          // interromper o vídeo com um overlay no meio da reprodução seria hostil.
          const xp = gamification?.xpAwarded ?? 0
          toast.success(xp > 0 ? `Aula concluída! +${xp} XP` : 'Aula concluída!')
        } else {
          // Celebração assume a navegação (snapshot ANTES do refresh — as
          // props de progresso mudam quando o server re-renderiza).
          setCelebration({ progress: course.progress, gamification })
        }
        router.refresh()
      } catch (err) {
        const apiErr = err as ApiError
        if (apiErr?.code === 'QUIZ_GATE_NOT_PASSED') {
          // Auto-conclusão silenciada: a aula só conclui passando no quiz.
          if (!opts.silent) {
            toast.error('Conclua o quiz da aula com a nota mínima para finalizá-la.')
          }
        } else if (apiErr?.code === 'STUDIO_GATE_NOT_SUBMITTED') {
          // A aula só conclui depois de enviar o projeto do Estúdio ao professor.
          if (!opts.silent) {
            toast.error('Envie o projeto do Estúdio para poder concluir a aula.')
          }
        } else if (apiErr?.code === 'STUDIO_GATE_NOT_PASSED') {
          // A aula só conclui depois de atingir a nota mínima do Estúdio.
          if (!opts.silent) {
            toast.error('Atinja a nota mínima do Estúdio para poder concluir a aula.')
          }
        } else if (!opts.silent) {
          toast.error('Não foi possível marcar a aula. Tente de novo.')
        }
      } finally {
        if (!opts.silent) setCompleting(false)
      }
    },
    [lesson.id, course.progress, router],
  )

  const onVideoReachedThreshold = useCallback(() => {
    // Auto-marca ao assistir ~90% (sem navegar); bloqueio por quiz é silencioso.
    void complete({ silent: true })
  }, [complete])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: course.slug,
      viewerWatermark,
      viewerId,
      initialPositionSeconds: lesson.completed ? null : lesson.positionSeconds,
      onVideoProgress,
      onVideoFlush,
      onVideoReachedThreshold,
      refreshAfterQuiz: () => router.refresh(),
      refreshAfterStudio: () => router.refresh(),
    }),
    [
      lesson.id,
      lesson.completed,
      lesson.positionSeconds,
      course.slug,
      viewerWatermark,
      viewerId,
      onVideoProgress,
      onVideoFlush,
      onVideoReachedThreshold,
      router,
    ],
  )

  // Guiada e normal NÃO coexistem: renderizar os dois montaria o MESMO bloco de estúdio
  // 2× (mesma chave de rascunho no IndexedDB → conflito) e dois players de vídeo. Logo é um
  // OU outro. Alternar remonta o editor, que re-semeia do rascunho LOCAL (sem perda).
  if (guided) {
    return (
      <LessonPlayerProvider value={playerContext}>
        <GuidedCreationMode
          blocks={lesson.blocks}
          lessonTitle={lesson.title}
          onExit={() => setGuided(false)}
        />
      </LessonPlayerProvider>
    )
  }

  return (
    <LessonPlayerProvider value={playerContext}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Header de "lição" (padrão Duolingo): voltar em círculo + progresso do CURSO. */}
          <div className="flex items-center gap-3">
            <Link
              href={courseHref}
              aria-label={`Voltar à trilha de ${course.title}`}
              className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-[0_3px_0_var(--border)] transition-all hover:text-foreground active:translate-y-[2px] active:shadow-[0_1px_0_var(--border)]"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <ProgressBar value={course.progress.percent} className="flex-1" />
            <span className="sz-display text-sm">{course.progress.percent}%</span>
          </div>

          {/* mb-2: título → 1º bloco fica um pouco maior que o gap entre blocos */}
          <div className="mb-2">
            <span className="inline-block rounded-full px-3 py-1 font-bold text-xs uppercase tracking-widest [background-image:var(--sz-gradient)] [font-family:var(--font-display)] text-(--sz-primary-fg)">
              Aula {lessonNumber} de {flatLessons.length}
            </span>
            <h1 className="sz-display mt-3 text-2xl md:text-3xl">{lesson.title}</h1>
          </div>

          {/* Modo criação guiada: só aparece quando a aula tem VÍDEO + ESTÚDIO. */}
          {canGuide ? (
            <button
              type="button"
              onClick={() => setGuided(true)}
              className="flex items-center gap-3 self-start rounded-2xl border-2 border-primary/40 bg-primary/5 px-4 py-2.5 text-left text-primary transition-colors hover:bg-primary/10 active:translate-y-[1px]"
            >
              <Wand2 className="size-5 shrink-0" />
              <span className="sz-display text-sm">
                Modo criação guiada
                <span className="block font-normal text-muted-foreground text-xs">
                  Vídeo e estúdio lado a lado pra assistir e criar junto
                </span>
              </span>
            </button>
          ) : null}

          <KidsLessonBlocks blocks={lesson.blocks} />

          {lesson.attachments.length > 0 ? (
            <KidsLessonAttachments
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
                {/* CTA 3D grande (o seletor global do Button default já aplica
                    a sombra dura + afunda no clique). */}
                <Button
                  onClick={() => complete()}
                  disabled={completing || completeBlocked}
                  className="h-12 rounded-full px-8 text-base"
                >
                  {completing ? <Spinner /> : <CheckCircle2 className="size-5" />}
                  Concluir aula
                </Button>
                {blockedByQuiz ? (
                  <p className="text-muted-foreground text-xs">
                    Passe no quiz da aula para poder concluí-la.
                  </p>
                ) : blockedByStudioNotSubmitted ? (
                  <p className="text-muted-foreground text-xs">
                    Envie o projeto do Estúdio para poder concluir a aula.
                  </p>
                ) : blockedByStudioNotPassed ? (
                  <p className="text-muted-foreground text-xs">
                    Atinja a nota mínima do Estúdio para poder concluir a aula.
                  </p>
                ) : null}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-full px-5')}
                >
                  <ArrowLeft className="size-4" />
                  Anterior
                </Link>
              ) : null}
              {nextHref ? (
                <Link
                  href={nextHref}
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-full px-5')}
                >
                  Próxima
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Outline do curso (sidebar) como MINI-TRILHA: módulos = unidades
            temáticas, aulas = círculos numerados. lg:top-6: sem header fixo
            no desktop (a navegação é a sidebar do app). */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-72">
          <Card className="overflow-hidden p-0">
            {/* Sem barra de progresso aqui: o header da lição (topo) já a mostra. */}
            <div className="border-border border-b px-4 py-3">
              <p className="sz-display text-sm">{course.title}</p>
              <CourseRatingFlow
                courseSlug={course.slug}
                initialRating={course.myRating}
                shareUrl={shareUrl}
                viewer={ratingViewer}
              />
            </div>
            <nav className="scrollbar-subtle max-h-[28rem] overflow-y-auto">
              {course.modules.map((module, moduleIndex) => (
                <div key={module.id} className={UNIT_THEME_CLASS[unitThemeAt(moduleIndex)]}>
                  <p className="bg-muted/40 px-4 py-1.5 font-bold text-(--unit) text-xs uppercase tracking-wide [font-family:var(--font-display)]">
                    {module.title}
                  </p>
                  <ul>
                    {module.lessons.map((item, lessonIndex) => {
                      const active = item.id === lesson.id
                      const number = (moduleStartIndexes[moduleIndex] ?? 0) + lessonIndex + 1
                      const numberBadge = (
                        <span
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full border-2 font-bold text-[0.65rem] [font-family:var(--font-display)]',
                            item.completed
                              ? 'border-transparent [background-color:var(--unit-bg)] [background-image:var(--unit-bg-image)] text-(--unit-fg)'
                              : active
                                ? 'border-(--unit) text-(--unit)'
                                : 'border-border',
                          )}
                        >
                          {item.completed ? (
                            <Check className="size-3.5" strokeWidth={3.5} />
                          ) : item.locked ? (
                            <Lock className="size-3" strokeWidth={2.5} />
                          ) : (
                            number
                          )}
                        </span>
                      )
                      // Aula travada: item NÃO clicável (a regra de acesso é do backend).
                      if (item.locked) {
                        return (
                          <li key={item.id}>
                            <div
                              aria-disabled="true"
                              title="Conclua a aula anterior para liberar"
                              className="flex cursor-not-allowed items-center gap-2.5 px-4 py-2 text-muted-foreground text-sm opacity-70"
                            >
                              {numberBadge}
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
                              'flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
                              active
                                ? 'bg-[color-mix(in_oklch,var(--unit)_12%,transparent)] font-semibold text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                            aria-current={active ? 'page' : undefined}
                          >
                            {numberBadge}
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

      {celebration ? (
        <LessonCelebration
          progressBefore={celebration.progress}
          gamification={celebration.gamification}
          // Próxima na ORDEM (ignora a trava): concluir esta aula já liberou a próxima.
          nextHref={nextLessonHref}
          courseHref={courseHref}
          onClose={() => setCelebration(null)}
        />
      ) : null}
    </LessonPlayerProvider>
  )
}
