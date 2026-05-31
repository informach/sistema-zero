import type { SimNaoStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: SimNaoStep
}

export default function SimNao({ step, submitting, onSubmit }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit([{ key: step.key, value: 'sim' }])}
        className="btn btn-primary py-6 text-base disabled:opacity-50"
      >
        {step.sim}
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit([{ key: step.key, value: 'nao' }])}
        className="btn btn-ghost py-6 text-base disabled:opacity-50"
      >
        {step.nao}
      </button>
    </div>
  )
}
