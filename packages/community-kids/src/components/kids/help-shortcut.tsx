'use client'

import { CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { HELP_NAV } from './nav'

/**
 * O atalho para o "Como fazer" (a biblioteca de ajuda). Decisão da dona (26/09/2026): NÃO é
 * uma sexta seção nem uma sexta aba. Duas roupas do MESMO atalho, molde do `RecadosBell`:
 *  - `pill` (rodapé do menu do computador, acima dos Recados): pílula de largura cheia;
 *  - `icon` (barra de cima do celular, ao lado do sino): o círculo com a interrogação, porque
 *    a barra de abas de 5 não cabe mais um item.
 * Sem contador: ajuda não tem "novos".
 */
export function HelpShortcut({ variant = 'icon' }: { variant?: 'icon' | 'pill' }) {
  const pathname = usePathname()
  const active = pathname === HELP_NAV.href || pathname.startsWith(`${HELP_NAV.href}/`)

  if (variant === 'pill') {
    return (
      <Link
        href={HELP_NAV.href}
        prefetch={false}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-[2.375rem] items-center gap-2.5 rounded-2xl px-3.5 font-semibold text-sm transition-colors',
          active
            ? 'kids-marca'
            : 'bg-(--menu-vidro) text-(--menu-texto) hover:bg-white/12 hover:text-white',
        )}
      >
        <CircleHelp className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{HELP_NAV.label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={HELP_NAV.href}
      prefetch={false}
      aria-label={HELP_NAV.label}
      aria-current={active ? 'page' : undefined}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-(--menu-vidro) text-(--menu-texto) transition-colors hover:bg-white/12 hover:text-white"
    >
      <CircleHelp className="size-4" aria-hidden />
    </Link>
  )
}
