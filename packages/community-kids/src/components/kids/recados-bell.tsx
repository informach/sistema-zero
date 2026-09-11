'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Atalho "recados do professor": busca o contador de conversas NÃO-LIDAS (server-backed,
 * watermark no members — não é baseline em localStorage como o do Clube) e mostra o
 * número. Duas roupas do MESMO atalho, as duas sobre a âncora escura do Pen:
 *  - `pill` (rodapé do menu, telas-modelo de 11/09/2026): pílula de largura cheia em
 *    branco a 8%, e cheia na cor de ação quando a criança está nos Recados;
 *  - `bell` (top bar do celular): o círculo com o ícone, porque a tab bar de 5 abas
 *    não cabe mais um item.
 */
export function RecadosBell({ variant = 'bell' }: { variant?: 'bell' | 'pill' }) {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  const active = pathname === '/recados' || pathname.startsWith('/recados/')

  useEffect(() => {
    let alive = true
    apiGet<{ count: number }>('/api/members/teacher-threads/unread-count')
      .then((r) => {
        if (alive) setCount(r.count ?? 0)
      })
      .catch(() => {
        // best-effort — sem contador se o members soluçar.
      })
    return () => {
      alive = false
    }
  }, [])

  const countLabel = count > 9 ? '9+' : String(count)
  const label = count > 0 ? `${count} recados novos do professor` : 'Recados do professor'

  if (variant === 'pill') {
    return (
      <Link
        href="/recados"
        prefetch={false}
        aria-current={active ? 'page' : undefined}
        // 38px e canto de 16px, a pílula do rodapé do modelo (1440px), no claro do menu.
        className={cn(
          'flex h-[2.375rem] items-center gap-2.5 rounded-2xl px-3.5 font-semibold text-sm transition-colors',
          active
            ? 'kids-marca'
            : 'bg-(--menu-vidro) text-(--menu-texto) hover:bg-white/12 hover:text-white',
        )}
      >
        <Mail className="size-4 shrink-0" aria-hidden />
        {/* O nome falado COMEÇA pelo texto visível (WCAG 2.5.3) e o número entra
            depois, por extenso: o selo é só para os olhos. */}
        <span className="min-w-0 flex-1 truncate">
          Recados do professor
          {count > 0 ? <span className="sr-only">, {count} novos</span> : null}
        </span>
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="grid h-5 min-w-5 place-items-center rounded-full bg-(--sz-hot) px-1.5 font-bold text-(--sz-hot-fg) text-[0.6875rem]"
          >
            {countLabel}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <Link
      href="/recados"
      prefetch={false}
      aria-label={label}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-(--menu-vidro) text-(--menu-texto) transition-colors hover:bg-white/12 hover:text-white"
    >
      <Mail className="size-4" aria-hidden />
      {count > 0 ? (
        <span className="-right-0.5 -top-0.5 absolute grid size-4 place-items-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
          {countLabel}
        </span>
      ) : null}
    </Link>
  )
}
