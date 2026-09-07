'use client'

import {
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  type LucideIcon,
  TriangleAlert,
} from 'lucide-react'
import { cloudStatusView } from '@/lib/cloud-status'
import type { CreationsCloud } from '@/lib/creations-cloud'
import type { HostChromeIcon, HostChromeTone } from '@/lib/host-chrome'
import { useCloudSyncState } from './use-host-chrome'

/**
 * O selo "Guardado na sua conta" como CAMADA do host, ACIMA do app.
 *
 * ⚠️ INTERINO (07/09/2026): só o `/molda` ainda o usa. Pinta, Estúdio e Pensa desenham
 * o selo DENTRO da própria barra pelo contrato `hostChrome` (`use-host-chrome.tsx`); o
 * Molda segue quando o pacote sair da obra da outra sessão (lote 6b), e aí este arquivo
 * some. A copy e os estados vêm da MESMA função pura (`cloudStatusView`), então os dois
 * caminhos nunca divergem.
 */
const ICONS: Record<HostChromeIcon, LucideIcon> = {
  upload: CloudUpload,
  download: CloudDownload,
  cloud: Cloud,
  offline: CloudOff,
  alert: TriangleAlert,
}

const TONES: Record<HostChromeTone, string> = {
  muted: 'text-muted-foreground',
  ok: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  danger: 'text-destructive',
}

export function CloudSaveBadge({
  cloud,
  syncing = false,
}: {
  cloud: CreationsCloud | null
  /** A DESCIDA está em andamento (o host sabe: `pullMissing`/reconcile em voo). */
  syncing?: boolean
}) {
  const state = useCloudSyncState(cloud)
  const view = cloudStatusView(state, syncing)
  if (!view) return null
  const Icon = ICONS[view.icon]
  // Só os estados que pedem atenção são ANUNCIADOS (leitor de tela): o guardando↔guardado de
  // cada autosave repetia o recado a cada ciclo. A região viva existe SEMPRE (vazia nos outros
  // estados): trocar `aria-live` no mesmo commit em que o texto muda pode não anunciar.
  return (
    <>
      <span aria-live="polite" className="sr-only">
        {view.announce ? view.text : ''}
      </span>
      <div
        role="status"
        aria-live="off"
        className={`m-1 inline-flex max-w-full items-center justify-end gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold shadow-sm ring-1 ring-border ${TONES[view.tone]}`}
      >
        <Icon aria-hidden="true" className="size-4" />
        <span>{view.text}</span>
      </div>
    </>
  )
}
