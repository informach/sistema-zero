'use client'
import { apiGet } from '@sistemazero/member-shell/lib/api'
import type {
  LeagueMeView,
  RankingEntryView,
  RankingLeaderboardView,
} from '@sistemazero/member-shell/lib/types'
import { Medal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'

const leagueNames: Record<string, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  platina: 'Platina',
  diamante: 'Diamante',
}

const numberPt = new Intl.NumberFormat('pt-BR')

/**
 * O nome de quem aparece: "Você" para a própria linha; o primeiro nome com link para o perfil
 * público quando a pessoa o abriu; sem perfil público, "Participante".
 */
function Participant({
  entry,
  className,
}: {
  entry: { isMe: boolean; profileId?: string; firstName?: string | null }
  className?: string
}) {
  if (entry.isMe) return <strong className={className}>Você</strong>
  if (entry.profileId)
    return (
      <Link
        href={`/criador/${entry.profileId}?de=ranking`}
        prefetch={false}
        className={cn('sz-link', className)}
      >
        {entry.firstName ?? 'Participante'}
      </Link>
    )
  return <span className={className}>Participante</span>
}

function leagueChangeSentence(league: LeagueMeView): string {
  const { promotionCount: up, relegationCount: down } = league
  if (!up && !down) return 'Esta semana não há mudança de liga.'
  const parts = [
    up ? `${up} ${up === 1 ? 'participante sobe' : 'participantes sobem'} de liga` : null,
    down
      ? `${down} ${up ? '' : down === 1 ? 'participante ' : 'participantes '}${down === 1 ? 'muda' : 'mudam'} para a liga anterior`
      : null,
  ].filter(Boolean)
  return `${parts.join('; ')} ao final da semana.`
}

export function RankingClient({
  initial,
  league,
}: {
  initial: RankingLeaderboardView | null
  league: LeagueMeView | null
}) {
  return (
    <>
      <PageBand
        back={{ href: '/progresso', label: 'Seu progresso' }}
        title="Ranking e liga"
        lead="O ranking soma todo o seu XP. A liga recomeça toda semana e junta pessoas num ritmo parecido com o seu."
      />
      <PageBody>
        <div className="grid items-start gap-7 lg:grid-cols-2">
          <RankingSection initial={initial} />
          <LeagueSection league={league} />
        </div>
      </PageBody>
    </>
  )
}

function RankingSection({ initial }: { initial: RankingLeaderboardView | null }) {
  const [ranking, setRanking] = useState(initial)
  const [history, setHistory] = useState<RankingLeaderboardView[]>([])
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  async function next() {
    if (!ranking?.nextCursor) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    try {
      const page = await apiGet<RankingLeaderboardView>(
        `/api/members/gamification/ranking?${new URLSearchParams({ limit: '20', cursor: ranking.nextCursor })}`,
        undefined,
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      setHistory((previous) => [...previous, ranking])
      setRanking(page)
    } catch {
      if (!controller.signal.aborted) toast.error('Não foi possível carregar a próxima página.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  function previous() {
    const page = history.at(-1)
    if (!page) return
    setRanking(page)
    setHistory((pages) => pages.slice(0, -1))
  }

  // A própria linha vem à parte quando não está na página aberta: entra no pé, destacada.
  const meOutside = ranking?.me && !ranking.items.some((entry) => entry.isMe) ? ranking.me : null

  return (
    <section aria-labelledby="ranking-geral" className="sz-card flex flex-col gap-4 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="ranking-geral" className="sz-h2">
          Ranking geral
        </h2>
        {ranking?.me ? (
          <span className="sz-chip sz-chip-acao">
            Sua posição: {ranking.me.position} de {numberPt.format(ranking.total)}
          </span>
        ) : null}
      </div>
      {ranking ? (
        <>
          {ranking.me ? null : (
            <p className="text-muted-foreground">Conquiste XP para participar do ranking.</p>
          )}
          {ranking.items.length || meOutside ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[0.9rem] text-muted-foreground">
                  <th scope="col" className="w-[5rem] px-3 py-2.5 font-bold sm:px-4">
                    Posição
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-bold sm:px-4">
                    Participante
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold sm:px-4">
                    XP
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.items.map((entry, index) => (
                  <RankingRow key={entry.profileId ?? `anonymous-${index}`} entry={entry} />
                ))}
                {meOutside ? <RankingRow entry={meOutside} detached /> : null}
              </tbody>
            </table>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="sz-btn-quiet sz-btn-sm"
              onClick={previous}
              disabled={busy || !history.length}
            >
              Anterior
            </button>
            <button
              type="button"
              className="sz-btn-outline sz-btn-sm"
              onClick={() => void next()}
              disabled={busy || !ranking.nextCursor}
            >
              {busy ? 'Carregando...' : 'Próxima'}
            </button>
          </div>
        </>
      ) : (
        <p role="status" className="text-muted-foreground">
          Ranking indisponível agora. Tente atualizar a página.
        </p>
      )}
    </section>
  )
}

function RankingRow({ entry, detached = false }: { entry: RankingEntryView; detached?: boolean }) {
  const cell = 'h-[3rem] px-3 sm:px-4'
  return (
    <>
      {detached ? (
        <tr aria-hidden>
          <td colSpan={3} className="h-2 p-0" />
        </tr>
      ) : null}
      <tr
        className={cn(
          entry.isMe
            ? '[&>td:first-child]:rounded-l-[0.6rem] [&>td:last-child]:rounded-r-[0.6rem] [&>td]:bg-(--acao-tint)'
            : 'border-border border-t',
        )}
      >
        <td className={cn(cell, 'font-bold')}>{entry.position}º</td>
        <td className={cell}>
          <Participant entry={entry} />
        </td>
        <td className={cn(cell, 'text-right', entry.isMe && 'font-bold')}>
          {numberPt.format(entry.xp)}
        </td>
      </tr>
    </>
  )
}

function LeagueSection({ league }: { league: LeagueMeView | null }) {
  const total = league?.entries.length ?? 0
  return (
    <section aria-labelledby="liga-semanal" className="sz-card flex flex-col gap-4 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="liga-semanal" className="sz-h2">
          Sua liga semanal
        </h2>
        {league ? (
          <span className="sz-chip">
            <Medal aria-hidden />
            Liga {leagueNames[league.tier] ?? league.tier}
          </span>
        ) : null}
      </div>
      {league ? (
        <>
          <p className="text-muted-foreground">
            Posição {league.myPosition} nesta semana. {leagueChangeSentence(league)}
          </p>
          <ol className="flex flex-col gap-2">
            {league.entries.map((entry, index) => {
              const up = entry.position <= league.promotionCount
              const down = !up && entry.position > total - league.relegationCount
              return (
                <li
                  key={entry.profileId ?? `anonymous-${index}`}
                  className={cn(
                    'flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-[0.8rem] px-4 py-3',
                    entry.isMe ? 'bg-(--acao-tint)' : 'bg-background',
                  )}
                >
                  <span className="w-[1.8rem] font-bold">{entry.position}</span>
                  <Participant entry={entry} className="min-w-0 flex-1 basis-[6rem] break-words" />
                  <span
                    className={cn(
                      'text-[0.9rem]',
                      entry.isMe ? 'font-bold' : 'text-muted-foreground',
                    )}
                  >
                    {numberPt.format(entry.weeklyXp)} XP na semana
                  </span>
                  {up ? <span className="sz-chip sz-chip-ok">Sobe</span> : null}
                  {down ? <span className="sz-chip sz-chip-aviso">Volta de liga</span> : null}
                </li>
              )
            })}
          </ol>
          {league.promotionCount || league.relegationCount ? (
            <p className="text-[0.9rem] text-muted-foreground">
              “Sobe”: vai para a próxima liga. “Volta de liga”: vai para a liga anterior.
            </p>
          ) : null}
        </>
      ) : (
        <p role="status" className="text-muted-foreground">
          Liga indisponível agora. Tente atualizar a página.
        </p>
      )}
    </section>
  )
}
