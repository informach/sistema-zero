'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Tabs } from '@sistemazero/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { JsonImportPanel } from '@/components/admin/json-import-panel'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { parseQuizImport, QUIZ_IMPORT_EXAMPLE } from '@/lib/lesson-block-import'
import type { QuizQuestion } from '@/lib/types'

export interface QuizValue {
  questions: QuizQuestion[]
  passingScore?: number
}

/**
 * Primeiro erro de validação do quiz (ou `null` se ok). Espelha o que o members
 * exige: ≥1 pergunta; por pergunta, prompt, ≥2 opções (com texto) e ≥1 correta.
 */
export function validateQuiz(quiz: QuizValue): string | null {
  if (quiz.questions.length === 0) return 'Adicione ao menos uma pergunta ao quiz.'
  for (const [i, q] of quiz.questions.entries()) {
    const n = i + 1
    if (!q.prompt.trim()) return `Pergunta ${n}: informe o enunciado.`
    if (q.choices.length < 2) return `Pergunta ${n}: adicione ao menos 2 opções.`
    if (q.choices.some((c) => !c.label.trim())) return `Pergunta ${n}: há opção sem texto.`
    if (q.correctChoiceIds.length === 0) return `Pergunta ${n}: marque ao menos 1 opção correta.`
  }
  return null
}

function newChoice(): { id: string; label: string } {
  return { id: crypto.randomUUID(), label: '' }
}

function newQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: '',
    choices: [newChoice(), newChoice()],
    correctChoiceIds: [],
  }
}

/** Form estruturado do bloco quiz — gera o MESMO `QuizBlock` que o textarea de JSON gerava. */
export function QuizBuilder({
  value,
  onChange,
}: {
  value: QuizValue
  onChange: (value: QuizValue) => void
}) {
  const [mode, setMode] = useState<'manual' | 'import'>('manual')

  function patchQuestion(id: string, patch: Partial<QuizQuestion>) {
    onChange({
      ...value,
      questions: value.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    })
  }

  function removeQuestion(id: string) {
    onChange({ ...value, questions: value.questions.filter((q) => q.id !== id) })
  }

  function patchChoice(q: QuizQuestion, choiceId: string, label: string) {
    patchQuestion(q.id, {
      choices: q.choices.map((c) => (c.id === choiceId ? { ...c, label } : c)),
    })
  }

  function toggleCorrect(q: QuizQuestion, choiceId: string) {
    const correct = q.correctChoiceIds.includes(choiceId)
      ? q.correctChoiceIds.filter((id) => id !== choiceId)
      : [...q.correctChoiceIds, choiceId]
    patchQuestion(q.id, { correctChoiceIds: correct })
  }

  function removeChoice(q: QuizQuestion, choiceId: string) {
    patchQuestion(q.id, {
      choices: q.choices.filter((c) => c.id !== choiceId),
      correctChoiceIds: q.correctChoiceIds.filter((id) => id !== choiceId),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={mode}
        onChange={(next) => setMode(next as 'manual' | 'import')}
        items={[
          { value: 'manual', label: 'Manual' },
          { value: 'import', label: 'Importar JSON' },
        ]}
      />

      {mode === 'import' ? (
        <div role="tabpanel" aria-label="Importar quiz por JSON">
          <JsonImportPanel
            parse={parseQuizImport}
            example={QUIZ_IMPORT_EXAMPLE}
            exampleFilename="modelo-quiz.json"
            hasExistingContent={value.questions.length > 0}
            successMessage="Quiz importado. Revise e salve o bloco."
            guide={
              <div className="space-y-2 text-muted-foreground">
                <p>
                  Use JSON em UTF-8. <code>passingScore</code> é opcional; sem ele, o quiz é de
                  fixação. Textos aceitam Markdown.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Cada pergunta precisa de enunciado e ao menos duas alternativas.</li>
                  <li>
                    Marque uma ou mais alternativas com <code>"correct": true</code>.
                  </li>
                  <li>Os IDs internos são gerados automaticamente ao aplicar.</li>
                </ul>
              </div>
            }
            renderPreview={(quiz) => {
              const choices = quiz.questions.reduce(
                (total, question) => total + question.choices.length,
                0,
              )
              return (
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>{quiz.questions.length}</strong> pergunta(s) ·{' '}
                    <strong>{choices}</strong> alternativa(s)
                  </p>
                  <p className="text-muted-foreground">
                    {quiz.passingScore === undefined
                      ? 'Quiz de fixação — não trava a conclusão da aula.'
                      : `Nota de corte: ${quiz.passingScore}%`}
                  </p>
                </div>
              )
            }}
            onApply={(quiz) => {
              onChange(quiz)
              setMode('manual')
            }}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Editar quiz manualmente" className="flex flex-col gap-4">
          <Field
            label="Nota de corte (%)"
            htmlFor="qb-passing"
            hint="Com nota: o aluno precisa aprovar para concluir a aula. Vazio: quiz de fixação (não trava)."
          >
            <Input
              id="qb-passing"
              type="number"
              min={0}
              max={100}
              step={1}
              className="max-w-32"
              value={value.passingScore ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim()
                // Nota de corte é % INTEIRA (o members rejeita decimais — score é inteiro).
                const n = Math.round(Number(raw))
                onChange({
                  ...value,
                  passingScore:
                    raw === '' || Number.isNaN(n) ? undefined : Math.min(100, Math.max(0, n)),
                })
              }}
            />
          </Field>

          {value.questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
              Nenhuma pergunta ainda.
            </p>
          ) : (
            value.questions.map((q, qi) => (
              <div key={q.id} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Pergunta {qi + 1}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Field label="Enunciado" hint="Formatação rica e imagens (negrito, listas, etc.).">
                  <RichTextEditor
                    content={q.prompt}
                    onChange={(markdown) => patchQuestion(q.id, { prompt: markdown })}
                  />
                </Field>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Opções (marque as corretas)
                  </span>
                  {q.choices.map((c) => (
                    <div key={c.id} className="space-y-2 rounded-lg border border-border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={q.correctChoiceIds.includes(c.id)}
                            onChange={() => toggleCorrect(q, c.id)}
                          />
                          Opção correta
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remover opção"
                          disabled={q.choices.length <= 2}
                          onClick={() => removeChoice(q, c.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <RichTextEditor
                        compact
                        content={c.label}
                        onChange={(markdown) => patchChoice(q, c.id, markdown)}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => patchQuestion(q.id, { choices: [...q.choices, newChoice()] })}
                  >
                    <Plus className="size-4" /> Opção
                  </Button>
                </div>

                <Field label="Explicação" hint="Opcional — o aluno vê após responder.">
                  <RichTextEditor
                    compact
                    content={q.explanation ?? ''}
                    onChange={(markdown) =>
                      patchQuestion(q.id, {
                        explanation: markdown.trim() ? markdown : undefined,
                      })
                    }
                  />
                </Field>
              </div>
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => onChange({ ...value, questions: [...value.questions, newQuestion()] })}
          >
            <Plus className="size-4" /> Adicionar pergunta
          </Button>
        </div>
      )}
    </div>
  )
}
