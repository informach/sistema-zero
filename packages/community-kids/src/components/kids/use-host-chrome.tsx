'use client'

import { useEffect, useMemo, useState } from 'react'
import { cloudStatusView } from '@/lib/cloud-status'
import type { CloudSyncState, CreationsCloud } from '@/lib/creations-cloud'
import {
  HOST_CHROME_MENU_LABELS,
  type HostChrome,
  type HostChromeMenu,
  type HostChromeStatus,
} from '@/lib/host-chrome'
import { useFocusMode } from './focus-mode'

/** O estado da fila da nuvem, reativo (era o subscribe do antigo `cloud-save-badge.tsx`). */
export function useCloudSyncState(cloud: CreationsCloud | null): CloudSyncState | null {
  const [state, setState] = useState<CloudSyncState | null>(() => cloud?.getState() ?? null)
  useEffect(() => {
    if (!cloud) {
      setState(null)
      return
    }
    setState(cloud.getState())
    return cloud.subscribe(setState)
  }, [cloud])
  return cloud ? state : null
}

/**
 * Monta o contrato `hostChrome` que as ferramentas embarcadas desenham na própria barra:
 * o botão do menu (do modo foco, só onde a sidebar existe) e o selo da nuvem (da fila de
 * `creations-cloud`). Tudo memoizado: o valor só troca quando algo VISÍVEL muda, senão
 * cada autosave re-renderizaria a barra da ferramenta.
 *
 * `announcement` é o texto da região viva do HOST (`HostChromeAnnouncer`), que fica fora
 * da ferramenta e sempre montada — trocar `aria-live` no mesmo commit em que o texto muda
 * pode não anunciar.
 */
export function useHostChrome({
  cloud,
  syncing = false,
}: {
  cloud: CreationsCloud | null
  syncing?: boolean
}): { chrome: HostChrome; announcement: string } {
  const { navAvailable, navHidden, toggleNav } = useFocusMode()
  const state = useCloudSyncState(cloud)

  const menu = useMemo<HostChromeMenu | null>(
    () =>
      navAvailable
        ? {
            hidden: navHidden,
            label: navHidden ? HOST_CHROME_MENU_LABELS.show : HOST_CHROME_MENU_LABELS.hide,
            onToggle: toggleNav,
          }
        : null,
    [navAvailable, navHidden, toggleNav],
  )
  const view = useMemo(() => cloudStatusView(state, syncing), [state, syncing])
  const status = useMemo<HostChromeStatus | null>(
    () => (view ? { tone: view.tone, icon: view.icon, label: view.label, text: view.text } : null),
    [view],
  )
  const chrome = useMemo<HostChrome>(() => ({ menu, status }), [menu, status])
  return { chrome, announcement: view?.announce ? view.text : '' }
}

/** Região viva do host: sempre montada, vazia fora de offline/erro. Irmã do app, nunca dentro. */
export function HostChromeAnnouncer({ text }: { text: string }) {
  return (
    <span aria-live="polite" className="sr-only">
      {text}
    </span>
  )
}
