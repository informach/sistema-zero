/**
 * Cartão de dicas do PRIMEIRO uso do editor (por estilo: pixel/vetor/mapa). Um
 * cartão leve e dispensável — não é um tour com setas nos elementos. Guarda o
 * "já vi" no localStorage por `id` (por navegador; some depois do 1º "Entendi").
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import { Button } from '../ui/Button'

const SEEN_PREFIX = 'pinta:coach:'

export function CoachMarks({
  id,
  title,
  tips,
}: {
  id: string
  title: string
  tips: readonly string[]
}): JSX.Element | null {
  // Começa "visto" para não piscar antes de ler o localStorage; o efeito revela
  // se for a primeira vez.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(SEEN_PREFIX + id) === '1')
    } catch {
      setDismissed(false)
    }
  }, [id])

  if (dismissed) return null

  function close(): void {
    try {
      localStorage.setItem(SEEN_PREFIX + id, '1')
    } catch {
      // localStorage indisponível (modo privado): só some nesta sessão.
    }
    setDismissed(true)
  }

  // No desenho das telas-modelo (11/09/2026): uma faixa azul-céu colada embaixo da barra (a área
  // da ferramenta é de borda a borda), o ladrilho amarelo da dica e a pílula azul chapada.
  return (
    <div className="pin-coach flex shrink-0 flex-wrap items-center gap-3 px-4 py-3">
      <span aria-hidden="true" className="pin-coach__tile">
        💡
      </span>
      <div className="min-w-40 flex-1">
        <p className="text-sm font-extrabold text-pin-text">{title}</p>
        <ul className="mt-0.5 flex flex-col gap-0.5 text-sm text-pin-muted">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      <Button variant="barPrimary" onClick={close}>
        {COPY.coach.gotIt}
      </Button>
    </div>
  )
}
