import type { CSSProperties } from 'react'
import { KidsAvatar } from '@/components/kids/kids-avatar'
import { cn } from '@/lib/cn'
import { LEVEL_ORDER } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'

/**
 * Avatar da criança nas listas, cabeçalhos e cartões, com a AURA na cor do nível da jornada.
 *
 * O anel saiu em 10/09/2026 (as telas-modelo de 11/09 não tinham) e VOLTOU em 19/10/2026, a pedido
 * dela, junto com o anel da etapa na comunidade adulta: a cor diz de longe em que etapa a criança
 * está. No perfil, no menu e no cartão da jornada o nível também vem escrito (`LevelBadge`); nas
 * listas (liga, Clube, Mural) a aura é o enfeite de reconhecer de longe. O anel é uma SOMBRA no próprio círculo (`.kids-aura` no `globals.css`): acompanha a
 * forma que o `className` der (círculo ou o quadrado arredondado do perfil) e não muda o tamanho de
 * nada. Folga clara entre a foto e o anel; a espessura cresce com o tamanho.
 */
export function AvatarWithAura({
  photoUrl,
  name,
  levelSlug,
  size = 'md',
  className,
  label,
}: {
  photoUrl?: string | null
  /** Nome de quem é o avatar: a inicial aparece enquanto não há foto. */
  name?: string | null
  /** Nível da jornada (`--level-<slug>`); sem ele (ou desconhecido), sem anel. */
  levelSlug?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}) {
  const aura = levelSlug && LEVEL_ORDER.includes(levelSlug as StudentLevelSlug) ? levelSlug : null
  return (
    <KidsAvatar
      photoUrl={photoUrl}
      name={name}
      size={size}
      label={label}
      className={cn(aura && `kids-aura kids-aura-${size}`, className)}
      style={aura ? ({ '--kids-aura-cor': `var(--level-${aura})` } as CSSProperties) : undefined}
    />
  )
}
