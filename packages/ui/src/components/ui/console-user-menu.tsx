'use client'

import { ExternalLink, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ConsoleAppLink } from '../../lib/console-apps'

export interface ConsoleUserMenuUser {
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
}

/**
 * O menu do avatar dos três consoles internos (admin, atendimento, marketing). Era uma cópia
 * por app; cada app passa só o que muda: a inicial de reserva, a rota de logout do seu BFF e
 * os links para os outros consoles (`consoleAppLinks`). Os links abrem em OUTRA aba — cada
 * console tem login próprio, e quem está trabalhando aqui não perde a tela.
 */
export function ConsoleUserMenu({
  user,
  fallbackInitial,
  logoutPath,
  apps = [],
  dropdownSide = 'down',
  dropdownAlign = 'right',
  roleLabel,
  triggerClassName,
}: {
  user: ConsoleUserMenuUser
  fallbackInitial: string
  logoutPath: string
  apps?: readonly ConsoleAppLink[]
  /** `up` p/ gatilhos rentes ao rodapé (footer da sidebar) — o menu abre acima. */
  dropdownSide?: 'down' | 'up'
  /**
   * Para que lado o menu cresce. `right` (padrão) alinha a borda direita com o gatilho, para o
   * avatar no canto direito da barra; `left` serve ao avatar no canto esquerdo de uma coluna.
   */
  dropdownAlign?: 'left' | 'right'
  /** O papel escrito para gente ("Equipe"); sem ele, o menu mostra o papel cru. */
  roleLabel?: string
  /** Troca o visual do gatilho (o avatar sobre um fundo escuro, por exemplo). */
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? fallbackInitial).toUpperCase()
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
      await fetch(logoutPath, { method: 'POST' })
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
        className={
          triggerClassName ??
          'flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-foreground transition-colors hover:bg-primary/25'
        }
        aria-label="Conta"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open ? (
        <div
          className={`absolute ${dropdownAlign === 'left' ? 'left-0' : 'right-0'} z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ${
            dropdownSide === 'up' ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className={`mt-1 text-xs text-muted-foreground ${roleLabel ? '' : 'capitalize'}`}>
              {roleLabel ?? user.role}
            </p>
          </div>
          {apps.length > 0 ? (
            <div className="border-b border-border py-1">
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Apps
              </p>
              {apps.map((app) => (
                <a
                  key={app.id}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{app.label}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              ))}
            </div>
          ) : null}
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
