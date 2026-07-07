import { Facebook, Instagram, type LucideIcon, Music2, Youtube } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  FORMAT_LABELS,
  FORMAT_NETWORK,
  NETWORK_LABELS,
  type PublicationFormat,
  type SocialNetwork,
} from '@/lib/networks'

const NETWORK_ICONS: Record<SocialNetwork, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  // Não há ícone oficial do TikTok no lucide — a nota musical é a convenção.
  tiktok: Music2,
}

/** Ícone da rede + rótulo do formato (chips do kanban/calendário/composer). */
export function NetworkChip({
  format,
  showLabel = true,
  className,
}: {
  format: PublicationFormat
  /** false = só o ícone (cards compactos do kanban). */
  showLabel?: boolean
  className?: string
}) {
  const network = FORMAT_NETWORK[format]
  const Icon = NETWORK_ICONS[network]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border px-1.5 py-0.5 text-xs text-muted-foreground',
        className,
      )}
      title={`${NETWORK_LABELS[network]} · ${FORMAT_LABELS[format]}`}
    >
      <Icon className="size-3" aria-hidden />
      {showLabel ? FORMAT_LABELS[format] : null}
    </span>
  )
}
