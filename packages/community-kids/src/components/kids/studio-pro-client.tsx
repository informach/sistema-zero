'use client'

// O CSS do Estúdio é gerado pelo `@import` no globals.css (pipeline Tailwind) — ver
// o comentário no `studio-full-client.tsx`. Aqui só orquestramos o editor PRO.
import { StudioProEditor } from '@sistemazero/member-shell/components/studio/studio-pro-editor'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback } from 'react'

/**
 * Wrapper KIDS fino da rota `/estudio/pro/[id]` (modo Código / WebContainer): provê
 * o tema da comunidade (next-themes) + a volta p/ a lista ao `<StudioProEditor>` do
 * member-shell (reusável pelo adulto). A rota é a ÚNICA com COOP/COEP (headers
 * escopados no next.config) — por isso o PRO abre aqui, não no `/estudio` clássico.
 */
export function StudioProClient({
  viewerId,
  projectId,
}: {
  viewerId: string | null
  projectId: string
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  const onExit = useCallback(() => router.push('/estudio'), [router])

  return (
    <div className="min-h-[34rem] w-full flex-1 overflow-hidden rounded-2xl border-2 border-border bg-card">
      <StudioProEditor viewerId={viewerId} projectId={projectId} theme={theme} onExit={onExit} />
    </div>
  )
}
