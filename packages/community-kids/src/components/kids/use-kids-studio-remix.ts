'use client'

import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from '@sistemazero/member-shell/lib/studio-tier'
import { useRouter } from 'next/navigation'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/lib/api'
import type { HubThreadView } from '@/lib/types'

const enc = encodeURIComponent

/** As ferramentas vêm das aventuras concluídas: o recado aponta para elas, nunca para um nível. */
const REMIX_BLOCKED_MESSAGE =
  'Esse jogo usa ferramentas que você ainda vai conquistar nos cursos. 🚀'

/** Owns remix admission, retirement and persistence for the current Kids viewer. */
export function useKidsStudioRemix({
  viewerId,
  slug,
  remixTier,
  canRemix,
}: {
  viewerId: string
  slug: string
  remixTier: StudioRemixCapability | null
  canRemix: boolean
}) {
  const router = useRouter()
  const remixAccessKey = JSON.stringify([remixTier, canRemix])
  const remixOwner = useMemo(
    () => ({ viewerId, slug, access: remixAccessKey }),
    [viewerId, slug, remixAccessKey],
  )
  const currentRemixOwner = useRef<{
    owner: typeof remixOwner
    controller: AbortController
  } | null>(null)
  const remixBusyRef = useRef<object | null>(null)
  useLayoutEffect(() => {
    const authority = { owner: remixOwner, controller: new AbortController() }
    currentRemixOwner.current = authority
    const cancel = () => authority.controller.abort()
    const storage = (event: StorageEvent) => {
      if (event.key === 'sz:kids:session-change') cancel()
    }
    window.addEventListener('sz:session-changed', cancel)
    window.addEventListener('storage', storage)
    return () => {
      cancel()
      if (currentRemixOwner.current === authority) currentRemixOwner.current = null
      remixBusyRef.current = null
      window.removeEventListener('sz:session-changed', cancel)
      window.removeEventListener('storage', storage)
    }
  }, [remixOwner])
  const handleRemix = useCallback(
    async (t: HubThreadView) => {
      const authority = currentRemixOwner.current
      if (
        !canRemix ||
        !viewerId ||
        !t.playId ||
        remixBusyRef.current ||
        !authority ||
        authority.owner !== remixOwner ||
        authority.controller.signal.aborted
      )
        return
      const operation = {}
      remixBusyRef.current = operation
      const signal = AbortSignal.any([authority.controller.signal, AbortSignal.timeout(60_000)])
      const isCurrent = () => currentRemixOwner.current === authority && !signal.aborted
      try {
        // Selo do post já diz que falta ferramenta → recado gentil sem nem baixar o jogo.
        if (remixTier && t.studioMeta && !studioRemixCovered(remixTier, t.studioMeta)) {
          toast.info(REMIX_BLOCKED_MESSAGE)
          return
        }
        const res = await fetch(`/api/studio/play/${enc(t.playId)}`, { signal, cache: 'no-store' })
        if (!res.ok) throw new Error('play indisponível')
        let snapshot: unknown = await res.json()
        if (!isCurrent()) return
        // Checagem AUTORITATIVA (post antigo sem metadado / metadado divergente): as
        // ferramentas REAIS do snapshot precisam caber no degrau — senão o projeto
        // importado nem abriria no Estúdio (trava de conquista) e viraria beco sem saída.
        const requirement = remixRequirementFromSnapshot(snapshot)
        if (remixTier && !studioRemixCovered(remixTier, requirement)) {
          toast.info(REMIX_BLOCKED_MESSAGE)
          return
        }
        if (requirement.programmingLanguage === 'python') {
          const { authorizePythonRemix } = await import(
            '@sistemazero/member-shell/lib/studio-python-remix'
          )
          if (!isCurrent()) return
          const options = await apiGet('/api/studio/free-options', undefined, { signal })
          snapshot = await authorizePythonRemix({
            snapshot,
            viewerId,
            audience: 'kids',
            options,
            signal,
            request: (input) =>
              apiSend('/api/studio/free-runtime', 'POST', input, undefined, { signal }),
          })
        }
        if (!isCurrent()) return
        const studio = await import('@sistemazero/studio/project-import')
        if (!isCurrent()) return
        await studio.importProjectSnapshot(snapshot, {
          name: `Remix de ${t.title}`.slice(0, 200),
          namespace: viewerId,
          isCurrent,
        })
        if (!isCurrent()) return
        // Gamificação (retenção pós-cursos): registra o marco da missão de remix.
        // BEST-EFFORT fire-and-forget — o toast/navegação não esperam; os guards
        // anti-farm (posse + playId real no hub + não-self) são do members.
        void fetch('/api/studio/remix', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ playId: t.playId }),
        }).catch(() => {})
        toast.success('Sua versão foi criada! Abrindo o Estúdio... 🎮')
        router.push('/estudio')
      } catch {
        if (isCurrent()) toast.error('Não consegui criar a sua versão agora. Tente de novo!')
      } finally {
        if (remixBusyRef.current === operation) remixBusyRef.current = null
      }
    },
    [viewerId, router, remixTier, canRemix, remixOwner],
  )
  return handleRemix
}
