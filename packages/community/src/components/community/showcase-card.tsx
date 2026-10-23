'use client'

import { importCreatorRemix } from '@sistemazero/member-shell/lib/import-creator-remix'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from '@sistemazero/member-shell/lib/studio-tier'
import type { HubThreadView } from '@sistemazero/member-shell/lib/types'
import { Gamepad2, Lock, MessageCircle, Play, Repeat2, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { challengeMonthName } from './community/challenge-month'
import { StageFace, StageLine } from './journey/stage'

/**
 * O cartão de um jogo do Mural (direção de arte de 18/10/2026): capa, selo do desafio, autor
 * (link para o perfil público), jogadas, Jogar em outra aba, Fazer minha versão e a conversa.
 * Quando o selo do post já diz que o jogo usa ferramentas que a pessoa não tem, o botão fica
 * tracejado e a frase explica; a checagem que vale continua no clique, pelo snapshot.
 */
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
  const accessKey = JSON.stringify(capability)
  // biome-ignore lint/correctness/useExhaustiveDependencies: trocar perfil, jogo ou capacidades cancela a autorização em andamento.
  useLayoutEffect(() => {
    const cancel = () => pending.current?.abort()
    const storage = (event: StorageEvent) => {
      if (event.key === 'sz:kids:session-change') cancel()
    }
    window.addEventListener('sz:session-changed', cancel)
    window.addEventListener('storage', storage)
    return () => {
      cancel()
      window.removeEventListener('sz:session-changed', cancel)
      window.removeEventListener('storage', storage)
    }
  }, [viewerId, accessKey, thread.playId])
  async function remix() {
    if (!capability || !viewerId || !thread.playId || busy || pending.current) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)])
    pending.current = controller
    setBusy(true)
    try {
      const response = await sessionFetch(`/api/studio/play/${encodeURIComponent(thread.playId)}`, {
        signal,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Jogo indisponível')
      let snapshot: unknown = await response.json()
      signal.throwIfAborted()
      const requirement = remixRequirementFromSnapshot(snapshot)
      if (!studioRemixCovered(capability, requirement)) {
        toast.info('Este jogo usa ferramentas que você ainda não liberou na sua jornada.')
        return
      }
      if (requirement.programmingLanguage === 'python') {
        const { authorizePythonRemix } = await import(
          '@sistemazero/member-shell/lib/studio-python-remix'
        )
        signal.throwIfAborted()
        const optionsResponse = await sessionFetch('/api/studio/free-options', {
          signal,
          cache: 'no-store',
        })
        if (!optionsResponse.ok) throw new Error('Ambiente Python indisponível')
        snapshot = await authorizePythonRemix({
          snapshot,
          viewerId,
          audience: 'adult',
          options: await optionsResponse.json(),
          signal,
          request: async (input) => {
            const decision = await sessionFetch('/api/studio/free-runtime', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(input),
              signal,
            })
            if (!decision.ok) throw new Error('Acesso ao ambiente Python indisponível')
            return decision.json()
          },
        })
      } else {
        const { authorizeJavaScriptCreation } = await import(
          '@sistemazero/member-shell/lib/studio-javascript-creation'
        )
        signal.throwIfAborted()
        await authorizeJavaScriptCreation(requirement.pro ? 'pro' : 'classic', signal)
      }
      signal.throwIfAborted()
      const projectId = await importCreatorRemix(snapshot, {
        viewerId,
        audience: 'adult',
        capability,
        name: `Remix de ${thread.title}`,
        signal,
      })
      if (signal.aborted) return
      void sessionFetch('/api/studio/remix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playId: thread.playId }),
      }).catch(() => {})
      toast.success('Sua versão foi criada.')
      router.push(`/estudio?projeto=${encodeURIComponent(projectId)}`)
    } catch {
      if (!signal.aborted) toast.error('Não foi possível criar sua versão. Tente novamente.')
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setBusy(false)
      }
    }
  }
  const author = thread.authorDisplayName || 'Criador'
  const challengeMonth = thread.challengeKey ? challengeMonthName(thread.challengeKey) : null
  // O selo vem do `studioMeta` do post (posts antigos não têm: o clique ainda confere no snapshot).
  const locked = Boolean(
    capability && thread.studioMeta && !studioRemixCovered(capability, thread.studioMeta),
  )
  const lockNoteId = `remix-trava-${thread.id}`
  return (
    <article className="sz-card flex flex-col overflow-hidden">
      {thread.coverImageUrl ? (
        <img
          src={thread.coverImageUrl}
          alt={`Capa de ${thread.title}`}
          className="aspect-video w-full bg-(--topo) object-cover"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-video w-full items-center justify-center bg-(--topo) text-(--sz-community-blue-light)"
        >
          <Gamepad2 className="size-[2.6rem]" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-5 md:p-6">
        {thread.challengeKey ? (
          <span className="sz-chip sz-chip-aviso self-start">
            <Trophy aria-hidden />
            {challengeMonth ? `Desafio de ${challengeMonth}` : 'Desafio do mês'}
          </span>
        ) : null}
        <h2 className="sz-h3">{thread.title}</h2>
        <div className="flex items-center gap-3">
          {thread.authorAvatarUrl || thread.authorJourney ? (
            <StageFace
              name={author}
              photoUrl={thread.authorAvatarUrl}
              badge={thread.authorJourney}
              size="p"
              className="size-10 text-[0.85rem]"
            />
          ) : null}
          <p className="flex min-w-0 flex-col text-[0.85rem] text-muted-foreground">
            <span>
              {thread.authorProfileId ? (
                <Link
                  href={`/criador/${thread.authorProfileId}`}
                  prefetch={false}
                  className="sz-link"
                >
                  {author}
                </Link>
              ) : (
                author
              )}{' '}
              · {thread.playsCount ?? 0} {thread.playsCount === 1 ? 'jogada' : 'jogadas'}
            </span>
            {thread.authorJourney ? <StageLine badge={thread.authorJourney} /> : null}
          </p>
        </div>
        {thread.body ? (
          <p className="line-clamp-4 whitespace-pre-wrap text-[0.85rem] text-foreground">
            {thread.body}
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          {thread.playId ? (
            <Link
              className="sz-btn w-full"
              href={`/jogar/${thread.playId}`}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
            >
              <Play aria-hidden />
              Jogar
              <span className="font-normal text-[0.85rem] opacity-90">(outra aba)</span>
            </Link>
          ) : null}
          <div className="flex gap-2.5">
            {capability && thread.playId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void remix()}
                aria-describedby={locked ? lockNoteId : undefined}
                className={cn(
                  // Quebra em duas linhas quando a coluna é estreita (grade de 2 ou 3 jogos), em vez
                  // de passar por cima do botão de comentários.
                  'sz-btn-outline sz-btn-sm min-w-0 flex-1 whitespace-normal py-2',
                  locked && 'border-dashed border-muted-foreground text-muted-foreground',
                )}
              >
                {locked ? <Lock aria-hidden /> : <Repeat2 aria-hidden />}
                {busy ? 'Criando versão...' : 'Fazer minha versão'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              aria-label="Comentários e reações"
              title="Comentários e reações"
              className={cn(
                'sz-iconbtn size-[2.4rem]',
                !(capability && thread.playId) && 'ml-auto',
              )}
            >
              <MessageCircle aria-hidden />
            </button>
          </div>
          {locked ? (
            <p id={lockNoteId} className="text-[0.85rem] text-muted-foreground">
              Usa ferramentas que você ainda não liberou na jornada.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
