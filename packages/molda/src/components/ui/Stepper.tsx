/**
 * Campo numérico com "−" e "+" de 44 px. Os botões commitam na hora; o texto
 * digitado só commita ao sair do campo ou no Enter (senão cada tecla viraria
 * um passo do desfazer).
 */
import type { JSX, KeyboardEvent } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import { IconButton } from './Button'
import { Minus, Plus } from './icons'

export interface StepperProps {
  label: string
  /** Rótulo curto visível (o `label` inteiro vai para o leitor de tela). */
  short?: string
  value: number
  step: number
  min: number
  max: number
  onChange: (value: number) => void
  /** `true` = o valor dá a volta ao passar do máximo (giro em graus). */
  wrap?: boolean
}

function clamp(value: number, min: number, max: number, wrap: boolean): number {
  if (wrap) {
    const span = max - min
    return ((((value - min) % span) + span) % span) + min
  }
  return Math.min(Math.max(value, min), max)
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function Stepper({
  label,
  short,
  value,
  step,
  min,
  max,
  onChange,
  wrap = false,
}: StepperProps): JSX.Element {
  const [text, setText] = useState(() => format(value))
  useEffect(() => {
    setText(format(value))
  }, [value])

  function commitText(): void {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (!Number.isFinite(parsed)) {
      setText(format(value))
      return
    }
    const snapped = Math.round(parsed / step) * step
    const next = clamp(snapped, min, max, wrap)
    if (next !== value) onChange(next)
    else setText(format(value))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitText()
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="w-6 shrink-0 text-xs font-bold text-mld-muted" aria-hidden="true">
        {short ?? label}
      </span>
      <IconButton
        aria-label={COPY.a11y.decrease(label)}
        onClick={() => onChange(clamp(value - step, min, max, wrap))}
        className="min-h-11 min-w-11"
      >
        <Minus aria-hidden="true" className="size-4" />
      </IconButton>
      <input
        type="text"
        name={label}
        autoComplete="off"
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commitText}
        onKeyDown={onKeyDown}
        className="min-h-11 w-14 rounded-lg border-2 border-mld-border bg-mld-bg text-center text-sm font-bold text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
      />
      <IconButton
        aria-label={COPY.a11y.increase(label)}
        onClick={() => onChange(clamp(value + step, min, max, wrap))}
        className="min-h-11 min-w-11"
      >
        <Plus aria-hidden="true" className="size-4" />
      </IconButton>
    </div>
  )
}
