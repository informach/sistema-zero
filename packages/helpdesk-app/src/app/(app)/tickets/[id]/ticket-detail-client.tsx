'use client'

import { Button } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft, Sparkles, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { splitQuotedReply } from '@/lib/quote'
import type { MessageView, TicketDetailResponse, TicketView } from '@/lib/types'
import { NoteBox } from './note-box'
import { ReplyBox } from './reply-box'
import { TicketControls } from './ticket-controls'

/** Remetente do e-mail ("Fulano <fulano@…>") ou autor da nota. */
function senderLabel(message: MessageView): string {
  if (message.kind === 'note') return message.createdByName ?? 'Equipe'
  if (message.fromName && message.fromEmail) return `${message.fromName} <${message.fromEmail}>`
  return message.fromEmail ?? message.createdByName ?? 'Sem remetente'
}

/** Rótulo de direção/origem da mensagem (recebida, quem/como respondeu, nota). */
function directionLabel(message: MessageView): string {
  if (message.kind === 'note') return `Nota interna · ${message.createdByName ?? 'Equipe'}`
  if (message.direction === 'inbound') return 'Recebido'
  if (message.direction === 'outbound') {
    if (message.sentVia === 'ai') return 'Resposta automática (IA)'
    if (message.sentVia === 'gmail') return 'Respondido pelo Gmail'
    return `Enviado por ${message.createdByName ?? 'Equipe'}`
  }
  return 'Mensagem'
}

/** Cartão de uma mensagem da thread — gere o próprio toggle de histórico citado. */
function MessageCard({ message }: { message: MessageView }) {
  const [showQuoted, setShowQuoted] = useState(false)
  // Só e-mails têm histórico citado; notas são texto puro da equipe.
  const { visible, quoted } =
    message.kind === 'note'
      ? { visible: message.bodyText, quoted: null }
      : splitQuotedReply(message.bodyText)

  return (
    <li
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
      <p className="mt-3 whitespace-pre-wrap text-sm">{visible}</p>
      {quoted ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowQuoted((v) => !v)}
            className="text-xs text-link hover:text-link-hover"
          >
            {showQuoted ? 'Ocultar histórico citado' : 'Mostrar histórico citado'}
          </button>
          {showQuoted ? (
            <p className="mt-2 whitespace-pre-wrap border-l-2 border-border pl-3 text-xs text-muted-foreground">
              {quoted}
            </p>
          ) : null}
        </div>
      ) : null}
      {message.attachments.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {message.attachments.length} {message.attachments.length === 1 ? 'anexo' : 'anexos'}:{' '}
          {message.attachments.map((a) => a.filename).join(', ')}
        </p>
      ) : null}
    </li>
  )
}

/** Resumo da IA + botão Resumir conversa + estado do processamento (F3). */
function AiSummaryPanel({
  ticket,
  onSummarized,
}: {
  ticket: TicketView
  onSummarized: (ticket: TicketView) => void
}) {
  const [summarizing, setSummarizing] = useState(false)
  const processing = ticket.aiStatus === 'pending' || ticket.aiStatus === 'processing'

  async function summarize() {
    if (summarizing) return
    setSummarizing(true)
    try {
      const updated = await apiSend<TicketView>(
        `/api/helpdesk/tickets/${ticket.id}/summarize`,
        'POST',
      )
      onSummarized(updated)
      toast.success('Resumo atualizado.')
    } catch (error) {
      const e = error as ApiError
      if (e.code === 'AI_NOT_CONFIGURED') toast.error('A IA ainda não foi configurada.')
      else if (e.code === 'AI_UNAVAILABLE')
        toast.error('A IA está indisponível agora. Tente de novo.')
      else toast.error('Não foi possível resumir. Tente novamente.')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          Resumo da IA
        </p>
        <Button variant="ghost" size="sm" onClick={summarize} disabled={summarizing}>
          {summarizing ? 'Resumindo…' : 'Resumir conversa'}
        </Button>
      </div>
      {processing ? (
        <p className="mt-1 text-sm text-muted-foreground">
          A IA está preparando o resumo e o rascunho desta conversa.
        </p>
      ) : ticket.aiSummary ? (
        <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.aiSummary}</p>
      ) : ticket.aiStatus === 'failed' ? (
        <p className="mt-1 text-sm text-muted-foreground">
          A IA não conseguiu processar. Use Resumir conversa para tentar de novo.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Ainda sem resumo.</p>
      )}
      {ticket.autoReplyState === 'sent' ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          Respondida automaticamente pela IA
        </span>
      ) : ticket.autoReplyReason ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Auto-resposta em revisão: {ticket.autoReplyReason}
        </p>
      ) : null}
    </div>
  )
}

/** Detalhe INTERATIVO do ticket: thread + editor com IA + controles (F2/F3). */
export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<TicketDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Reload DURO (mostra o skeleton): carga inicial e retry do estado de falha.
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  // Reload SOFT (sem piscar o skeleton): re-GET que atualiza os dados no lugar.
  // Preserva o texto digitado no editor (o ReplyBox não desmonta) e ressincroniza
  // a version — necessário porque o claim da resposta bumpa a version mesmo em
  // falha de envio. Um erro de refresh não apaga a tela.
  const softReload = useCallback(async () => {
    try {
      const detail = await apiGet<TicketDetailResponse>(`/api/helpdesk/tickets/${ticketId}`)
      setData(detail)
    } catch {
      // mantém o estado atual
    }
  }, [ticketId])

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

  // PATCH bem-sucedido dos controles: troca só o ticket (versão nova) sem re-GET.
  const handleTicketUpdated = useCallback((updated: TicketView) => {
    setData((cur) => (cur ? { ...cur, ticket: updated } : cur))
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
        {ticket.aiStatus !== 'skipped' || ticket.aiSummary ? (
          <AiSummaryPanel ticket={ticket} onSummarized={handleTicketUpdated} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <ul className="space-y-3">
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </ul>

          <ReplyBox
            ticketId={ticketId}
            version={ticket.version}
            initialDraft={ticket.aiDraft ?? ''}
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
