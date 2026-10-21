'use client'

import { buttonVariants } from '@sistemazero/ui/button'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { leaveStudy, studyErrorMessage } from '@/lib/study-access-client'

/**
 * A troca SEGURA do responsável para a criança: encerra a sessão adulta no servidor e só então
 * abre a escolha de perfis. Um link para `/perfis` deixava a sessão dos pais aberta no aparelho
 * que vai para a mão da criança. `destination` é a entrada do aluno (com o `next` de uma aula,
 * quando o responsável chegou por um link dela).
 */
export function StudentAreaButton({
  destination = '/perfis',
  className,
  disabled = false,
  shortLabel,
}: {
  destination?: string
  className?: string
  disabled?: boolean
  /** Rótulo curto para telas estreitas (a barra da área dos pais no celular). */
  shortLabel?: string
}) {
  const label = 'Ir para a área da criança'
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={shortLabel && !busy ? label : undefined}
      onClick={async () => {
        setBusy(true)
        try {
          await leaveStudy(destination)
        } catch (error) {
          toast.error(studyErrorMessage(error))
          setBusy(false)
        }
      }}
      className={
        className ?? cn(buttonVariants({ variant: 'secondary' }), 'min-h-11 rounded-full px-4')
      }
    >
      {/* As estrelinhas da entrada da criança ("Eu sou criador(a)"), não o chapéu de formatura. */}
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      {busy && shortLabel ? (
        <>
          <span className="sm:hidden">Abrindo…</span>
          <span className="hidden sm:inline">Abrindo a área da criança…</span>
        </>
      ) : busy ? (
        'Abrindo a área da criança…'
      ) : shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </button>
  )
}
