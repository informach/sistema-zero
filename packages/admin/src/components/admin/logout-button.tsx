'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { useState } from 'react'

export function LogoutButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      // Navegação de DOCUMENTO: logout muda cookies HttpOnly e `router.replace +
      // router.refresh` corre um contra o outro (vercel/next.js#54766); o full
      // load também descarta o router cache com dados RSC da sessão encerrada.
      window.location.replace('/login')
    }
  }
  return (
    <Button variant={variant} onClick={logout} disabled={busy}>
      {busy ? <Spinner /> : null}
      Sair
    </Button>
  )
}
