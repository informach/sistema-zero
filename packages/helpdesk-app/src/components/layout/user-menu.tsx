'use client'

import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SessionUser } from '@/lib/types'

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? 'H').toUpperCase()
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Navegação de DOCUMENTO: logout muda cookies HttpOnly e `router.replace +
      // router.refresh` corre um contra o outro (vercel/next.js#54766); o full
      // load também descarta o router cache com dados RSC da sessão encerrada.
      window.location.replace('/login')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-foreground transition-colors hover:bg-primary/25"
        aria-label="Conta"
      >
        {initial}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  )
}
