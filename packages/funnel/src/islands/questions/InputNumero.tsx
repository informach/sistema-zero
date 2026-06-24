import { useState } from 'react'
import type { InputNumeroStep } from '../../content/quiz-config'
import { parseNonNegativeInt } from '../../lib/money'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: InputNumeroStep
}

/** Entrada de um número inteiro (ex.: horas/dia). Valida min/max e envia ao continuar. */
export default function InputNumero({ step, submitting, onSubmit }: Props) {
  const [raw, setRaw] = useState('')
  const [erro, setErro] = useState(false)

  function continuar() {
    const n = parseNonNegativeInt(raw)
    if (n == null || n < step.min || n > step.max) {
      setErro(true)
      return
    }
    setErro(false)
    onSubmit([{ key: step.key, value: n }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-muted" htmlFor="input-numero">
          {step.label}
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 focus-within:border-cyan">
          {step.unidade && <span className="text-base font-bold text-cyan">{step.unidade}</span>}
          <input
            id="input-numero"
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              if (erro) setErro(false)
            }}
            placeholder="0"
            className="w-full bg-transparent text-lg font-semibold text-ink outline-none"
          />
        </div>
      </div>
      {erro && (
        <p className="text-sm text-red-400">
          Informe um número entre {step.min} e {step.max}.
        </p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={continuar}
        className="btn btn-primary disabled:opacity-50"
      >
        Continuar →
      </button>
    </div>
  )
}
