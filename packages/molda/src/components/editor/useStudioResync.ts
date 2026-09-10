import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type {
  ExportForStudioResult,
  MoldaExportedAsset,
  MoldaStudioResyncResult,
  MoldaStudioReview,
} from '../../export/studioLibrary'
import { getDefaultMoldaPersistence, getMoldaStorageNamespace } from '../../state/persistence'

/** Folga depois do último salvamento antes de reenviar (a criança pinta em rajadas). */
export const RESYNC_IDLE_MS = 1500

export type ResyncToStudio = (asset: MoldaExportedAsset) => Promise<MoldaStudioResyncResult>

export interface StudioResyncController<T> {
  /** Drena a fila; com um snapshot explícito, não depende de um novo render do hook. */
  flush(savedAsset?: T): Promise<void>
  prepareExit(savedAsset: T): Promise<boolean>
  review: MoldaStudioReview | null
  approveReview(): Promise<void>
  dismissReview(): void
}

/** Como cada geração vira o que o Estúdio aceita. O gancho não conhece formato. */
export type StudioExporter<T> = (
  asset: T,
  context: {
    persistence: ReturnType<typeof getDefaultMoldaPersistence>
    namespace: string
    acceptedReview?: string
    signal?: AbortSignal
  },
) => Promise<ExportForStudioResult>

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
export function useStudioResync<T extends { id: string }>(options: {
  savedAsset: T
  send: ResyncToStudio | undefined
  canSend?: (id: string) => Promise<boolean>
  /** A exportação da geração dona desta criação. */
  exportAsset: StudioExporter<T>
  /** Falha real da ponte; `not-linked` é o estado normal de uma criação ainda não importada. */
  onFailure?: (message?: string) => void
  idleMs?: number
  sameContent?: (a: T, b: T) => boolean
}): StudioResyncController<T> {
  const { savedAsset, send, exportAsset, onFailure, idleMs = RESYNC_IDLE_MS } = options
  // Capture while this workshop owns the profile, before host teardown can switch it.
  const [context] = useState(() => ({
    persistence: getDefaultMoldaPersistence(),
    namespace: getMoldaStorageNamespace(),
  }))
  // O que estava salvo ao MONTAR nunca é reenviado: abrir não é salvar.
  const lastSeenRef = useRef(savedAsset)
  const pendingRef = useRef<T | null>(null)
  const exportController = useRef<AbortController | null>(null)
  const chainRef = useRef<Promise<void>>(Promise.resolve())
  const sendRef = useRef(send)
  sendRef.current = send
  const canSendRef = useRef(options.canSend)
  canSendRef.current = options.canSend
  const onFailureRef = useRef(onFailure)
  onFailureRef.current = onFailure
  const exportRef = useRef(exportAsset)
  exportRef.current = exportAsset
  const sameContentRef = useRef(options.sameContent)
  sameContentRef.current = options.sameContent
  type ReviewRequest = {
    asset: T
    context: Parameters<StudioExporter<T>>[1]
    deliver: ResyncToStudio
    exporter: StudioExporter<T>
    report: MoldaStudioReview
    canSend: typeof options.canSend
  }
  const [request, setRequestState] = useState<ReviewRequest | null>(null)
  const requestRef = useRef<ReviewRequest | null>(null)
  const mounted = useRef(true)
  const setRequest = useCallback((next: ReviewRequest | null) => {
    requestRef.current = next
    if (mounted.current) setRequestState(next)
  }, [])
  const isCurrent = (asset: T) =>
    asset === lastSeenRef.current || !!sameContentRef.current?.(asset, lastSeenRef.current)
  const enqueue = (
    asset: T,
    context: Parameters<StudioExporter<T>>[1],
    deliver: ResyncToStudio,
    exporter: StudioExporter<T>,
    canSend: typeof options.canSend,
  ): Promise<void> => {
    exportController.current?.abort()
    setRequest(null)
    const controller = new AbortController()
    exportController.current = controller
    chainRef.current = chainRef.current.then(async () => {
      if (controller.signal.aborted) return
      try {
        if (canSend && !(await canSend(asset.id))) return
        if (controller.signal.aborted) return
        const exported = await exporter(asset, { ...context, signal: controller.signal })
        if (controller.signal.aborted) return
        if (!exported.ok) {
          if (exported.reason === 'needs-review') {
            if (mounted.current && isCurrent(asset))
              setRequest({ asset, context, deliver, exporter, report: exported.review, canSend })
            return
          }
          onFailureRef.current?.(
            exported.reason === 'asset-too-big'
              ? COPY.scene.glbExport.studio.tooComplex
              : COPY.editor.studioSyncFailed,
          )
          return
        }
        const result = await deliver(exported.asset)
        if (!result.updated && result.reason === 'failed') onFailureRef.current?.(result.error)
      } catch {
        if (!controller.signal.aborted) onFailureRef.current?.()
      } finally {
        if (exportController.current === controller) exportController.current = null
      }
    })
    return chainRef.current
  }

  const flushRef = useRef((_savedAsset?: T): Promise<void> => Promise.resolve())
  flushRef.current = (explicitAsset?: T): Promise<void> => {
    if (explicitAsset && explicitAsset !== lastSeenRef.current) {
      const same = sameContentRef.current?.(explicitAsset, lastSeenRef.current)
      lastSeenRef.current = explicitAsset
      if (!same) pendingRef.current = explicitAsset
    }
    const asset = pendingRef.current
    const deliver = sendRef.current
    if (!asset || !deliver) return chainRef.current
    pendingRef.current = null
    return enqueue(asset, context, deliver, exportRef.current, canSendRef.current)
  }

  const flush = useCallback((asset?: T): Promise<void> => flushRef.current(asset), [])

  // O `send` vive no ref de propósito: o host recria o adapter a cada render dele e um
  // `send` novo no meio da folga cancelaria o reenvio agendado (ficaria preso até a aba
  // esconder). Só o salvamento agenda.
  useEffect(() => {
    if (!sendRef.current) return
    if (savedAsset === lastSeenRef.current) return
    const same = sameContentRef.current?.(savedAsset, lastSeenRef.current)
    lastSeenRef.current = savedAsset
    if (!same) {
      exportController.current?.abort()
      setRequest(null)
      pendingRef.current = savedAsset
    }
    if (!pendingRef.current) return
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
  }, [savedAsset, idleMs, setRequest])

  // Desmontar (fechar a criação) com um reenvio pendente: sai agora.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      void flushRef.current()
    }
  }, [])

  return {
    flush,
    prepareExit: async (asset) => {
      await flush(asset)
      return !requestRef.current || !isCurrent(requestRef.current.asset)
    },
    review: request && isCurrent(request.asset) ? request.report : null,
    dismissReview: () => setRequest(null),
    approveReview: () => {
      if (!request || !isCurrent(request.asset)) return Promise.resolve()
      setRequest(null)
      return enqueue(
        request.asset,
        { ...request.context, acceptedReview: request.report.token },
        request.deliver,
        request.exporter,
        request.canSend,
      )
    },
  }
}
