'use client'

import type { ReactNode } from 'react'
import type { DialogueBlock } from '../lib/types'

/**
 * Balão de fala do mascote, no lugar de contexto corrido. Para criança, "o Zappy
 * te explicando" lê melhor que um parágrafo solto acima da atividade.
 *
 * O mascote é asset do KIDS (o member-shell não tem `public/`, então referenciar
 * `/zappy/*.webp` daqui daria 404 na comunidade adulta). Por isso ele entra por
 * SLOT: o kids injeta o Zappy, e o adulto vê o mesmo balão como recado
 * destacado, sem personagem.
 *
 * ⚠️ Mascote e balão são IRMÃOS na mesma linha, e a cauda é ancorada na borda
 * ESQUERDA do balão. Isso evita de graça a armadilha do balão do tutorial, onde
 * a seta mira o CENTRO e um `mx-auto` a joga cem pixels fora do alvo: aqui não
 * existe centro a calcular.
 */
export function DialogueBlockView({
  content,
  mascot,
}: {
  content: DialogueBlock
  /** Figura de quem fala. Sem ela o balão vira um recado destacado. */
  mascot?: ReactNode
}) {
  return (
    <div className="flex items-end gap-3">
      {mascot}
      <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-(--unit,var(--color-border)) bg-card p-4">
        {mascot ? (
          <span
            aria-hidden="true"
            className="-left-[9px] absolute bottom-6 size-3.5 rotate-45 border-(--unit,var(--color-border)) border-b-2 border-l-2 bg-card"
          />
        ) : null}
        {/* Texto de verdade, no fluxo normal: nada de `role="status"` (isto não é
            aviso) nem de `blockquote` (a atribuição é o mascote, que é decorativo
            e some para o leitor de tela, o que deixaria uma citação sem autor). */}
        <p className="whitespace-pre-line text-pretty text-base text-foreground">{content.text}</p>
      </div>
    </div>
  )
}
