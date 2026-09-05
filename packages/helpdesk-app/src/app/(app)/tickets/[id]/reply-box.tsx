'use client'

import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { MessageView, TicketSource, TicketView } from '@/lib/types'

type ReplyResponse = { ticket: TicketView; message: MessageView }

/** Erros da IA → toast amigável (ambos os botões: enviar não usa IA). */
function aiErrorToast(error: ApiError): void {
  if (error.code === 'AI_NOT_CONFIGURED') {
    toast.error('A IA ainda não foi configurada.')
  } else if (error.code === 'AI_UNAVAILABLE') {
    toast.error('A IA está indisponível agora. Tente de novo.')
  } else {
    toast.error('Não foi possível gerar o rascunho. Tente novamente.')
  }
}

/**
 * Editor de resposta ao cliente. O canal é do TICKET, decidido no backend: e-mail
 * vai pelo Gmail na mesma thread; chamado aberto no portal (Ajuda) vira mensagem
 * da conversa + aviso por e-mail, sem depender da caixa Gmail. A assinatura vem
 * do backend nos dois casos. Vem preenchido com o rascunho da IA (quando existe);
 * "Regenerar rascunho" pede um novo à IA e substitui o texto.
 */
export function ReplyBox({
  ticketId,
  version,
  source,
  initialDraft,
  onSent,
  onStale,
  onTicketUpdated,
}: {
  ticketId: string
  version: number
  /** Canal do chamado — só muda a copy; quem decide o transporte é o backend. */
  source: TicketSource
  /** Rascunho da IA no carregamento (prefill do editor). */
  initialDraft: string
  /** Sucesso: o chamador recarrega o detalhe (versão nova + mudança do poller). */
  onSent: () => void
  /** Falha (qualquer): re-GET SOFT p/ ressincronizar a version (o claim a bumpou). */
  onStale: () => void
  /** Regenerar: troca o ticket local pela view devolvida (novo rascunho/status). */
  onTicketUpdated: (ticket: TicketView) => void
}) {
  const [body, setBody] = useState(initialDraft)
  const [sending, setSending] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const busy = sending || regenerating
  const viaPortal = source === 'portal'

  async function send() {
    const text = body.trim()
    if (!text || busy) return
    setSending(true)
    try {
      await apiSend<ReplyResponse>(`/api/helpdesk/tickets/${ticketId}/reply`, 'POST', {
        body: text,
        version,
      })
      toast.success(viaPortal ? 'Resposta publicada na Ajuda do cliente.' : 'Resposta enviada.')
      setBody('')
      onSent()
    } catch (error) {
      const apiError = error as ApiError
      // Códigos específicos ANTES do genérico: CONNECTION_NOT_CONNECTED também é 409.
      if (apiError.code === 'CONNECTION_NOT_CONNECTED') {
        toast.error('Conecte a caixa contato@ em Configurações antes de responder.')
      } else if (apiError.code === 'GMAIL_SEND_FAILED') {
        toast.error('Não foi possível enviar o e-mail. Confira a entrega antes de tentar de novo.')
      } else if (apiError.code === 'GMAIL_NOT_CONFIGURED') {
        toast.error('A integração com o Gmail ainda não foi configurada.')
      } else if (apiError.code === 'CONCURRENCY_CONFLICT') {
        toast.error('Alguém mexeu no ticket. Recarreguei para você.')
      } else {
        toast.error('Não foi possível enviar a resposta. Tente novamente.')
      }
      // E-mail: o claim reserva a version ANTES do envio, então qualquer falha
      // pós-claim a bumpou. Portal: um passo só, mas um 409 significa que alguém
      // mexeu no ticket. Nos dois casos o re-GET soft ressincroniza a version (o
      // texto digitado é preservado).
      onStale()
    } finally {
      setSending(false)
    }
  }

  async function regenerate() {
    if (busy) return
    setRegenerating(true)
    try {
      const ticket = await apiSend<TicketView>(
        `/api/helpdesk/tickets/${ticketId}/draft/regenerate`,
        'POST',
      )
      setBody(ticket.aiDraft ?? '')
      onTicketUpdated(ticket)
      toast.success('Rascunho gerado pela IA.')
    } catch (error) {
      aiErrorToast(error as ApiError)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="reply-body" className="text-sm font-medium">
          Responder ao cliente
        </label>
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}>
          <Sparkles className="size-4" aria-hidden />
          {regenerating ? 'Gerando…' : 'Regenerar rascunho'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {viaPortal
          ? 'A resposta aparece na Ajuda do cliente na hora; o aviso por e-mail é enfileirado e pode levar alguns instantes. '
          : 'A resposta vai por e-mail, na mesma conversa. '}
        Revise o texto antes de enviar. A IA prepara sugestões, mas nunca responde sozinha.
      </p>
      <Textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escreva a resposta para o cliente"
        className="min-h-32"
        disabled={busy}
      />
      <div className="flex justify-end">
        <Button onClick={send} disabled={busy || body.trim().length === 0}>
          {sending ? 'Enviando…' : viaPortal ? 'Publicar resposta' : 'Enviar resposta'}
        </Button>
      </div>
    </div>
  )
}
