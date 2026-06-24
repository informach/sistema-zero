import type { SimNaoStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: SimNaoStep
}

/** Sim/Não: dois cards com rótulos próprios; envia o valor `'sim'`/`'nao'` ao clicar. */
export default function SimNao({ step, submitting, onSubmit }: Props) {
  const opcoes = [
    { value: 'sim', label: step.opcaoSim, icon: '✓', tone: 'text-lime' },
    { value: 'nao', label: step.opcaoNao, icon: '✕', tone: 'text-muted' },
  ] as const

  return (
    <div className="flex flex-col gap-3">
      {opcoes.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={submitting}
          onClick={() => onSubmit([{ key: step.key, value: opt.value }])}
          className="card group flex items-center gap-3 px-5 py-4 text-left text-base transition hover:border-cyan disabled:opacity-50"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-sm font-bold ${opt.tone} group-hover:border-cyan`}
          >
            {opt.icon}
          </span>
          <span className="font-medium text-ink">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
