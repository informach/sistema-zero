'use client'

// O CSS do Estúdio é gerado pelo `@import` no globals.css (pipeline Tailwind) — ver
// o comentário no `studio-full-client.tsx`. Aqui só orquestramos o editor PRO.
import { StudioProEditor } from '@sistemazero/member-shell/components/studio/studio-pro-editor'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import type { StudioTutorConfig } from '@sistemazero/studio'
import { useTheme } from 'next-themes'
import { useCallback, useMemo } from 'react'

/**
 * Wrapper KIDS fino da rota `/estudio/pro/[id]` (modo Código / WebContainer): provê
 * o tema da comunidade (next-themes) + a volta p/ a lista ao `<StudioProEditor>` do
 * member-shell (reusável pelo adulto). A rota é a ÚNICA com COOP/COEP (headers
 * escopados no next.config) — por isso o PRO abre aqui, não no `/estudio` clássico.
 */
export function StudioProClient({
  viewerId,
  projectId,
  zappyEnabled = false,
}: {
  viewerId: string | null
  projectId: string
  /** Capacidade de oferta derivada no servidor; o BFF mantém o gate autoritativo. */
  zappyEnabled?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  // Carga COMPLETA (não soft-nav): sair da rota PRO larga o cross-origin isolation
  // (COEP) limpo, evitando que o /estudio clássico herde o COEP do documento isolado.
  const onExit = useCallback(() => window.location.assign('/estudio'), [])
  const tutor = useMemo<StudioTutorConfig | undefined>(
    () => (zappyEnabled ? { adapter: createStudioZappyAdapter(), cooldownMs: 1_500 } : undefined),
    [zappyEnabled],
  )

  return (
    <div className="min-h-[34rem] w-full flex-1 overflow-hidden rounded-2xl border-2 border-border bg-card">
      <StudioProEditor
        viewerId={viewerId}
        projectId={projectId}
        theme={theme}
        onExit={onExit}
        tutor={tutor}
      />
    </div>
  )
}
