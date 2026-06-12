'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { LogOut, Moon, Sun, User } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'

/**
 * Menu do avatar: cabeçalho com foto + nome + e-mail, itens Meu perfil/Mudar
 * tema e Sair. SEM "Compras" (decisão da v1 kids: a compra é do RESPONSÁVEL —
 * histórico financeiro não aparece na área da criança). Dropdown custom;
 * `direction="up"` abre PARA CIMA (rodapé da sidebar do desktop).
 */
export function UserMenu({
  user,
  direction = 'down',
}: {
  user: SessionUserWithAvatar
  direction?: 'up' | 'down'
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

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
      // load também descarta o router cache com dados RSC do usuário deslogado.
      window.location.replace('/login')
    }
  }

  const isDark = resolvedTheme === 'dark'
  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full transition-opacity hover:opacity-85"
        aria-label="Conta"
        aria-expanded={open}
      >
        <UserAvatar
          avatarUrl={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          size="sm"
        />
      </button>
      {open ? (
        <div
          className={`absolute z-50 w-72 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ${
            direction === 'up' ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'
          }`}
        >
          {/* Cabeçalho: avatar à esquerda + nome/e-mail */}
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <UserAvatar
              avatarUrl={user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {getUserDisplayName(user.firstName, user.lastName, user.email)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Link href="/perfil" onClick={() => setOpen(false)} className={itemClass}>
            <User className="size-4" />
            Meu perfil
          </Link>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={itemClass}>
            {mounted && !isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Mudar tema
          </button>
          <div className="border-t border-border" />
          <button onClick={logout} disabled={busy} className={`${itemClass} disabled:opacity-50`}>
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  )
}
