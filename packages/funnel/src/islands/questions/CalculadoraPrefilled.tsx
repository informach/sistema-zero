import { useState } from 'react'
import type { CalculadoraPrefilledStep } from '../../content/quiz-config'
import { parseNonNegativeInt } from '../../lib/money'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: CalculadoraPrefilledStep
}

/**
 * Calculadora de inteiros com o 1º campo PRÉ-PREENCHIDO por uma resposta anterior
 * (`campo1.sourceKey`). Preview = campo1 × campo2 × multiplicador. Envia os dois
 * campos; o valor final (`resultadoKey`) é calculado no servidor (`derive` do funil).
 */
export default function CalculadoraPrefilled({ step, answers, submitting, onSubmit }: Props) {
  const fonte = answers[step.campo1.sourceKey]
  const [c1Raw, setC1Raw] = useState(typeof fonte === 'number' ? String(fonte) : '')
  const [c2Raw, setC2Raw] = useState('')
  const [erro, setErro] = useState(false)
  const [resultado, setResultado] = useState<{ c1: number; c2: number; total: number } | null>(null)

  function calcular() {
    const c1 = parseNonNegativeInt(c1Raw)
    const c2 = parseNonNegativeInt(c2Raw)
    if (c1 == null || c2 == null) {
      setErro(true)
      return
    }
    setErro(false)
    setResultado({ c1, c2, total: c1 * c2 * step.multiplicador })
  }

  function continuar() {
    if (!resultado) return
    onSubmit([
      { key: step.campo1.key, value: resultado.c1 },
      { key: step.campo2.key, value: resultado.c2 },
    ])
  }

  const texto = resultado
    ? step.textoResultado.replace('{resultado}', resultado.total.toLocaleString('pt-BR'))
    : ''

  return (
    <div className="flex flex-col gap-4">
      <Campo
        id="calc-campo1"
        label={step.campo1.label}
        unidade={step.campo1.unidade}
        value={c1Raw}
        onChange={(v) => {
          setC1Raw(v)
          setResultado(null)
        }}
      />
      <Campo
        id="calc-campo2"
        label={step.campo2.label}
        unidade={step.campo2.unidade}
        value={c2Raw}
        onChange={(v) => {
          setC2Raw(v)
          setResultado(null)
        }}
      />
      {erro && <p className="text-sm text-red-400">Preencha os dois campos com valores válidos.</p>}

      {!resultado ? (
        <button type="button" onClick={calcular} className="btn btn-primary">
          Calcular
        </button>
      ) : (
        <>
          <div className="card border-cyan/40 bg-card-2 p-5 text-base leading-relaxed text-ink">
            {texto}
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={continuar}
            className="btn btn-primary disabled:opacity-50"
          >
            Entendi, continuar →
          </button>
        </>
      )}
    </div>
  )
}

function Campo(props: {
  id: string
  label: string
  unidade: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted" htmlFor={props.id}>
        {props.label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 focus-within:border-cyan">
        <span className="text-base font-bold text-cyan">{props.unidade}</span>
        <input
          id={props.id}
          inputMode="numeric"
          autoComplete="off"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-lg font-semibold text-ink outline-none"
        />
      </div>
    </div>
  )
}
