import { KidsAvatar } from '@/components/kids/kids-avatar'
import { cn } from '@/lib/cn'
import { levelInfo } from '@/lib/level-info'

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-28',
} as const

/** Espessura do anel da aura por tamanho (mais fina nos avatares pequenos). */
const RING = { sm: 2, md: 3, lg: 4, xl: 5 } as const

/**
 * Avatar da criança com uma AURA na cor do NÍVEL (rank) ao redor. Anel sólido +
 * brilho suave, ambos na cor do nível (`--level-<slug>` do globals.css, inline —
 * cor dinâmica). Cosmético: sem nível (ou Noob) ainda mostra a aura cinza neutra.
 * Estático (sem animação) → ok com `prefers-reduced-motion`.
 */
export function AvatarWithAura({
  photoUrl,
  levelSlug,
  size = 'md',
  className,
  label,
}: {
  photoUrl?: string | null
  /** Slug do nível (`noob`…`god`). Ausente/desconhecido → Noob (aura cinza). */
  levelSlug?: string
  size?: keyof typeof SIZES
  className?: string
  label?: string
}) {
  const color = levelInfo(levelSlug).colorVar
  const ring = RING[size]
  return (
    <span
      className={cn('relative inline-flex shrink-0 rounded-full', className)}
      style={{
        // Anel sólido coloca a aura colada no avatar; o segundo halo é o brilho.
        boxShadow: `0 0 0 ${ring}px ${color}, 0 0 ${ring * 3}px color-mix(in oklch, ${color} 55%, transparent)`,
      }}
    >
      <KidsAvatar photoUrl={photoUrl} size={size} label={label} />
    </span>
  )
}
