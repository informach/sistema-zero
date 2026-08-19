'use client'

// O CSS do Estúdio é gerado pelo `@import` no globals.css (pipeline Tailwind) — ver
// o comentário no `studio-full-client.tsx`. Aqui só orquestramos o editor PRO.
import { StudioProEditor } from '@sistemazero/member-shell/components/studio/studio-pro-editor'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import type { StudioTutorConfig } from '@sistemazero/studio'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '../../lib/creations-cloud'
import { createStudioCloudSync } from '../../lib/studio-cloud'
import { openStudioZappyLesson } from '../../lib/studio-zappy-navigation'
import { CloudSaveBadge } from './cloud-save-badge'
import { EMBEDDED_STUDIO_FRAME } from './embedded-app-loading'

/** Teto da espera pela fila ao sair do editor PRO (a fila segue sozinha; o /estudio completa). */
const EXIT_FLUSH_TIMEOUT_MS = 3000

/**
 * Wrapper KIDS fino da rota `/estudio/pro/[id]` (modo Código / WebContainer): provê
 * o tema da comunidade (next-themes) + a volta p/ a lista ao `<StudioProEditor>` do
 * member-shell (reusável pelo adulto). A rota é a ÚNICA com COOP/COEP (headers
 * escopados no next.config) — por isso o PRO abre aqui, não no `/estudio` clássico.
 *
 * "Guardado na sua conta": esta rota também liga o espelho da nuvem (só o `attach`;
 * a DESCIDA acontece na lista do `/estudio`, que é por onde a criança chega aqui) —
 * senão as edições no modo Código só subiam na próxima visita à lista.
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
  const [cloud, setCloud] = useState<CreationsCloud | null>(null)
  // Carga COMPLETA (não soft-nav): sair da rota PRO larga o cross-origin isolation
  // (COEP) limpo, evitando que o /estudio clássico herde o COEP do documento isolado.
  // Antes de sair, o que estiver pendente sobe — com TETO: sem internet (a fila espera o
  // backoff) ou com um projeto de vários MB, a criança não pode ficar presa no editor. O
  // `pagehide` da fila também cobre, e o `/estudio` reconcilia e sobe o que ficou.
  const onExit = useCallback(() => {
    const leave = () => window.location.assign('/estudio')
    if (!cloud) return leave()
    if (cloud.getState().status === 'offline') return leave()
    void cloud.flush({ timeoutMs: EXIT_FLUSH_TIMEOUT_MS }).finally(leave)
  }, [cloud])
  const tutor = useMemo<StudioTutorConfig | undefined>(
    () =>
      zappyEnabled
        ? {
            adapter: createStudioZappyAdapter(),
            openLesson: openStudioZappyLesson,
            cooldownMs: 1_500,
          }
        : undefined,
    [zappyEnabled],
  )

  // Espelho da nuvem (só com PERFIL). O módulo do Estúdio é o mesmo que o editor PRO
  // carrega (o `setStudioCloudMirror` é global no pacote); o namespace por viewer é
  // definido pelo próprio editor antes de gravar.
  useEffect(() => {
    if (!viewerId) return
    let active = true
    let detach: (() => void) | null = null
    let created: CreationsCloud | null = null
    void (async () => {
      const m = await import('@sistemazero/studio')
      if (!active) return
      created = createCreationsCloud({ tool: 'studio', viewerId, idleMs: 10_000 })
      detach = createStudioCloudSync({ studio: m, cloud: created, viewerId }).attach()
      setCloud(created)
    })()
    return () => {
      active = false
      detach?.()
      const current = created
      if (current)
        void current.flush({ timeoutMs: EXIT_FLUSH_TIMEOUT_MS }).finally(() => current.dispose())
      setCloud(null)
    }
  }, [viewerId])

  return (
    // O card daqui era órfão: saiu dos outros três em 08/2026 e ficou. Não era só
    // cosmético — o `estudio/loading.tsx` TAMBÉM cobre `/estudio/pro/[id]`, então
    // a espera vinha sem card e o editor entrava dentro de um.
    // A moldura segue BLOCO (o editor se dimensiona por `h-full`); o selo da nuvem é
    // uma camada por cima, no canto, para não roubar altura do editor.
    <div className={`${EMBEDDED_STUDIO_FRAME} relative`}>
      {/* Canto INFERIOR: no topo o selo cobria os botões da direita da Topbar do editor. */}
      <div className="pointer-events-none absolute right-2 bottom-2 z-10">
        <CloudSaveBadge cloud={cloud} />
      </div>
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
