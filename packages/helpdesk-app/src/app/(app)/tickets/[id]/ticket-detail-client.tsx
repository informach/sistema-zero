'use client'

import { Button } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketSourceBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges'
import { apiGet } from '@/lib/api'
import { formatSlaRemaining } from '@/lib/sla'
import type { TicketDetailResponse, TicketView } from '@/lib/types'
import { AiSummaryPanel } from './ai-summary-panel'
import { NoteBox } from './note-box'
import { ReplyBox } from './reply-box'
import { TicketControls } from './ticket-controls'
import { TicketMessageCard } from './ticket-message-card'

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<TicketDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  // Atualiza os dados no lugar para preservar o texto digitado no editor.
  const softReload = useCallback(async () => {
    try {
      const detail = await apiGet<TicketDetailResponse>(`/api/helpdesk/tickets/${ticketId}`)
      setData(detail)
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
    setData((current) => (current ? { ...current, ticket: updated } : current))
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
        </div>
        <p className="text-sm text-muted-foreground">
          {ticket.requesterName
            ? `${ticket.requesterName} <${ticket.requesterEmail}>`
            : ticket.requesterEmail}
          {' · '}
          {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
          {ticket.assignedToName ? ` · Responsável: ${ticket.assignedToName}` : ''}
        </p>
        {slaRemaining ? <p className="text-xs text-muted-foreground">{slaRemaining}</p> : null}
        {ticket.aiStatus !== 'skipped' || ticket.aiSummary ? (
          <AiSummaryPanel ticket={ticket} onSummarized={handleTicketUpdated} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <ul className="space-y-3">
            {messages.map((message) => (
              <TicketMessageCard
                key={message.id}
                message={message}
                onDeliveryUpdated={softReload}
              />
            ))}
          </ul>

          <ReplyBox
            ticketId={ticketId}
            version={ticket.version}
            source={ticket.source}
            initialDraft={
              ticket.aiStatus === 'pending' || ticket.aiStatus === 'processing'
                ? ''
                : (ticket.aiDraft ?? '')
            }
            onSent={softReload}
            onStale={softReload}
            onTicketUpdated={handleTicketUpdated}
          />
        </div>

        <aside className="space-y-6">
          <TicketControls ticket={ticket} onUpdated={handleTicketUpdated} onStale={softReload} />
          <NoteBox ticketId={ticketId} onAdded={softReload} />
        </aside>
      </div>
    </div>
  )
}
