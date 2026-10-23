'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { BOTH_COMMUNITIES_LABEL, COMMUNITY_NAMES } from '@/lib/platform'
import { pathIsPlatformScoped } from './nav'
import { usePlatformOptional } from './platform-provider'

/**
 * O selo do cabeçalho que diz de qual comunidade a tela fala: o amarelo do Zappy para a
 * Comunidade dos Criadores, o verde-água para a Comunidade Sistema Zero e o neutro "Kids e
 * Adultos juntos" nas telas que mostram as duas. Fora do provider (um teste solto) não aparece.
 *
 * `label` é a voz da própria tela quando ela sabe mais que o endereço: uma fila da lente que,
 * no filtro, passou a mostrar as duas comunidades passa `BOTH_COMMUNITIES_LABEL` e o selo fica
 * neutro, como nas telas que juntam as duas.
 */
export function CommunityChip({
  className,
  label: override,
}: {
  className?: string
  label?: string
}) {
  const pathname = usePathname()
  const platform = usePlatformOptional()
  if (!platform || !pathname) return null
  const scoped = !override && pathIsPlatformScoped(pathname)
  const label = override ?? (scoped ? COMMUNITY_NAMES[platform] : BOTH_COMMUNITIES_LABEL)
  const tone = !scoped
    ? 'bg-muted text-muted-foreground'
    : platform === 'kids'
      ? 'bg-lens-kids text-lens-kids-ink'
      : 'bg-lens-adult-tint text-[#05585e]'
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-bold',
        tone,
        className,
      )}
    >
      {label}
    </span>
  )
}
