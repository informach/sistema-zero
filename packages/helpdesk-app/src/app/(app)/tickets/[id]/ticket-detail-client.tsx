'use client'

import { Button } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketSourceBadge,
  TicketStatusBadge,
  TicketTriageBadge,
} from '@/components/shared/ticket-badges'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { triageRuleDescription } from '@/lib/categories'
import { formatSlaRemaining } from '@/lib/sla'
import type { TicketDetailResponse, TicketView } from '@/lib/types'
import { AiHistory } from './ai-history'
import { AiSummaryPanel } from './ai-summary-panel'
import { NoteBox } from './note-box'
import { ReplyBox } from './reply-box'
import { TicketControls } from './ticket-controls'
import { TicketMessageCard } from './ticket-message-card'

function newestTicket(current: TicketView, incoming: TicketView): TicketView {
  if (incoming.id !== current.id) return current
  return incoming.version > current.version ||
    (incoming.version === current.version && incoming.updatedAt >= current.updatedAt)
    ? incoming
    : current
}

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<TicketDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const dataRef = useRef(data)
  dataRef.current = data
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const takeoverKey = useRef<{ key: string; version: number } | null>(null)
  async function takeover() {
    if (!data || busy) return
    setBusy(true)
    setActionError(null)
    try {
      takeoverKey.current ??= { key: crypto.randomUUID(), version: data.ticket.version }
      const ticket = await apiSend<TicketView>(
        `/api/helpdesk/tickets/${ticketId}/takeover`,
        'POST',
        { version: takeoverKey.current.version, idempotencyKey: takeoverKey.current.key },
      )
      setData((current) =>
        current ? { ...current, ticket: newestTicket(current.ticket, ticket) } : current,
      )
      takeoverKey.current = null
    } catch (reason) {
      setActionError((reason as ApiError).message)
      if ((reason as ApiError).status === 409) {
        takeoverKey.current = null
        void softReload()
      }
    } finally {
      setBusy(false)
    }
  }
  async function older() {
    if (!data?.olderCursor || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const next = await apiGet<TicketDetailResponse>(
        `/api/helpdesk/tickets/${ticketId}/messages?before=${encodeURIComponent(data.olderCursor)}&limit=50`,
      )
      setData((current) =>
        current
          ? {
              ...current,
              messages: [
                ...new Map([...next.messages, ...current.messages].map((m) => [m.id, m])).values(),
              ],
              hasOlder: next.hasOlder,
              olderCursor: next.olderCursor,
            }
          : current,
      )
    } catch {
      setActionError('Não foi possível carregar as mensagens anteriores.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      failures = 0
    async function poll() {
      let delay = 5000
      const current = dataRef.current
      if (current && !document.hidden)
        try {
          const next = await apiGet<TicketDetailResponse>(
            `/api/helpdesk/tickets/${ticketId}/messages?limit=50${current.latestCursor ? `&after=${encodeURIComponent(current.latestCursor)}` : ''}`,
            controller.signal,
          )
          if (stopped) return
          setData((prior) =>
            prior
              ? {
                  ...prior,
                  ticket: newestTicket(prior.ticket, next.ticket),
                  messages: [
                    ...new Map(
                      [...prior.messages, ...next.messages].map((m) => [m.id, m]),
                    ).values(),
                  ],
                  latestCursor: next.latestCursor ?? prior.latestCursor,
                }
              : prior,
          )
          failures = 0
          if (next.hasMore) delay = 200
        } catch (reason) {
          if (stopped) return
          const error = reason as ApiError
          if (error.status === 401 || error.status === 403) return
          delay = Math.max(error.retryAfterMs ?? 0, Math.min(60000, 5000 * 2 ** ++failures))
        }
      if (!stopped) timer = setTimeout(poll, delay)
    }
    timer = setTimeout(poll, 1500)
    return () => {
      stopped = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [ticketId])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  // Atualiza os dados no lugar para preservar o texto digitado no editor.
  const softReload = useCallback(async () => {
    try {
      const detail = await apiGet<TicketDetailResponse>(`/api/helpdesk/tickets/${ticketId}`)
      setData((current) =>
        current
          ? {
              ...detail,
              ticket: newestTicket(current.ticket, detail.ticket),
              messages: [
                ...new Map(
                  [...current.messages, ...detail.messages].map((m) => [m.id, m]),
                ).values(),
              ],
              hasOlder: current.hasOlder,
              olderCursor: current.olderCursor,
            }
          : detail,
      )
    } catch {
      // Um refresh secundário não apaga o estado útil que já está na tela.
    }
  }, [ticketId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é o gatilho explícito do retry.
  useEffect(() => {
    let alive = true
    setData(null)
    setFailed(false)
    apiGet<TicketDetailResponse>(`/api/helpdesk/tickets/${ticketId}`)
      .then((detail) => {
        if (alive) setData(detail)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [ticketId, reloadKey])

  const handleTicketUpdated = useCallback((updated: TicketView) => {
    setData((current) =>
      current ? { ...current, ticket: newestTicket(current.ticket, updated) } : current,
    )
  }, [])

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar o ticket.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>
            Tentar de novo
          </Button>
          <Link href="/tickets" className="text-sm text-link hover:text-link-hover">
            Voltar para a caixa de entrada
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Carregando ticket</span>
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        {['a', 'b', 'c'].map((key) => (
          <Skeleton key={key} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const { ticket, messages } = data
  const slaRemaining = formatSlaRemaining(ticket.sla)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Caixa de entrada
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <TicketStatusBadge status={ticket.status} />
          <TicketCategoryBadge category={ticket.category} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketSlaBadge sla={ticket.sla} />
          <TicketSourceBadge source={ticket.source} />
          <TicketTriageBadge triage={ticket.triage} />
        </div>
        <p className="text-sm text-muted-foreground">
          {ticket.requesterName
            ? `${ticket.requesterName} <${ticket.requesterEmail}>`
            : ticket.requesterEmail}
          {' · '}
          {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
          {ticket.assignedToName ? ` · Responsável: ${ticket.assignedToName}` : ''}
        </p>
        <p className="text-sm">
          {ticket.handlingMode === 'assistant'
            ? 'Assistente de IA no atendimento'
            : 'Atendimento com a equipe'}
        </p>
        {ticket.handlingMode === 'assistant' ? (
          <Button disabled={busy} onClick={() => void takeover()}>
            Assumir atendimento
          </Button>
        ) : null}
        {actionError ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
        {slaRemaining ? <p className="text-xs text-muted-foreground">{slaRemaining}</p> : null}
        {ticket.triage !== 'human' ? (
          <p className="text-xs text-muted-foreground">
            Fora da fila de atendimento.
            {triageRuleDescription(ticket.triageRule)
              ? ` ${triageRuleDescription(ticket.triageRule)}`
              : ''}
          </p>
        ) : null}
        {ticket.triage === 'human' && (ticket.aiStatus !== 'skipped' || ticket.aiSummary) ? (
          <AiSummaryPanel ticket={ticket} onSummarized={handleTicketUpdated} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {data.hasOlder ? (
            <Button variant="outline" disabled={busy} onClick={() => void older()}>
              Carregar mensagens anteriores
            </Button>
          ) : null}
          <ul className="space-y-3">
            {[...messages]
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
              .map((message) => (
                <TicketMessageCard
                  key={message.id}
                  message={message}
                  onDeliveryUpdated={softReload}
                />
              ))}
          </ul>

          {ticket.triage === 'human' ? (
            <ReplyBox
              ticketId={ticketId}
              version={ticket.version}
              replyChannel={ticket.replyChannel}
              draftRunId={ticket.aiDraftRunId}
              initialDraft={
                ticket.aiStatus === 'pending' || ticket.aiStatus === 'processing'
                  ? ''
                  : (ticket.aiDraft ?? '')
              }
              onSent={softReload}
              onStale={softReload}
              onTicketUpdated={handleTicketUpdated}
            />
          ) : null}
        </div>

        <aside className="space-y-6">
          <TicketControls ticket={ticket} onUpdated={handleTicketUpdated} onStale={softReload} />
          <NoteBox ticketId={ticketId} onAdded={softReload} />
          <AiHistory ticketId={ticketId} />
        </aside>
      </div>
    </div>
  )
}
