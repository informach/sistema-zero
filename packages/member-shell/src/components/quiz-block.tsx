'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2, Timer, Trophy, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { type ApiError, apiSend } from '../lib/api'
import { cn } from '../lib/cn'
import { renderMarkdown } from '../lib/markdown'
import type { QuizAttemptResultView, QuizBlock, QuizStateView } from '../lib/types'
import { useLessonPlayer } from './lesson-player-context'

interface Props {
  blockId: string
  content: QuizBlock
  /** Estado das tentativas vindo do GET da aula (hidrata score/cooldown). */
  quizState: QuizStateView | null
}

/**
 * Quiz validado NO SERVIDOR: o GET da aula não traz gabarito; o submit devolve
 * score + correções/explicações. Reprovou → cooldown de 5 min com countdown
 * regressivo (espelha o legado). Quiz com `passingScore` bloqueia o "Concluir
 * aula" até aprovar (o gate é do backend — aqui só refletimos o estado).
 */
export function QuizBlockView({ blockId, content, quizState }: Props) {
  const player = useLessonPlayer()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizAttemptResultView | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Cooldown vindo do 429 de corrida (a pré-checagem passou, o save atômico perdeu).
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)

  const questions = content.questions ?? []
  const passed = result?.passed ?? quizState?.passed ?? false
  const lastScore = result?.score ?? quizState?.lastScore ?? null
  const passingScore = result?.passingScore ?? content.passingScore ?? 100
  const retryAvailableAt =
    result?.retryAvailableAt ?? cooldownUntil ?? quizState?.retryAvailableAt ?? null
  const cooldownLeft = useCooldown(passed ? null : retryAvailableAt)

  // Correções por questão (só existem após um submit nesta visita).
  const corrections = useMemo(() => {
    const map = new Map<string, QuizAttemptResultView['questions'][number]>()
    for (const q of result?.questions ?? []) map.set(q.questionId, q)
    return map
  }, [result])

  if (questions.length === 0) return null

  const allAnswered = questions.every((q) => answers[q.id])
  const formDisabled = submitting || passed || cooldownLeft !== null

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

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="sz-display text-base">Teste seus conhecimentos</h3>
        {content.passingScore != null ? (
          <span className="text-xs text-muted-foreground">
            Nota mínima: <span className="sz-display">{passingScore}%</span>
          </span>
        ) : null}
      </div>

      {questions.map((q, qi) => {
        const chosen = answers[q.id]
        const correction = corrections.get(q.id)
        return (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="flex gap-1.5 text-sm font-medium text-foreground">
              <span className="shrink-0">{qi + 1}.</span>
              {/* Enunciado em markdown (negrito/títulos/listas/imagens) — renderer puro/XSS-safe. */}
              <div className="lesson-prose flex-1">{renderMarkdown(q.prompt)}</div>
            </legend>
            {q.choices.map((choice) => {
              const selected = chosen === choice.id
              // Pós-submit: destaca a escolha do aluno (certa/errada) e o gabarito.
              const isCorrectChoice = correction?.correctChoiceIds.includes(choice.id) ?? false
              const showCorrection = correction !== undefined
              return (
                <label
                  key={choice.id}
                  // Visual da referência (LessonExperience): opção elevada sobre o card
                  // (bg-background + shadow-sm) e radio na cor do tema (accent-primary).
                  className={cn(
                    'flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-sm transition-colors',
                    formDisabled ? 'cursor-default' : 'cursor-pointer',
                    selected ? 'border-ring' : 'border-border',
                    !formDisabled && !selected && 'hover:bg-muted/40',
                    showCorrection && isCorrectChoice && 'border-accent dark:border-primary',
                    showCorrection && selected && !isCorrectChoice && 'border-destructive',
                  )}
                >
                  <input
                    type="radio"
                    name={`${blockId}-${q.id}`}
                    value={choice.id}
                    checked={selected}
                    disabled={formDisabled}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: choice.id }))}
                    className="size-4 shrink-0 accent-primary"
                  />
                  {/* Texto da opção em markdown (formatação rica + imagens). */}
                  <div className="lesson-prose flex-1 text-foreground">
                    {renderMarkdown(choice.label)}
                  </div>
                  {showCorrection && isCorrectChoice ? (
                    <CheckCircle2 className="size-4 text-accent dark:text-primary" />
                  ) : null}
                  {showCorrection && selected && !isCorrectChoice ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : null}
                </label>
              )
            })}
            {correction && !correction.correct && correction.explanation ? (
              <div className="lesson-prose rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {renderMarkdown(correction.explanation)}
              </div>
            ) : null}
          </fieldset>
        )
      })}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {passed ? (
        <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
          <Trophy className="size-4" />
          Quiz concluído{lastScore !== null ? ` com ${lastScore}%` : ''}!
        </p>
      ) : cooldownLeft !== null ? (
        <div className="flex flex-col gap-2">
          {lastScore !== null ? (
            <p className="text-sm">
              Você fez <span className="sz-display-grad">{lastScore}%</span>. Para concluir, alcance{' '}
              {passingScore}%.
            </p>
          ) : null}
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="size-4" />
            Você poderá refazer o quiz em {cooldownLeft}.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={!allAnswered || submitting} className="self-start">
            {submitting ? <Spinner /> : null}
            {submitting ? 'Enviando respostas...' : 'Enviar quiz'}
          </Button>
          {lastScore !== null && result === null ? (
            <p className="text-sm text-muted-foreground">
              Última tentativa: <span className="sz-display">{lastScore}%</span>
            </p>
          ) : null}
          {result && !result.passed ? (
            <p className="text-sm">
              Você fez <span className="sz-display-grad">{result.score}%</span>. Para concluir,
              alcance {passingScore}%.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  )
}

/**
 * Countdown MM:SS até `retryAvailableAt` (tick de 1s). `null` = sem cooldown.
 * O primeiro cálculo roda dentro do effect (não no render) — evita divergência
 * de hidratação SSR/client com `Date.now()`.
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
