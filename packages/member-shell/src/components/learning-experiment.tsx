'use client'

import type { ExperimentActivity, LearningAnswers } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { useId } from 'react'

/** Deterministic mini models. They never open or modify the student's project. */
export function LearningExperiment({
  activity,
  answers,
  onChange,
}: {
  activity: ExperimentActivity
  answers: LearningAnswers
  onChange: (value: LearningAnswers) => void
}) {
  const id = useId()
  const config =
    activity.preset === 'motion'
      ? { key: 'gravity', label: 'Gravidade', min: 0, max: 1.5, step: 0.1, initial: 0.6 }
      : activity.preset === 'population'
        ? {
            key: 'interval',
            label: 'Intervalo entre objetos (segundos)',
            min: 0.1,
            max: 2,
            step: 0.1,
            initial: 1.4,
          }
        : { key: 'radius', label: 'Raio da colisão', min: 5, max: 45, step: 1, initial: 25 }
  const parameter =
    typeof answers[config.key] === 'number'
      ? answers[config.key]
      : (activity.parameters[config.key] ?? config.initial)
  const value =
    typeof parameter === 'number'
      ? Math.min(config.max, Math.max(config.min, parameter))
      : config.initial
  const testedValues = Array.isArray(answers.testedValues) ? answers.testedValues : []
  const experiments = testedValues.length
  const tested = typeof answers.tested === 'number' ? answers.tested : null
  const previous = typeof answers.previous === 'number' ? answers.previous : null
  const trial = tested ?? value
  const path = (g: number) =>
    Array.from({ length: 55 }, (_, frame) => {
      const y = Math.max(35, Math.min(185, 185 - 7 * frame + (g * frame * frame) / 2))
      return `${frame ? 'L' : 'M'}${22 + frame * 6},${y}`
    }).join(' ')
  const population = (interval: number) => Math.floor(10 / interval)
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4 sm:p-6">
      <label htmlFor={id} className="flex justify-between gap-3 font-medium">
        {config.label}
        <output htmlFor={id} className="tabular-nums text-primary">
          {value}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange({ ...answers, [config.key]: Number(e.target.value) })}
        className="min-h-11 w-full accent-primary"
      />
      <svg
        role="img"
        aria-label={
          activity.preset === 'motion'
            ? 'Trajetória de um salto: azul é o teste atual e cinza o anterior.'
            : activity.preset === 'population'
              ? 'Quantidade de objetos criados durante dez segundos.'
              : 'Dois personagens com suas áreas de colisão.'
        }
        viewBox="0 0 380 220"
        className="w-full rounded-xl bg-card text-primary"
      >
        <path d="M16 190H364" stroke="currentColor" strokeOpacity=".2" />
        {activity.preset === 'motion' ? (
          <>
            {previous !== null && (
              <path
                d={path(previous)}
                fill="none"
                stroke="currentColor"
                strokeOpacity=".25"
                strokeWidth="3"
                strokeDasharray="5 5"
              />
            )}
            <path d={path(trial)} fill="none" stroke="currentColor" strokeWidth="4" />
            <text x="20" y="215" fill="currentColor" fontSize="12">
              Início
            </text>
            <text x="290" y="215" fill="currentColor" fontSize="12">
              Tempo →
            </text>
          </>
        ) : activity.preset === 'population' ? (
          <>
            <rect
              x="30"
              y={185 - Math.min(150, population(trial) * 1.5)}
              width="110"
              height={Math.min(150, population(trial) * 1.5)}
              rx="6"
              fill="currentColor"
            />
            <text x="40" y="210" fontSize="12" fill="currentColor">
              {population(trial)} criados
            </text>
            <rect
              x="220"
              y={185 - Math.min(150, Math.ceil(3 / trial) * 1.5)}
              width="110"
              height={Math.min(150, Math.ceil(3 / trial) * 1.5)}
              rx="6"
              fill="currentColor"
              opacity=".4"
            />
            <text x="195" y="210" fontSize="12" fill="currentColor">
              {Math.ceil(3 / trial)} ainda na tela
            </text>
          </>
        ) : (
          <>
            <rect x="110" y="75" width="40" height="60" rx="8" fill="currentColor" opacity=".7" />
            <rect x="180" y="75" width="40" height="60" rx="8" fill="currentColor" opacity=".3" />
            <circle
              cx="130"
              cy="105"
              r={trial}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <circle
              cx="200"
              cy="105"
              r={trial}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text x="50" y="195" fill="currentColor" fontSize="14">
              {trial * 2 >= 70
                ? 'As áreas de colisão se encontram.'
                : 'As áreas de colisão estão separadas.'}
            </text>
          </>
        )}
      </svg>
      {activity.preset === 'population' && (
        <p className="text-sm text-muted-foreground">
          Neste modelo, cada objeto leva 3 segundos para sair da tela. Compare o total criado com os
          objetos que ainda aparecem.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() =>
            onChange({
              ...answers,
              [config.key]: value,
              tested: value,
              previous: tested,
              testedValues: [...new Set([...testedValues, String(value)])],
              experiments: new Set([...testedValues, String(value)]).size,
              observed: true,
            })
          }
        >
          Testar este valor
        </Button>
        <span className="text-sm text-muted-foreground" role="status">
          {experiments
            ? `${experiments} valor${experiments === 1 ? '' : 'es'} testado${experiments === 1 ? '' : 's'}`
            : 'Mude um valor e veja o que acontece.'}
        </span>
      </div>
    </div>
  )
}
