'use client'

import { Button } from '@sistemazero/ui/button'
import { LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { KidsMascot } from '@/components/kids/mascot'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'

/** Logout reutilizável nos estados normais e terminais da grade de perfis. */
export function ProfileLogoutButton({
  disabled = false,
  onLoggingChange,
}: {
  disabled?: boolean
  onLoggingChange?: (logging: boolean) => void
}) {
  const [loggingOut, setLoggingOut] = useState(false)
  const locked = disabled || loggingOut

  async function logout() {
    if (locked) return
    setLoggingOut(true)
    onLoggingChange?.(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error(`logout failed with ${response.status}`)
      window.location.replace('/login')
    } catch {
      toast.error('Não foi possível sair agora. Verifique a conexão e tente novamente.')
      setLoggingOut(false)
      onLoggingChange?.(false)
    }
  }

  return (
    <Button variant="ghost" onClick={() => void logout()} disabled={locked}>
      <LogOut className="size-4" /> {loggingOut ? 'Saindo…' : 'Sair'}
    </Button>
  )
}

/**
 * A lista de perfis não pôde ser carregada. Esse estado é diferente de uma conta
 * realmente sem perfis: orientar a criação aqui poderia gerar duplicatas quando
 * o serviço se recuperar.
 */
export function ProfilesUnavailable({
  reason = 'profiles',
}: {
  reason?: 'profiles' | 'allowance'
}) {
  const router = useRouter()
  const allowanceUnavailable = reason === 'allowance'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <h1 className="sz-display mt-4 text-2xl text-foreground">
        {allowanceUnavailable
          ? 'Não foi possível verificar o acesso'
          : 'Não foi possível carregar os perfis'}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {allowanceUnavailable
          ? 'Pode ser uma instabilidade momentânea. Tente novamente antes de criar o primeiro perfil.'
          : 'Pode ser uma instabilidade momentânea. Tente novamente para ver os perfis da sua família.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button className="min-h-11" onClick={() => router.refresh()}>
          <RefreshCw className="size-4" /> Tentar de novo
        </Button>
        <ProfileLogoutButton />
      </div>
    </main>
  )
}

/** Conta válida, porém sem uma matrícula kids que conceda ao menos um perfil. */
export function ProfilesNotIncluded() {
  const router = useRouter()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <h1 className="sz-display mt-4 text-2xl text-foreground">Nenhum perfil liberado ainda</h1>
      <p className="mt-3 text-muted-foreground">
        Esta conta ainda não tem uma matrícula Kids que libere perfis. Conheça a Comunidade dos
        Criadores ou, se você acabou de comprar, verifique novamente.
      </p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={COMUNIDADE_OFERTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-bold text-primary-foreground transition-[transform,filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-px"
        >
          Conhecer a Comunidade dos Criadores
        </a>
        <Button variant="outline" className="min-h-11" onClick={() => router.refresh()}>
          <RefreshCw className="size-4" /> Já comprei
        </Button>
        <ProfileLogoutButton />
      </div>
    </main>
  )
}
