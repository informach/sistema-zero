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
export function ZappyCredits({
  credits,
  audience = 'kids',
}: {
  credits?: AiCreditsView | null
  audience?: 'kids' | 'adult'
}): JSX.Element | null {
  const adulto = audience === 'adult'
  if (credits?.studioSource === 'openrouter')
    return (
      <div className="border-sz-border border-b px-4 py-1.5 text-xs text-sz-fg-mute">
        {adulto
          ? 'Fonte no Estúdio: a sua conexão OpenRouter. O Pensa usa os pedidos da sua conta.'
          : 'Fonte no Estúdio: OpenRouter do responsável. O Pensa usa a franquia da família.'}
      </div>
    )
  const meter = resolveAiCredits(credits, { audience })
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
      <p className="text-xs text-sz-fg-mute">
        {adulto
          ? 'Vale para o Pensa e o tutor do Estúdio.'
          : 'Franquia da família, compartilhada entre Pensa e Zappy no Estúdio.'}
      </p>
    </div>
  )
}
