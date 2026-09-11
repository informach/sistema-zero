'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CLOUD_ACCOUNT_COPY, cloudStatusView } from '@/lib/cloud-status'
import type { CloudSyncState, CreationsCloud } from '@/lib/creations-cloud'
import {
  HOST_CHROME_MENU_LABELS,
  type HostChrome,
  type HostChromeAccount,
  type HostChromeBack,
  type HostChromeMenu,
  type HostChromeStatus,
} from '@/lib/host-chrome'
import { useFocusMode } from './focus-mode'
import { backToSection } from './nav'

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
 * o botão do menu (do modo foco, só onde a sidebar existe), o selo da nuvem (da fila de
 * `creations-cloud`), a seta das galerias de volta à seção-mãe (do `backToSection` do
 * menu) e o sinal de que a nuvem da conta está ligada. Tudo memoizado: o valor só troca
 * quando algo VISÍVEL muda, senão cada autosave re-renderizaria a barra da ferramenta.
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
  const router = useRouter()
  const pathname = usePathname() ?? ''

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
  // A seta volta para a página principal da seção (Criar, para as quatro ferramentas). O
  // `router` do App Router é estável, e a rota não muda entre a galeria e o editor (a troca
  // é estado de dentro da ferramenta), então o objeto só nasce de novo se a rota mudar.
  const section = useMemo(() => backToSection(pathname), [pathname])
  const back = useMemo<HostChromeBack | null>(
    () =>
      section
        ? {
            text: section.text,
            label: section.label,
            href: section.href,
            onNavigate: () => router.push(section.href),
          }
        : null,
    [section, router],
  )
  // Ligada = existe a fila (há perfil e a ferramenta guarda na conta) e o navegador consegue
  // guardar. É um BOOLEANO de propósito: o guardando↔guardado de cada autosave muda o
  // `status`, não a conta, e não pode trocar a identidade deste objeto.
  const accountOn = state !== null && state.status !== 'unsupported'
  const account = useMemo<HostChromeAccount | null>(
    () => (accountOn ? { label: CLOUD_ACCOUNT_COPY.label } : null),
    [accountOn],
  )
  const chrome = useMemo<HostChrome>(
    () => ({ menu, status, back, account }),
    [menu, status, back, account],
  )
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
