import type { MultiplaEscolhaStep } from '../../content/quiz-config'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: MultiplaEscolhaStep
}

export default function MultiplaEscolha({ step, submitting, onSubmit }: Props) {
  const comImagem = step.comImagem && step.opcoes.every((o) => Boolean(o.image))

  // Variante com imagem (P1): cards grandes com a foto ao fundo, gradiente e badge.
  if (comImagem) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {step.opcoes.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={submitting}
            onClick={() => onSubmit([{ key: step.key, value: opt.value }])}
            className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl border border-line p-5 text-left transition hover:border-lime focus-visible:border-lime disabled:opacity-60 sm:min-h-64"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              style={{ backgroundImage: `url(${opt.image})` }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-transparent"
            />
            <span className="relative z-10 mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-lime text-sm font-bold text-[#0b0f14] shadow-lg shadow-black/30">
              {opt.value}
            </span>
            <span className="relative z-10 text-base font-semibold leading-snug text-ink">
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    )
  }

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
