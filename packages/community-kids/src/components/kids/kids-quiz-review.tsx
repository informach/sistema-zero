'use client'

import { renderInline, renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import type { QuizAttemptResultView, QuizQuestion } from '@/lib/types'

/** Correção pós-submit: cartão verde/vermelho por pergunta. */
export function QuizReview({
  questions,
  result,
  answers,
}: {
  questions: QuizQuestion[]
  result: QuizAttemptResultView
  answers: Record<string, string>
}) {
  const corrections = new Map(
    result.questions.map((correction) => [correction.questionId, correction]),
  )
  return (
    <div className="flex flex-col gap-3">
      <p className="sz-display text-muted-foreground text-sm uppercase tracking-wide">Correção</p>
      {questions.map((question, questionIndex) => {
        const correction = corrections.get(question.id)
        if (!correction) return null
        const chosen = answers[question.id]
        return (
          <div
            key={question.id}
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
                <p className="font-bold text-sm [&_img]:my-1 [&_img]:max-h-32 [&_img]:rounded-lg [&_img]:align-middle">
                  {questionIndex + 1}. {renderInline(question.prompt)}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  {question.choices.map((choice) => {
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
                {correction.explanation ? (
                  <div className="mt-2 rounded-xl bg-card px-3 py-2">
                    <p
                      className={cn(
                        'mb-1 font-bold text-xs',
                        correction.correct ? 'text-success-foreground' : 'text-destructive',
                      )}
                    >
                      {correction.correct ? 'Isso! Por quê:' : 'Por quê:'}
                    </p>
                    <div className="lesson-prose text-muted-foreground">
                      {renderMarkdown(correction.explanation)}
                    </div>
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

/** Countdown MM:SS do cooldown, calculado no effect para evitar hidratação divergente. */
export function useQuizCooldown(retryAvailableAt: string | null): string | null {
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
