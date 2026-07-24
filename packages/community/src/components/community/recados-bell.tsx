'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

/** Atalho persistente para recados, com o total não-lido da vitrine adulta. */
export function RecadosBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    apiGet<{ count: number }>('/api/members/teacher-threads/unread-count')
      .then((result) => {
        if (active) setCount(result.count ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <Link
      href="/recados"
      aria-label={count > 0 ? `${count} recados novos` : 'Recados'}
      className="relative inline-flex size-9 items-center justify-center rounded-full border bg-card hover:border-primary"
    >
      <Mail className="size-4" />
      {count > 0 ? (
        <span className="-right-0.5 -top-0.5 absolute grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  )
}
