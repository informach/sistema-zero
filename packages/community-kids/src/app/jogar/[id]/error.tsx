'use client'

import { useEffect } from 'react'
import { KidsMascot } from '@/components/kids/mascot'
import { reportClientError } from '@/lib/report-error'

/**
 * Error boundary da página PÚBLICA `/jogar/[id]` (sem login, aberta por
 * família/amigos). O `<Player>` renderiza FORA do try/catch da carga, então um
 * throw em render (canvas/WebGL perdido, snapshot legado malformado) cairia na
 * tela branca crua do Next — péssima primeira impressão. Aqui mostra um recado
 * gentil + "tentar de novo". Renderiza dentro do root layout (globals aplicados).
 */
export default function JogarError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Rota anônima → sem sessão, mas o beacon `/api/client-error` é same-origin e
    // sem gate de sessão: o crash do player chega ao Sentry mesmo aqui.
    console.error(error)
    reportClientError(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <KidsMascot expression="thinking" className="size-24" />
      <div>
        <h1 className="sz-display text-2xl">Ops! O jogo não quis abrir</h1>
        <p className="mt-1 text-muted-foreground">
          Pode ter sido um tropeço aqui. Tenta de novo? 🎮
        </p>
      </div>
      <button type="button" onClick={() => reset()} className="sz-btn-gradient h-11 px-6 text-base">
        Tentar de novo
      </button>
    </main>
  )
}
