'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'

import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseRatingFlow, type RatingViewer } from '@/components/kids/course-rating-flow'
import { useFocusMode } from '@/components/kids/focus-mode'
import { FocusModeToggle } from '@/components/kids/focus-mode-toggle'
import { KidsLessonAttachments } from '@/components/kids/kids-lesson-attachments'
import { KidsLessonBlocks } from '@/components/kids/kids-lesson-blocks'
import { LessonCelebration } from '@/components/kids/lesson-celebration'
import { visibleModules } from '@/components/kids/trail-layout'
import { UNIT_THEME_CLASS, unitThemeAt } from '@/components/kids/unit-theme'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type {
  CourseDetailView,
  CourseProgressView,
  GamificationDelta,
  LessonCompleteResult,
  LessonDetailView,
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
  const learning = useLessonLearning(lesson, viewerId)
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const missing = (reason: string) => requirements.some((r) => !r.complete && r.reason === reason)
  const blockedByLearning = missing('LEARNING_GATE_INCOMPLETE')
  const blockedByPinta = missing('PINTA_GATE_NOT_SUBMITTED')

  const { navAvailable, outlineAvailable, outlineCollapsed } = useFocusMode()
  const [completing, setCompleting] = useState(false)
  // Snapshot do progresso ANTES do refresh (a celebração anima antes→depois)
  // + delta de gamificação vindo na RESPOSTA do complete; null = overlay fechado.
  const [celebration, setCelebration] = useState<{
    progress: CourseProgressView
    progressAfter: CourseProgressView
    publicationPending: boolean
    gamification: GamificationDelta | null
  } | null>(null)
  const courseHref = `/cursos/${encodeURIComponent(course.slug)}`

  // Numeração global da aula ("AULA N DE M" + círculos da mini-trilha).
  const flatLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules])
  const lessonNumber = flatLessons.findIndex((l) => l.id === lesson.id) + 1
  // Módulo sem aula PUBLICADA não entra no índice lateral — só um título solto com
  // lista vazia embaixo (mesma regra da trilha do curso, `visibleModules`). A
  // numeração global não muda: módulo vazio soma zero aula em qualquer ordem.
  const modules = useMemo(() => visibleModules(course), [course])
  const moduleStartIndexes = useMemo(() => {
    const starts: number[] = []
    let acc = 0
    for (const m of modules) {
      starts.push(acc)
      acc += m.lessons.length
    }
    return starts
  }, [modules])

  const blockedByQuiz = missing('QUIZ_GATE_NOT_PASSED')
  const blockedByStudioNotSubmitted = missing('STUDIO_GATE_NOT_SUBMITTED')
  const blockedByStudioNotPassed = missing('STUDIO_GATE_NOT_PASSED')
  const blockedByComingSoon = missing('LESSON_COMING_SOON')

  const completeBlocked = requirements.some((r) => !r.complete)

  // Com a trava sequencial, uma aula "em breve" prende TODAS as seguintes. O
  // "Próxima" some e a mini-trilha enche de cadeado — sem dizer por quê, a leitura
  // mais natural para uma criança é "eu fiz alguma coisa errada".
  const nextLessonLocked = useMemo(() => {
    const i = flatLessons.findIndex((l) => l.id === lesson.id)
    return i >= 0 && Boolean(flatLessons[i + 1]?.locked)
  }, [flatLessons, lesson.id])

  const completedRef = useRef(lesson.completed)
  const complete = useCallback(async () => {
    if (completedRef.current) return
    setCompleting(true)
    try {
      const res = await apiSend<LessonCompleteResult>(
        `/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`,
        'POST',
      )
      completedRef.current = true
      setCelebration({
        progress: course.progress,
        progressAfter: res,
        publicationPending:
          typeof course.careerSlot === 'number' &&
          res.percent === 100 &&
          course.milestones?.showcased === false,
        gamification: res?.gamification ?? null,
      })
      router.refresh()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(apiError.message || 'Não foi possível concluir a aula. Tente novamente.')
    } finally {
      setCompleting(false)
    }
  }, [lesson.id, course.progress, course.careerSlot, course.milestones?.showcased, router])

  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: course.slug,
      viewerWatermark,
      viewerId,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
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
      <div
        className={cn(
          'flex flex-col gap-6 lg:flex-row lg:items-start',
          // Sem a coluna direita, some o gap fantasma antes da largura-zero.
          outlineCollapsed ? 'lg:gap-0' : 'lg:gap-10',
        )}
      >
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Header de "lição" (padrão Duolingo): voltar em círculo + modo foco.
              O progresso do CURSO saiu daqui (09/2026): dentro da aula o que a
              criança precisa é o progresso DA AULA, que agora vive em segmentos
              logo acima das seções (`LessonProgress`). O do curso ela já vê na
              trilha, no card do curso e na celebração. O chip "Aula N de M"
              abaixo FICA: ele situa a aula no curso sem medir nada. */}
          <div className="flex items-center gap-3">
            {/* "Voltar ao CURSO", não "à trilha": desde que a página do curso ganhou
                a própria setinha (que vai à trilha do NÍVEL), a mesma palavra levaria
                a dois lugares em telas seguidas. */}
            <KidsBackButton href={courseHref} label={`Voltar ao curso ${course.title}`} />
            <div className="flex-1" />
            {/* Modo foco: esconder o menu / a lista de aulas p/ mais área útil. */}
            {navAvailable || outlineAvailable ? (
              <div className="flex items-center gap-2">
                <FocusModeToggle target="nav" />
                <FocusModeToggle target="outline" />
              </div>
            ) : null}
          </div>

          {/* mb-2: título → 1º bloco fica um pouco maior que o gap entre blocos */}
          <div className="mb-2">
            <span className="inline-block rounded-full px-3 py-1 font-bold text-xs uppercase tracking-widest [background-image:var(--sz-gradient)] [font-family:var(--font-display)] text-(--sz-primary-fg)">
              Aula {lessonNumber} de {flatLessons.length}
            </span>
            <h1 className="sz-display mt-3 text-2xl md:text-3xl">{lesson.title}</h1>
          </div>

          <LessonSections
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            kids
            renderBlocks={(blocks) => <KidsLessonBlocks blocks={blocks} />}
          />

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
                {blockedByLearning ? (
                  <p className="text-sm text-muted-foreground">
                    Termine as atividades essenciais das seções para concluir a aula.
                  </p>
                ) : blockedByPinta ? (
                  <p className="text-sm text-muted-foreground">
                    Envie seu desenho ao professor para concluir a aula.
                  </p>
                ) : blockedByComingSoon ? (
                  <p className="text-muted-foreground text-xs">
                    Essa aula ainda está sendo preparada.
                    {/* As próximas NÃO abrem sozinhas quando o bloco sai: a criança
                        ainda precisa concluir esta. Prometer o contrário faria ela
                        voltar e encontrar os mesmos cadeados. */}
                    {nextLessonLocked
                      ? ' Quando ela ficar pronta, você termina e as próximas abrem.'
                      : ''}
                  </p>
                ) : blockedByQuiz ? (
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
        <aside
          aria-hidden={outlineCollapsed || undefined}
          className={cn(
            'w-full shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out motion-reduce:transition-none',
            'lg:sticky lg:top-6',
            outlineCollapsed
              ? 'lg:w-0 lg:pointer-events-none lg:opacity-0'
              : 'lg:w-72 lg:opacity-100',
          )}
        >
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
              {modules.map((module, moduleIndex) => (
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
                              className="flex cursor-not-allowed items-center gap-2.5 px-4 py-2 text-muted-foreground text-sm opacity-70"
                            >
                              {numberBadge}
                              <span className="truncate">{item.title}</span>
                              {/* Descritivo, não imperativo: a aula anterior pode ser
                                  uma "em breve", que ainda não dá para concluir. Vai
                                  em `sr-only` porque `title` não aparece no touch e
                                  um `<div>` sem role não aceita `aria-label`. */}
                              <span className="sr-only">
                                , bloqueada, abre quando a anterior for concluída
                              </span>
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
          progressAfter={celebration.progressAfter}
          publicationPending={celebration.publicationPending}
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
