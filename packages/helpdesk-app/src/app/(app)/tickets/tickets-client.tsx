'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Inbox, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
import type { HelpdeskPage, TicketStatus, TicketView } from '@/lib/types'

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

export function TicketsClient() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [queue, setQueue] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<TicketView[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Debounce da busca: o `q` só vira filtro depois da pausa de digitação.
  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [search])

  function listPath(offset: number): string {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
    if (status !== 'all') params.set('status', status)
    if (queue === 'attention') params.set('sla', 'attention')
    if (queue === 'unassigned') params.set('queue', 'unassigned')
    if (query) params.set('q', query)
    return `/api/helpdesk/tickets?${params.toString()}`
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    apiGet<HelpdeskPage<TicketView>>(listPath(0))
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setTotal(page.total)
        setHasMore(page.hasMore)
        setLoading(false)
      })
      .catch(() => {
        // Erro não vira lista vazia (indistinguível de caixa vazia): aviso + tentar de novo.
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [status, queue, query, reloadKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const page = await apiGet<HelpdeskPage<TicketView>>(listPath(items.length))
      setItems((cur) => {
        const seen = new Set(cur.map((it) => it.id))
        return [...cur, ...page.items.filter((it) => !seen.has(it.id))]
      })
      setTotal(page.total)
      setHasMore(page.hasMore)
    } catch {
      toast.error('Não foi possível carregar mais tickets. Tente novamente.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Priorizar fila
            </p>
            <div className="mt-1 inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setQueue(filter.value)}
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
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
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
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por assunto ou e-mail"
            aria-label="Buscar tickets"
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
                    <p>Última mensagem {formatShortSp(ticket.lastMessageAt)}</p>
                    <p className="mt-0.5">
                      {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? (
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
