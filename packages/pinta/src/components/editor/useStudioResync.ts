import { useEffect, useRef, useState } from 'react'
import type { PintaAsset } from '../../core/project'
import type { PintaHostAdapter } from '../../core/types'
import { buildStudioPayload } from '../../export/studioBridge'
import type { PintaGalleryStore } from '../../state/galleryStore'
import { createLatestTaskQueue, type LatestTaskQueue } from '../../state/latestTaskQueue'

const RESYNC_IDLE_MS = 1500

type ResyncToStudio = NonNullable<PintaHostAdapter['resyncToStudio']>

interface ResyncJob {
  asset: PintaAsset
  animationId: string | null
  frameIndex: number
  gallery: PintaGalleryStore
  send: ResyncToStudio
}

async function sendResync(job: ResyncJob): Promise<{ updated: boolean }> {
  const payload = await buildStudioPayload(
    job.asset,
    (id) => job.gallery.getState().assets.find((asset) => asset.id === id) ?? null,
    { animationId: job.animationId, frameIndex: job.frameIndex },
  )
  if (!payload || payload.dataUrl.length > 800_000) return { updated: false }
  return job.send({
    id: job.asset.id,
    name: job.asset.name,
    dataUrl: payload.dataUrl,
    width: payload.width,
    height: payload.height,
    ...(payload.sprite ? { sprite: payload.sprite } : {}),
    ...(payload.tileset ? { tileset: payload.tileset } : {}),
    ...(payload.tilemap ? { tilemap: payload.tilemap } : {}),
  })
}

export function useStudioResync(options: {
  asset: PintaAsset
  animationId: string | null
  frameIndex: number
  gallery: PintaGalleryStore
  send?: ResyncToStudio
}): boolean {
  const [resynced, setResynced] = useState(false)
  const mountedRef = useRef(false)
  const queueRef = useRef<LatestTaskQueue<ResyncJob> | null>(null)
  if (!queueRef.current) {
    queueRef.current = createLatestTaskQueue<ResyncJob, { updated: boolean }>({
      run: sendResync,
      onLatestSuccess: (result) => {
        if (mountedRef.current && result.updated) setResynced(true)
      },
    })
  }
  const queue = queueRef.current
  const enqueueCurrentRef = useRef<() => void>(() => {})
  const lastSeenAssetRef = useRef(options.asset)
  const pendingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Atualiza o job somente depois do commit. Um render descartado pelo React
  // concorrente não pode virar payload enviado ao host.
  useEffect(() => {
    const send = options.send
    enqueueCurrentRef.current = send
      ? () =>
          queue.enqueue({
            asset: options.asset,
            animationId: options.animationId,
            frameIndex: options.frameIndex,
            gallery: options.gallery,
            send,
          })
      : () => {}
  }, [options.asset, options.animationId, options.frameIndex, options.gallery, options.send, queue])

  useEffect(() => {
    if (!options.send) return
    if (options.asset === lastSeenAssetRef.current) return
    lastSeenAssetRef.current = options.asset
    pendingRef.current = true
    setResynced(false)
    const run = (): void => {
      if (!pendingRef.current) return
      pendingRef.current = false
      enqueueCurrentRef.current()
    }
    const timer = setTimeout(run, RESYNC_IDLE_MS)
    const onHidden = (): void => {
      if (!document.hidden) return
      clearTimeout(timer)
      run()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', run)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', run)
    }
  }, [options.asset, options.send])

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        pendingRef.current = false
        enqueueCurrentRef.current()
      }
      void queue.flush()
    }
  }, [queue])

  return resynced
}
