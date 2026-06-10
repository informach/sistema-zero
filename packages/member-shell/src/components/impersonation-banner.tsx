'use client'

import { LogOut, ShieldAlert } from 'lucide-react'
import { useState } from 'react'

/**
 * Faixa PERSISTENTE da sessão de impersonação (suporte): deixa explícito que um
 * admin está navegando como o aluno e oferece o encerramento. "Encerrar" = logout
 * normal (revoga a família de refresh no auth — a sessão de suporte morre de vez).
 */
export function ImpersonationBanner({
  studentName,
  actorName,
}: {
  studentName: string
  actorName: string
}) {
  const [busy, setBusy] = useState(false)

  async function endSession() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Navegação de DOCUMENTO (mesma régua do logout do user-menu): muda cookies
      // HttpOnly e descarta o router cache com dados RSC da sessão impersonada.
      window.location.replace('/login')
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500/15 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
      <ShieldAlert className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 truncate">
        Sessão de suporte: você ({actorName}) está navegando como{' '}
        <strong className="font-semibold">{studentName}</strong>.
      </p>
      <button
        type="button"
        onClick={endSession}
        disabled={busy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-600/40 px-2 py-0.5 font-medium hover:bg-amber-500/20 disabled:opacity-50"
      >
        <LogOut className="size-3.5" aria-hidden />
        Encerrar
      </button>
    </div>
  )
}
