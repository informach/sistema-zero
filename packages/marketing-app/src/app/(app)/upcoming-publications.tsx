'use client'

import { Button } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { CalendarClock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { MarkPublishedDialog } from '@/components/shared/mark-published-dialog'
import { NetworkChip } from '@/components/shared/network-chip'
import { PubStatusBadge } from '@/components/shared/pub-status-badge'
import { apiGet } from '@/lib/api'
import { addDaysToKey } from '@/lib/calendar'
import { formatShortSp, spDayWindow, todayDayKeySp } from '@/lib/dates'
import type { MarketingPage, PublicationListItemView, PublicationView } from '@/lib/types'

const PENDING_STATUSES = 'scheduled,awaiting_manual'

function composerHref(pub: PublicationListItemView): string {
  return `/conteudos/${pub.contentId}/publicacoes/${pub.id}`
}

/** Linha de publicação do painel (hoje/amanhã e atrasadas). */
function PublicationRow({
  pub,
  onMark,
}: {
  pub: PublicationListItemView
  onMark: (id: string) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2">
      {pub.scheduledAt ? (
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {formatShortSp(pub.scheduledAt)}
        </span>
      ) : null}
      <NetworkChip format={pub.format} />
      <Link
        href={composerHref(pub)}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
        title={pub.contentTitle}
      >
        {pub.contentTitle}
      </Link>
      <PubStatusBadge status={pub.status} />
      <Button size="sm" variant="outline" onClick={() => onMark(pub.id)}>
        Marcar como publicada
      </Button>
    </li>
  )
}

/**
 * Painel: agenda de hoje/amanhã + atrasadas + falhas, em 3 buscas paralelas.
 * Cada bloco tem estado de erro próprio e VISÍVEL (padrão painel-cards:
 * falha nunca vira lista vazia silenciosa).
 */
export function UpcomingPublications() {
  const [upcoming, setUpcoming] = useState<PublicationListItemView[] | null>(null)
  const [overdue, setOverdue] = useState<PublicationListItemView[] | null>(null)
  const [failures, setFailures] = useState<PublicationListItemView[] | null>(null)
  const [upcomingFailed, setUpcomingFailed] = useState(false)
  const [overdueFailed, setOverdueFailed] = useState(false)
  const [failuresFailed, setFailuresFailed] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const todayKey = todayDayKeySp()
    const fromIso = spDayWindow(todayKey).fromIso
    const toIso = spDayWindow(addDaysToKey(todayKey, 1)).toIso
    const nowIso = new Date().toISOString()

    const fetchPage = (params: URLSearchParams) =>
      apiGet<MarketingPage<PublicationListItemView>>(`/api/marketing/publications?${params}`)

    fetchPage(
      new URLSearchParams({ from: fromIso, to: toIso, status: PENDING_STATUSES, limit: '100' }),
    )
      .then((page) => alive && setUpcoming(page.items))
      .catch(() => alive && setUpcomingFailed(true))
    fetchPage(new URLSearchParams({ to: nowIso, status: PENDING_STATUSES, limit: '100' }))
      .then((page) => alive && setOverdue(page.items))
      .catch(() => alive && setOverdueFailed(true))
    fetchPage(new URLSearchParams({ status: 'failed', limit: '20' }))
      .then((page) => alive && setFailures(page.items))
      .catch(() => alive && setFailuresFailed(true))

    return () => {
      alive = false
    }
  }, [])

  const onMarked = useCallback((view: PublicationView) => {
    setUpcoming((current) => current?.filter((p) => p.id !== view.id) ?? current)
    setOverdue((current) => current?.filter((p) => p.id !== view.id) ?? current)
    setFailures((current) => current?.filter((p) => p.id !== view.id) ?? current)
  }, [])

  // Um item atrasado de HOJE também cai na janela de hoje/amanhã — a lista de
  // cima mostra só o que não está na seção de atrasadas. Por isso ela espera as
  // DUAS buscas assentarem (evita linha duplicada por um instante).
  const overdueIds = new Set((overdue ?? []).map((p) => p.id))
  const upcomingVisible = upcoming?.filter((p) => !overdueIds.has(p.id)) ?? null
  const upcomingReady = upcoming !== null && (overdue !== null || overdueFailed)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Publicações agendadas</h2>

      {overdueFailed ? (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar as publicações atrasadas. Recarregue a página.
        </p>
      ) : overdue && overdue.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Atrasadas: já passaram do horário e seguem pendentes
          </p>
          <ul className="space-y-1.5">
            {overdue.map((pub) => (
              <PublicationRow key={pub.id} pub={pub} onMark={setMarkingId} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Hoje e amanhã</h3>
        {upcomingFailed ? (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar a agenda de hoje e amanhã. Recarregue a página.
          </p>
        ) : !upcomingReady || upcomingVisible === null ? (
          <div className="space-y-1.5">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ) : upcomingVisible.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nada agendado para hoje e amanhã"
            description="Agende publicações pelo composer de cada conteúdo ou pelo calendário."
          />
        ) : (
          <ul className="space-y-1.5">
            {upcomingVisible.map((pub) => (
              <PublicationRow key={pub.id} pub={pub} onMark={setMarkingId} />
            ))}
          </ul>
        )}
      </div>

      {failuresFailed ? (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar as falhas de publicação. Recarregue a página.
        </p>
      ) : failures && failures.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Falhas de publicação</p>
          <ul className="space-y-1.5">
            {failures.map((pub) => (
              <li
                key={pub.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2"
              >
                <NetworkChip format={pub.format} />
                <span className="min-w-0 flex-1 truncate text-sm" title={pub.contentTitle}>
                  {pub.contentTitle}
                </span>
                {pub.lastError ? (
                  <span
                    className="min-w-0 max-w-64 truncate text-xs text-destructive"
                    title={pub.lastError}
                  >
                    {pub.lastError}
                  </span>
                ) : null}
                <Link
                  href={composerHref(pub)}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {markingId ? (
        <MarkPublishedDialog
          publicationId={markingId}
          open
          onClose={() => setMarkingId(null)}
          onDone={onMarked}
        />
      ) : null}
    </section>
  )
}
