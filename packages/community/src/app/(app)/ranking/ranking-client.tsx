'use client'
import { apiGet } from '@sistemazero/member-shell/lib/api'
import type {
  LeagueMeView,
  RankingEntryView,
  RankingLeaderboardView,
} from '@sistemazero/member-shell/lib/types'
import { ArrowDown, ArrowUp, Medal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StageFace, StageLine } from '@/components/community/journey/stage'
import { PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
import type { StageBadge } from '@/lib/journey-stage'

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
 * público quando a pessoa o abriu; sem perfil público, "Participante". Com a foto e a etapa da
 * jornada (19/10/2026), que o members só manda de quem mostra o perfil e da própria pessoa: o anel
 * da cor em volta da foto e o nome da etapa embaixo do nome.
 */
function Participant({
  entry,
  className,
}: {
  entry: {
    isMe: boolean
    profileId?: string
    firstName?: string | null
    photoUrl?: string | null
    journey?: StageBadge
  }
  className?: string
}) {
  const label = entry.isMe
    ? 'Você'
    : entry.profileId
      ? (entry.firstName ?? 'Participante')
      : 'Participante'
  const name = entry.isMe ? (
    <strong>Você</strong>
  ) : entry.profileId ? (
    <Link href={`/criador/${entry.profileId}?de=ranking`} prefetch={false} className="sz-link">
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  )
  // A foto só a partir de 640px: no celular a linha não comporta foto, nome e etapa lado a lado
  // (a etapa continua escrita embaixo do nome).
  return (
    <span className={cn('flex min-w-0 items-center gap-3', className)}>
      <span className="hidden sm:inline-flex">
        <StageFace
          name={entry.isMe ? (entry.firstName ?? label) : label}
          photoUrl={entry.isMe || entry.profileId ? entry.photoUrl : null}
          badge={entry.journey}
          size="p"
          className="size-10 text-[0.85rem]"
        />
      </span>
      <span className="flex min-w-0 flex-col break-words">
        {name}
        {entry.journey ? <StageLine badge={entry.journey} /> : null}
      </span>
    </span>
  )
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
      >
        {/* A liga da semana é a disputa viva: mora no palco (Estúdio à noite). */}
        <div className="mt-6">
          <LeagueSection league={league} />
        </div>
      </PageBand>
      <PageBody>
        <RankingSection initial={initial} />
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
    <section
      aria-labelledby="ranking-geral"
      className="sz-card flex flex-col gap-4 p-4 sm:p-6 md:p-8"
    >
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
            // A tabela cabe no celular (colunas estreitas, sem foto); a rolagem é só a rede.
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="text-[0.9rem] text-muted-foreground">
                    <th
                      scope="col"
                      className="w-[3rem] px-1.5 py-2.5 font-bold sm:w-[6rem] sm:px-4"
                    >
                      <span aria-hidden="true" className="sm:hidden">
                        Nº
                      </span>
                      <span className="sr-only sm:not-sr-only">Posição</span>
                    </th>
                    <th scope="col" className="px-1.5 py-2.5 font-bold sm:px-4">
                      Participante
                    </th>
                    <th
                      scope="col"
                      className="w-[4.6rem] px-1.5 py-2.5 text-right font-bold sm:w-[7rem] sm:px-4"
                    >
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
            </div>
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
  const cell = 'h-[3.6rem] px-1.5 py-2 sm:px-4'
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
            ? '[&>td:first-child]:rounded-l-[0.6rem] [&>td:first-child]:shadow-[inset_4px_0_0_var(--cta)] [&>td:last-child]:rounded-r-[0.6rem] [&>td]:bg-(--aviso-tint)'
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
    <section aria-labelledby="liga-semanal" className="flex flex-col gap-4">
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
          <ol className="sz-card m-0 flex list-none flex-col overflow-hidden p-0">
            {league.entries.map((entry, index) => {
              const up = entry.position <= league.promotionCount
              const down = !up && entry.position > total - league.relegationCount
              const lastUp =
                up && entry.position === league.promotionCount && total > entry.position
              const firstDown =
                down && entry.position === total - league.relegationCount + 1 && index > 0
              return (
                <li key={entry.profileId ?? `anonymous-${index}`} className="flex flex-col">
                  {firstDown ? (
                    <span className="border-(--rosa) border-t-2 border-dashed px-4 pt-1 text-center font-bold text-(--rosa) text-[0.85rem]">
                      Daqui para baixo voltam para a liga anterior
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-x-3.5 gap-y-1 px-4 py-3',
                      index > 0 && !firstDown && 'border-border border-t',
                      entry.isMe && 'bg-(--aviso-tint) shadow-[inset_4px_0_0_var(--cta)]',
                    )}
                  >
                    <span className="w-[1.8rem] font-(family-name:--font-pixel)">
                      {entry.position}
                    </span>
                    <Participant
                      entry={entry}
                      className="min-w-0 flex-1 basis-[6rem] break-words"
                    />
                    {up ? (
                      <span className="sz-chip sz-chip-ok">
                        <ArrowUp aria-hidden />
                        Sobe
                      </span>
                    ) : null}
                    {down ? (
                      <span className="sz-chip sz-chip-aviso">
                        <ArrowDown aria-hidden />
                        Volta de liga
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'font-(family-name:--font-pixel) text-[0.95rem]',
                        entry.isMe ? 'text-white' : 'text-(--texto-claro-2)',
                      )}
                    >
                      {numberPt.format(entry.weeklyXp)} XP
                      <span className="sr-only"> na semana</span>
                    </span>
                  </div>
                  {lastUp ? (
                    <span className="border-(--menta) border-b-2 border-dashed px-4 pb-1 text-center font-bold text-(--menta) text-[0.85rem]">
                      Até aqui sobem para a próxima liga
                    </span>
                  ) : null}
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
