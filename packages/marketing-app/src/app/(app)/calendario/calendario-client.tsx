'use client'

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { NetworkChip } from '@/components/shared/network-chip'
import { PubStatusBadge } from '@/components/shared/pub-status-badge'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import {
  addDaysToKey,
  addMonths,
  monthGrid,
  monthLabel,
  moveIsoToDayKeepingTime,
  weekDays,
} from '@/lib/calendar'
import { formatTimeSp, isoToSaoPauloDayKey, spDayWindow, todayDayKeySp } from '@/lib/dates'
import { NETWORK_LABELS, SOCIAL_NETWORKS, type SocialNetwork } from '@/lib/networks'
import { canSchedule, validateScheduleWindow } from '@/lib/publications'
import type { MarketingPage, PublicationListItemView, PublicationView } from '@/lib/types'
import { MonthGrid } from './month-grid'
import { PublicationChipBody, publicationHref } from './publication-chip'
import { WeekView } from './week-view'

type CalendarView = 'month' | 'week'
type StatusFilter = 'all' | 'scheduled' | 'published' | 'failed'

/** CSV de status enviado ao backend por opção do filtro. */
const STATUS_FILTER_CSV: Record<Exclude<StatusFilter, 'all'>, string> = {
  scheduled: 'scheduled,awaiting_manual',
  published: 'published',
  failed: 'failed',
}

const MAX_PAGES = 3
const PAGE_LIMIT = 200

function yearMonthOf(dayKey: string): { year: number; month0: number } {
  return { year: Number(dayKey.slice(0, 4)), month0: Number(dayKey.slice(5, 7)) - 1 }
}

/**
 * Calendário editorial: grade mensal/semanal com chips por dia (dia civil de
 * SP), filtros por rede/status e reagendamento por drag (otimista + rollback).
 */
export function CalendarioClient() {
  const todayKey = todayDayKeySp()
  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState(todayKey)
  const [networkFilter, setNetworkFilter] = useState<'all' | SocialNetwork>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [items, setItems] = useState<PublicationListItemView[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [capped, setCapped] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const fetchEpoch = useRef(0)

  const { year, month0 } = yearMonthOf(anchor)
  const cells = useMemo(
    () => (view === 'month' ? monthGrid(year, month0, todayKey) : weekDays(anchor, todayKey)),
    [view, year, month0, anchor, todayKey],
  )
  const firstKey = cells[0]?.dayKey
  const lastKey = cells[cells.length - 1]?.dayKey

  const load = useCallback(() => {
    if (!firstKey || !lastKey) return
    const epoch = ++fetchEpoch.current
    const fromIso = spDayWindow(firstKey).fromIso
    const toIso = spDayWindow(lastKey).toIso
    setLoading(true)
    setFailed(false)

    async function fetchAll() {
      const all: PublicationListItemView[] = []
      let offset = 0
      let hitCap = false
      for (let page = 0; page < MAX_PAGES; page++) {
        const params = new URLSearchParams({
          from: fromIso,
          to: toIso,
          limit: String(PAGE_LIMIT),
          offset: String(offset),
        })
        if (networkFilter !== 'all') params.set('network', networkFilter)
        if (statusFilter !== 'all') params.set('status', STATUS_FILTER_CSV[statusFilter])
        const data = await apiGet<MarketingPage<PublicationListItemView>>(
          `/api/marketing/publications?${params}`,
        )
        all.push(...data.items)
        if (!data.hasMore) return { all, hitCap }
        offset += data.items.length
        hitCap = true
      }
      return { all, hitCap }
    }

    fetchAll()
      .then(({ all, hitCap }) => {
        if (epoch !== fetchEpoch.current) return
        setItems(all)
        // hitCap só é aviso quando as 3 páginas vieram cheias E sobrou mais.
        setCapped(hitCap && all.length >= MAX_PAGES * PAGE_LIMIT)
        setLoading(false)
      })
      .catch(() => {
        if (epoch !== fetchEpoch.current) return
        setFailed(true)
        setLoading(false)
      })
  }, [firstKey, lastKey, networkFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const pubsByDay = useMemo(() => {
    const map = new Map<string, PublicationListItemView[]>()
    for (const pub of items) {
      if (!pub.scheduledAt) continue
      const dayKey = isoToSaoPauloDayKey(pub.scheduledAt)
      const list = map.get(dayKey)
      if (list) list.push(pub)
      else map.set(dayKey, [pub])
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
    }
    return map
  }, [items])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const activePub = activeId ? (items.find((p) => p.id === activeId) ?? null) : null

  function goPrev() {
    if (view === 'month') {
      const prev = addMonths(year, month0, -1)
      setAnchor(`${prev.year}-${String(prev.month0 + 1).padStart(2, '0')}-01`)
    } else {
      setAnchor(addDaysToKey(anchor, -7))
    }
  }

  function goNext() {
    if (view === 'month') {
      const next = addMonths(year, month0, 1)
      setAnchor(`${next.year}-${String(next.month0 + 1).padStart(2, '0')}-01`)
    } else {
      setAnchor(addDaysToKey(anchor, 7))
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const pubId = String(active.id)
    const targetDay = String(over.id)
    const pub = items.find((p) => p.id === pubId)
    if (!pub?.scheduledAt || !canSchedule(pub.status)) return
    if (isoToSaoPauloDayKey(pub.scheduledAt) === targetDay) return

    const newIso = moveIsoToDayKeepingTime(pub.scheduledAt, targetDay)
    const windowError = validateScheduleWindow(new Date(newIso), new Date())
    if (windowError) {
      toast.error(windowError)
      return
    }

    // Otimista: move o chip já; erro → volta e avisa.
    const previous = items
    setItems((current) => current.map((p) => (p.id === pubId ? { ...p, scheduledAt: newIso } : p)))
    apiSend<PublicationView>(`/api/marketing/publications/${pubId}/schedule`, 'POST', {
      scheduledAt: newIso,
    })
      .then((updated) => {
        setItems((current) => current.map((p) => (p.id === pubId ? { ...p, ...updated } : p)))
      })
      .catch((error) => {
        setItems(previous)
        toast.error((error as ApiError).message)
      })
  }

  const expandedPubs = expandedDay ? (pubsByDay.get(expandedDay) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-semibold">{monthLabel(year, month0)}</h2>
        <Button size="icon-sm" variant="outline" aria-label="Período anterior" onClick={goPrev}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="Próximo período" onClick={goNext}>
          <ChevronRight aria-hidden />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAnchor(todayKey)}>
          Hoje
        </Button>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView('month')}
            aria-pressed={view === 'month'}
            className={
              view === 'month'
                ? 'bg-primary px-3 py-1 text-sm font-medium text-primary-foreground'
                : 'px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
            }
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            aria-pressed={view === 'week'}
            className={
              view === 'week'
                ? 'bg-primary px-3 py-1 text-sm font-medium text-primary-foreground'
                : 'px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
            }
          >
            Semana
          </button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value as 'all' | SocialNetwork)}
            aria-label="Filtrar por rede"
            className="w-40"
          >
            <option value="all">Todas as redes</option>
            {SOCIAL_NETWORKS.map((network) => (
              <option key={network} value={network}>
                {NETWORK_LABELS[network]}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filtrar por status"
            className="w-40"
          >
            <option value="all">Todos os status</option>
            <option value="scheduled">Agendadas</option>
            <option value="published">Publicadas</option>
            <option value="failed">Falhas</option>
          </Select>
        </div>
      </div>

      {capped ? (
        <p className="text-sm text-muted-foreground" role="status">
          Muitas publicações no período, refine o filtro.
        </p>
      ) : null}

      {failed ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar as publicações do período.
          </p>
          <Button variant="outline" size="sm" onClick={load}>
            Tentar de novo
          </Button>
        </div>
      ) : loading ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {cells.map((cell) => (
              <Skeleton key={cell.dayKey} className="min-h-24 rounded-none" />
            ))}
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {view === 'month' ? (
            <MonthGrid cells={cells} pubsByDay={pubsByDay} onShowAll={setExpandedDay} />
          ) : (
            <WeekView cells={cells} pubsByDay={pubsByDay} />
          )}
          <DragOverlay>
            {activePub ? <PublicationChipBody pub={activePub} className="shadow-lg" /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog
        open={expandedDay !== null}
        onClose={() => setExpandedDay(null)}
        title={
          expandedDay ? `Publicações de ${expandedDay.slice(8, 10)}/${expandedDay.slice(5, 7)}` : ''
        }
      >
        <ul className="space-y-1.5">
          {expandedPubs.map((pub) => (
            <li key={pub.id}>
              <Link
                href={publicationHref(pub)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                {pub.scheduledAt ? (
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatTimeSp(pub.scheduledAt)}
                  </span>
                ) : null}
                <NetworkChip format={pub.format} showLabel={false} />
                <span className="min-w-0 flex-1 truncate">{pub.contentTitle}</span>
                <PubStatusBadge status={pub.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  )
}
