'use client'

import { splitQuotedReply } from '@sistemazero/helpdesk-contracts/quote'
import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { StickyNote } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { MessageView } from '@/lib/types'

function senderLabel(message: MessageView): string {
  if (message.kind === 'note') return message.createdByName ?? 'Equipe'
  if (message.fromName && message.fromEmail) return `${message.fromName} <${message.fromEmail}>`
  return message.fromEmail ?? message.createdByName ?? 'Sem remetente'
}

function directionLabel(message: MessageView): string {
  if (message.kind === 'note') return `Nota interna · ${message.createdByName ?? 'Equipe'}`
  if (message.direction === 'inbound') return 'Recebido'
  if (message.direction === 'outbound') {
    if (message.sentVia === 'ai') return 'Registro histórico de resposta automática'
    if (message.sentVia === 'gmail') return 'Respondido pelo Gmail'
    if (message.kind === 'portal') {
      return `Publicado na Ajuda por ${message.createdByName ?? 'Equipe'}`
    }
    return `Enviado por ${message.createdByName ?? 'Equipe'}`
  }
  return 'Mensagem'
}

function DeliveryRecovery({
  ticketId,
  message,
  onUpdated,
}: {
  ticketId: string
  message: MessageView
  onUpdated: () => void
}) {
  const [checking, setChecking] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const pendingTooRecent =
    message.deliveryState === 'pending' &&
    Date.now() - new Date(message.createdAt).getTime() < 2 * 60_000

  async function reconcile() {
    setChecking(true)
    try {
      const result = await apiSend<{ reconciled: boolean; message: MessageView }>(
        `/api/helpdesk/tickets/${ticketId}/deliveries/${message.id}/reconcile`,
        'POST',
      )
      if (result.reconciled) toast.success('O Gmail confirmou o envio da resposta.')
      else toast.error('O Gmail ainda não confirmou o envio. Não reenvie sem revisar a conversa.')
      onUpdated()
    } catch {
      toast.error('Não foi possível verificar a entrega agora.')
    } finally {
      setChecking(false)
    }
  }

  async function discard() {
    setChecking(true)
    try {
      await apiSend<{ message: MessageView }>(
        `/api/helpdesk/tickets/${ticketId}/deliveries/${message.id}/mark-failed`,
        'POST',
        { confirmation: 'delivery-not-confirmed' },
      )
      toast.success('Entrega marcada como não confirmada. Você já pode preparar outra resposta.')
      onUpdated()
    } catch {
      toast.error('Não foi possível registrar a decisão sobre esta entrega.')
    } finally {
      setChecking(false)
      setConfirmDiscard(false)
    }
  }

  if (message.deliveryState === 'failed') {
    return (
      <p className="mt-3 text-xs text-destructive">
        O Gmail recusou este envio. A equipe pode preparar outra resposta.
      </p>
    )
  }
  if (message.deliveryState !== 'unknown' && message.deliveryState !== 'pending') return null

  if (pendingTooRecent) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        O envio está aguardando confirmação do Gmail. Se este estado continuar por alguns minutos,
        atualize a página para verificar a entrega.
      </p>
    )
  }

  const pending = message.deliveryState === 'pending'
  return (
    <>
      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <p className="text-sm font-medium">
          {pending ? 'Envio pendente há alguns minutos' : 'Envio sem confirmação'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {pending
            ? 'O processo pode ter sido interrompido antes da confirmação. Verifique no Gmail antes de enviar novamente.'
            : 'A conexão caiu antes de o Gmail confirmar. Verifique a entrega antes de enviar novamente.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reconcile} disabled={checking}>
            {checking ? 'Verificando…' : 'Verificar no Gmail'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDiscard(true)}
            disabled={checking}
          >
            Preparar nova resposta
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Liberar uma nova resposta?"
        message="O Gmail não confirmou este envio. Só continue se você verificou a conversa e aceita o risco de a resposta anterior aparecer depois."
        confirmText="Liberar nova resposta"
        confirmVariant="destructive"
        onConfirm={discard}
      />
    </>
  )
}

export function TicketMessageCard({
  message,
  onDeliveryUpdated,
}: {
  message: MessageView
  onDeliveryUpdated: () => void
}) {
  const [showQuoted, setShowQuoted] = useState(false)
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
            <StickyNote className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : null}
          {senderLabel(message)}
        </p>
        <p className="text-xs text-muted-foreground">
          {directionLabel(message)} ·{' '}
          <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{visible}</p>
      {quoted ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowQuoted((visible) => !visible)}
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
          {message.attachments.map((attachment) => attachment.filename).join(', ')}
        </p>
      ) : null}
      {message.direction === 'outbound' ? (
        <DeliveryRecovery
          ticketId={message.ticketId}
          message={message}
          onUpdated={onDeliveryUpdated}
        />
      ) : null}
    </li>
  )
}
