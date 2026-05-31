import type { MultiplaEscolhaStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: MultiplaEscolhaStep
}

export default function MultiplaEscolha({ step, submitting, onSubmit }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {step.opcoes.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={submitting}
          onClick={() => onSubmit([{ key: step.key, value: opt.value }])}
          className="card group flex items-center gap-3 px-5 py-4 text-left text-base transition hover:border-cyan disabled:opacity-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-sm font-bold text-cyan group-hover:border-cyan">
            {opt.value}
          </span>
          <span className="font-medium text-ink">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
