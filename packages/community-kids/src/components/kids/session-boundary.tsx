'use client'

import { pageSessionId } from '@sistemazero/member-shell/lib/session-fetch'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useEffect, useState } from 'react'

/**
 * O que a pessoa lê quando a sessão desta página não é mais a do navegador. O botão diz para
 * onde vai: a criança volta à escolha de perfis; o responsável reabre a área dos pais, que
 * pede o login de novo se a sessão adulta acabou.
 */
const COPY = {
  student: {
    text: 'Para não misturar as criações, abra de novo com o seu perfil. O que já foi guardado continua guardado.',
    action: 'Continuar com meu perfil',
    href: '/perfis',
  },
  parent: {
    text: 'A área dos pais desta página foi trocada ou encerrada. Abra de novo para continuar com os seus dados.',
    action: 'Abrir a área dos pais',
    href: '/pais',
  },
} as const

export function SessionBoundary({ kind }: { kind: 'parent' | 'student' }) {
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    // Captura a identidade antes de qualquer troca de perfil neste navegador.
    const original = pageSessionId()
    let disposed = false
    let checking = false
    const changed = () => setChanged(true)
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'sz:kids:session-change') setChanged(true)
    }
    const check = async () => {
      if (document.visibilityState === 'hidden' || checking) return
      checking = true
      try {
        const response = await fetch('/api/study/session', {
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        })
        if (!response.ok) return
        const current: { sessionId?: string | null } = await response.json()
        if (!disposed && current.sessionId !== original) setChanged(true)
      } catch {
        /* Rede fora não significa troca de perfil. */
      } finally {
        checking = false
      }
    }
    window.addEventListener('sz:session-changed', changed)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', check)
    window.addEventListener('pageshow', check)
    document.addEventListener('visibilitychange', check)
    void check()
    const timer = window.setInterval(check, 60_000)
    return () => {
      disposed = true
      window.removeEventListener('sz:session-changed', changed)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', check)
      window.removeEventListener('pageshow', check)
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [])
  const copy = COPY[kind]
  // Fechar (o X, o Esc ou o fundo) também revalida: continuar nesta página salvaria em nome
  // de quem não está mais aqui. Não há "fechar e seguir" — só o caminho de volta.
  const reopen = () => window.location.assign(copy.href)
  return (
    <Dialog
      open={changed}
      onClose={reopen}
      closeLabel="Fechar e abrir de novo"
      title="O perfil mudou em outra aba"
      footer={
        <Button onClick={reopen} className="min-h-11 rounded-full px-4">
          {copy.action}
        </Button>
      }
    >
      <p>{copy.text}</p>
    </Dialog>
  )
}
