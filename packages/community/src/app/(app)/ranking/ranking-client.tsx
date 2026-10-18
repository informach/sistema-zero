'use client'
import { apiGet } from '@sistemazero/member-shell/lib/api'
import type { LeagueMeView, RankingLeaderboardView } from '@sistemazero/member-shell/lib/types'
import { Button } from '@sistemazero/ui/button'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const leagueNames: Record<string, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  platina: 'Platina',
  diamante: 'Diamante',
}
export function RankingClient({
  initial,
  league,
}: {
  initial: RankingLeaderboardView | null
  league: LeagueMeView | null
}) {
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
  return (
    <div className="space-y-7">
      <header>
        <h1 className="sz-display text-3xl">Ranking e liga</h1>
        <p className="mt-2 text-muted-foreground">
          Progresso da comunidade adulta. O ranking acumula XP; a liga recomeça a cada semana.
        </p>
      </header>
      <section className="rounded-3xl bg-card p-6">
        <h2 className="text-xl font-semibold">Ranking geral</h2>
        {ranking ? (
          <>
            <p className="my-3 text-sm">
              {ranking.me
                ? `Sua posição: ${ranking.me.position} de ${ranking.total}.`
                : 'Conquiste XP para participar do ranking.'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-3">Posição</th>
                    <th className="p-3">Participante</th>
                    <th className="p-3">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.items.map((entry, index) => (
                    <tr
                      key={entry.profileId ?? `anonymous-${index}`}
                      className={entry.isMe ? 'bg-primary/10 font-semibold' : 'border-t'}
                    >
                      <td className="p-3">{entry.position}</td>
                      <td className="p-3">
                        {entry.profileId ? (
                          <Link
                            className="text-primary underline"
                            href={`/criador/${entry.profileId}`}
                          >
                            {entry.isMe ? 'Você' : (entry.firstName ?? 'Participante')}
                          </Link>
                        ) : entry.isMe ? (
                          'Você'
                        ) : (
                          (entry.firstName ?? 'Participante')
                        )}
                      </td>
                      <td className="p-3">{entry.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={previous} disabled={busy || !history.length}>
                Anterior
              </Button>
              <Button onClick={() => void next()} disabled={busy || !ranking.nextCursor}>
                {busy ? 'Carregando...' : 'Próxima'}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3" role="status">
            Ranking indisponível agora. Tente atualizar a página.
          </p>
        )}
      </section>
      <section className="rounded-3xl bg-card p-6">
        <h2 className="text-xl font-semibold">Sua liga semanal</h2>
        {league ? (
          <>
            <p className="my-3">
              Liga {leagueNames[league.tier] ?? league.tier} · posição {league.myPosition}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {league.promotionCount
                ? `${league.promotionCount} participantes sobem de liga; ${league.relegationCount} mudam para a liga anterior ao final da semana.`
                : 'Esta semana não há mudança de liga.'}
            </p>
            <ol className="space-y-2">
              {league.entries.map((entry, index) => (
                <li
                  key={entry.profileId ?? `anonymous-${index}`}
                  className={`flex justify-between rounded-xl p-3 ${entry.isMe ? 'bg-primary/10 font-semibold' : 'bg-background'}`}
                >
                  <span>
                    {entry.position}.{' '}
                    {entry.profileId ? (
                      <Link className="text-primary underline" href={`/criador/${entry.profileId}`}>
                        {entry.isMe ? 'Você' : (entry.firstName ?? 'Participante')}
                      </Link>
                    ) : entry.isMe ? (
                      'Você'
                    ) : (
                      (entry.firstName ?? 'Participante')
                    )}
                  </span>
                  <span>{entry.weeklyXp} XP</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-3" role="status">
            Liga indisponível agora. Tente atualizar a página.
          </p>
        )}
      </section>
      <Link href="/progresso" prefetch={false} className="font-semibold text-primary">
        Voltar ao progresso
      </Link>
    </div>
  )
}
