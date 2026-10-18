import { useRef } from 'react'
import { ComponentButton, ComponentNumberField } from './SceneComponentPanel'

/** Both entry points configure the same quad-strip operation. Offsets are relative to its center. */
export function SceneLoopCutControls({
  count,
  offset,
  change,
}: {
  count: number
  offset: number
  change(count: number, offset: number): void
}) {
  const positionInput = useRef<HTMLInputElement>(null)
  return (
    <>
      <div className="mld-component-field">
        Quantidade de cortes
        <div className="mld-component-selection">
          <ComponentButton
            aria-label="Diminuir quantidade de cortes"
            disabled={count <= 1}
            onClick={() => change(count - 1, 0)}
          >
            −
          </ComponentButton>
          <output aria-label="Quantidade de cortes" className="mld-component-value">
            {count}
          </output>
          <ComponentButton
            aria-label="Aumentar quantidade de cortes"
            disabled={count >= 16}
            onClick={() => change(count + 1, 0)}
          >
            +
          </ComponentButton>
        </div>
      </div>
      <h4>Onde cortar</h4>
      <div className="mld-component-grid">
        <ComponentButton
          tone={offset === 0 ? 'primary' : 'neutral'}
          aria-pressed={offset === 0}
          onClick={() => change(count, 0)}
        >
          No meio
        </ComponentButton>
        <ComponentButton onClick={() => positionInput.current?.focus()}>Ajustar</ComponentButton>
      </div>
      <ComponentNumberField
        inputRef={positionInput}
        label="Posição do conjunto (%)"
        name="componentRingOffset"
        value={offset * 100}
        change={(n) => change(count, n / 100)}
      />
      <p className="mld-component-description">
        0% centraliza os cortes. Valores positivos ou negativos deslocam o conjunto.
      </p>
    </>
  )
}
