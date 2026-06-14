'use client'

import { useLessonPlayer } from '@sistemazero/member-shell/components/lesson-player-context'
import { renderInline, renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, Check, Sparkles, Timer, Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { QuizAttemptResultView, QuizBlock, QuizQuestion, QuizStateView } from '@/lib/types'
import { badgeInfo } from './badges'
import { KidsMascot } from './mascot'

interface Props {
  blockId: string
  content: QuizBlock
  /** Estado das tentativas vindo do GET da aula (hidrata score/cooldown). */
  quizState: QuizStateView | null
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/**
 * Quiz estilo Duolingo: intro com mascote → UMA pergunta por vez (segmentos
 * de progresso + cartas de resposta grandes) → correção verde/vermelho no
 * final. A SEMÂNTICA é a mesma do quiz compartilhado (member-shell): o GET da
 * aula não traz gabarito e a nota/correções só chegam na RESPOSTA do submit —
 * por isso o feedback é no fim, nunca por pergunta (grading é server-side).
 * Reprovou → cooldown de 5 min com countdown; `passingScore` segue bloqueando
 * o "Concluir aula" (gate do backend — aqui só refletimos o estado).
 */
export function KidsQuiz({ blockId, content, quizState }: Props) {
  const player = useLessonPlayer()
  const [phase, setPhase] = useState<'intro' | 'steps'>('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizAttemptResultView | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Cooldown vindo do 429 de corrida (a pré-checagem passou, o save atômico perdeu).
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)

  const questions = content.questions ?? []
  const passedBefore = quizState?.passed ?? false
  const passed = result?.passed ?? passedBefore
  const lastScore = result?.score ?? quizState?.lastScore ?? null
  const passingScore = result?.passingScore ?? content.passingScore ?? 100
  const retryAvailableAt =
    result?.retryAvailableAt ?? cooldownUntil ?? quizState?.retryAvailableAt ?? null
  const cooldownLeft = useCooldown(passed ? null : retryAvailableAt)

  if (questions.length === 0) return null

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const body = Object.fromEntries(questions.map((q) => [q.id, [answers[q.id] ?? '']]))
      const res = await apiSend<QuizAttemptResultView>(
        `/api/members/lessons/${encodeURIComponent(player?.lessonId ?? '')}/blocks/${encodeURIComponent(blockId)}/quiz-attempts`,
        'POST',
        { answers: body },
      )
      setResult(res)
      if (res.passed) {
        // Aprovado destrava o "Concluir aula" (gate do backend) → re-render da página.
        player?.refreshAfterQuiz?.()
      }
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.code === 'QUIZ_COOLDOWN') {
        if (apiErr.retryAvailableAt) setCooldownUntil(apiErr.retryAvailableAt)
        setError('Aguarde o tempo de espera para refazer o quiz.')
      } else {
        setError('Não foi possível enviar as respostas. Tente de novo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function retry() {
    setResult(null)
    setAnswers({})
    setStep(0)
    setPhase('intro')
    setCooldownUntil(null)
    setError(null)
  }

  // ── Aprovado (nesta visita ou em tentativa anterior) ────────────────────────
  if (passed) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col items-center gap-3 p-6 text-center [background-image:var(--sz-gradient)] text-(--sz-primary-fg)">
          <span className="grid place-items-center rounded-full bg-card p-3">
            <KidsMascot
              expression="celebrating"
              className={cn('size-16', result && 'kid-wiggle')}
            />
          </span>
          <p className="sz-display inline-flex items-center gap-2 text-2xl">
            <Trophy className="size-6" />
            Quiz concluído{lastScore !== null ? ` com ${lastScore}%` : ''}!
          </p>
          {result ? <p className="text-sm opacity-90">Mandou bem demais!</p> : null}
          {/* Recompensas REAIS do backend (vêm na resposta do submit aprovado). */}
          {result?.gamification ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {result.gamification.xpAwarded > 0 ? (
                <span className="kid-pop inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-1.5 font-bold text-foreground text-sm [font-family:var(--font-display)]">
                  <Sparkles className="size-4 text-primary" />+{result.gamification.xpAwarded} XP
                </span>
              ) : null}
              {result.gamification.badgesUnlocked.map((b) => {
                const info = badgeInfo(b.slug)
                if (!info) return null
                const Icon = info.icon
                return (
                  <span
                    key={b.slug}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-1.5 font-bold text-foreground text-sm [font-family:var(--font-display)]"
                  >
                    <Icon className="size-4 text-primary" />
                    {info.title}!
                  </span>
                )
              })}
            </div>
          ) : null}
        </Card>
        {result ? <QuizReview questions={questions} result={result} answers={answers} /> : null}
      </div>
    )
  }

  // ── Reprovado NESTA visita: nota + correção + retry/cooldown ───────────────
  if (result) {
    return (
      <Card className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex items-center gap-4">
          <KidsMascot expression="thinking" className="size-16" />
          <div>
            <p className="sz-display text-xl">Quase lá!</p>
            <p className="mt-0.5 text-sm">
              Você fez <span className="sz-display-grad">{result.score}%</span> — precisa de{' '}
              {passingScore}% para passar.
            </p>
          </div>
        </div>
        <QuizReview questions={questions} result={result} answers={answers} />
        {cooldownLeft !== null ? (
          <p className="inline-flex items-center gap-2 text-muted-foreground text-sm">
            <Timer className="size-4" />
            Você pode tentar de novo em {cooldownLeft}.
          </p>
        ) : (
          <button type="button" onClick={retry} className="sz-btn-gradient h-11 self-start px-6">
            Tentar de novo!
          </button>
        )}
      </Card>
    )
  }

  // ── Cooldown hidratado do GET (reprovou em visita anterior) ────────────────
  if (cooldownLeft !== null) {
    return (
      <Card className="flex items-center gap-4 p-5 md:p-6">
        <KidsMascot expression="sleeping" className="size-16 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="sz-display text-lg">Pausa rápida!</p>
          {lastScore !== null ? (
            <p className="text-sm">
              Você fez <span className="sz-display-grad">{lastScore}%</span> — precisa de{' '}
              {passingScore}% para passar.
            </p>
          ) : null}
          <p className="inline-flex items-center gap-2 text-muted-foreground text-sm">
            <Timer className="size-4" />
            Você pode tentar de novo em {cooldownLeft}.
          </p>
        </div>
      </Card>
    )
  }

  // ── Intro: mascote + chips de info + COMEÇAR ───────────────────────────────
  if (phase === 'intro') {
    return (
      <Card className="flex flex-col items-center gap-4 p-6 text-center md:p-8">
        <KidsMascot expression="thinking" className="size-20" />
        <div>
          <h3 className="sz-display text-2xl">Hora do desafio!</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Mostre o que você aprendeu nesta aula.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border-2 border-border px-3 py-1 font-bold text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}
          </span>
          <span className="rounded-full border-2 border-border px-3 py-1 font-bold text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            {content.passingScore != null ? `Nota mínima ${passingScore}%` : 'Só para treinar'}
          </span>
        </div>
        {lastScore !== null ? (
          <p className="text-muted-foreground text-xs">
            Última tentativa: <span className="sz-display">{lastScore}%</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setPhase('steps')}
          className="sz-btn-gradient h-12 px-8 text-base"
        >
          Começar!
        </button>
      </Card>
    )
  }

  // ── Wizard: uma pergunta por vez ───────────────────────────────────────────
  const question = questions[step] as QuizQuestion
  const chosen = answers[question.id]
  const isLast = step === questions.length - 1

  return (
    <Card className="flex flex-col gap-5 p-5 md:p-6">
      {/* Segmentos de progresso (um por pergunta, estilo Duolingo). */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              i < step && 'bg-(--kids-lime)',
              i === step && '[background-image:var(--sz-gradient)]',
              i > step && 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Pergunta {step + 1} de {questions.length}
      </p>

      {/* Enunciado em markdown (negrito/títulos/listas/imagens); sz-display dá a fonte da marca. */}
      <div className="lesson-prose sz-display text-lg md:text-xl">
        {renderMarkdown(question.prompt)}
      </div>

      <div role="radiogroup" aria-label={question.prompt} className="flex flex-col gap-3">
        {question.choices.map((choice, ci) => {
          const selected = chosen === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={submitting}
              onClick={() => setAnswers((a) => ({ ...a, [question.id]: choice.id }))}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold text-base transition-all',
                selected
                  ? 'border-primary bg-(--kids-cyan-tint) text-primary shadow-[0_4px_0_color-mix(in_oklch,var(--primary)_45%,transparent)]'
                  : 'border-border bg-card shadow-[0_4px_0_var(--border)] hover:border-ring/60 active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]',
              )}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-xl border-2 font-bold text-sm [font-family:var(--font-display)]',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {CHOICE_LETTERS[ci] ?? '•'}
              </span>
              {/* Opção: markdown INLINE (negrito/itálico/código/imagens) — o <button>
                  só aceita conteúdo inline; `plainLinks` evita aninhar <a> num <button>. */}
              <span className="flex-1 [&_img]:my-1 [&_img]:max-h-40 [&_img]:rounded-lg [&_img]:align-middle">
                {renderInline(choice.label, { plainLinks: true })}
              </span>
              {selected ? <Check className="size-5 shrink-0" strokeWidth={3} /> : null}
            </button>
          )
        })}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-5 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!chosen || submitting}
          onClick={() => (isLast ? void submit() : setStep((s) => s + 1))}
          className="sz-btn-gradient h-11 px-7 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? <Spinner /> : null}
          {isLast ? 'Responder!' : 'Próxima'}
        </button>
      </div>
    </Card>
  )
}

/** Correção pós-submit: cartão verde/vermelho por pergunta (estilo Duolingo). */
function QuizReview({
  questions,
  result,
  answers,
}: {
  questions: QuizQuestion[]
  result: QuizAttemptResultView
  answers: Record<string, string>
}) {
  const corrections = new Map(result.questions.map((c) => [c.questionId, c]))
  return (
    <div className="flex flex-col gap-3">
      <p className="sz-display text-muted-foreground text-sm uppercase tracking-wide">Correção</p>
      {questions.map((q, qi) => {
        const correction = corrections.get(q.id)
        if (!correction) return null
        const chosen = answers[q.id]
        return (
          <div
            key={q.id}
            className={cn(
              'rounded-2xl border-2 p-4',
              correction.correct
                ? 'border-(--kids-lime) bg-(--kids-lime-tint)'
                : 'border-destructive bg-destructive/10',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white',
                  correction.correct ? 'bg-(--kids-lime)' : 'bg-destructive',
                )}
              >
                {correction.correct ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <X className="size-4" strokeWidth={3} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {/* Recap compacto: markdown inline (preserva o text-sm do cartão de correção). */}
                <p className="font-bold text-sm [&_img]:my-1 [&_img]:max-h-32 [&_img]:rounded-lg [&_img]:align-middle">
                  {qi + 1}. {renderInline(q.prompt)}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  {q.choices.map((choice) => {
                    const isCorrect = correction.correctChoiceIds.includes(choice.id)
                    const isChosen = chosen === choice.id
                    if (!isCorrect && !isChosen) return null
                    return (
                      <p
                        key={choice.id}
                        className={cn(
                          'flex items-center gap-1.5 [&_img]:max-h-24 [&_img]:rounded-lg [&_img]:align-middle',
                          isCorrect
                            ? 'font-semibold text-success-foreground'
                            : 'text-destructive line-through',
                        )}
                      >
                        {isCorrect ? (
                          <Check className="size-3.5 shrink-0" strokeWidth={3} />
                        ) : (
                          <X className="size-3.5 shrink-0" strokeWidth={3} />
                        )}
                        {renderInline(choice.label)}
                      </p>
                    )
                  })}
                </div>
                {!correction.correct && correction.explanation ? (
                  <div className="lesson-prose mt-2 rounded-xl bg-card px-3 py-2 text-muted-foreground">
                    {renderMarkdown(correction.explanation)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Countdown MM:SS até `retryAvailableAt` (tick de 1s) — espelha o
 * member-shell/quiz-block. O primeiro cálculo roda dentro do effect (não no
 * render) — evita divergência de hidratação SSR/client com `Date.now()`.
 */
function useCooldown(retryAvailableAt: string | null): string | null {
  const [left, setLeft] = useState<string | null>(null)

  useEffect(() => {
    if (!retryAvailableAt) {
      setLeft(null)
      return
    }
    const target = new Date(retryAvailableAt).getTime()
    const tick = () => {
      const ms = target - Date.now()
      setLeft(ms > 0 ? formatCountdown(ms) : null)
    }
    tick()
    const interval = setInterval(tick, 1_000)
    return () => clearInterval(interval)
  }, [retryAvailableAt])

  return left
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1_000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
