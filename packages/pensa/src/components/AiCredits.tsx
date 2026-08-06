import { type AiCreditsView, resolveAiCredits } from '@sistemazero/core/ai-credits'
import type { ReactNode } from 'react'

/**
 * Quanta ajuda ainda resta — discreto com folga, âmbar quando está acabando.
 * Sem dado, some (nunca mostra zero para dizer "não consegui saber").
 */
export function AiCreditsBadge({ credits }: { credits?: AiCreditsView | null }) {
  const meter = resolveAiCredits(credits)
  if (meter.state === 'unknown') return null
  // Sem `role`/`aria-label`: o texto visível JÁ é o nome acessível, e um rótulo
  // por cima faria o leitor de tela anunciar a mesma coisa duas vezes. A menção
  // à família mora no aviso do "acabou", onde ela realmente explica algo.
  // Também SEM `aria-live`: o número muda a cada pergunta.
  return <span className={`pensa-credits is-${meter.state}`}>{meter.inline}</span>
}

/**
 * Aviso de LIMITE. Não é erro: `role="status"` (educado, não interrompe) e cor
 * âmbar. O vermelho de `.pensa-inline-error` fica exclusivo de falha técnica —
 * acabar a ajuda do dia não é o app quebrando, e insistir não resolve.
 */
export function AiCreditsNotice({ children }: { children: ReactNode }) {
  return (
    <p className="pensa-credits-notice" role="status">
      {children}
    </p>
  )
}
