'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

/**
 * Sino "recados do professor": busca o contador de conversas NÃO-LIDAS (server-backed,
 * watermark no members — não é baseline em localStorage como o do Clube) e mostra o
 * pontinho + número. É o atalho p/ `/recados` no mobile (a tab bar de 5 abas não cabe
 * mais um item). Sem novidade → só o ícone (o recurso segue descoberto).
 */
export function RecadosBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet<{ count: number }>('/api/members/teacher-threads/unread-count')
      .then((r) => {
        if (alive) setCount(r.count ?? 0)
      })
      .catch(() => {
        // best-effort — sem sino se o members soluçar.
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Link
      href="/recados"
      aria-label={count > 0 ? `${count} recados novos do professor` : 'Recados do professor'}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card transition-colors hover:border-primary"
    >
      <Mail className="size-4" />
      {count > 0 ? (
        <span className="-right-0.5 -top-0.5 absolute grid size-4 place-items-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  )
}
