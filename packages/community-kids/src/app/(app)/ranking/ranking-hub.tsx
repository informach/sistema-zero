'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import {
  ArrowRight,
  Crown,
  GraduationCap,
  ListChecks,
  RefreshCw,
  Rocket,
  Sparkles,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { type ComponentType, type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import { ChestIcon } from '@/components/kids/chest-icon'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { KidsTabs } from '@/components/kids/kids-tabs'
import { LeagueBoard } from '@/components/kids/league-board'
import { LevelBadge } from '@/components/kids/level-badge'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { LeagueMeView, RankingEntryView, RankingLeaderboardView } from '@/lib/types'
import { type XpSourceId, xpSources } from '@/lib/xp-sources'

const PAGE_SIZE = 20

/** A aba da liga no hash: é o que sobrevive ao "Tentar de novo", que recarrega a página. */
const ABA_LIGA = 'liga'

function recarregarNaAba(tab: 'general' | 'league') {
  window.history.replaceState(
    null,
    '',
    tab === 'league' ? `#${ABA_LIGA}` : window.location.pathname,
  )
  window.location.reload()
}

/**
 * O pódio das telas-modelo (11/09/2026, medido a 1440px): três colunas de 313px dentro
 * de um cartão branco, o 2º à esquerda, o 1º no meio e o 3º à direita, cada um com o
 * avatar em cima de um bloco de metal de cantos redondos só no alto. A ALTURA do bloco
 * diz a posição (140, 108 e 84px) e o número vai dentro dele, em Baloo.
 *
 * Ouro, prata e bronze não são cor de marca: são metal, e todo mundo lê sem legenda.
 * Cada metal traz a PRÓPRIA tinta (escura no ouro, branca na prata e no bronze, ver o
 * par `--medal-*-fg` no globals), e o avatar sem foto pinta a inicial no mesmo metal.
 *
 * ⚠️ A cor e a altura saem da POSIÇÃO, não do índice: o ranking empata ("1, 1, 3"), e
 * dois primeiros lugares precisam dos dois o mesmo ouro.
 */
const METAL: Record<1 | 2 | 3, { fundo: string; tinta: string; avatar: string; bloco: string }> = {
  1: {
    fundo: 'var(--medal-ouro)',
    tinta: 'var(--medal-ouro-fg)',
    avatar: 'bg-(--medal-ouro) text-(--medal-ouro-fg) size-14 md:size-20',
    bloco: 'h-24 md:h-[8.75rem]',
  },
  2: {
    fundo: 'var(--medal-prata)',
    tinta: 'var(--medal-prata-fg)',
    avatar: 'bg-(--medal-prata) text-(--medal-prata-fg) size-12 md:size-16',
    bloco: 'h-[4.75rem] md:h-[6.75rem]',
  },
  3: {
    fundo: 'var(--medal-bronze)',
    tinta: 'var(--medal-bronze-fg)',
    avatar: 'bg-(--medal-bronze) text-(--medal-bronze-fg) size-12 md:size-16',
    bloco: 'h-[3.75rem] md:h-[5.25rem]',
  },
}

/** A ordem de DESENHO do pódio (2º, 1º, 3º). A lista continua 1, 2, 3 para o leitor. */
const ORDEM_NO_PODIO = ['order-2', 'order-1', 'order-3'] as const

/**
 * O ladrilho de cada fonte de XP, nas cores das telas-modelo (azul, âmbar, verde,
 * coral). O par de cada cor é o das oficinas, que já passa AA (tinta escura no âmbar);
 * o verde é o verde profundo da paleta, fundo que não segue o tema, com tinta branca.
 */
const FONTE: Record<
  XpSourceId,
  { icone: ComponentType<{ className?: string }>; fundo: string; tinta: string; tamanho?: string }
> = {
  aula: { icone: GraduationCap, fundo: 'var(--tool-estudio)', tinta: 'var(--tool-estudio-fg)' },
  publicar: { icone: Rocket, fundo: 'var(--tool-pensa)', tinta: 'var(--tool-pensa-fg)' },
  quiz: {
    icone: ListChecks,
    fundo: 'var(--sz-kids-verde-profundo)',
    tinta: 'var(--sz-tool-on-sig)',
  },
  // O baú é o desenho da trilha (grade de 32, traço 2): no tamanho do lucide ele sai fino.
  bau: {
    icone: ChestIcon,
    fundo: 'var(--tool-pinta)',
    tinta: 'var(--tool-pinta-fg)',
    tamanho: 'size-6',
  },
}

export function RankingHub({
  header,
  initialRanking,
  league,
  canPublish = false,
}: {
  /** O cabeçalho da página (vem do servidor, que é dono do texto). As abas moram logo
   *  abaixo dele, na mesma faixa creme, como nas telas-modelo. */
  header?: ReactNode
  initialRanking: RankingLeaderboardView | null
  league: LeagueMeView | null
  /** Pode abrir o Estúdio livre (posse + nível): só assim o jogo publicado vira fonte. */
  canPublish?: boolean
}) {
  const [tab, setTab] = useState<'general' | 'league'>('general')
  // O "Tentar de novo" RECARREGA a página (o placar vem do servidor), e a aba viajava junto:
  // quem estava na liga voltava no geral. Ela vai no hash, lido DEPOIS da montagem — ler
  // `location` no estado inicial diverge do HTML do servidor (full review de 11/09/2026).
  useEffect(() => {
    if (window.location.hash === `#${ABA_LIGA}`) setTab('league')
  }, [])
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
      <KidsBand tone="creme">
        {header}
        <KidsTabs
          label="Qual placar mostrar"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'general', label: 'Ranking geral' },
            { value: 'league', label: 'Minha liga' },
          ]}
          className={header ? 'mt-7' : undefined}
        />
      </KidsBand>

      <KidsBand tone="menta">
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
          <Unavailable
            message="Sua liga não pôde ser carregada agora."
            onRetry={() => recarregarNaAba('league')}
          />
        )}
      </KidsBand>

      <KidsBand tone="lilas">
        <HowToClimb canPublish={canPublish} />
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
  if (!available) {
    return (
      <Unavailable
        message="O ranking geral não pôde ser carregado agora."
        onRetry={() => recarregarNaAba('general')}
      />
    )
  }
  if (items.length === 0) {
    return (
      <KidsEmptyState
        icon={Sparkles}
        titleAs="h2"
        title="O placar está só começando!"
        description="Complete uma atividade que dá XP para aparecer aqui junto com os outros criadores."
      />
    )
  }

  const meIsLoaded = items.some((entry) => entry.isMe)
  return (
    <section
      className="kids-carta rounded-[2rem] px-4 pt-6 pb-6 md:px-8 md:pt-8 md:pb-8"
      aria-label="Ranking geral por XP acumulado"
    >
      <Podium entries={items.slice(0, 3)} />

      {items.length > 3 ? (
        <ol className="mt-7 space-y-2 border-border border-t pt-7">
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
          // Quem ainda não apareceu na página carregada vê a própria linha presa no pé
          // da tela, para não precisar rolar o placar inteiro atrás de si.
          <div className="sticky bottom-20 z-10 mt-4 rounded-[1.25rem] bg-card p-2 shadow-[0_10px_30px_-18px_rgb(12_30_62/0.45)] md:bottom-4">
            <p className="px-2 pt-1 pb-2 font-extrabold text-primary text-xs uppercase tracking-[0.12em]">
              Sua posição
            </p>
            <RankingRow entry={me} />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-center font-bold text-[0.9375rem]">
            Ganhe seu primeiro XP para entrar no ranking! 🚀
          </p>
        )
      ) : null}

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="sz-btn-gradient sz-btn-suave gap-2 px-6 disabled:opacity-60"
          >
            {loadingMore ? <Spinner /> : null}
            Ver mais posições
          </button>
        </div>
      ) : (
        <p className="mt-6 text-center font-semibold text-muted-foreground text-sm">
          Você chegou ao fim do ranking: {total} {total === 1 ? 'criador' : 'criadores'} com XP.
        </p>
      )}
    </section>
  )
}

function Podium({ entries }: { entries: RankingEntryView[] }) {
  return (
    <ol className="grid grid-cols-3 items-end gap-2 md:gap-5">
      {entries.map((entry, index) => {
        const metal = METAL[Math.min(3, Math.max(1, entry.position)) as 1 | 2 | 3]
        return (
          <li
            // O pódio preserva a ordem da primeira página e nunca é reordenado no cliente.
            // biome-ignore lint/suspicious/noArrayIndexKey: os dados públicos não têm id único
            key={index}
            className={cn(
              'flex min-w-0 flex-col items-center text-center',
              ORDEM_NO_PODIO[index],
              // Com um só no placar, ele fica no meio (e com dois, o 2º à esquerda dele).
              entries.length === 1 && 'col-start-2',
            )}
          >
            {/* A posição é DITA aqui: o `<ol>` conta pela ordem no DOM, e o placar é por
                competição (dois empatados em 1º levam o 3º ao terceiro lugar), então a
                contagem da lista divergiria do que está na tela. */}
            <span className="sr-only">{entry.position}º lugar</span>
            {entry.position === 1 ? (
              <Crown
                aria-hidden
                strokeWidth={1.75}
                className="mb-2.5 size-6 md:size-7"
                style={{ color: metal.fundo }}
              />
            ) : null}
            <AvatarWithAura
              photoUrl={entry.photoUrl}
              name={entry.firstName ?? (entry.isMe ? 'Você' : null)}
              size="lg"
              className={metal.avatar}
              label={entry.isMe ? 'Seu avatar' : `Avatar de ${entry.firstName ?? 'colega'}`}
            />
            <div className="mt-3.5 flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
              <ParticipantName
                entry={entry}
                className="sz-display max-w-full truncate text-base md:text-xl"
              />
            </div>
            <span className="mt-1.5 font-medium text-muted-foreground text-sm tabular-nums md:text-[0.9375rem]">
              {entry.xp.toLocaleString('pt-BR')} XP
            </span>
            <LevelBadge levelSlug={entry.levelSlug} size="sm" className="mt-2 max-w-full" />
            <div
              className={cn(
                'mt-3.5 grid w-full place-items-center rounded-t-[1rem] md:rounded-t-[1.5rem]',
                metal.bloco,
              )}
              style={{ backgroundColor: metal.fundo, color: metal.tinta }}
            >
              {/* O número já foi dito lá em cima ("Nº lugar"): aqui ele é só desenho. */}
              <span aria-hidden="true" className="sz-display text-2xl md:text-[1.875rem]">
                {entry.position}º
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function RankingRow({ entry }: { entry: RankingEntryView }) {
  return (
    <div
      className={cn(
        'flex min-h-[3.75rem] items-center gap-3 rounded-2xl px-3.5 py-2 md:gap-4 md:px-[1.125rem]',
        // A própria linha ganha o contorno azul da marca (o "você está aqui" das
        // telas-modelo); as outras ficam no cinza-claro do fundo do app.
        entry.isMe ? 'bg-card ring-2 ring-primary ring-inset' : 'bg-background',
      )}
    >
      <span className="w-8 shrink-0 font-extrabold text-muted-foreground text-[0.9375rem] tabular-nums md:w-9">
        {entry.position}º
      </span>
      <AvatarWithAura
        photoUrl={entry.photoUrl}
        name={entry.firstName ?? (entry.isMe ? 'Você' : null)}
        size="sm"
        className="size-9"
        label={entry.isMe ? 'Seu avatar' : `Avatar de ${entry.firstName ?? 'colega'}`}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
        <ParticipantName entry={entry} className="truncate font-extrabold text-base" />
        <LevelBadge levelSlug={entry.levelSlug} size="sm" />
      </div>
      <span className="shrink-0 font-extrabold text-muted-foreground text-[0.9375rem] tabular-nums">
        {entry.xp.toLocaleString('pt-BR')} XP
      </span>
    </div>
  )
}

/**
 * O nome no placar, com a pílula azul "você" na própria criança (o desenho das
 * telas-modelo). O nome vira link para o perfil público só quando o colega é público
 * (opt-in dos pais). Sem o primeiro nome, a própria criança é "Você" (e aí a pílula
 * sobraria) e o colega é "Colega".
 */
function ParticipantName({ entry, className }: { entry: RankingEntryView; className?: string }) {
  const name = entry.firstName ?? (entry.isMe ? 'Você' : 'Colega')
  return (
    <>
      {entry.profileId ? (
        <Link href={`/crianca/${entry.profileId}`} className={cn(className, 'hover:underline')}>
          {name}
        </Link>
      ) : (
        <span className={className}>{name}</span>
      )}
      {entry.isMe && entry.firstName ? (
        <span className="kids-marca shrink-0 rounded-full px-2 py-0.5 font-extrabold text-[0.6875rem] leading-tight">
          você
        </span>
      ) : null}
    </>
  )
}

/**
 * "Placar em pausa": o servidor não respondeu. Não é placar vazio, então o círculo é o
 * creme do tom `pausa` (o amarelo é o de festejar), e o botão recarrega a página: o
 * placar vem do servidor, e um `router.refresh()` não refaria o estado já montado aqui.
 */
function Unavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <KidsEmptyState
      tone="pausa"
      icon={Trophy}
      // O recado É a seção da faixa (vem logo abaixo do h1 da página).
      titleAs="h2"
      title="Placar em pausa"
      description={`${message} Tente novamente em instantes.`}
      action={
        <button type="button" onClick={onRetry} className="sz-btn-gradient gap-2.5 px-6">
          <RefreshCw className="size-[1.125rem]" aria-hidden />
          Tentar de novo
        </button>
      }
    />
  )
}

/** O fim da página: quanto vale cada coisa, com os números do servidor. */
function HowToClimb({ canPublish }: { canPublish: boolean }) {
  const fontes = xpSources({ canPublish })
  return (
    <section aria-labelledby="como-subir-no-placar">
      <KidsSectionHeader
        id="como-subir-no-placar"
        title="XP é o que move o placar"
        subtitle="Cada aula concluída, quiz acertado e jogo publicado no Mural soma. Continue criando e a sua posição sobe sozinha."
        actions={
          <Link
            href="/cursos"
            prefetch={false}
            // 44px, o alvo de toque da casa (estava em 40).
            className="sz-btn-gradient sz-btn-inverso h-11 gap-1.5 px-5 text-sm"
          >
            Ver a minha carreira
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul
        className={cn(
          'grid gap-4 sm:grid-cols-2',
          fontes.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        )}
      >
        {fontes.map((fonte) => {
          const visual = FONTE[fonte.id]
          const Icone = visual.icone
          return (
            <li key={fonte.id} className="kids-carta flex flex-col p-5 md:p-[1.375rem]">
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-[0.75rem]"
                  style={{ backgroundColor: visual.fundo, color: visual.tinta }}
                >
                  <Icone className={visual.tamanho ?? 'size-5'} />
                </span>
                <span className="rounded-full bg-(--band-menta) px-3 py-1 font-extrabold text-(--tinta) text-[0.8125rem] tabular-nums">
                  +{fonte.xp} XP
                </span>
              </div>
              <p className="mt-4 font-extrabold text-[0.9375rem] leading-snug">{fonte.label}</p>
              {fonte.detail ? (
                <p className="mt-1 font-medium text-muted-foreground text-[0.8125rem] leading-snug">
                  {fonte.detail}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
