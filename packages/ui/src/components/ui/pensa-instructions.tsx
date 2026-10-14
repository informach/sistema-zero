'use client'
import { type ReactNode, useId, useState } from 'react'

/**
 * Os passos do guia v2 do Pensa, um de cada vez. Passos orientam; navegar entre eles não marca
 * aprendizagem nem conclusão.
 *
 * ⚠️⚠️ A cor vem SÓ das classes `.sz-tool-guide__steps*` do `tool-chrome.css` (14/10/2026). A
 * primeira versão usava `bg-sz-bg`, que é token do ESTÚDIO: dentro do Pinta e do Molda ele
 * resolvia para o navy do menu do kids e o texto sumia (contraste 1,00:1). Nada aqui pode falar
 * token de app (`sz-*`, `pin-*`) nem `--sz-kids-*`/`--sz-tool-*` — o contrato do `tool-chrome`
 * varre este arquivo.
 */
export function PensaInstructions({
  steps,
  renderListen,
}: {
  steps: Array<{ id: string; text: string; hint?: string }>
  renderListen?: (stepId: string) => ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [todos, setTodos] = useState(false)
  const listaId = useId()
  const atual = Math.min(index, steps.length - 1)
  const current = steps[atual]
  if (!current) return null
  return (
    <section aria-label="Como fazer esta missão" className="sz-tool-guide__steps">
      <p className="sz-tool-guide__steps-count">
        Passo {atual + 1} de {steps.length}
      </p>
      <div aria-live="polite">
        <p className="sz-tool-guide__step">{current.text}</p>
        {current.hint ? <p className="sz-tool-guide__step-hint">{current.hint}</p> : null}
      </div>
      {renderListen?.(current.id)}
      <div className="sz-tool-guide__steps-nav">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={atual === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={atual >= steps.length - 1}
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
        >
          Próximo passo
        </button>
        {steps.length > 1 ? (
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline"
            aria-expanded={todos}
            // ⚠ Recolhida a lista DESMONTA: apontar para um id ausente é referência pendurada.
            aria-controls={todos ? listaId : undefined}
            onClick={() => setTodos((v) => !v)}
          >
            {/* Rótulo FIXO: quem diz se está aberto é o `aria-expanded` (rótulo que troca junto
                seria sinal duplo para o leitor de tela). */}
            Ver todos os passos
          </button>
        ) : null}
      </div>
      {todos ? (
        <ol id={listaId} className="sz-tool-guide__steps-all">
          {steps.map((step, i) => (
            <li key={step.id} aria-current={i === atual ? 'step' : undefined}>
              {step.text}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
