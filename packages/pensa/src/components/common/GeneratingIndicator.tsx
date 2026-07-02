/**
 * Indicador de espera de GERAÇÃO (pode levar ~30s): três bolinhas pulando
 * (motion-reduce: paradas) + mensagem e dica via copy. Compartilhado pelas
 * etapas R e O (a etapa E mantém o dela, anterior a este componente).
 */
import type { JSX } from 'react'

export function GeneratingIndicator({
  message,
  hint,
}: {
  message: string
  hint?: string
}): JSX.Element {
  return (
    <div aria-busy="true" className="flex flex-col items-center gap-2">
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
