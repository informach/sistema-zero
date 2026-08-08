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
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseRatingFlow, type RatingViewer } from '@/components/kids/course-rating-flow'
import { useFocusMode } from '@/components/kids/focus-mode'
import { FocusModeToggle } from '@/components/kids/focus-mode-toggle'
import {
  isGuidedCreationActive,
  setGuidedCreationActive,
} from '@/components/kids/guided-creation-session'
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
  // Modo foco: dois botões INDEPENDENTES no header (menu ≥768px, lista de aulas
  // ≥1024px). Ver focus-mode.tsx.
  const { navAvailable, outlineAvailable, outlineCollapsed } = useFocusMode()
  const [completing, setCompleting] = useState(false)
  // O envio ao professor faz router.refresh() e pode remontar a árvore da aula.
  // A intenção guiada vive na memória do módulo até a saída explícita, igual ao
  // estado "Expandir" do StudioBlockView, e é isolada por aula + perfil.
  const guidedIdentity = useMemo(() => ({ lessonId: lesson.id, viewerId }), [lesson.id, viewerId])
  const [guided, setGuided] = useState(() => isGuidedCreationActive(guidedIdentity))
  const canGuide = useMemo(() => lessonSupportsGuided(lesson.blocks), [lesson.blocks])

  const enterGuided = useCallback(() => {
    setGuidedCreationActive(guidedIdentity, true)
    setGuided(true)
  }, [guidedIdentity])

  const exitGuided = useCallback(() => {
    setGuidedCreationActive(guidedIdentity, false)
    setGuided(false)
  }, [guidedIdentity])
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
  // Aula EM PRODUÇÃO: o bloco "em breve" é o único que a criança recebe (o members
  // segura os demais) e a conclusão é recusada com 409 LESSON_COMING_SOON. Espelha o
  // gate aqui p/ o botão já nascer desabilitado, em vez de só falhar no clique.
  const blockedByComingSoon = useMemo(
    () => lesson.blocks.some((b) => b.kind === 'coming_soon'),
    [lesson.blocks],
  )
  const completeBlocked =
    blockedByComingSoon || blockedByQuiz || blockedByStudioNotSubmitted || blockedByStudioNotPassed

  // Com a trava sequencial, uma aula "em breve" prende TODAS as seguintes. O
  // "Próxima" some e a mini-trilha enche de cadeado — sem dizer por quê, a leitura
  // mais natural para uma criança é "eu fiz alguma coisa errada".
  const nextLessonLocked = useMemo(() => {
    const i = flatLessons.findIndex((l) => l.id === lesson.id)
    return i >= 0 && Boolean(flatLessons[i + 1]?.locked)
  }, [flatLessons, lesson.id])

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
  // Festa ADIADA da auto-conclusão (07/2026): a 90% ainda tem vídeo rolando
  // (overlay no meio seria hostil), então guardamos o delta e a celebração
  // completa abre quando o vídeo TERMINA (onVideoEnded). Antes, quem assistia
  // até o fim ganhava só um toast e "perdia a festa" da conclusão manual.
  const deferredCelebrationRef = useRef<{
    progress: CourseProgressView
    gamification: GamificationDelta | null
  } | null>(null)

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
          // Auto-conclusão a ~90% do vídeo: toast discreto agora (com o XP) e
          // a festa completa fica ARMADA para o fim do vídeo.
          deferredCelebrationRef.current = { progress: course.progress, gamification }
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
        } else if (apiErr?.code === 'LESSON_COMING_SOON') {
          // A aula ainda está sendo montada (bloco "em breve").
          if (!opts.silent) {
            toast.error('Essa aula ainda está sendo preparada. Volte daqui a pouquinho!')
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

  const onVideoEnded = useCallback(() => {
    // Fim de verdade do vídeo: se a auto-conclusão armou a festa, abre agora
    // (uma vez). Sem conclusão (gate de quiz/estúdio pendente) não há festa.
    const deferred = deferredCelebrationRef.current
    if (!deferred) return
    deferredCelebrationRef.current = null
    setCelebration(deferred)
  }, [])

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
      onVideoEnded,
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
      onVideoEnded,
      router,
    ],
  )

  // Guiada e normal NÃO coexistem: renderizar os dois montaria o MESMO bloco de estúdio
  // 2× (mesma chave de rascunho no IndexedDB → conflito) e dois players de vídeo. Logo é um
  // OU outro. Alternar remonta o editor, que re-semeia do rascunho LOCAL (sem perda).
  if (guided) {
    return (
      <LessonPlayerProvider value={playerContext}>
        <GuidedCreationMode blocks={lesson.blocks} lessonTitle={lesson.title} onExit={exitGuided} />
      </LessonPlayerProvider>
    )
  }

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
          {/* Header de "lição" (padrão Duolingo): voltar em círculo + progresso do CURSO. */}
          <div className="flex items-center gap-3">
            {/* "Voltar ao CURSO", não "à trilha": desde que a página do curso ganhou
                a própria setinha (que vai à trilha do NÍVEL), a mesma palavra levaria
                a dois lugares em telas seguidas. */}
            <KidsBackButton href={courseHref} label={`Voltar ao curso ${course.title}`} />
            <ProgressBar value={course.progress.percent} className="flex-1" />
            <span className="sz-display text-sm">{course.progress.percent}%</span>
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

          {/* Modo criação guiada: só aparece quando a aula tem VÍDEO + ESTÚDIO. */}
          {canGuide ? (
            <button
              type="button"
              onClick={enterGuided}
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
                {blockedByComingSoon ? (
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
