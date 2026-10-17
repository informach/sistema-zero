'use client'

import {
  type PensaDelivery,
  type PensaDestination,
  type PensaMissionHandoff,
  PensaMissionHandoffSchema,
} from '@sistemazero/core/pensa'
import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { PensaMissionSession } from '@sistemazero/ui/pensa-mission-session'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CreationsCloud } from '@/lib/creations-cloud'
import { cloudConfirmRefusal, guideError, progressRefusal } from '@/lib/pensa-guide-errors'
import { navigatePensaMission, resolveNextPensaMission } from '@/lib/pensa-next-mission'
import { notePensaRestoreFromView } from '@/lib/pensa-restore-pending'
import { usePensaGuideCollapsed } from './use-pensa-guide-collapsed'

export function canOpenPensaMission(handoff: PensaMissionHandoff): boolean {
  return (
    handoff.availability.eligibleProfileIds.includes(handoff.team.viewerProfileId) &&
    (handoff.availability.available || handoff.availability.reason === 'completed')
  )
}

export function usePensaMissionHandoff(
  missionId: string | null,
  destination: PensaDestination,
  viewerId: string | null,
) {
  const [loaded, setLoaded] = useState<{
    viewerId: string | null
    data: PensaMissionHandoff
  } | null>(null)
  const data = loaded?.viewerId === viewerId ? loaded.data : null
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    missionId ? 'loading' : 'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter intentionally retries the same mission after a failed request.
  useEffect(() => {
    if (!missionId) {
      setLoaded(null)
      setStatus('idle')
      setError(null)
      return
    }
    if (!viewerId) {
      setLoaded(null)
      setStatus('error')
      setError('Abra seu perfil para continuar esta missão.')
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    // Keep an existing editor mounted while another mission of the same workshop loads.
    void readHandoff(missionId, viewerId, controller.signal)
      .then((next) => {
        if (next.mission.destination !== destination)
          throw guideError('Esta missão pertence a outra oficina.')
        if (viewerId && next.team.viewerProfileId !== viewerId)
          throw guideError('O perfil mudou. Abra a missão novamente para continuar.')
        if (!controller.signal.aborted) {
          setLoaded({ viewerId, data: next })
          setStatus('success')
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded(null)
          setStatus('error')
          setError(cause instanceof Error ? cause.message : 'Não consegui abrir a missão.')
        }
      })
    return () => controller.abort()
  }, [missionId, destination, viewerId, attempt])
  const update = useCallback(
    (next: PensaMissionHandoff) => setLoaded({ viewerId, data: next }),
    [viewerId],
  )
  return { data, status, error, retry, update }
}

async function readHandoff(missionId: string, viewerId: string, signal?: AbortSignal) {
  const response = await sessionFetch(
    `/api/pensa/missions/${encodeURIComponent(missionId)}/handoff`,
    { signal, cache: 'no-store', headers: { 'x-sz-viewer': viewerId } },
  )
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw progressRefusal(response.status, body)
  const handoff = PensaMissionHandoffSchema.parse(body)
  notePensaRestoreFromView(handoff.team.viewerProfileId, handoff)
  return handoff
}

/** Serialize mutations, refresh CAS tokens and attach only creations confirmed in the account. */
export function usePensaMissionSession({
  handoff,
  viewerId,
  cloud,
  update,
  retry,
  navigate,
  narrationEnabled = false,
}: {
  handoff: PensaMissionHandoff | null
  viewerId: string | null
  cloud: Pick<CreationsCloud, 'confirm' | 'peek'> | null
  update(next: PensaMissionHandoff): void
  retry(): void
  navigate(path: string): void
  narrationEnabled?: boolean
}): PensaMissionSession | undefined {
  const { collapsed, setCollapsed } = usePensaGuideCollapsed(viewerId)
  const current = useRef(handoff)
  current.current = handoff
  const alive = useRef(true)
  const scope = `${viewerId}:${handoff?.mission.id ?? ''}:${handoff?.mission.contentRevision ?? ''}`
  const currentScope = useRef(scope)
  currentScope.current = scope
  const chain = useRef<Promise<void>>(Promise.resolve())
  const pendingRequest = useRef<{ signature: string; id: string } | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return useMemo(() => {
    if (
      !handoff ||
      !viewerId ||
      handoff.team.viewerProfileId !== viewerId ||
      !canOpenPensaMission(handoff)
    )
      return undefined
    const activeViewerId = viewerId
    const mission = handoff.mission
    const assetSlots = handoff.assetSlots.filter(
      (slot) => 'assetSlotIds' in mission && mission.assetSlotIds.includes(slot.id),
    )
    function assertCurrent() {
      if (!alive.current || currentScope.current !== scope || !current.current)
        throw guideError('O perfil ou a missão mudou. Abra a missão atual para continuar.')
      return current.current
    }
    async function confirm(creationId: string) {
      assertCurrent()
      if (!cloud) throw guideError('Espere sua criação ficar guardada na conta.')
      await cloud.confirm(creationId, { timeoutMs: 15000 }).catch((cause: unknown) => {
        throw cloudConfirmRefusal(cause, 'Sua criação')
      })
      assertCurrent()
      const saved = await cloud.peek(creationId)
      assertCurrent()
      if (!saved) throw guideError('Sua criação ainda não foi guardada na conta.')
      return String(saved.summary.revision)
    }
    function enqueue(action: () => Promise<void>) {
      const next = chain.current.catch(() => {}).then(action)
      chain.current = next
      return next
    }
    async function mutate(
      action: 'start' | 'complete' | 'reconfirm' | 'reopen' | 'deliveries' | 'note',
      deliveries?: PensaDelivery[],
      note?: string,
    ) {
      const state = assertCurrent()
      const input =
        action === 'note'
          ? { expectedProgressRevision: state.progress.progressRevision, note: note ?? '' }
          : {
              baseRevisionId: state.projectRevisionId,
              contentRevision: state.mission.contentRevision,
              expectedProgressRevision: state.progress.progressRevision,
              ...(deliveries ? { deliveries } : {}),
              ...(['complete', 'reconfirm'].includes(action) ? { confirmed: true, note: '' } : {}),
            }
      const signature = JSON.stringify([state.mission.id, action, input])
      if (pendingRequest.current?.signature !== signature)
        pendingRequest.current = { signature, id: crypto.randomUUID() }
      const requestId = pendingRequest.current.id
      const response = await sessionFetch(`/api/pensa/missions/${state.mission.id}/${action}`, {
        method: action === 'deliveries' || action === 'note' ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json', 'x-sz-viewer': activeViewerId },
        body: JSON.stringify({ requestId, ...input }),
      })
      const body: unknown = await response.json().catch(() => null)
      assertCurrent()
      if (!response.ok) {
        if (response.status === 409) retry()
        throw progressRefusal(response.status, body)
      }
      const next = PensaMissionHandoffSchema.parse(body)
      pendingRequest.current = null
      current.current = next
      update(next)
    }
    async function complete() {
      const state = assertCurrent()
      let deliveries = state.progress.deliveries
      if (state.mission.destination === 'studio') {
        deliveries = [
          {
            assetSlotId: null,
            creation: {
              tool: 'studio',
              profileId: activeViewerId,
              creationId: state.studioProjectId,
              saveRevision: await confirm(state.studioProjectId),
              contentFingerprint: null,
            },
          },
        ]
      } else {
        if (!deliveries.length)
          throw guideError('Escolha e guarde as criações desta missão antes de conferir.')
        deliveries = await Promise.all(
          deliveries.map(async (delivery) => ({
            ...delivery,
            creation: {
              ...delivery.creation,
              saveRevision: await confirm(delivery.creation.creationId),
            },
          })),
        )
      }
      const latest = assertCurrent()
      await mutate(
        latest.progress.validity === 'needs_review' ? 'reconfirm' : 'complete',
        deliveries,
      )
    }
    const nextAction = handoff.nextAction
    const nextMissionLabel =
      nextAction.type === 'mission'
        ? nextAction.destination === handoff.mission.destination
          ? 'Continuar meu caminho'
          : `Continuar no ${nextAction.destination === 'studio' ? 'Estúdio' : nextAction.destination === 'pinta' ? 'Pinta' : 'Molda'}`
        : 'Voltar ao plano'
    return {
      mission: handoff.mission,
      progress: handoff.progress,
      project: handoff.project,
      assetSlots,
      references: handoff.references,
      blockedReason:
        handoff.availability.available || handoff.availability.reason === 'completed'
          ? null
          : handoff.availability.message,
      collapsed,
      onCollapsedChange: setCollapsed,
      renderListen: narrationEnabled
        ? (section, itemId) => (
            <PrivateZappyVoice
              viewerId={activeViewerId}
              reference={{
                origin: 'pensa_mission',
                missionId: handoff.mission.id,
                contentRevision: handoff.mission.contentRevision,
                section,
                itemId: itemId ?? null,
              }}
            />
          )
        : undefined,
      onComplete: () => enqueue(complete),
      onReopen: () => enqueue(() => mutate('reopen')),
      onSaveNote: (note) => enqueue(() => mutate('note', undefined, note)),
      nextMissionLabel,
      onNextMission: () =>
        enqueue(async () => {
          const state = assertCurrent()
          if (state.mission.destination === 'studio') await confirm(state.studioProjectId)
          const next = await resolveNextPensaMission(state.project.id, activeViewerId)
          assertCurrent()
          navigatePensaMission(next.path, navigate)
        }),
      onNeedHelp: () => {
        const state = assertCurrent()
        navigate(
          `/pensa?plano=${encodeURIComponent(state.project.id)}&ajuda=${encodeURIComponent(state.mission.id)}`,
        )
      },
      onReturnToPlan: () => {
        const state = assertCurrent()
        navigate(`/pensa?plano=${encodeURIComponent(state.project.id)}`)
      },
      onBindCreation: (input) =>
        enqueue(async () => {
          const state = assertCurrent()
          const slot = assetSlots.find((item) => item.id === input.assetSlotId)
          if (!slot || state.mission.kind !== 'asset')
            throw guideError('Esta criação não faz parte da missão atual.')
          const saveRevision = await confirm(input.creationId)
          const latest = assertCurrent()
          const delivery: PensaDelivery = {
            assetSlotId: slot.id,
            creation: {
              tool: state.mission.destination,
              profileId: activeViewerId,
              creationId: input.creationId,
              saveRevision,
              contentFingerprint: null,
            },
          }
          await mutate('deliveries', [
            ...latest.progress.deliveries.filter((item) => item.assetSlotId !== slot.id),
            delivery,
          ])
        }),
    }
  }, [
    handoff,
    viewerId,
    cloud,
    update,
    retry,
    navigate,
    narrationEnabled,
    collapsed,
    setCollapsed,
    scope,
  ])
}
