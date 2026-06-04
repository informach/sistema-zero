'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import type { QuizBlock } from '@/lib/types'

/**
 * Quiz interativo client-side: o aluno marca as respostas e confere o gabarito
 * localmente (o members não tem endpoint de submissão de quiz nesta fase — a
 * conclusão da aula continua sendo o botão "Concluir aula").
 */
export function QuizBlockView({ content }: { content: QuizBlock }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const questions = content.questions ?? []
  if (questions.length === 0) return null

  const correctCount = questions.filter((q) =>
    q.correctChoiceIds.includes(answers[q.id] ?? ''),
  ).length
  const allAnswered = questions.every((q) => answers[q.id])

  return (
    <Card className="flex flex-col gap-5 p-5">
      <h3 className="sz-display text-base">Teste seus conhecimentos</h3>
      {questions.map((q, qi) => {
        const chosen = answers[q.id]
        const correct = checked && q.correctChoiceIds.includes(chosen ?? '')
        return (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="text-sm font-medium">
              {qi + 1}. {q.prompt}
            </legend>
            {q.choices.map((choice) => {
              const selected = chosen === choice.id
              const isCorrectChoice = q.correctChoiceIds.includes(choice.id)
              return (
                <label
                  key={choice.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    selected ? 'border-ring bg-muted/60' : 'border-border hover:bg-muted/40',
                    checked && selected && isCorrectChoice && 'border-accent dark:border-primary',
                    checked && selected && !isCorrectChoice && 'border-destructive',
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={choice.id}
                    checked={selected}
                    disabled={checked}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: choice.id }))}
                    className="accent-current"
                  />
                  <span className="flex-1">{choice.text}</span>
                  {checked && selected ? (
                    isCorrectChoice ? (
                      <CheckCircle2 className="size-4 text-accent dark:text-primary" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )
                  ) : null}
                </label>
              )
            })}
            {checked && !correct && q.explanation ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {q.explanation}
              </p>
            ) : null}
          </fieldset>
        )
      })}
      {checked ? (
        <div className="flex items-center justify-between">
          <p className="text-sm">
            Você acertou <span className="sz-display-grad">{correctCount}</span> de{' '}
            {questions.length}.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setChecked(false)
              setAnswers({})
            }}
          >
            Tentar de novo
          </Button>
        </div>
      ) : (
        <Button onClick={() => setChecked(true)} disabled={!allAnswered} className="self-start">
          Verificar respostas
        </Button>
      )}
    </Card>
  )
}
