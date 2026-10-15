'use client'

import { ArrowLeft } from 'lucide-react'

/** Quando o servidor recusa sem dizer o motivo (o handoff sempre manda um, mas não confiamos). */
const DEFAULT_REASON = 'Essa missão é de outra pessoa da equipe.'

/**
 * A missão do Pensa que NÃO é desta criança (`capability.owned === false`), nas três oficinas
 * (Estúdio, Pinta e Molda; Pensa em equipe, 14/10/2026).
 *
 * O motivo vem do servidor e já está na voz da criança ("Essa missão é de quem cuida das
 * artes.", "Outra pessoa da equipe já está fazendo essa missão.", ou a ferramenta que a conta
 * ainda não tem). No lugar do guia não há nada para marcar nem concluir, mas há SEMPRE um
 * caminho: "Voltar ao plano", onde ela vê o que é dela. Antes a tela mostrava só a frase, sem
 * saída nenhuma além do menu.
 */
export function PensaMissionBlocked({
  reason,
  onBackToPlan,
}: {
  reason: string | null
  onBackToPlan: () => void
}) {
  return (
    <div className="grid h-full flex-1 place-items-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <p role="status" className="font-semibold">
          {reason?.trim() || DEFAULT_REASON}
        </p>
        <button
          type="button"
          onClick={onBackToPlan}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao plano
        </button>
      </div>
    </div>
  )
}
