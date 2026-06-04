'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function LogoutButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
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
