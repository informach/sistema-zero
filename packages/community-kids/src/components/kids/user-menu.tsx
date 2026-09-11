'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { LogOut, Palette, User, Users } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { profileMenuSubtitle } from '@/lib/gamification-label'
import { levelInfo } from '@/lib/level-info'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'
import { AvatarWithAura } from './avatar-with-aura'
import { LevelBadge } from './level-badge'

/**
 * As iniciais do responsável (sessão da CONTA, sem foto) no `UserAvatar` do member-shell são
 * tinta escura sobre a ação a 15%, e sumiam na âncora escura. As classes do componente vêm
 * DEPOIS do `className`, então quem vence é o seletor de filho, aplicado só onde ele pousa no
 * escuro (o cabeçalho do menu suspenso, branco, continua como é).
 */
const AVATAR_SOBRE_O_ESCURO = '[&>span]:bg-primary [&>span]:text-primary-foreground'

/**
 * Menu do avatar: cabeçalho com foto + nome + colocação no ranking/XP (NÃO o
 * e-mail dos pais — decisão 06/2026), itens Meu perfil/Mudar tema e Sair. SEM
 * "Compras" (decisão da v1 kids: a compra é do RESPONSÁVEL — histórico financeiro
 * não aparece na área da criança). Dropdown custom.
 *
 * Duas roupas do MESMO botão, as duas sobre a âncora escura do Pen:
 *  - `avatar` (top bar do celular): só o círculo, abre para baixo;
 *  - `card` (rodapé do menu, telas-modelo de 11/09/2026): o cartão INTEIRO, em branco a
 *    8%, é o botão, com o avatar, o nome e o nível de verdade (`LEVEL_INFO`, nunca o
 *    rótulo da imagem), e o menu abre para cima, na largura do cartão.
 */
export function UserMenu({
  user,
  gamification = null,
  avatarPhotoUrl = null,
  direction = 'down',
  variant = 'avatar',
}: {
  user: SessionUserWithAvatar
  gamification?: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil. Em sessão de perfil mostra sempre o KidsAvatar
   *  (foto OU a inicial); na conta cai na foto/iniciais do responsável. */
  avatarPhotoUrl?: string | null
  direction?: 'up' | 'down'
  variant?: 'avatar' | 'card'
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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

  // Padrão ⇄ Pink. O ícone é um só, então não precisa esperar a hidratação (o Sol/Lua de antes
  // dependia do tema guardado e só aparecia depois de montar).
  const isPink = resolvedTheme === 'pink'
  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted'

  // Em sessão de PERFIL o `user` já chega com a identidade da CRIANÇA (o layout
  // troca nome/foto pelo perfil ativo). O subtítulo mostra ranking/XP (não o e-mail).
  const isProfile = Boolean(user.activeProfile)
  const subtitle = profileMenuSubtitle(gamification, isProfile)
  const levelSlug = gamification?.level?.slug
  const displayName = user.firstName || 'Aluno'
  const card = variant === 'card'

  const avatar = (size: 'sm' | 'md') =>
    isProfile ? (
      <AvatarWithAura photoUrl={avatarPhotoUrl} name={displayName} size={size} />
    ) : (
      <UserAvatar
        avatarUrl={user.avatarUrl}
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        size={size === 'sm' ? 'sm' : 'lg'}
      />
    )

  return (
    <div className={cn('relative', card && 'w-full')} ref={ref}>
      {card ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          // O cartão do rodapé do menu escuro do Pen: branco a 8%, nome em branco e o nível
          // no cinza do menu.
          className="flex h-16 w-full items-center gap-3 rounded-2xl bg-(--menu-vidro) px-3 text-left text-white transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          {/* O nome falado é o que está escrito no cartão, com o papel do botão antes:
              "Menu da conta, Lipe, Construtor(a)". */}
          <span className="sr-only">Menu da conta, </span>
          <span className={cn('shrink-0', !isProfile && AVATAR_SOBRE_O_ESCURO)}>
            {isProfile ? (
              <AvatarWithAura
                photoUrl={avatarPhotoUrl}
                name={displayName}
                size="sm"
                className="size-10"
              />
            ) : (
              avatar('sm')
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold text-[0.9375rem] leading-tight">
              {displayName}
            </span>
            {isProfile && levelSlug ? (
              <span className="mt-0.5 block truncate text-(--menu-icone) text-[0.8125rem]">
                {levelInfo(levelSlug).label}
              </span>
            ) : subtitle ? (
              <span className="mt-0.5 block truncate text-(--menu-icone) text-[0.8125rem]">
                {subtitle}
              </span>
            ) : null}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'rounded-full transition-opacity hover:opacity-85',
            !isProfile && AVATAR_SOBRE_O_ESCURO,
          )}
          aria-label="Conta"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {avatar('sm')}
        </button>
      )}
      {open ? (
        <div
          className={cn(
            'absolute z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg',
            card ? 'inset-x-0 bottom-full mb-2' : 'w-72',
            !card && (direction === 'up' ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'),
          )}
        >
          {/* Cabeçalho: avatar à esquerda + nome (do perfil ativo, se houver) */}
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            {avatar('md')}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm">
                {getUserDisplayName(user.firstName, user.lastName, user.email)}
              </p>
              {isProfile ? <LevelBadge levelSlug={levelSlug} size="sm" className="mt-1" /> : null}
              {subtitle ? (
                <p className="mt-1 truncate text-muted-foreground text-xs">{subtitle}</p>
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
          <button
            type="button"
            onClick={() => setTheme(isPink ? 'padrao' : 'pink')}
            className={itemClass}
          >
            <Palette className="size-4" />
            Mudar tema
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className={`${itemClass} disabled:opacity-50`}
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  )
}
