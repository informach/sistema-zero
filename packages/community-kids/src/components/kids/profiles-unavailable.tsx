'use client'

import { Button } from '@sistemazero/ui/button'
import { LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { KIDS_SCREEN_BAND } from '@/components/kids/kids-screen'
import { KidsMascot } from '@/components/kids/mascot'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'
import { KidsRecado } from './kids-recado'

/** Logout reutilizável nos estados normais e terminais da grade de perfis. */
export function ProfileLogoutButton({
  disabled = false,
  onLoggingChange,
  className,
}: {
  disabled?: boolean
  onLoggingChange?: (logging: boolean) => void
  /** Telas terminais passam `min-h-11` para casar com os vizinhos de 44px. */
  className?: string
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
    <Button variant="ghost" className={className} onClick={() => void logout()} disabled={locked}>
      <LogOut className="size-4" /> {loggingOut ? 'Saindo…' : 'Sair'}
    </Button>
  )
}

/**
 * A lista de perfis não pôde ser carregada. Esse estado é diferente de uma conta
 * realmente sem perfis: orientar a criação aqui poderia gerar duplicatas quando
 * o serviço se recuperar.
 *
 * No molde das telas de recado (`KidsRecado`, 11/09/2026), numa tela inteira: a faixa
 * creme de cima a baixo, o cartão branco e os botões em pílula.
 */
export function ProfilesUnavailable({
  reason = 'profiles',
}: {
  reason?: 'profiles' | 'allowance'
}) {
  const router = useRouter()
  const allowanceUnavailable = reason === 'allowance'

  return (
    <main className="flex min-h-dvh flex-col">
      <KidsRecado
        bandClassName={KIDS_SCREEN_BAND}
        art={<KidsMascot expression="thinking" className="size-24" />}
        title={
          allowanceUnavailable
            ? 'Não foi possível verificar o acesso'
            : 'Não foi possível carregar os perfis'
        }
        actions={
          <>
            <button type="button" className="sz-btn-gradient" onClick={() => router.refresh()}>
              <RefreshCw className="size-4" aria-hidden /> Tentar de novo
            </button>
            <ProfileLogoutButton className="min-h-11 rounded-full" />
          </>
        }
      >
        <p>
          {allowanceUnavailable
            ? 'Pode ser uma instabilidade momentânea. Tente novamente antes de criar o primeiro perfil.'
            : 'Pode ser uma instabilidade momentânea. Tente novamente para ver os perfis da sua família.'}
        </p>
      </KidsRecado>
    </main>
  )
}

/** Conta válida, porém sem uma matrícula kids que conceda ao menos um perfil. */
export function ProfilesNotIncluded() {
  const router = useRouter()

  return (
    <main className="flex min-h-dvh flex-col">
      <KidsRecado
        bandClassName={KIDS_SCREEN_BAND}
        art={<KidsMascot expression="thinking" className="size-24" />}
        title="Nenhum perfil liberado ainda"
        actions={
          // O CTA é a ação principal e o rótulo é longo: fica sozinho em largura total (padrão
          // do `KidsLockedProduct`). Dividir a linha com os secundários espremia a pílula.
          <div className="flex w-full flex-col items-stretch gap-3">
            <a
              href={COMUNIDADE_OFERTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sz-btn-gradient h-12 w-full px-6 text-base"
            >
              Conhecer a Comunidade dos Criadores
            </a>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="sz-btn-gradient sz-btn-contorno"
                onClick={() => router.refresh()}
              >
                <RefreshCw className="size-4" aria-hidden /> Já comprei
              </button>
              <ProfileLogoutButton className="min-h-11 rounded-full" />
            </div>
          </div>
        }
      >
        <p>
          Esta conta ainda não tem um acesso Kids que libere perfis para as crianças. Conheça a
          Comunidade dos Criadores. Se você acabou de comprar, toque em "Já comprei".
        </p>
      </KidsRecado>
    </main>
  )
}
