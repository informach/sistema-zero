import { type AiCreditsView, resolveAiCredits } from '@sistemazero/core/ai-credits'
import type { JSX } from 'react'
import { cn } from '#ui'

/**
 * Quanta ajuda ainda resta — discreto quando há folga, destacado quando acaba.
 *
 * ⚠️ Fica FORA da região `aria-live` do painel de propósito: o número muda a cada
 * pergunta e o leitor de tela repetiria o contador junto de toda resposta. Quem
 * anuncia o "acabou" é a mensagem que chega no fluxo da conversa.
 *
 * Sem dado (`unknown`) devolve `null`: o medidor SOME. Nunca mostre zero para
 * dizer "não consegui saber" — para a criança é a mesma coisa que "acabou".
 */
export function ZappyCredits({ credits }: { credits?: AiCreditsView | null }): JSX.Element | null {
  const meter = resolveAiCredits(credits)
  if (meter.state === 'unknown') return null
  const alerta = meter.state === 'low' || meter.state === 'exhausted'
  return (
    <div className="border-sz-border border-b px-4 py-1.5">
      <span
        // Âmbar, nunca vermelho: acabar a ajuda não é falha, é uma fronteira.
        className={cn('text-xs', alerta ? 'font-bold text-sz-warn' : 'text-sz-fg-mute')}
      >
        <span className="sr-only">{meter.ariaLabel}</span>
        <span aria-hidden="true">{meter.inline}</span>
      </span>
    </div>
  )
}
