import { useState } from 'react'
import type { SliderStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: SliderStep
}

export default function Slider({ step, answers, submitting, onSubmit }: Props) {
  const initial = typeof answers[step.key] === 'number' ? (answers[step.key] as number) : 5
  const [value, setValue] = useState<number>(initial)

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center text-5xl font-bold text-lime">{value}</div>
      <input
        type="range"
        min={step.min}
        max={step.max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[var(--color-lime)]"
        aria-label={step.titulo}
      />
      <div className="flex justify-between gap-4 text-sm text-muted">
        <span className="max-w-[45%]">{step.labelMin}</span>
        <span className="max-w-[45%] text-right">{step.labelMax}</span>
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit([{ key: step.key, value }])}
        className="btn btn-primary disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  )
}
