/**
 * Indicador de espera de GERAÇÃO (pode levar ~30s): Zappy pensando + três
 * bolinhas pulando (motion-reduce: paradas) + mensagem e dica via copy.
 * Compartilhado pelas etapas E, R e O. `role="status"` anuncia início/fim da
 * espera a leitores de tela.
 */
import type { JSX } from 'react'
import { ZappyImage } from './ZappyImage'

export function GeneratingIndicator({
  message,
  hint,
}: {
  message: string
  hint?: string
}): JSX.Element {
  return (
    <div role="status" aria-busy="true" className="flex flex-col items-center gap-2">
      <ZappyImage
        pose="thinking"
        fallbackEmoji="💭"
        className="h-16 w-16 object-contain text-3xl"
      />
      <div aria-hidden="true" className="flex gap-1.5">
        {['a', 'b', 'c'].map((key, index) => (
          <span
            key={key}
            className="h-3 w-3 animate-bounce rounded-full bg-pz-accent motion-reduce:animate-none"
            style={{ animationDelay: `${index * 0.15}s` }}
          />
        ))}
      </div>
      <p className="font-bold text-pz-text">{message}</p>
      {hint ? <p className="text-sm text-pz-muted">{hint}</p> : null}
    </div>
  )
}
