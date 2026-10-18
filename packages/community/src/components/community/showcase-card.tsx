'use client'

import { importCreatorRemix } from '@sistemazero/member-shell/lib/import-creator-remix'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from '@sistemazero/member-shell/lib/studio-tier'
import type { HubThreadView } from '@sistemazero/member-shell/lib/types'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function ShowcaseCard({
  thread,
  viewerId,
  capability,
  onOpen,
}: {
  thread: HubThreadView
  viewerId: string
  capability: StudioRemixCapability | null
  onOpen: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  async function remix() {
    if (!capability || !thread.playId || busy) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    try {
      const response = await sessionFetch(`/api/studio/play/${encodeURIComponent(thread.playId)}`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Jogo indisponível')
      const snapshot: unknown = await response.json()
      if (!studioRemixCovered(capability, remixRequirementFromSnapshot(snapshot))) {
        toast.info('Este jogo usa ferramentas que você ainda não liberou na sua jornada.')
        return
      }
      const projectId = await importCreatorRemix(snapshot, {
        viewerId,
        audience: 'adult',
        capability,
        name: `Remix de ${thread.title}`,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      void sessionFetch('/api/studio/remix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playId: thread.playId }),
      }).catch(() => {})
      toast.success('Sua versão foi criada.')
      router.push(`/estudio?projeto=${encodeURIComponent(projectId)}`)
    } catch {
      if (!controller.signal.aborted)
        toast.error('Não foi possível criar sua versão. Tente novamente.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <Card className="overflow-hidden">
      {thread.coverImageUrl ? (
        <img
          src={thread.coverImageUrl}
          alt={`Capa de ${thread.title}`}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">{thread.title}</h2>
        <p className="text-sm text-muted-foreground">
          {thread.authorProfileId ? (
            <Link href={`/criador/${thread.authorProfileId}`} className="text-primary underline">
              {thread.authorDisplayName || 'Criador'}
            </Link>
          ) : (
            thread.authorDisplayName || 'Criador'
          )}{' '}
          · {thread.playsCount ?? 0} jogadas
        </p>
        <p className="whitespace-pre-wrap text-sm">{thread.body}</p>
        <div className="flex flex-wrap gap-3">
          {thread.playId ? (
            <Link
              className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
              href={`/jogar/${thread.playId}`}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
            >
              Jogar
            </Link>
          ) : null}
          {capability && thread.playId ? (
            <Button variant="outline" disabled={busy} onClick={() => void remix()}>
              {busy ? 'Criando versão...' : 'Fazer minha versão'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onOpen}>
            Comentários e reações
          </Button>
        </div>
      </div>
    </Card>
  )
}
