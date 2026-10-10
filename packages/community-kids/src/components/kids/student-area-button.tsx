'use client'

import { buttonVariants } from '@sistemazero/ui/button'
import { GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { leaveStudy, studyErrorMessage } from '@/lib/study-access-client'

/**
 * A troca SEGURA do responsável para a criança: encerra a sessão adulta no servidor e só então
 * abre a escolha de perfis. Um link para `/perfis` deixava a sessão dos pais aberta no aparelho
 * que vai para a mão da criança. `destination` é a entrada do aluno (com o `next` de uma fase,
 * quando o responsável chegou por um link dela).
 */
export function StudentAreaButton({
  destination = '/perfis',
  className,
  disabled = false,
}: {
  destination?: string
  className?: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
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
      <GraduationCap className="size-4" aria-hidden="true" />
      {busy ? 'Abrindo a área do aluno…' : 'Ir para a área do aluno'}
    </button>
  )
}
