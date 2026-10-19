'use client'

import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowRight, Lock, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { HubChannelView, HubSpaceView } from '@/lib/types'

/** O espaço com os canais (só os fóruns: a Mostra tem o próprio cartão). */
interface ForumSpace {
  space: HubSpaceView
  channels: HubChannelView[] | null
}

type HomeState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; forums: ForumSpace[]; showcase: HubSpaceView | null }

/**
 * Os espaços da comunidade adulta (direção de arte de 18/10/2026): cada fórum com os canais e o
 * selo de novidade, e a Mostra num cartão próprio. Canais que não carregam não derrubam o cartão
 * do espaço: o "Entrar" continua lá.
 */
export function CommunityHomeClient() {
  const [state, setState] = useState<HomeState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` refaz a leitura (Tentar novamente)
  useEffect(() => {
    let alive = true
    apiGet<{ items: HubSpaceView[] }>('/api/hub/spaces')
      .then(async ({ items }) => {
        const showcase = items.find((s) => s.slug === CREATOR_SHOWCASE_SLUGS.adult) ?? null
        const forums = await Promise.all(
          items
            .filter((s) => s.slug !== CREATOR_SHOWCASE_SLUGS.adult)
            .map(async (space) => ({
              space,
              channels: space.locked
                ? null
                : await apiGet<{ items: HubChannelView[] }>(
                    `/api/hub/spaces/${space.slug}/channels`,
                  )
                    .then((r) => r.items)
                    .catch(() => null),
            })),
        )
        if (alive) setState({ kind: 'ready', forums, showcase })
      })
      .catch(() => {
        if (alive) setState({ kind: 'error' })
      })
    return () => {
      alive = false
    }
  }, [attempt])

  if (state.kind === 'loading')
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only">Carregando…</span>
        <Skeleton className="h-[18rem] w-full rounded-[1.2rem]" />
        <Skeleton className="h-[11rem] w-full rounded-[1.2rem]" />
      </div>
    )
  if (state.kind === 'error')
    return (
      <div role="status" className="sz-card flex flex-col items-start gap-4 p-6">
        <p className="text-muted-foreground">Não foi possível carregar a comunidade agora.</p>
        <button
          type="button"
          className="sz-btn-outline sz-btn-sm"
          onClick={() => {
            setState({ kind: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  if (state.forums.length === 0 && !state.showcase)
    return (
      <p className="sz-card p-6 text-muted-foreground">
        Nenhuma comunidade disponível para você ainda.
      </p>
    )

  return (
    <div className="flex flex-col gap-6">
      {state.forums.map((forum) => (
        <ForumCard key={forum.space.id} forum={forum} />
      ))}
      {state.showcase ? <ShowcaseSpaceCard space={state.showcase} /> : null}
    </div>
  )
}

function ForumCard({ forum: { space, channels } }: { forum: ForumSpace }) {
  const href = `/comunidade/${space.slug}`
  return (
    <section aria-labelledby={`espaco-${space.id}`} className="sz-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-5 border-border border-b p-6 md:p-7">
        <span
          aria-hidden
          className="inline-flex size-[3.6rem] flex-none items-center justify-center rounded-[0.9rem] bg-primary text-primary-foreground"
        >
          <MessagesSquare className="size-[1.7rem]" />
        </span>
        <div className="flex min-w-0 flex-1 basis-[14rem] flex-col gap-1.5">
          <h2 id={`espaco-${space.id}`} className="sz-h2">
            {space.name}
          </h2>
          {space.description ? <p className="text-muted-foreground">{space.description}</p> : null}
        </div>
        {space.locked ? (
          <span className="sz-chip">
            <Lock aria-hidden />
            Ainda não liberado
          </span>
        ) : (
          <Link
            href={href}
            prefetch={false}
            aria-label={`Entrar em ${space.name}`}
            className="sz-btn"
          >
            Entrar
            <ArrowRight aria-hidden />
          </Link>
        )}
      </div>
      {channels && channels.length > 0 ? (
        <ul aria-label={`Canais de ${space.name}`} className="flex flex-col px-3 pt-2 pb-3 md:px-4">
          {channels.map((channel, index) => (
            <li key={channel.id}>
              <Link
                href={`${href}?canal=${encodeURIComponent(channel.slug)}`}
                prefetch={false}
                className={cn(
                  'flex min-h-[3.2rem] items-center gap-3.5 rounded-[0.7rem] px-3 text-foreground no-underline transition-colors hover:bg-muted md:px-4',
                  index > 0 && 'border-border border-t',
                )}
              >
                {channel.postingPolicy === 'staff_only' ? (
                  <Lock aria-hidden className="size-5 flex-none text-muted-foreground" />
                ) : (
                  <span aria-hidden className="w-5 flex-none text-center font-mono">
                    #
                  </span>
                )}
                <strong className="min-w-0 flex-1 truncate">{channel.name}</strong>
                {channel.postingPolicy === 'staff_only' ? (
                  <span className="hidden text-[0.85rem] text-muted-foreground sm:inline">
                    Só a equipe publica
                  </span>
                ) : null}
                {channel.hasUnread ? <span className="sz-chip sz-chip-acao">Novidades</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/** Ilustração decorativa da Mostra: três capas de jogo lado a lado, nas cores fixas da marca. */
function ShowcaseArt() {
  return (
    <svg
      viewBox="0 0 340 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="block h-full w-full fill-(--topo)"
    >
      <rect width="340" height="240" />
      <rect x="24" y="40" width="130" height="80" rx="10" className="fill-(--topo-borda)" />
      <rect x="186" y="40" width="130" height="80" rx="10" className="fill-(--topo-borda)" />
      <rect
        x="105"
        y="136"
        width="130"
        height="80"
        rx="10"
        className="fill-(--topo-borda) stroke-(--sz-community-blue-light)"
        strokeWidth="2"
      />
      <circle cx="70" cy="74" r="12" className="fill-(--sz-community-blue-light)" />
      <circle cx="260" cy="74" r="12" className="fill-(--sz-community-pink)" />
      <path d="M170 160 L182 190 L170 184 L158 190 Z" className="fill-(--sz-community-yellow)" />
    </svg>
  )
}

function ShowcaseSpaceCard({ space }: { space: HubSpaceView }) {
  return (
    <section
      aria-labelledby={`espaco-${space.id}`}
      className="sz-card flex flex-col overflow-hidden md:flex-row"
    >
      <div className="h-[11rem] flex-none md:h-auto md:w-[17rem]">
        <ShowcaseArt />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6 md:p-7">
        <h2 id={`espaco-${space.id}`} className="sz-h2">
          {space.name}
        </h2>
        <p className="text-muted-foreground">
          {space.description ||
            'Jogos prontos da comunidade, para jogar no navegador e fazer a sua versão.'}
        </p>
        <div className="mt-auto flex flex-wrap gap-3 pt-1">
          <Link href="/mural-dos-criadores-adulto" prefetch={false} className="sz-btn">
            Ver a Mostra
          </Link>
          <Link href="/desafios" prefetch={false} className="sz-btn-outline">
            Desafio do mês
          </Link>
        </div>
      </div>
    </section>
  )
}
