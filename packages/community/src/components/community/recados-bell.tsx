'use client'

import { useTeacherUnread } from '@sistemazero/member-shell/lib/teacher-unread'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

/**
 * O botão Recados da barra do topo (direção de arte de 18/10/2026): ícone E texto, com o total
 * não-lido da vitrine adulta num selo amarelo. No celular fica só o ícone, com o mesmo selo.
 */
export function RecadosBell() {
  const pathname = usePathname() ?? ''
  const count = useTeacherUnread(pathname)
  const active = pathname === '/recados' || pathname.startsWith('/recados/')

  return (
    <Link
      href="/recados"
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      aria-label={count > 0 ? `Recados, ${count} ${count === 1 ? 'novo' : 'novos'}` : 'Recados'}
      className={cn(
        'relative inline-flex h-[2.6rem] items-center gap-2 rounded-[0.6rem] px-3 font-bold text-[0.9rem] text-white transition-colors sm:px-4',
        active
          ? 'bg-(--topo-borda) shadow-[inset_0_0_0_2px_var(--sz-community-action-light)]'
          : 'bg-(--topo-borda) hover:bg-(--topo-vidro)',
      )}
    >
      <Mail className="size-5" aria-hidden />
      <span className="hidden sm:inline">Recados</span>
      {count > 0 ? (
        <span
          aria-hidden
          className="inline-grid h-[1.4rem] min-w-[1.4rem] place-items-center rounded-full bg-(--sz-community-yellow) px-1.5 text-[0.85rem] text-foreground"
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  )
}
