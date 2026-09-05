'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Inbox, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketSourceBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges'
import { apiGet } from '@/lib/api'
import { STATUS_LABELS, TICKET_STATUSES } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { formatShortSp } from '@/lib/dates'
import { formatSlaRemaining } from '@/lib/sla'
import type { CursorPage, TicketStatus, TicketView } from '@/lib/types'

const LIMIT = 50
const SEARCH_DEBOUNCE_MS = 350

type StatusFilter = TicketStatus | 'all'
type QueueFilter = 'all' | 'attention' | 'unassigned'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
]

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'all', label: 'Fila completa' },
  { value: 'attention', label: 'Precisa de atenção' },
  { value: 'unassigned', label: 'Sem responsável' },
]

function requesterLabel(ticket: TicketView): string {
  return ticket.requesterName
    ? `${ticket.requesterName} <${ticket.requesterEmail}>`
    : ticket.requesterEmail
}

function isTicketStatus(value: string | null): value is TicketStatus {
  return value !== null && (TICKET_STATUSES as readonly string[]).includes(value)
}

function isQueueFilter(value: string | null): value is QueueFilter {
  return value === 'attention' || value === 'unassigned'
}

function apiListPath(
  status: StatusFilter,
  queue: QueueFilter,
  query: string,
  cursor: string | null = null,
): string {
  const params = new URLSearchParams({ limit: String(LIMIT) })
  if (status !== 'all') params.set('status', status)
  if (queue === 'attention') params.set('sla', 'attention')
  if (queue === 'unassigned') params.set('queue', 'unassigned')
  if (query) params.set('q', query)
  if (cursor) params.set('cursor', cursor)
  return `/api/helpdesk/tickets?${params.toString()}`
}

export function TicketsClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const statusValue = searchParams.get('status')
  const queueValue = searchParams.get('queue')
  const status: StatusFilter = isTicketStatus(statusValue) ? statusValue : 'all'
  const queue: QueueFilter = isQueueFilter(queueValue) ? queueValue : 'all'
  const query = (searchParams.get('q') ?? '').trim()
  const [search, setSearch] = useState(query)
  const [items, setItems] = useState<TicketView[]>([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const filterKey = `${status}\u0000${queue}\u0000${query}`
  const activeFilterKey = useRef(filterKey)
  activeFilterKey.current = filterKey

  const replaceFilters = useCallback(
    (next: { status?: StatusFilter; queue?: QueueFilter; query?: string }) => {
      const params = new URLSearchParams()
      const nextStatus = next.status ?? status
      const nextQueue = next.queue ?? queue
      const nextQuery = next.query ?? query
      if (nextStatus !== 'all') params.set('status', nextStatus)
      if (nextQueue !== 'all') params.set('queue', nextQueue)
      if (nextQuery) params.set('q', nextQuery)
      const serialized = params.toString()
      router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false })
    },
    [pathname, query, queue, router, status],
  )

  useEffect(() => setSearch(query), [query])

  useEffect(() => {
    const normalized = search.trim()
    if (normalized === query) return
    const handle = setTimeout(() => replaceFilters({ query: normalized }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [search, query, replaceFilters])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é o gatilho explícito do retry.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadingMore(false)
    setFailed(false)
    apiGet<CursorPage<TicketView>>(apiListPath(status, queue, query))
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setTotal(page.total)
        setNextCursor(page.nextCursor)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [status, queue, query, reloadKey])

  async function loadMore() {
    if (!nextCursor) return
    const requestedFilterKey = filterKey
    setLoadingMore(true)
    try {
      const page = await apiGet<CursorPage<TicketView>>(
        apiListPath(status, queue, query, nextCursor),
      )
      if (activeFilterKey.current !== requestedFilterKey) return
      setItems((current) => {
        const seen = new Set(current.map((ticket) => ticket.id))
        return [...current, ...page.items.filter((ticket) => !seen.has(ticket.id))]
      })
      setTotal(page.total)
      setNextCursor(page.nextCursor)
    } catch {
      if (activeFilterKey.current === requestedFilterKey) {
        toast.error('Não foi possível carregar mais tickets. Tente novamente.')
      }
    } finally {
      if (activeFilterKey.current === requestedFilterKey) setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Priorizar fila
            </legend>
            <div className="mt-1 inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => replaceFilters({ queue: filter.value })}
                  aria-pressed={queue === filter.value}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    queue === filter.value
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="sr-only">Filtrar por status</legend>
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => replaceFilters({ status: filter.value })}
                  aria-pressed={status === filter.value}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    status === filter.value
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="relative w-full sm:w-64">
          <label htmlFor="ticket-search" className="sr-only">
            Buscar tickets
          </label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="ticket-search"
            name="ticket-search"
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por assunto ou e-mail…"
            className="pl-8"
          />
        </div>
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar os tickets.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar de novo
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Carregando tickets</span>
          {['a', 'b', 'c'].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhum ticket ainda."
          description="Quando chegarem pedidos por e-mail ou pelo portal, eles aparecem aqui."
        />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{ticket.subject}</h3>
                      <TicketStatusBadge status={ticket.status} />
                      <TicketCategoryBadge category={ticket.category} />
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketSlaBadge sla={ticket.sla} />
                      <TicketSourceBadge source={ticket.source} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {requesterLabel(ticket)}
                    </p>
                    {ticket.sla ? (
                      <p className="text-xs text-muted-foreground">
                        {formatSlaRemaining(ticket.sla)}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>
                      Última mensagem{' '}
                      <time dateTime={ticket.lastMessageAt}>
                        {formatShortSp(ticket.lastMessageAt)}
                      </time>
                    </p>
                    <p className="mt-0.5">
                      {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Carregando…' : `Carregar mais (${items.length} de ${total})`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
