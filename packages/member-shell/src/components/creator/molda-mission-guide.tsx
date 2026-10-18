'use client'

import type { MoldaAsset } from '@sistemazero/molda/assets'
import { PensaMissionPanel } from '@sistemazero/ui/pensa-mission-panel'
import type { PensaMissionSession } from '@sistemazero/ui/pensa-mission-session'
import { useCallback, useEffect, useState } from 'react'
import type { MoldaPersistenceLike } from '../../lib/molda-cloud-persistence'
import { guideError } from '../../lib/pensa-guide-errors'

type GuideAsset = Pick<MoldaAsset, 'id' | 'name' | 'kind'>
export type MoldaGuidePersistence = Pick<MoldaPersistenceLike, 'load' | 'loadAll' | 'subscribe'> & {
  listSummaries?: () => Promise<GuideAsset[]>
}

export function MoldaMissionGuide({
  session,
  persistence,
  onOpenAsset,
  hasOpenCreation,
}: {
  session: PensaMissionSession
  persistence: MoldaGuidePersistence
  onOpenAsset(id: string): void
  hasOpenCreation(): Promise<boolean>
}) {
  const [assets, setAssets] = useState<GuideAsset[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    const items = persistence.listSummaries
      ? await persistence.listSummaries()
      : await persistence.loadAll()
    setAssets(items)
  }, [persistence])
  useEffect(() => {
    let alive = true
    const reload = () => {
      if (alive)
        void load().catch(() => {
          if (alive) setError('Não consegui consultar suas criações. Tente novamente.')
        })
    }
    reload()
    const unsubscribe = persistence.subscribe?.((event) => {
      if (event.type === 'changed' || event.type === 'sync-end') reload()
    })
    return () => {
      alive = false
      unsubscribe?.()
    }
  }, [persistence, load])
  const safeSession: PensaMissionSession = {
    ...session,
    onComplete: async () => {
      if (await hasOpenCreation())
        throw guideError(
          'Guarde e feche a criação pelo Voltar do Molda antes de conferir a missão.',
        )
      await session.onComplete()
    },
    onNextMission: async () => {
      if (await hasOpenCreation())
        throw guideError('Guarde e feche a criação pelo Voltar do Molda antes de continuar.')
      await session.onNextMission()
    },
    onReturnToPlan: async () => {
      if (await hasOpenCreation())
        throw guideError('Guarde e feche a criação pelo Voltar do Molda antes de voltar ao plano.')
      await session.onReturnToPlan()
    },
  }
  return (
    <PensaMissionPanel
      key={`${session.mission.id}:${session.mission.contentRevision}`}
      session={safeSession}
      recovery={error ? <p role="alert">{error}</p> : null}
    >
      {session.assetSlots.map((slot) => {
        const creationId =
          session.progress.deliveries.find((delivery) => delivery.assetSlotId === slot.id)?.creation
            .creationId ?? ''
        return (
          <div key={slot.id}>
            <label>
              {slot.name}
              <select
                value={creationId}
                disabled={
                  busy || Boolean(session.blockedReason) || session.progress.status === 'completed'
                }
                onChange={(event) => {
                  const chosenId = event.target.value
                  if (!chosenId || busy) return
                  setBusy(true)
                  setError(null)
                  void (async () => {
                    if (await hasOpenCreation())
                      throw guideError(
                        'Guarde e feche a criação antes de escolher o resultado da missão.',
                      )
                    const selected = await persistence.load(chosenId)
                    if (!selected || selected.kind !== slot.kind)
                      throw guideError('Escolha uma criação guardada do tipo pedido nesta missão.')
                    await session.onBindCreation({ assetSlotId: slot.id, creationId: chosenId })
                  })()
                    .catch((cause: unknown) =>
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Não consegui guardar sua escolha.',
                      ),
                    )
                    .finally(() => setBusy(false))
                }}
              >
                <option value="">Escolha uma criação guardada</option>
                {assets
                  .filter((asset) => asset.kind === slot.kind)
                  .map((asset) => (
                    <option value={asset.id} key={asset.id}>
                      {asset.name}
                    </option>
                  ))}
              </select>
            </label>
            <p>{slot.description}</p>
            {creationId ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                onClick={() => onOpenAsset(creationId)}
              >
                Abrir {slot.name}
              </button>
            ) : null}
          </div>
        )
      })}
    </PensaMissionPanel>
  )
}
