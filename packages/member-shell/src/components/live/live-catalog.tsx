'use client'

import type { LiveCatalogView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { CalendarDays, Clock3, Video } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import { LiveParentReservations } from './live-parent-reservations'

export function LiveCatalog({ mode = 'learner' }: { mode?: 'learner' | 'parent' | 'teacher' }) {
  const [data, setData] = useState<LiveCatalogView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reload, setReload] = useState(0)
  const endpoint = mode === 'parent' ? '/api/parents/live/enrollments' : '/api/live/catalog'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry and profile assignment explicitly invalidate this catalog.
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    liveRequest<LiveCatalogView>(endpoint, undefined, 'GET', controller.signal)
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [endpoint, reload])
  async function loadMore() {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await liveRequest<LiveCatalogView>(`${endpoint}?cursor=${data.nextCursor}`)
      setData((previous) =>
        previous
          ? {
              ...next,
              programs: [
                ...new Map(
                  [...previous.programs, ...next.programs].map((item) => [item.id, item]),
                ).values(),
              ],
              cohorts: [
                ...new Map(
                  [...previous.cohorts, ...next.cohorts].map((item) => [item.id, item]),
                ).values(),
              ],
              sessions: [
                ...new Map(
                  [...previous.sessions, ...next.sessions].map((item) => [item.id, item]),
                ).values(),
              ],
              enrollments: [
                ...new Map(
                  [...previous.enrollments, ...next.enrollments].map((item) => [item.id, item]),
                ).values(),
              ],
            }
          : next,
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível carregar as próximas turmas.',
      )
    } finally {
      setLoadingMore(false)
    }
  }
  const destination = mode === 'teacher' ? '/admin/professor/ao-vivo' : '/oficinas/aulas'
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          <CalendarDays className="size-4" aria-hidden /> Juntos para criar
        </span>
        <h1 className="sz-display text-3xl font-bold">
          {mode === 'teacher' ? 'Suas turmas ao vivo' : 'Oficinas ao vivo'}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {mode === 'parent'
            ? 'Acompanhe as inscrições da família e o prazo de cada encontro.'
            : mode === 'teacher'
              ? 'Prepare a sala, receba a turma e acompanhe cada criação.'
              : 'Uma ideia, uma turma pequena e uma professora criando com você.'}
        </p>
      </header>
      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p>{error}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => setReload((value) => value + 1)}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {!data && !error ? <p role="status">Buscando as oficinas…</p> : null}
      {data ? (
        <>
          {mode === 'parent' ? (
            <LiveParentReservations
              catalog={data}
              onAssigned={() => setReload((value) => value + 1)}
            />
          ) : null}
          <section aria-labelledby="live-my-schedule" className="space-y-4">
            <h2 id="live-my-schedule" className="sz-display text-2xl font-bold">
              {mode === 'parent' ? 'Agenda da família' : 'Minha agenda'}
            </h2>
            {data.sessions.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6">
                <CalendarDays className="mb-3 size-8 text-primary" aria-hidden />
                <p>
                  {mode === 'teacher'
                    ? 'Você ainda não tem turmas atribuídas.'
                    : 'Sua próxima oficina vai aparecer aqui.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.sessions.map((session) => {
                  const cohort = data.cohorts.find((item) => item.id === session.cohortId)
                  const enrollments = data.enrollments.filter(
                    (item) => item.cohortId === session.cohortId && item.status === 'active',
                  )
                  const now = Date.now()
                  const expired = now >= Date.parse(session.accessEndsAt)
                  const scheduled = now < Date.parse(session.startsAt)
                  return (
                    <article
                      key={session.id}
                      className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-primary">{cohort?.title}</p>
                          <h3 className="sz-display mt-1 text-xl font-bold">{session.title}</h3>
                        </div>
                        <Video className="size-6 shrink-0 text-primary" aria-hidden />
                      </div>
                      <p className="flex items-center gap-2 text-sm">
                        <CalendarDays className="size-4 shrink-0" aria-hidden />
                        {liveDate(session.occurrenceStartsAt ?? session.startsAt, cohort?.timeZone)}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="size-4 shrink-0" aria-hidden />
                        {expired
                          ? 'Acesso encerrado'
                          : `Disponível até ${liveDate(session.accessEndsAt, cohort?.timeZone)}`}
                      </p>
                      {mode === 'parent' ? (
                        <p className="text-sm font-medium">
                          {enrollments
                            .map((item) => item.learnerName || 'Vaga aguardando perfil')
                            .join(' · ')}
                        </p>
                      ) : (
                        <Link
                          className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          href={`${destination}/${session.id}`}
                        >
                          {mode === 'teacher'
                            ? 'Preparar sala'
                            : expired
                              ? 'Ver detalhes'
                              : scheduled
                                ? 'Ver encontro e testar aparelhos'
                                : 'Abrir encontro'}
                        </Link>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
            {data.nextCursor && (
              <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? 'Carregando…' : 'Ver mais turmas'}
              </Button>
            )}
          </section>
          {mode === 'learner' && data.programs.length > 0 ? (
            <section className="space-y-4" aria-labelledby="live-explore">
              <h2 id="live-explore" className="sz-display text-2xl font-bold">
                Conheça as oficinas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.programs.map((program) => (
                  <article key={program.id} className="rounded-2xl border bg-card p-5">
                    <h3 className="sz-display text-xl font-bold">{program.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {program.description}
                    </p>
                    <p className="mt-4 text-sm">As inscrições são feitas pelo responsável.</p>
                    <Link
                      className="mt-2 inline-block font-bold text-primary underline underline-offset-4"
                      href="/pais/oficinas"
                    >
                      Ver com meu responsável
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
