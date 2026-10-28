'use client'

import { validatePredictionQuiz } from '@sistemazero/core/learning'
import {
  falaDaExplicacaoDoQuiz,
  falaDaPerguntaDoQuiz,
  type QuizQuestionSpeech,
  type ZappySpeechOverride,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Tabs } from '@sistemazero/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { JsonImportPanel } from '@/components/admin/json-import-panel'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { ZappySpeechEditor, type ZappySpeechRow } from '@/components/editor/zappy-speech-editor'
import type { QuizValue } from '@/lib/lesson-block-form'
import { parseQuizImport, QUIZ_IMPORT_EXAMPLE } from '@/lib/lesson-block-import'
import type { QuizQuestion } from '@/lib/types'

type QuizSpeechSlot = keyof QuizQuestionSpeech

/** Ajuste vazio não viaja: `{}` e `{ question: undefined }` viram ausência. */
function semAjusteVazio(speech: QuizQuestionSpeech): QuizQuestionSpeech | undefined {
  const limpo = Object.fromEntries(Object.entries(speech).filter(([, v]) => v !== undefined))
  return Object.keys(limpo).length ? limpo : undefined
}

/** As falas da questão que o painel "Como o Zappy fala" mostra: pergunta e explicação. */
function linhasDaFala(q: QuizQuestion): ZappySpeechRow[] {
  const linhas: ZappySpeechRow[] = []
  const pergunta = falaDaPerguntaDoQuiz(q)
  if (pergunta)
    linhas.push({
      id: 'question',
      label: 'Pergunta e alternativas',
      visibleText: pergunta,
      override: q.zappySpeech?.question,
    })
  const explicacao = q.explanation ? falaDaExplicacaoDoQuiz(q.explanation) : ''
  if (explicacao)
    linhas.push({
      id: 'explanation',
      label: 'Explicação',
      visibleText: explicacao,
      override: q.zappySpeech?.explanation,
    })
  return linhas
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

  function patchSpeech(q: QuizQuestion, slot: QuizSpeechSlot, override?: ZappySpeechOverride) {
    patchQuestion(q.id, { zappySpeech: semAjusteVazio({ ...q.zappySpeech, [slot]: override }) })
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
      : q.predictionScene
        ? [choiceId]
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
                      ? 'Quiz de fixação: não trava a conclusão da aula.'
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
          {validatePredictionQuiz(value.questions) && (
            <p role="alert" className="text-sm text-destructive">
              {validatePredictionQuiz(value.questions)}
            </p>
          )}
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
                <Field
                  label="Demonstração da previsão"
                  htmlFor={`prediction-${q.id}`}
                  hint="Para usar Ver o que acontece, escolha uma cena em todas as perguntas e uma única alternativa correta em cada uma."
                >
                  <Select
                    id={`prediction-${q.id}`}
                    value={q.predictionScene ?? ''}
                    onChange={(e) =>
                      patchQuestion(q.id, {
                        predictionScene: (e.target.value ||
                          undefined) as QuizQuestion['predictionScene'],
                      })
                    }
                  >
                    <option value="">Sem demonstração (quiz comum)</option>
                    <option value="garden-touch">Jardim: toque nas pedras</option>
                    <option value="garden-count">Jardim: vazio e novo achado</option>
                    <option value="garden-repeat">Jardim: toque repetido</option>
                    <option value="lighthouse-order">Farol: ordem dos comandos</option>
                    <option value="lighthouse-memory">Farol: memória da coleta</option>
                    <option value="lighthouse-door">Farol: resposta da porta</option>
                    <option value="lighthouse-retest">Farol: nova partida</option>
                    <option value="island-view">Ilha: ponto de vista</option>
                    <option value="island-position">Ilha: posição</option>
                    <option value="island-height">Ilha: altura</option>
                    <option value="island-retest">Ilha: novo teste</option>
                    <option value="jardim-memory">Jardim: memória da coleta</option>
                    <option value="jardim-view">Jardim: ponto de vista</option>
                    <option value="jardim-height">Jardim: altura e contato</option>
                  </Select>
                </Field>
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

                <Field label="Explicação" hint="Opcional. O aluno vê depois de responder.">
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

                {/* A criança pode OUVIR a pergunta, as alternativas ("Letra A: …") e a explicação
                    na voz do Zappy. O painel só existe para acertar uma pronúncia; quem grava a
                    aula inteira é o botão "Gerar a voz do Zappy". */}
                {q.prompt.trim() ? (
                  <details className="rounded-lg border border-border p-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Voz do Zappy (pronúncia)
                    </summary>
                    <div className="mt-2">
                      <ZappySpeechEditor
                        rows={linhasDaFala(q)}
                        onChange={(slot, override) =>
                          patchSpeech(q, slot as QuizSpeechSlot, override)
                        }
                        onPreviewVoice={(slot, override, novasVozes) =>
                          onChange({
                            ...value,
                            vozes: { ...value.vozes, ...novasVozes },
                            questions: value.questions.map((atual) =>
                              atual.id === q.id
                                ? {
                                    ...atual,
                                    zappySpeech: semAjusteVazio({
                                      ...atual.zappySpeech,
                                      [slot]: override,
                                    }),
                                  }
                                : atual,
                            ),
                          })
                        }
                      />
                    </div>
                  </details>
                ) : null}
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
