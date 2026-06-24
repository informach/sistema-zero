import { useState } from 'react'
import type { SliderStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: SliderStep
}

/** Slider `min`..`max` (ex.: 1–10) com rótulos nas pontas. Envia o valor ao continuar. */
export default function Slider({ step, submitting, onSubmit }: Props) {
  const meio = Math.round((step.min + step.max) / 2)
  const [value, setValue] = useState(meio)

  return (
    <div className="flex flex-col gap-6">
      {step.label && <p className="text-sm leading-relaxed text-muted">{step.label}</p>}
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <span className="text-4xl font-extrabold text-cyan tabular-nums">{value}</span>
        </div>
        <input
          type="range"
          min={step.min}
          max={step.max}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={step.titulo}
          className="w-full accent-[var(--color-lime)]"
        />
        <div className="flex justify-between text-xs text-muted">
          <span className="max-w-[45%] text-left">{step.minLabel}</span>
          <span className="max-w-[45%] text-right">{step.maxLabel}</span>
        </div>
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit([{ key: step.key, value }])}
        className="btn btn-primary disabled:opacity-50"
      >
        Continuar →
      </button>
    </div>
  )
}
