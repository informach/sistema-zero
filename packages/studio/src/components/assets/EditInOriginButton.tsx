import type { JSX } from 'react'
import type { CreationOrigin } from './creationOrigin'

/**
 * "✏️ Editar": abre o app de origem (Pinta ou Molda) já naquela criação. Botão de
 * verdade (alvo de toque), não o link de 10px que só existia enquanto a seção
 * "Meus desenhos" existia (ela morre quando o host passa o "Trazer do Pinta").
 */
export function EditInOriginButton({
  assetName,
  origin,
  onClick,
}: {
  assetName: string
  origin: CreationOrigin
  onClick: () => void
}): JSX.Element {
  const app = origin === 'pinta' ? 'Pinta' : 'Molda'
  return (
    <button
      type="button"
      aria-label={`Editar ${assetName} no ${app}`}
      title={
        origin === 'pinta'
          ? 'Abrir este desenho no Pinta (ele se atualiza aqui sozinho)'
          : 'Abrir esta criação no Molda (ela se atualiza aqui sozinha)'
      }
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded border border-sz-border bg-sz-bg px-2 text-xs font-medium text-sz-fg hover:border-sz-accent hover:text-sz-accent"
      onClick={onClick}
    >
      ✏️ Editar
    </button>
  )
}
