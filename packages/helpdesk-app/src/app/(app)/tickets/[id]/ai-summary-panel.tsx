'use client'

import { Button } from '@sistemazero/ui/button'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { TicketView } from '@/lib/types'

export function AiSummaryPanel({
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
      const apiError = error as ApiError
      if (apiError.code === 'AI_NOT_CONFIGURED') toast.error('A IA ainda não foi configurada.')
      else if (apiError.code === 'AI_UNAVAILABLE') {
        toast.error('A IA está indisponível agora. Tente de novo.')
      } else toast.error('Não foi possível resumir. Tente novamente.')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
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
      <p className="mt-2 text-xs text-muted-foreground">
        Resumos e rascunhos são sugestões. Uma pessoa da equipe revisa e envia cada resposta.
      </p>
    </div>
  )
}
