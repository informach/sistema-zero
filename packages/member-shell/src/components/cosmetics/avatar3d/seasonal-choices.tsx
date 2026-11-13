'use client'

import { type MoldeDoVestuario, VESTUARIO_DAS_FESTAS } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG as C } from '@sistemazero/core/avatar'
import { isAvatarItemOwned } from '../../../lib/avatar-pack'

/**
 * As sugestões da festa do jogo (o molde do vestuário), só com as peças que o catálogo do pack tem.
 * Escolher veste pela lógica do configurador (prévia e compra como sempre).
 */
export function SeasonalAvatarChoices({
  festa,
  owned,
  disabled,
  onSelect,
}: {
  festa: MoldeDoVestuario['festa']
  owned: ReadonlySet<string>
  disabled: boolean
  onSelect(partId: string): void
}) {
  const colecao = VESTUARIO_DAS_FESTAS[festa]
  // As da festa (conquistadas no jogo) primeiro, depois as sugestões.
  const sugestoes = [...colecao.conquista, ...colecao.pecas].filter((id) => C.parts[id])
  if (!sugestoes.length) return null
  return (
    <details
      aria-label={colecao.titulo}
      className="mx-4 mb-2 shrink-0 rounded-2xl border border-border bg-card p-3 text-foreground"
    >
      <summary className="cursor-pointer font-bold text-sm">{colecao.titulo}</summary>
      <p className="mt-1 text-muted-foreground text-sm">
        São sugestões. Você pode escolher outras peças. Comprar continua sendo escolha sua.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sugestoes.map((id) => {
          const p = C.parts[id]
          if (!p) return null
          const tem = isAvatarItemOwned(C, id, owned)
          return (
            <button
              type="button"
              key={id}
              disabled={disabled}
              onClick={(e) => {
                onSelect(id)
                const detalhes = e.currentTarget.closest('details')
                if (detalhes) {
                  detalhes.open = false
                  detalhes.querySelector('summary')?.focus()
                }
              }}
              className="min-h-11 rounded-xl border border-border px-3 text-sm disabled:opacity-50"
            >
              {p.label}
              {tem ? '' : p.tier === 'festa' ? ' · vem da festa' : ` · ${p.price} moedas`}
            </button>
          )
        })}
      </div>
    </details>
  )
}
