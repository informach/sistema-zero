'use client'

import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { MessageView, TicketView } from '@/lib/types'

type ReplyResponse = { ticket: TicketView; message: MessageView }

/** Editor de resposta ao cliente: envia pelo Gmail na mesma thread (assinatura vem do backend). */
export function ReplyBox({
  ticketId,
  version,
  onSent,
  onStale,
}: {
  ticketId: string
  version: number
  /** Sucesso: o chamador recarrega o detalhe (versão nova + qualquer mudança do poller). */
  onSent: () => void
  /** Falha (qualquer): re-GET SOFT p/ ressincronizar a version (o claim a bumpou). */
  onStale: () => void
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await apiSend<ReplyResponse>(`/api/helpdesk/tickets/${ticketId}/reply`, 'POST', {
        body: text,
        version,
      })
      toast.success('Resposta enviada.')
      setBody('')
      onSent()
    } catch (error) {
      const apiError = error as ApiError
      // Códigos específicos ANTES do genérico: CONNECTION_NOT_CONNECTED também é 409.
      if (apiError.code === 'CONNECTION_NOT_CONNECTED') {
        toast.error('Conecte a caixa contato@ em Configurações antes de responder.')
      } else if (apiError.code === 'GMAIL_SEND_FAILED') {
        toast.error('Não foi possível enviar o e-mail. Tente de novo.')
      } else if (apiError.code === 'GMAIL_NOT_CONFIGURED') {
        toast.error('A integração com o Gmail ainda não foi configurada.')
      } else if (apiError.code === 'CONCURRENCY_CONFLICT') {
        toast.error('Alguém mexeu no ticket. Recarreguei para você.')
      } else {
        toast.error('Não foi possível enviar a resposta. Tente novamente.')
      }
      // O claim reserva a version ANTES do envio; qualquer falha pós-claim a bumpou.
      // Re-GET soft ressincroniza a version (o texto digitado é preservado).
      onStale()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <label htmlFor="reply-body" className="text-sm font-medium">
        Responder ao cliente
      </label>
      <Textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escreva a resposta para o cliente"
        className="min-h-32"
        disabled={sending}
      />
      <div className="flex justify-end">
        <Button onClick={send} disabled={sending || body.trim().length === 0}>
          {sending ? 'Enviando…' : 'Enviar resposta'}
        </Button>
      </div>
    </div>
  )
}
