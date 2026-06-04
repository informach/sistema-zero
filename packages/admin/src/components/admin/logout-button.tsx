'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }
  return (
    <Button variant={variant} onClick={logout} disabled={busy}>
      {busy ? <Spinner /> : null}
      Sair
    </Button>
  )
}
