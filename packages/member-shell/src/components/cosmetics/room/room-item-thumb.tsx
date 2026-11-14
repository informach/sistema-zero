'use client'

import { MORADA_CATALOG, moradaFileUrl } from '@sistemazero/core/morada'
import { type ReactNode, useState } from 'react'

/**
 * A miniatura da peça nas bandejas (o PNG gerado do GLB, como as peças do avatar). Sem a imagem,
 * mostra o `fallback` (o emoji no Kids, o ícone de linha no adulto). Decorativa: o nome da peça
 * vem escrito ao lado.
 */
export function RoomItemThumb({
  id,
  fallback,
  className,
}: {
  id: string
  fallback: ReactNode
  className?: string
}) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const piece = MORADA_CATALOG.pieces[id] ?? MORADA_CATALOG.pieces[`trophy/${id}`]
  if (!piece || failedId === id) return <>{fallback}</>
  return (
    <img
      src={moradaFileUrl(piece.thumb)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailedId(id)}
      className={className}
    />
  )
}
