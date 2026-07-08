'use client'

import { Button } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { MessageView, TicketDetailResponse } from '@/lib/types'

function senderLabel(message: MessageView): string {
  if (message.kind === 'note') return message.createdByName ?? 'Equipe'
  if (message.fromName && message.fromEmail) return `${message.fromName} <${message.fromEmail}>`
  return message.fromEmail ?? message.createdByName ?? 'Sem remetente'
}

function directionLabel(message: MessageView): string {
  if (message.kind === 'note') return 'Nota interna'
  if (message.direction === 'inbound') return 'Recebido'
  if (message.direction === 'outbound') return message.sentVia === 'ai' ? 'Enviado (IA)' : 'Enviado'
  return 'Mensagem'
}

/** Detalhe READ-ONLY do ticket: assunto + badges + thread (o editor vem na F2). */
export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<TicketDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
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

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar o ticket.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Caixa de entrada
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <TicketStatusBadge status={ticket.status} />
          <TicketCategoryBadge category={ticket.category} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-sm text-muted-foreground">
          {ticket.requesterName
            ? `${ticket.requesterName} <${ticket.requesterEmail}>`
            : ticket.requesterEmail}
          {' · '}
          {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
          {ticket.assignedToName ? ` · Responsável: ${ticket.assignedToName}` : ''}
        </p>
        {ticket.aiSummary ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Resumo da IA</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.aiSummary}</p>
          </div>
        ) : null}
      </div>

      <ul className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={cn(
              'rounded-xl border border-border bg-card p-4',
              message.kind === 'note' && 'border-dashed bg-muted/40',
              message.direction === 'outbound' && 'border-primary/30',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {message.kind === 'note' ? (
                  <StickyNote className="size-4 text-muted-foreground" aria-hidden />
                ) : null}
                {senderLabel(message)}
              </p>
              <p className="text-xs text-muted-foreground">
                {directionLabel(message)} · {formatDate(message.createdAt)}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{message.bodyText}</p>
            {message.attachments.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {message.attachments.length} {message.attachments.length === 1 ? 'anexo' : 'anexos'}
                : {message.attachments.map((a) => a.filename).join(', ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
