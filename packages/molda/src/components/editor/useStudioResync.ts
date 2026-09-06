import { useCallback, useEffect, useRef } from 'react'
import type { MoldaAsset } from '../../core/model'
import {
  exportLoadedAssetForStudio,
  type MoldaExportedAsset,
  type MoldaStudioResyncResult,
} from '../../export/studioLibrary'

/** Folga depois do último salvamento antes de reenviar (a criança pinta em rajadas). */
export const RESYNC_IDLE_MS = 1500

export type ResyncToStudio = (asset: MoldaExportedAsset) => Promise<MoldaStudioResyncResult>

export interface StudioResyncController {
  /** Drena a fila; com um snapshot explícito, não depende de um novo render do hook. */
  flush(savedAsset?: MoldaAsset): Promise<void>
}

/**
 * A VOLTA da ponte "Trazer do Molda" (porte do `useStudioResync` do Pinta): depois de
 * SALVAR, e nunca ao abrir, reenvia a criação ao host já no formato do Estúdio; o host
 * regrava a biblioteca pessoal de lá e a sincronia do Estúdio leva os bytes aos jogos.
 *
 * - Debounced: o autosave dispara a cada pincelada; o reenvio espera a folga, e sai na
 *   hora ao esconder a aba, ao sair da página ou ao desmontar (fechar a criação).
 * - Em ORDEM: os envios são encadeados, então o último salvamento é o último a chegar
 *   (um reenvio velho nunca sobrescreve o mais novo).
 * - Só o que o Estúdio aceita: a exportação passa pelos mesmos tetos do "Trazer do
 *   Molda"; o que não cabe não é reenviado (o jogo fica com a versão anterior).
 */
export function useStudioResync(options: {
  savedAsset: MoldaAsset
  send: ResyncToStudio | undefined
  /** Falha real da ponte; `not-linked` é o estado normal de uma criação ainda não importada. */
  onFailure?: (message?: string) => void
  idleMs?: number
}): StudioResyncController {
  const { savedAsset, send, onFailure, idleMs = RESYNC_IDLE_MS } = options
  // O que estava salvo ao MONTAR nunca é reenviado: abrir não é salvar.
  const lastSeenRef = useRef(savedAsset)
  const pendingRef = useRef<MoldaAsset | null>(null)
  const chainRef = useRef<Promise<void>>(Promise.resolve())
  const sendRef = useRef(send)
  sendRef.current = send
  const onFailureRef = useRef(onFailure)
  onFailureRef.current = onFailure

  const flushRef = useRef((_savedAsset?: MoldaAsset): Promise<void> => Promise.resolve())
  flushRef.current = (explicitAsset?: MoldaAsset): Promise<void> => {
    if (explicitAsset && explicitAsset !== lastSeenRef.current) {
      lastSeenRef.current = explicitAsset
      pendingRef.current = explicitAsset
    }
    const asset = pendingRef.current
    const deliver = sendRef.current
    if (!asset || !deliver) return chainRef.current
    pendingRef.current = null
    const exported = exportLoadedAssetForStudio(asset)
    // O que não cabe no Estúdio não é reenviado, em SILÊNCIO: a criação pode nem estar
    // ligada a um jogo, e o teto já é avisado no "Baixar" e no "Trazer do Molda".
    if (!exported.ok) return chainRef.current
    chainRef.current = chainRef.current.then(async () => {
      try {
        const result = await deliver(exported.asset)
        if (!result.updated && result.reason === 'failed') {
          onFailureRef.current?.(result.error)
        }
      } catch {
        onFailureRef.current?.()
      }
    })
    return chainRef.current
  }

  const flush = useCallback((asset?: MoldaAsset): Promise<void> => flushRef.current(asset), [])

  // O `send` vive no ref de propósito: o host recria o adapter a cada render dele e um
  // `send` novo no meio da folga cancelaria o reenvio agendado (ficaria preso até a aba
  // esconder). Só o salvamento agenda.
  useEffect(() => {
    if (!sendRef.current) return
    if (savedAsset === lastSeenRef.current) return
    lastSeenRef.current = savedAsset
    pendingRef.current = savedAsset
    const flushPending = (): void => {
      void flushRef.current()
    }
    const timer = setTimeout(flushPending, idleMs)
    const onHidden = (): void => {
      if (!document.hidden) return
      clearTimeout(timer)
      flushPending()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', flushPending)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', flushPending)
    }
  }, [savedAsset, idleMs])

  // Desmontar (fechar a criação) com um reenvio pendente: sai agora.
  useEffect(() => {
    return () => {
      void flushRef.current()
    }
  }, [])

  return { flush }
}
