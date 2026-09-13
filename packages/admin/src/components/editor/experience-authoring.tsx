'use client'

import {
  EXPLORATION_DEFINITIONS,
  type ExplorationActivity,
  experienceScript,
  isExperienceScript,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { demonstrationActionChoices, ExperienceActionEditor } from './experience-action-editor'

export function ExperienceAuthoring({
  activity,
  onChange,
}: {
  activity: ExplorationActivity
  onChange: (activity: ExplorationActivity) => void
}) {
  const id = useId()
  const [raw, setRaw] = useState('')
  const [error, setError] = useState('')
  const script = experienceScript(activity)
  const supportsComparison = ['gravity', 'impulse', 'hitbox', 'jump-sound'].includes(
    activity.mission,
  )
  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      {activity.version === 3 && (
        <>
          <label className="block space-y-2 text-sm font-medium" htmlFor={`${id}-mode`}>
            <span>O que o aluno fará neste bloco</span>
            <Select
              id={`${id}-mode`}
              value={activity.mode ?? 'explore'}
              onChange={(e) =>
                onChange({
                  ...activity,
                  mode: e.target.value === 'demonstrate' ? 'demonstrate' : 'explore',
                })
              }
            >
              <option value="explore">Experimentação: investigar uma missão</option>
              <option value="demonstrate">Demonstração: observar um roteiro</option>
            </Select>
          </label>
          <p className="text-xs text-muted-foreground">
            Demonstrações permitem observar, pausar e rever. Experimentações liberam somente os
            controles da missão e terminam no objetivo proposto. O professor escolhe cada bloco
            separadamente.
          </p>
          {activity.mode === 'demonstrate' && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Roteiro executável · {script.length} etapas</p>
                {script.map((step, index) => (
                  <div
                    key={step.id}
                    className="space-y-2 rounded-xl border border-border bg-background p-3"
                  >
                    <label className="block text-xs font-medium" htmlFor={`${id}-step-${index}`}>
                      Fala da etapa {index + 1}
                    </label>
                    <Textarea
                      id={`${id}-step-${index}`}
                      rows={2}
                      maxLength={500}
                      value={step.caption}
                      onChange={(e) =>
                        onChange({
                          ...activity,
                          demonstration: script.map((s, i) =>
                            i === index ? { ...s, caption: e.target.value } : s,
                          ),
                        })
                      }
                    />
                    <Select
                      aria-label={`Destaque da etapa ${index + 1}`}
                      value={step.highlight ?? 'scene'}
                      onChange={(e) =>
                        onChange({
                          ...activity,
                          demonstration: script.map((s, i) =>
                            i === index
                              ? {
                                  ...s,
                                  highlight:
                                    e.target.value === 'tools'
                                      ? 'tools'
                                      : e.target.value === 'compare'
                                        ? 'compare'
                                        : 'scene',
                                }
                              : s,
                          ),
                        })
                      }
                    >
                      <option value="scene">Palco</option>
                      <option value="tools">Controles</option>
                      {(supportsComparison || step.highlight === 'compare') && (
                        <option value="compare" disabled={!supportsComparison}>
                          Comparação
                        </option>
                      )}
                    </Select>
                    {!supportsComparison && step.highlight === 'compare' && (
                      <p role="alert" className="text-xs text-destructive">
                        Esta cena não oferece comparação lado a lado. Escolha Palco ou Controles.
                      </p>
                    )}
                    <details className="rounded-lg border border-border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Ações da cena · {step.actions.length}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <ExperienceActionEditor
                          mission={activity.mission}
                          value={step.actions}
                          stepNumber={index + 1}
                          onChange={(actions) =>
                            onChange({
                              ...activity,
                              demonstration: script.map((s, i) =>
                                i === index ? { ...s, actions } : s,
                              ),
                            })
                          }
                        />
                        <label className="block space-y-1 text-xs">
                          Descoberta a acompanhar antes de avançar
                          <Select
                            value={step.waitFor ?? ''}
                            onChange={(e) =>
                              onChange({
                                ...activity,
                                demonstration: script.map((s, i) =>
                                  i === index ? { ...s, waitFor: e.target.value || undefined } : s,
                                ),
                              })
                            }
                          >
                            <option value="">Concluir as ações desta etapa</option>
                            {EXPLORATION_DEFINITIONS[activity.mission].goals.map((goal) => (
                              <option key={goal.id} value={goal.id}>
                                {goal.label}
                              </option>
                            ))}
                          </Select>
                        </label>
                      </div>
                    </details>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...script]
                          ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                          onChange({ ...activity, demonstration: next })
                        }}
                      >
                        Subir etapa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === script.length - 1}
                        onClick={() => {
                          const next = [...script]
                          ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                          onChange({ ...activity, demonstration: next })
                        }}
                      >
                        Descer etapa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={script.length <= 1}
                        onClick={() =>
                          onChange({
                            ...activity,
                            demonstration: script.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remover etapa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                disabled={script.length >= 12}
                onClick={() => {
                  const action = demonstrationActionChoices(activity.mission)[0]?.value
                  if (action)
                    onChange({
                      ...activity,
                      demonstration: [
                        ...script,
                        {
                          id: crypto.randomUUID(),
                          caption: 'Observe o que acontece.',
                          highlight: 'scene',
                          actions: [{ ...action }],
                        },
                      ],
                    })
                }}
              >
                Adicionar etapa ao roteiro
              </Button>
              {!isExperienceScript(script, activity.mission, activity.initialImpulse) && (
                <p role="alert" className="text-sm text-destructive">
                  Revise o roteiro: cada etapa precisa de fala e ações válidas. Uma descoberta
                  exigida precisa acontecer até a última ação de observação dessa etapa.
                </p>
              )}
              <details
                onToggle={(e) => {
                  if (e.currentTarget.open) setRaw(JSON.stringify(script, null, 2))
                }}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Importar ou editar roteiro em JSON
                </summary>
                <p className="my-2 text-xs text-muted-foreground">
                  Até 12 etapas; cada etapa tem fala, destaque e até 16 ações válidas da missão.
                  Tempos de observação entre 0,001 e 10 segundos. O ensaio executa estas mesmas
                  ações.
                </p>
                <Textarea
                  aria-label="Ações do roteiro em JSON"
                  rows={12}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="font-mono text-xs"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      try {
                        const parsed: unknown = JSON.parse(raw)
                        if (
                          !isExperienceScript(parsed, activity.mission, activity.initialImpulse)
                        ) {
                          setError(
                            'Revise as etapas: há uma fala, destaque ou ação inválida para esta missão.',
                          )
                          return
                        }
                        onChange({ ...activity, demonstration: parsed })
                        setError('')
                      } catch {
                        setError('O roteiro precisa ser um JSON válido.')
                      }
                    }}
                  >
                    Aplicar roteiro
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onChange({ ...activity, demonstration: undefined })
                      setError('')
                      setRaw(
                        JSON.stringify(
                          experienceScript({ ...activity, demonstration: undefined }),
                          null,
                          2,
                        ),
                      )
                    }}
                  >
                    Restaurar exemplo original
                  </Button>
                </div>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </details>
            </>
          )}
        </>
      )}
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Compatibilidade com atividades anteriores
        </summary>{' '}
        <label className="block space-y-2 text-sm font-medium" htmlFor={`${id}-version`}>
          <span>Motor da experiência</span>
          <Select
            id={`${id}-version`}
            value={activity.version}
            onChange={(e) =>
              onChange(
                e.target.value === '3'
                  ? { ...activity, version: 3, mode: 'explore' }
                  : {
                      type: 'exploration',
                      version: 2,
                      mission: activity.mission,
                      initialImpulse: activity.initialImpulse,
                      instructionAudioUrl: activity.instructionAudioUrl,
                    },
              )
            }
          >
            <option value="3">v3 · laboratório, exemplo executável e comparação</option>
            <option value="2">v2 · exploração anterior</option>
          </Select>
        </label>
      </details>
    </div>
  )
}
