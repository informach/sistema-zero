import { useState } from 'react'
import type { InputNumeroStep } from '../../content/quiz-config'
import { parseReaisToCents } from '../../lib/money'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: InputNumeroStep
}

export default function InputNumero({ step, submitting, onSubmit }: Props) {
  const [raw, setRaw] = useState('')
  const [erro, setErro] = useState(false)

  function submit() {
    const cents = parseReaisToCents(raw)
    if (cents == null) {
      setErro(true)
      return
    }
    onSubmit([{ key: step.key, value: cents }])
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm text-muted" htmlFor="input-numero">
        {step.label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 focus-within:border-cyan">
        <span className="text-lg font-bold text-cyan">{step.unidade}</span>
        <input
          id="input-numero"
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            setErro(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="0,00"
          className="w-full bg-transparent text-xl font-semibold text-ink outline-none"
        />
      </div>
      {erro && <p className="text-sm text-red-400">Informe um valor válido.</p>}
      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="btn btn-primary disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  )
}
