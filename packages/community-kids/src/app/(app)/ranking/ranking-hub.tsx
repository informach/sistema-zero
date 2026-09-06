'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { Crown, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import { LeagueBoard } from '@/components/kids/league-board'
import { LevelBadge } from '@/components/kids/level-badge'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { LeagueMeView, RankingEntryView, RankingLeaderboardView } from '@/lib/types'

const PAGE_SIZE = 20

export function RankingHub({
  initialRanking,
  league,
}: {
  initialRanking: RankingLeaderboardView | null
  league: LeagueMeView | null
}) {
  const [tab, setTab] = useState<'general' | 'league'>('general')
  const [items, setItems] = useState(initialRanking?.items ?? [])
  const [nextCursor, setNextCursor] = useState(initialRanking?.nextCursor ?? null)
  const [total, setTotal] = useState(initialRanking?.total ?? 0)
  const [loadingMore, setLoadingMore] = useState(false)

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const page = await apiGet<RankingLeaderboardView>(
        `/api/members/gamification/ranking?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
      )
      setItems((current) => [...current, ...page.items])
      setNextCursor(page.nextCursor)
      setTotal(page.total)
    } catch {
      toast.error('Não foi possível carregar mais posições. Tente de novo.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-border bg-card p-1.5">
        <button
          type="button"
          onClick={() => setTab('general')}
          aria-pressed={tab === 'general'}
          className={cn(
            'min-h-12 rounded-xl px-4 font-bold sz-display transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            tab === 'general'
              ? 'bg-primary text-primary-foreground shadow-[0_3px_0_color-mix(in_oklch,var(--primary),black_22%)]'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Ranking geral
        </button>
        <button
          type="button"
          onClick={() => setTab('league')}
          aria-pressed={tab === 'league'}
          className={cn(
            'min-h-12 rounded-xl px-4 font-bold sz-display transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            tab === 'league'
              ? 'bg-primary text-primary-foreground shadow-[0_3px_0_color-mix(in_oklch,var(--primary),black_22%)]'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Minha liga
        </button>
      </div>

      {tab === 'general' ? (
        <GeneralRanking
          available={initialRanking !== null}
          items={items}
          me={initialRanking?.me ?? null}
          total={total}
          hasMore={nextCursor !== null}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      ) : league ? (
        <LeagueBoard league={league} />
      ) : (
        <Unavailable message="Sua liga não pôde ser carregada agora." />
      )}
    </div>
  )
}

function GeneralRanking({
  available,
  items,
  me,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  available: boolean
  items: RankingEntryView[]
  me: RankingEntryView | null
  total: number
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  if (!available) return <Unavailable message="O ranking geral não pôde ser carregado agora." />
  if (items.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Sparkles className="size-10 text-primary" />
          <h2 className="mt-3 sz-display text-xl">O placar está só começando!</h2>
          <p className="mt-1 max-w-md text-muted-foreground text-sm">
            Complete uma atividade que dá XP para aparecer aqui junto com os outros criadores.
          </p>
        </CardContent>
      </Card>
    )
  }

  const meIsLoaded = items.some((entry) => entry.isMe)
  return (
    <section className="space-y-4" aria-label="Ranking geral por XP acumulado">
      <Podium entries={items.slice(0, 3)} />

      {items.length > 3 ? (
        <ol className="space-y-2">
          {items.slice(3).map((entry, index) => (
            <li
              // A lista só cresce por append; os campos públicos não formam uma chave
              // única sem reintroduzir o id privado do perfil.
              // biome-ignore lint/suspicious/noArrayIndexKey: ver acima
              key={index + 3}
            >
              <RankingRow entry={entry} />
            </li>
          ))}
        </ol>
      ) : null}

      {!meIsLoaded ? (
        me ? (
          <div className="sticky bottom-20 z-10 rounded-2xl border-2 border-primary bg-card p-1 shadow-lg md:bottom-4">
            <p className="px-3 pt-2 font-bold text-primary text-xs uppercase tracking-wide">
              Sua posição
            </p>
            <RankingRow entry={me} compact />
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-(--kids-cyan-tint) px-4 py-3 text-center text-sm">
            Ganhe seu primeiro XP para entrar no ranking! 🚀
          </div>
        )
      ) : null}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner /> : null}
            Ver mais posições
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-xs">
          Você chegou ao fim do ranking: {total} {total === 1 ? 'criador' : 'criadores'} com XP.
        </p>
      )}
    </section>
  )
}

function Podium({ entries }: { entries: RankingEntryView[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {entries.map((entry, index) => (
        <li
          // O pódio preserva a ordem da primeira página e nunca é reordenado no cliente.
          // biome-ignore lint/suspicious/noArrayIndexKey: os dados públicos não têm id único
          key={index}
          className={cn(
            'relative flex flex-col items-center rounded-2xl border-2 bg-card px-3 py-5 text-center',
            entry.position === 1
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/25 sm:-translate-y-2'
              : entry.isMe
                ? 'border-primary bg-(--kids-cyan-tint)'
                : 'border-border',
          )}
        >
          {entry.position === 1 ? (
            <Crown className="absolute -top-4 size-8 rotate-[-8deg] text-amber-500" />
          ) : null}
          <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-muted font-bold sz-display">
            {entry.position}º
          </span>
          <AvatarWithAura
            photoUrl={entry.photoUrl}
            levelSlug={entry.levelSlug}
            size="lg"
            label={entry.isMe ? 'Seu avatar' : `Avatar de ${entry.firstName ?? 'colega'}`}
          />
          <ParticipantName
            entry={entry}
            className="mt-3 max-w-full truncate font-bold sz-display"
          />
          <span className="mt-1 font-bold text-primary text-sm tabular-nums">
            {entry.xp.toLocaleString('pt-BR')} XP
          </span>
          <LevelBadge levelSlug={entry.levelSlug} size="sm" className="mt-2" />
        </li>
      ))}
    </ol>
  )
}

function RankingRow({ entry, compact = false }: { entry: RankingEntryView; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5',
        entry.isMe ? 'border-primary bg-(--kids-cyan-tint)' : 'border-transparent bg-muted',
        compact && 'border-transparent bg-card',
      )}
    >
      <span className="w-9 text-center font-bold text-muted-foreground tabular-nums">
        {entry.position}º
      </span>
      <AvatarWithAura
        photoUrl={entry.photoUrl}
        levelSlug={entry.levelSlug}
        size="sm"
        label={entry.isMe ? 'Seu avatar' : `Avatar de ${entry.firstName ?? 'colega'}`}
      />
      <div className="min-w-0 flex-1">
        <ParticipantName entry={entry} className="block truncate font-bold text-sm" />
        <LevelBadge levelSlug={entry.levelSlug} size="sm" className="mt-1" />
      </div>
      <span className="font-bold text-sm tabular-nums">{entry.xp.toLocaleString('pt-BR')} XP</span>
    </div>
  )
}

function ParticipantName({ entry, className }: { entry: RankingEntryView; className?: string }) {
  const name = entry.isMe ? 'Você' : (entry.firstName ?? 'Colega')
  return entry.profileId ? (
    <Link href={`/crianca/${entry.profileId}`} className={cn(className, 'hover:underline')}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  )
}

function Unavailable({ message }: { message: string }) {
  return (
    <Card className="border-2">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <Trophy className="size-10 text-muted-foreground" />
        <h2 className="mt-3 sz-display text-xl">Placar em pausa</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          {message} Tente novamente em instantes.
        </p>
      </CardContent>
    </Card>
  )
}
