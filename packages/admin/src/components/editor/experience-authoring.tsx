'use client'

import {
  type ExplorationActivity,
  experienceScript,
  isExperienceScript,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'

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
                      <option value="compare">Comparação</option>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {step.actions
                        .map((a) => (a.type === 'advance' ? `observar ${a.seconds}s` : a.type))
                        .join(' → ')}
                    </p>
                  </div>
                ))}
              </div>
              <details
                onToggle={(e) => {
                  if (e.currentTarget.open) setRaw(JSON.stringify(script, null, 2))
                }}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Editar ações e ordem do roteiro
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
