import { useState } from 'react'
import type { CalculadoraStep } from '../../content/quiz-config'
import { parseNonNegativeInt, parseReaisToCents } from '../../lib/money'
import { calcCustoMensalCents, custoMensalText } from '../../lib/result-text'
import type { BaseQuestionProps } from './types'

interface Props extends BaseQuestionProps {
  step: CalculadoraStep
}

export default function Calculadora({ step, submitting, onSubmit }: Props) {
  const [horasRaw, setHorasRaw] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [erro, setErro] = useState(false)
  const [resultado, setResultado] = useState<{
    horas: number
    valorCents: number
    custo: number
  } | null>(null)

  function calcular() {
    const horas = parseNonNegativeInt(horasRaw)
    const valorCents = parseReaisToCents(valorRaw)
    if (horas == null || valorCents == null) {
      setErro(true)
      return
    }
    setErro(false)
    setResultado({ horas, valorCents, custo: calcCustoMensalCents(horas, valorCents) })
  }

  function continuar() {
    if (!resultado) return
    onSubmit([
      { key: step.campo1.key, value: resultado.horas },
      { key: step.campo2.key, value: resultado.valorCents },
    ])
  }

  return (
    <div className="flex flex-col gap-4">
      <Campo
        id="calc-horas"
        label={step.campo1.label}
        unidade={step.campo1.unidade}
        value={horasRaw}
        onChange={(v) => {
          setHorasRaw(v)
          setResultado(null)
        }}
      />
      <Campo
        id="calc-valor"
        label={step.campo2.label}
        unidade={step.campo2.unidade}
        value={valorRaw}
        onChange={(v) => {
          setValorRaw(v)
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
          {/* Frase de perda só quando há custo (> 0). Resultado 0 apenas segue p/ a P8. */}
          {resultado.custo > 0 && (
            <div className="card border-lime/40 bg-card-2 p-5 text-base text-ink">
              {custoMensalText(resultado.custo)}
            </div>
          )}
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
          inputMode="decimal"
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
