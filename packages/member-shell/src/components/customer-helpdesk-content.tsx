'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import { MessageCircleMore, Plus } from 'lucide-react'
import {
  CUSTOMER_TICKET_CATEGORY_LABEL,
  CUSTOMER_TICKET_STATUS_LABEL,
  type CustomerTicketMessageView,
  type CustomerTicketPage,
  type CustomerTicketStatus,
} from '../lib/customer-helpdesk'

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Agora'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusVariant(status: CustomerTicketStatus): 'default' | 'muted' | 'success' | 'outline' {
  if (status === 'resolved' || status === 'closed') return 'success'
  if (status === 'waiting') return 'default'
  if (status === 'new') return 'outline'
  return 'muted'
}

export function CustomerTicketStatusBadge({ status }: { status: CustomerTicketStatus }) {
  return <Badge variant={statusVariant(status)}>{CUSTOMER_TICKET_STATUS_LABEL[status]}</Badge>
}

export function CustomerConversationMessage({ message }: { message: CustomerTicketMessageView }) {
  const fromCustomer = message.direction !== 'outbound'
  return (
    <article
      className={`rounded-xl border p-4 shadow-sm ${fromCustomer ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'}`}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{fromCustomer ? 'Você' : (message.fromName ?? 'Equipe Sistema Zero')}</strong>
        <time dateTime={message.createdAt} className="text-muted-foreground">
          {formatWhen(message.createdAt)}
        </time>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.bodyText}</p>
    </article>
  )
}

export function CustomerTicketList({
  page,
  loadingDetail,
  loadingMore,
  onOpen,
  onLoadMore,
  onOpenNew,
}: {
  page: CustomerTicketPage
  loadingDetail: boolean
  loadingMore: boolean
  onOpen: (ticketId: string) => void
  onLoadMore: () => void
  onOpenNew: () => void
}) {
  if (loadingDetail) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Abrindo conversa…
        </CardContent>
      </Card>
    )
  }

  if (page.items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <MessageCircleMore className="size-8 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Você ainda não tem chamados.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando precisar, a equipe está por aqui.
            </p>
          </div>
          <Button onClick={onOpenNew}>
            <Plus className="size-4" aria-hidden="true" /> Abrir chamado
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ul className="space-y-2" aria-label="Seus chamados">
        {page.items.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onOpen(ticket.id)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex flex-wrap items-center gap-2">
                <CustomerTicketStatusBadge status={ticket.status} />
                {ticket.category ? (
                  <span className="text-xs text-muted-foreground">
                    {CUSTOMER_TICKET_CATEGORY_LABEL[ticket.category]}
                  </span>
                ) : null}
                <time
                  dateTime={ticket.lastMessageAt}
                  className="ml-auto text-xs text-muted-foreground"
                >
                  {formatWhen(ticket.lastMessageAt)}
                </time>
              </div>
              <p className="mt-2 truncate font-semibold text-foreground">{ticket.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {page.hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner className="size-4" /> : null}
            Carregar mais chamados
          </Button>
        </div>
      ) : null}
    </>
  )
}
