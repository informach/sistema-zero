/**
 * Carinha do Zappy (mascote) por pose: usa a imagem que o HOST forneceu em
 * `adapter.mascotImages` e cai no emoji de fallback quando a pose não existe
 * (modo adulto/host sem assets). Sempre decorativa (aria-hidden) — o texto ao
 * redor carrega o significado.
 */
import type { JSX } from 'react'
import type { PensaMascotPose } from '../../core/types'
import { usePensaApp } from '../appContext'

export function ZappyImage({
  pose,
  fallbackEmoji,
  className,
}: {
  pose: PensaMascotPose
  fallbackEmoji: string
  /** Dimensiona a imagem OU o emoji (ex.: "h-9 w-9" / "text-4xl"). */
  className?: string
}): JSX.Element {
  const { adapter } = usePensaApp()
  const src = adapter.mascotImages?.[pose]
  if (src) {
    return <img src={src} alt="" aria-hidden="true" className={className} draggable={false} />
  }
  return (
    <span aria-hidden="true" className={className}>
      {fallbackEmoji}
    </span>
  )
}
