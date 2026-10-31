'use client'

import { type MoldeDoVestuario, VESTUARIO_DAS_FESTAS } from '@sistemazero/arquipelago-contracts'
import { AVATAR_PART_INFO } from '../../../lib/avatar3d-catalog'
import type { AvatarPartView } from '../../../lib/types'

/** Só apresenta peças devolvidas pelo catálogo autenticado. Seleção usa o configurador atual. */
export function SeasonalAvatarChoices({
  festa,
  parts,
  disabled,
  onSelect,
}: {
  festa: MoldeDoVestuario['festa']
  parts: readonly AvatarPartView[]
  disabled: boolean
  onSelect(part: AvatarPartView): void
}) {
  const colecao = VESTUARIO_DAS_FESTAS[festa]
  // As da festa (conquistadas no jogo) primeiro, depois as sugestões de peças que já existiam.
  const sugestoes = [...colecao.conquista, ...colecao.pecas].flatMap((id) => {
    const part = parts.find((p) => p.id === id)
    return part && AVATAR_PART_INFO[id]?.category === part.category ? [part] : []
  })
  if (!sugestoes.length) return null
  return (
    <details
      aria-label={colecao.titulo}
      className="mx-4 mb-2 shrink-0 rounded-2xl border border-border bg-card p-3 text-foreground"
    >
      <summary className="cursor-pointer font-bold text-sm">{colecao.titulo}</summary>
      <p className="mt-1 text-muted-foreground text-sm">
        São sugestões. Você pode escolher outras peças. Comprar e salvar continuam sendo escolhas
        suas.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sugestoes.map((p) => (
          <button
            type="button"
            key={p.id}
            disabled={disabled}
            onClick={(e) => {
              onSelect(p)
              const detalhes = e.currentTarget.closest('details')
              if (detalhes) {
                detalhes.open = false
                detalhes.querySelector('summary')?.focus()
              }
            }}
            className="min-h-11 rounded-xl border border-border px-3 text-sm disabled:opacity-50"
          >
            {AVATAR_PART_INFO[p.id]?.labelPt ?? p.id}
            {p.owned ? '' : p.tier === 'festa' ? ' · vem da festa' : ` · ${p.price} moedas`}
          </button>
        ))}
      </div>
    </details>
  )
}
