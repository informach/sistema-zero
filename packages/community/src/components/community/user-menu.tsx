'use client'

import { ChevronRight, LogOut, Palette, Receipt, Trophy, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { stageBadgeOf, stageName, stageSpokenLabel, stageTinyLabel } from '@/lib/journey-stage'
import type { SessionUserWithAvatar } from '@/lib/types'
import { getUserDisplayName, getUserInitials } from '@/lib/user-display'
import { useAdultGamification } from './gamification-provider'
import { StageLine, StageRing } from './journey/stage'

/**
 * A imagem da pessoa na comunidade adulta: a foto do avatar 3D, como no Kids (direção de arte de
 * 18/10/2026). Sem avatar, as iniciais sobre a cor de ação. `avatarUrl` aqui já é a foto do
 * avatar (o layout a busca), nunca uma imagem enviada.
 */
export function PersonAvatar({
  user,
  className,
}: {
  user: Pick<SessionUserWithAvatar, 'avatarUrl' | 'firstName' | 'lastName' | 'email'>
  className?: string
}) {
  const base = cn(
    'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
    className,
  )
  if (user.avatarUrl)
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={cn(base, 'bg-(--acao-tint) object-cover')}
        loading="lazy"
      />
    )
  return (
    <span aria-hidden className={cn(base, 'bg-primary font-bold text-primary-foreground')}>
      {getUserInitials(user.firstName, user.lastName, user.email)}
    </span>
  )
}

/**
 * O menu do perfil (direção de arte de 18/10/2026): nome e e-mail no cabeçalho, Seu progresso (que
 * saiu da barra do topo) com o resumo da gamificação, avatar 3D, espaço 3D, perfil, compras e Sair.
 * É um painel que abre e fecha (botão com `aria-expanded`), não um `role="menu"`: sem as setas do
 * padrão de menu, o leitor de tela anunciaria um controle que não responde. Esc fecha e devolve o
 * foco ao botão; clicar fora ou levar o foco para fora (Tab depois de Sair) também fecha.
 * ⚠️ A cor mora em Meu perfil: dois lugares escrevendo o mesmo estado foi como o adulto e o kids
 * divergiram antes.
 */
export function UserMenu({
  user,
  variant = 'avatar',
}: {
  user: SessionUserWithAvatar
  /** `avatar`: a foto redonda da barra do celular, o painel abre para baixo. `card`: o cartão da
   *  pessoa no pé do menu lateral (foto, nome e etapa), o painel abre para cima. */
  variant?: 'avatar' | 'card'
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const gamification = useAdultGamification()
  const progress = gamification?.progress
  const name = getUserDisplayName(user.firstName, user.lastName, user.email)
  // A etapa da jornada (19/10/2026): o anel da cor em volta da foto e o nome da etapa no menu.
  const stage = stageBadgeOf(progress?.journey)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
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

  const close = () => setOpen(false)
  const item =
    'flex min-h-[3rem] w-full items-center gap-3.5 px-5 text-left text-foreground no-underline transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'

  return (
    <div
      className="relative"
      ref={ref}
      // Só quando o foco VAI para outro elemento fora (Tab): o clique fora já fecha pelo `mousedown`,
      // e sem `relatedTarget` (Safari não foca link no clique) fechar aqui engoliria o clique.
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (open && next && !ref.current?.contains(next)) setOpen(false)
      }}
    >
      {variant === 'card' ? (
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={`Menu do perfil de ${name}${stage ? `, ${stageSpokenLabel(stage)}` : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'flex w-full min-w-0 items-center gap-3 rounded-[1rem] bg-(--carta) p-3 text-left transition-colors hover:bg-(--carta-2)',
            open && 'shadow-[inset_0_0_0_2px_var(--cta)]',
          )}
        >
          <StageRing badge={stage} dark>
            <PersonAvatar user={user} className="size-[2.4rem] text-[0.85rem]" />
          </StageRing>
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="truncate text-(--texto-claro) text-[0.9rem]">{name}</strong>
            <span className="truncate text-(--legenda-clara) text-[0.85rem]">
              {stage ? `${stageTinyLabel(stage)} · ${stageName(stage)}` : 'Meu perfil'}
            </span>
          </span>
          <ChevronRight
            className={cn(
              'size-5 shrink-0 text-(--legenda-clara) transition-transform',
              open && '-rotate-90',
            )}
            aria-hidden
          />
        </button>
      ) : (
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={`Menu do perfil de ${name}${stage ? `, ${stageSpokenLabel(stage)}` : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'block rounded-full transition-opacity hover:opacity-90',
            // Com a jornada, o anel da etapa é a borda (aberto, um contorno branco em volta); sem
            // ela, a borda de sempre.
            !stage && 'border-2',
            !stage && (open ? 'border-white' : 'border-(--sz-community-action-light)'),
            stage && open && 'outline-2 outline-white outline-offset-2',
          )}
        >
          <StageRing badge={stage} dark>
            <PersonAvatar user={user} className="size-[2.4rem] text-[0.85rem]" />
          </StageRing>
        </button>
      )}
      {open ? (
        <div
          id={panelId}
          className={cn(
            'absolute z-50 w-[min(20rem,calc(100vw-1.6rem))] overflow-hidden rounded-[1rem] border border-border bg-popover text-popover-foreground shadow-[0_18px_40px_rgba(15,26,51,0.18)]',
            // Na barra do celular deitado, o painel cabe entre a barra e as abas e rola por dentro.
            variant === 'card'
              ? 'bottom-full left-0 mb-2'
              : 'right-0 mt-2 max-h-[calc(100dvh-8.5rem)] overflow-y-auto',
          )}
        >
          <div className="flex items-center gap-3.5 border-border border-b px-5 py-4">
            <StageRing badge={stage}>
              <PersonAvatar user={user} className="size-[3.2rem] text-[1rem]" />
            </StageRing>
            <div className="flex min-w-0 flex-col">
              <p className="truncate font-bold text-[1.05rem]">{name}</p>
              <p className="truncate text-[0.85rem] text-muted-foreground">{user.email}</p>
              {stage ? <StageLine badge={stage} className="mt-0.5" /> : null}
            </div>
          </div>
          <Link
            href="/progresso"
            prefetch={false}
            onClick={close}
            className={cn(item, 'min-h-[3.2rem] bg-background')}
          >
            <Trophy className="size-5 text-primary" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <strong>Seu progresso</strong>
              {progress ? (
                <span className="text-[0.85rem] text-muted-foreground">
                  {progress.xp} XP · sequência de {progress.streak.current}{' '}
                  {progress.streak.current === 1 ? 'dia' : 'dias'}
                </span>
              ) : null}
            </span>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
          <Link href="/meu-avatar" prefetch={false} onClick={close} className={item}>
            <User className="size-5" aria-hidden />
            <strong>Meu avatar 3D</strong>
          </Link>
          <Link href="/quarto" prefetch={false} onClick={close} className={item}>
            <User className="size-5" aria-hidden />
            <strong>Meu espaço 3D</strong>
          </Link>
          <Link href="/perfil" prefetch={false} onClick={close} className={item}>
            <Palette className="size-5" aria-hidden />
            <span className="flex flex-col">
              <strong>Meu perfil</strong>
              <span className="text-[0.85rem] text-muted-foreground">
                Dados, avatar, senha e cor da plataforma
              </span>
            </span>
          </Link>
          <Link href="/compras" prefetch={false} onClick={close} className={item}>
            <Receipt className="size-5" aria-hidden />
            <strong>Compras e assinatura</strong>
          </Link>
          <div className="border-border border-t" />
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className={cn(item, 'disabled:opacity-50')}
          >
            <LogOut className="size-5" aria-hidden />
            <strong>Sair</strong>
          </button>
        </div>
      ) : null}
    </div>
  )
}
