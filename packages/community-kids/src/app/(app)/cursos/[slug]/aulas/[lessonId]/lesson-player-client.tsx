'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { Spinner } from '@sistemazero/ui/spinner'
import { Check, CheckCircle2, Lock, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseRatingFlow, type RatingViewer } from '@/components/kids/course-rating-flow'
import { useFocusMode } from '@/components/kids/focus-mode'
import { KidsLessonBlocks } from '@/components/kids/kids-lesson-blocks'
import { KidsLessonProgress } from '@/components/kids/kids-lesson-progress'
import { LessonActionEvidence } from '@/components/kids/lesson-action-evidence'
import { LessonCelebration } from '@/components/kids/lesson-celebration'
import { KidsMascotAnimated, prefetchZappyRive } from '@/components/kids/mascot-rive'
import { visibleModules } from '@/components/kids/trail-layout'
import { UNIT_THEME_CLASS, unitThemeAt } from '@/components/kids/unit-theme'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { PosicaoNaAula } from '@/lib/lesson-progress'
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
  nextLessonHref,
  viewerWatermark,
  viewerId,
  ratingViewer,
  shareUrl,
}: Props) {
  const router = useRouter()
  const learning = useLessonLearning(lesson, viewerId)

  // A aula termina em festa, e a festa é o Zappy animado. O runtime do Rive são
  // ~676 KB: baixá-los no clique de "Concluir" atrasaria justo o quadro que a
  // criança esperou a aula inteira para ver. Puxamos ocioso, agora que ela acabou
  // de entrar e vai passar minutos aqui. Best-effort — falhar só devolve o WebP.
  useEffect(() => {
    prefetchZappyRive()
  }, [])

  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const missing = (reason: string) => requirements.some((r) => !r.complete && r.reason === reason)
  const blockedByLearning =
    missing('LEARNING_GATE_INCOMPLETE') || missing('SECTION_GATE_INCOMPLETE')
  const blockedByPinta = missing('PINTA_GATE_NOT_SUBMITTED')

  const { outlineCollapsed, toggleOutline } = useFocusMode()
  // Onde a criança está no percurso. Quem sabe é o `LessonSections` (o índice muda no
  // CLIENTE ao avançar de seção); a barra do topo mora aqui, acima dele.
  const [secao, setSecao] = useState<PosicaoNaAula | null>(null)
  // Bail-out por VALOR: o player avisa com um objeto NOVO a cada vez, e devolver o
  // anterior quando os números não mudaram faz o React abortar o re-render. É a 2ª
  // rede contra o laço (a 1ª é o callback viver num ref lá dentro).
  const aoTrocarSecao = useCallback((p: PosicaoNaAula) => {
    setSecao((antes) => (antes && antes.index === p.index && antes.total === p.total ? antes : p))
  }, [])
  // Primeiro quadro: o servidor já resolveu em que seção a criança entra, então a
  // barra nasce certa em vez de piscar em "Seção 1". O aviso do player chega no efeito
  // seguinte e manda dali em diante.
  const posicaoInicial = useMemo<PosicaoNaAula | null>(() => {
    const lista = lesson.sections ?? []
    if (lista.length === 0) return null
    const i = lista.findIndex((s) => s.id === lesson.learningProgress?.sectionId)
    return { index: i >= 0 ? i : 0, total: lista.length }
  }, [lesson.sections, lesson.learningProgress?.sectionId])
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

  // Numeração global da aula nos círculos da mini-trilha.
  const flatLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules])
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
      showActivityRequirement: false,
      viewerWatermark,
      viewerId,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      refreshAfterLearning: () => router.refresh(),
      refreshAfterQuiz: () => router.refresh(),
      refreshAfterStudio: () => router.refresh(),
      renderActionEvidence: (result) => <LessonActionEvidence result={result} />,
      renderInstruction: (text, pose = 'speaking', speech) => (
        <DialogueBlockView
          content={{ kind: 'dialogue', text, pose }}
          speech={speech}
          mascot={
            /* Mudo pelo mesmo motivo do bloco `dialogue` (ver kids-lesson-blocks):
               instrução de seção é estado, e há uma por seção. */
            <KidsMascotAnimated expression={pose} className="size-16 sm:size-20" sound={false} />
          }
        />
      ),
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
    <span className="inline-flex items-center gap-2 font-extrabold text-[0.9375rem]">
      <CheckCircle2 className="size-5 text-(--success-foreground)" aria-hidden />
      Aula concluída
    </span>
  ) : (
    <button
      type="button"
      onClick={() => complete()}
      disabled={completing || completeBlocked}
      className="sz-btn-gradient h-12 gap-2 px-7 text-base disabled:cursor-not-allowed disabled:opacity-55"
    >
      {completing ? <Spinner /> : <CheckCircle2 className="size-5" aria-hidden />}
      Concluir aula
    </button>
  )
  const completionMessage = lesson.completed ? null : blockedByLearning ? (
    <p>Termine as atividades essenciais das seções para concluir a aula.</p>
  ) : blockedByPinta ? (
    <p>Envie seu desenho ao professor para concluir a aula.</p>
  ) : blockedByComingSoon ? (
    <p>
      Essa aula ainda está sendo preparada.
      {nextLessonLocked ? ' Quando ela ficar pronta, você termina e as próximas abrem.' : ''}
    </p>
  ) : blockedByQuiz ? (
    <p>Passe no quiz da aula para poder concluí-la.</p>
  ) : blockedByStudioNotSubmitted ? (
    <p>Envie o projeto do Estúdio para poder concluir a aula.</p>
  ) : blockedByStudioNotPassed ? (
    <p>Atinja a nota mínima do Estúdio para poder concluir a aula.</p>
  ) : null

  return (
    <LessonPlayerProvider value={playerContext}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
        {/* Conteúdo principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Navegação mínima da aula: retorno, progresso real e controles dos menus.
              O progresso do curso continua na trilha e na lista de aulas. */}
          <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 md:gap-4">
            {/* "Voltar ao CURSO", não "à trilha": desde que a página do curso ganhou
                a própria setinha (que vai à trilha do NÍVEL), a mesma palavra levaria
                a dois lugares em telas seguidas. */}
            <KidsBackButton href={courseHref} label={`Voltar ao curso ${course.title}`} />
            <KidsLessonProgress
              progress={lesson.sectionProgress}
              posicao={secao ?? posicaoInicial}
              // Aula "em breve" não tem atividade: o members serve SÓ o recado, e o
              // único requisito pendente é o próprio bloco. Medi-lo faria a barra
              // dizer "0 de 1 atividade" para algo que a criança não pode fazer.
              atividades={blockedByComingSoon ? [] : requirements}
            />
          </div>

          <LessonSections
            key={`${viewerId}:${lesson.id}`}
            lesson={lesson}
            kids
            lessonTitle={lesson.title}
            immersive
            completionAction={completionAction}
            completionMessage={completionMessage}
            onSectionChange={aoTrocarSecao}
            renderBlocks={(blocks) => <KidsLessonBlocks blocks={blocks} />}
          />
        </div>

        {/* Mini-trilha do curso: no desktop, lateral contínua junto à borda;
            no celular, gaveta sobre a aula. */}
        <button
          type="button"
          onClick={toggleOutline}
          aria-label="Fechar lista de aulas"
          aria-hidden={outlineCollapsed}
          inert={outlineCollapsed}
          className={cn(
            'fixed inset-0 z-[60] bg-foreground/25 transition-opacity duration-300 motion-reduce:transition-none lg:hidden',
            outlineCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        />
        <aside
          id="kids-lesson-outline"
          aria-hidden={outlineCollapsed || undefined}
          inert={outlineCollapsed}
          className={cn(
            'fixed inset-y-0 right-0 z-[61] flex w-(--lesson-outline-width) flex-col overflow-hidden border-border border-l bg-card transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:z-40',
            outlineCollapsed ? 'pointer-events-none translate-x-full' : 'translate-x-0',
          )}
        >
          <button
            type="button"
            onClick={toggleOutline}
            aria-label="Fechar lista de aulas"
            className="ml-auto flex size-11 items-center justify-center lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-(--borda-carta) bg-card lg:rounded-none lg:border-0">
            {/* O índice lateral mantém o progresso geral do curso, compacto. */}
            <div className="px-5 pt-5 pb-3">
              <p className="sz-display text-lg leading-tight">{course.title}</p>
              <CourseRatingFlow
                courseSlug={course.slug}
                initialRating={course.myRating}
                shareUrl={shareUrl}
                viewer={ratingViewer}
              />
              <div className="mt-3.5 flex items-center justify-between font-semibold text-muted-foreground text-xs">
                <span>Progresso do curso</span>
                <span className="font-extrabold">{course.progress.percent}%</span>
              </div>
              <div
                className="sz-progress mt-1.5"
                role="progressbar"
                aria-label="Progresso do curso"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={course.progress.percent}
              >
                <span style={{ width: `${course.progress.percent}%` }} />
              </div>
            </div>
            <nav className="scrollbar-subtle max-h-[28rem] overflow-y-auto px-3 pb-4 lg:max-h-none lg:min-h-0 lg:flex-1">
              {modules.map((module, moduleIndex) => (
                <div key={module.id} className={UNIT_THEME_CLASS[unitThemeAt(moduleIndex)]}>
                  <p
                    className="px-2 pt-3 pb-1.5 font-extrabold text-[0.6875rem] uppercase tracking-[0.12em]"
                    // A cor da unidade como tinta miúda reprova AA; puxada para o texto do
                    // tema, mantém o matiz e passa (a régua do chip de etiqueta).
                    style={{ color: 'color-mix(in oklab, var(--unit) 62%, var(--foreground))' }}
                  >
                    {module.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {module.lessons.map((item, lessonIndex) => {
                      const active = item.id === lesson.id
                      const number = (moduleStartIndexes[moduleIndex] ?? 0) + lessonIndex + 1
                      const numberBadge = (
                        <span
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full font-extrabold text-[0.6875rem] tabular-nums',
                            item.completed
                              ? '[background-color:var(--unit-bg)] text-(--unit-fg)'
                              : 'bg-muted text-muted-foreground',
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
                              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 font-semibold text-muted-foreground text-sm opacity-70"
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
                              'flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-2 font-semibold text-sm transition-colors',
                              // A aula de agora: o creme com o traço laranja à esquerda, como
                              // nas telas-modelo. O traço é sombra INTERNA (não mexe no layout).
                              active
                                ? 'bg-(--band-creme) text-(--tinta) shadow-[inset_3px_0_0_var(--sz-kids-laranja-texto)]'
                                : 'text-(--tinta) hover:bg-muted',
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
          </div>
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
