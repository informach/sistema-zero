'use client'

import { adventurer } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { useMemo } from 'react'
import { type AvatarConfig, buildAvatarOptions } from '@/lib/avatar-catalog'
import { cn } from '@/lib/cn'

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-28',
} as const

/**
 * Avatar da criança montado por CAMADAS (DiceBear `adventurer`, composto LOCALMENTE
 * — nunca chama `api.dicebear.com`, que vazaria o IP da criança). Substitui a foto:
 * compõe o SVG das peças equipadas e degrada para o avatar grátis padrão quando a
 * config é nula ou tem peça desconhecida (forward-compat). O SVG é confiável (saída
 * de enums fixos, não HTML do usuário) → `dangerouslySetInnerHTML` ok.
 */
export function KidsAvatar({
  config,
  size = 'md',
  className,
  label,
}: {
  config?: AvatarConfig | null
  size?: keyof typeof SIZES
  className?: string
  /** Texto acessível (ex.: "Avatar de Lia"). Default genérico. */
  label?: string
}) {
  // Memoiza pela config SERIALIZADA: o pai costuma passar um literal novo a cada
  // render (ex.: `{ parts: draft }` no editor) → por referência o SVG seria
  // reconstruído à toa. O callback fecha só sobre `configKey` (deps exatas) e
  // re-hidrata por parse; a serialização é barata perto do createAvatar.
  const configKey = JSON.stringify(config ?? null)
  const svg = useMemo(() => {
    const parsed = JSON.parse(configKey) as AvatarConfig | null
    return createAvatar(adventurer, buildAvatarOptions(parsed)).toString()
  }, [configKey])
  return (
    <span
      role="img"
      aria-label={label ?? 'Avatar'}
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-full bg-(--kids-cyan-tint) [&_svg]:size-full',
        SIZES[size],
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG do DiceBear é confiável (enums fixos).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
