'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { LogOut, Moon, Sun, User, Users } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { profileMenuSubtitle } from '@/lib/gamification-label'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'
import { KidsAvatar } from './kids-avatar'

/**
 * Menu do avatar: cabeçalho com foto + nome + colocação no ranking/XP (NÃO o
 * e-mail dos pais — decisão 06/2026), itens Meu perfil/Mudar tema e Sair. SEM
 * "Compras" (decisão da v1 kids: a compra é do RESPONSÁVEL — histórico financeiro
 * não aparece na área da criança). Dropdown custom; `direction="up"` abre PARA
 * CIMA (rodapé da sidebar do desktop).
 */
export function UserMenu({
  user,
  gamification = null,
  avatarPhotoUrl = null,
  direction = 'down',
}: {
  user: SessionUserWithAvatar
  gamification?: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil. Em sessão de perfil mostra sempre o KidsAvatar
   *  (foto OU personagem padrão); na conta cai na foto/iniciais do responsável. */
  avatarPhotoUrl?: string | null
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

  // Em sessão de PERFIL o `user` já chega com a identidade da CRIANÇA (o layout
  // troca nome/foto pelo perfil ativo). O subtítulo mostra ranking/XP (não o e-mail).
  const isProfile = Boolean(user.activeProfile)
  const subtitle = profileMenuSubtitle(gamification, isProfile)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full transition-opacity hover:opacity-85"
        aria-label="Conta"
        aria-expanded={open}
      >
        {isProfile ? (
          <KidsAvatar photoUrl={avatarPhotoUrl} size="sm" />
        ) : (
          <UserAvatar
            avatarUrl={user.avatarUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            size="sm"
          />
        )}
      </button>
      {open ? (
        <div
          className={`absolute z-50 w-72 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ${
            direction === 'up' ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'
          }`}
        >
          {/* Cabeçalho: avatar à esquerda + nome (do perfil ativo, se houver) */}
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            {isProfile ? (
              <KidsAvatar photoUrl={avatarPhotoUrl} size="md" />
            ) : (
              <UserAvatar
                avatarUrl={user.avatarUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                email={user.email}
                size="lg"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm">
                {getUserDisplayName(user.firstName, user.lastName, user.email)}
              </p>
              {subtitle ? (
                <p className="truncate text-muted-foreground text-xs">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {/* Voltar à grade de perfis (trocar de criança / abrir a área dos pais). */}
          <Link href="/perfis" onClick={() => setOpen(false)} className={itemClass}>
            <Users className="size-4" />
            Trocar de perfil
          </Link>
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
