'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { Crown, Flame, Rocket, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsTabs } from '@/components/kids/kids-tabs'
import { LeagueBoard } from '@/components/kids/league-board'
import { LevelBadge } from '@/components/kids/level-badge'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { LeagueMeView, RankingEntryView, RankingLeaderboardView } from '@/lib/types'

const PAGE_SIZE = 20

/**
 * Cor da medalha por posição do pódio. Ouro, prata e bronze não são cor de marca:
 * são metal, e todo mundo lê sem legenda. O 1º ainda ganha a coroa e sobe dois
 * pixels, que é o que a referência faz.
 */
const MEDALHA = [
  { cor: 'var(--medal-ouro)', tinta: 'var(--medal-ouro-fg)' },
  { cor: 'var(--medal-prata)', tinta: 'var(--medal-prata-fg)' },
  { cor: 'var(--medal-bronze)', tinta: 'var(--medal-bronze-fg)' },
] as const

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
    <>
      <KidsBand tone="ceu">
        <KidsTabs
          label="Qual placar mostrar"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'general', label: 'Ranking geral', icon: Trophy },
            { value: 'league', label: 'Minha liga', icon: Flame },
          ]}
          className="mx-auto max-w-md"
        />
        <div className="mt-6">
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
      </KidsBand>

      <KidsBand tone="lilas">
        <div className="kids-unit-cyan">
          <KidsClosingCard
            icon={Rocket}
            title="XP é o que move o placar"
            description="Cada aula concluída, quiz acertado e jogo publicado no Mural soma. Continue criando e a sua posição sobe sozinha."
            action={
              <Link href="/cursos" prefetch={false} className="sz-btn-gradient px-6">
                Ver a minha carreira
              </Link>
            }
          />
        </div>
      </KidsBand>
    </>
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
      <div className="kids-unit-cyan">
        <KidsEmptyState
          icon={Sparkles}
          title="O placar está só começando!"
          description="Complete uma atividade que dá XP para aparecer aqui junto com os outros criadores."
        />
      </div>
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
          <div className="kids-carta sticky bottom-20 z-10 border-primary! p-1 md:bottom-4">
            <p className="px-3 pt-2 font-bold text-primary text-xs uppercase tracking-wide">
              Sua posição
            </p>
            <RankingRow entry={me} compact />
          </div>
        ) : (
          <p className="kids-carta px-4 py-3 text-center font-semibold text-sm">
            Ganhe seu primeiro XP para entrar no ranking! 🚀
          </p>
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
        <p className="text-center font-semibold text-muted-foreground text-xs">
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
            'kids-carta relative flex flex-col items-center px-3 py-5 text-center',
            entry.position === 1 && 'sm:-translate-y-2',
          )}
          // A medalha entra pela BORDA do cartão, não pelo fundo: sobre o creme e o
          // azul-claro das faixas, um cartão de fundo dourado brigaria com a faixa.
          // O "sou eu" fica no FUNDO, para os dois sinais poderem coexistir — antes
          // a borda carregava os dois e um apagava o outro.
          style={{
            borderColor: MEDALHA[index]?.cor,
            backgroundColor: entry.isMe
              ? 'color-mix(in oklab, var(--primary) 9%, var(--card))'
              : undefined,
          }}
        >
          {entry.position === 1 ? (
            <Crown
              className="-top-4 absolute size-8 rotate-[-8deg]"
              style={{ color: MEDALHA[0].cor }}
            />
          ) : null}
          <span
            className="sz-display mb-3 flex size-9 items-center justify-center rounded-full"
            style={{
              // Cada medalha traz a PRÓPRIA tinta: escura no ouro, branca na prata e
              // no bronze (ver o par `--medal-*-fg` no globals).
              backgroundColor: MEDALHA[index]?.cor ?? 'var(--muted)',
              color: MEDALHA[index]?.tinta,
            }}
          >
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
            className="sz-display mt-3 max-w-full truncate font-bold"
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
    <div className="kids-unit-muted">
      <KidsEmptyState
        icon={Trophy}
        title="Placar em pausa"
        description={`${message} Tente novamente em instantes.`}
      />
    </div>
  )
}
