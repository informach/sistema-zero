'use client'

import { Cloud, CloudDownload, CloudOff, CloudUpload, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CloudSyncState, CreationsCloud } from '@/lib/creations-cloud'

/**
 * O selo "Guardado na sua conta" (18/08/2026): a ÚNICA confirmação visível de que o
 * jogo/desenho subiu para a nuvem. Vive no HOST (acima do Pinta/Estúdio), sem
 * tocar no cabeçalho dos pacotes. Estados honestos, na linguagem da criança:
 * guardando · guardado · sem internet (guarda quando voltar) · não consegui.
 * `unsupported` (navegador sem `CompressionStream`) e `idle` antes da 1ª mudança
 * não mostram nada — não é o momento de falar de nuvem.
 */
export function CloudSaveBadge({
  cloud,
  syncing = false,
}: {
  cloud: CreationsCloud | null
  /** A DESCIDA está em andamento (o host sabe: `pullMissing`/reconcile em voo). */
  syncing?: boolean
}) {
  const [state, setState] = useState<CloudSyncState | null>(cloud?.getState() ?? null)
  useEffect(() => {
    if (!cloud) return
    setState(cloud.getState())
    return cloud.subscribe(setState)
  }, [cloud])
  if (!cloud || !state) return null

  const view =
    state.status === 'saving'
      ? { icon: CloudUpload, text: 'Guardando na sua conta…', tone: 'text-muted-foreground' }
      : syncing && (state.status === 'idle' || state.status === 'saved')
        ? {
            icon: CloudDownload,
            text: 'Buscando o que você guardou na sua conta…',
            tone: 'text-muted-foreground',
          }
        : state.status === 'saved'
          ? {
              icon: Cloud,
              text: 'Guardado na sua conta',
              tone: 'text-emerald-700 dark:text-emerald-300',
            }
          : state.status === 'offline'
            ? {
                icon: CloudOff,
                text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
                tone: 'text-amber-700 dark:text-amber-300',
              }
            : state.status === 'error'
              ? {
                  icon: TriangleAlert,
                  text: state.lastError ?? 'Não consegui guardar na sua conta.',
                  tone: 'text-destructive',
                }
              : null
  if (!view) return null
  const Icon = view.icon
  // Só os estados que pedem atenção são ANUNCIADOS (leitor de tela): o guardando↔guardado de
  // cada autosave repetia o recado a cada ciclo. A região viva existe SEMPRE (vazia nos outros
  // estados): trocar `aria-live` no mesmo commit em que o texto muda pode não anunciar.
  const announce = state.status === 'offline' || state.status === 'error'
  return (
    <>
      <span aria-live="polite" className="sr-only">
        {announce ? view.text : ''}
      </span>
      <div
        role="status"
        aria-live="off"
        // Pílula com fundo: no Estúdio o selo é uma camada por cima da lista/editor.
        className={`m-1 inline-flex max-w-full items-center justify-end gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold shadow-sm ring-1 ring-border ${view.tone}`}
      >
        <Icon aria-hidden="true" className="size-4" />
        <span>{view.text}</span>
      </div>
    </>
  )
}
