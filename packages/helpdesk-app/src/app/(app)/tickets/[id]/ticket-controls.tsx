'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TRIAGE_LABELS,
  triageRuleDescription,
} from '@/lib/categories'
import type { TicketCategory, TicketPriority, TicketStatus, TicketView } from '@/lib/types'

/** Corpo de um PATCH ao ticket: só o campo que mudou + a versão atual. */
type PatchBody = {
  status?: TicketStatus
  category?: TicketCategory | null
  priority?: TicketPriority | null
  assignToMe?: boolean
  /** Decisão humana de triagem: só `human` (é atendimento) e `system` (não é). */
  triage?: 'human' | 'system'
  version: number
}

/** Painel lateral "Detalhes": status/categoria/prioridade/atribuição do ticket. */
export function TicketControls({
  ticket,
  onUpdated,
  onStale,
}: {
  ticket: TicketView
  /** Sucesso do PATCH: substitui o ticket local pela view devolvida (versão nova). */
  onUpdated: (updated: TicketView) => void
  /** 409 de concorrência: o chamador recarrega o detalhe. */
  onStale: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [confirmDemote, setConfirmDemote] = useState(false)

  async function patch(changes: Omit<PatchBody, 'version'>, action: string) {
    setSaving(true)
    try {
      const updated = await apiSend<TicketView>(`/api/helpdesk/tickets/${ticket.id}`, 'PATCH', {
        ...changes,
        version: ticket.version,
      })
      onUpdated(updated)
      return true
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.code === 'CONCURRENCY_CONFLICT' || apiError.status === 409) {
        toast.error('Alguém mexeu no ticket. Recarreguei para você.')
        onStale()
        return false
      }
      toast.error(`Não foi possível ${action}. Tente novamente.`)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (status === ticket.status) return
    const ok = await patch({ status }, 'atualizar o status')
    if (ok) toast.success('Status atualizado.')
  }

  async function changeCategory(value: string) {
    const category = value === '' ? null : (value as TicketCategory)
    if (category === ticket.category) return
    const ok = await patch({ category }, 'atualizar a categoria')
    if (ok) toast.success('Categoria atualizada.')
  }

  async function changePriority(value: string) {
    const priority = value === '' ? null : (value as TicketPriority)
    if (priority === ticket.priority) return
    const ok = await patch({ priority }, 'atualizar a prioridade')
    if (ok) toast.success('Prioridade atualizada.')
  }

  async function toggleAssignment() {
    const assigned = ticket.assignedTo !== null
    const ok = await patch(
      { assignToMe: !assigned },
      assigned ? 'remover a atribuição' : 'atribuir o ticket',
    )
    if (ok) toast.success(assigned ? 'Atribuição removida.' : 'Ticket atribuído a você.')
  }

  async function promote() {
    const ok = await patch({ triage: 'human' }, 'trazer o ticket para a fila')
    if (ok) toast.success('Ticket de volta na fila de atendimento.')
  }

  async function demote() {
    const ok = await patch({ triage: 'system' }, 'tirar o ticket da fila')
    if (ok) {
      setConfirmDemote(false)
      toast.success('Ticket marcado como automático e fora da fila.')
    }
  }

  const assigned = ticket.assignedTo !== null
  const triaged = ticket.triage !== 'human'
  const ruleDescription = triageRuleDescription(ticket.triageRule)
  const ignoreHref = `/configuracoes?ignorar=${encodeURIComponent(ticket.requesterEmail)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Status" htmlFor="ticket-status">
          <Select
            id="ticket-status"
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value as TicketStatus)}
            disabled={saving}
          >
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Categoria" htmlFor="ticket-category">
          <Select
            id="ticket-category"
            value={ticket.category ?? ''}
            onChange={(e) => changeCategory(e.target.value)}
            disabled={saving}
          >
            <option value="">Sem categoria</option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Prioridade" htmlFor="ticket-priority">
          <Select
            id="ticket-priority"
            value={ticket.priority ?? ''}
            onChange={(e) => changePriority(e.target.value)}
            disabled={saving}
          >
            <option value="">Sem prioridade</option>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Responsável</p>
          <p className="text-sm text-muted-foreground">
            {ticket.assignedToName ?? 'Sem responsável'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={toggleAssignment}
            disabled={saving}
          >
            {assigned ? 'Remover atribuição' : 'Atribuir a mim'}
          </Button>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Triagem</p>
          {triaged ? (
            <>
              <p className="text-sm text-muted-foreground">
                {TRIAGE_LABELS[ticket.triage]}, fora da fila.
                {ruleDescription ? ` ${ruleDescription}` : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={promote}
                disabled={saving}
              >
                É atendimento
              </Button>
              {ticket.source === 'email' ? (
                <Link href={ignoreHref} className="block text-xs text-link hover:text-link-hover">
                  Ignorar sempre este remetente
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Atendimento.
                {ruleDescription ? ` ${ruleDescription}` : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setConfirmDemote(true)}
                disabled={saving}
              >
                Não é atendimento
              </Button>
            </>
          )}
        </div>

        <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="break-all">{ticket.requesterEmail}</p>
          <p>
            {ticket.messageCount} {ticket.messageCount === 1 ? 'mensagem' : 'mensagens'}
          </p>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmDemote}
        onClose={() => setConfirmDemote(false)}
        title="Tirar este ticket da fila?"
        message="Ele fica fechado e marcado como automático, fora do painel e da meta de resposta. Dá para voltar atrás com o botão É atendimento. Para nunca mais abrir ticket deste remetente, cadastre o endereço em Configurações."
        confirmText="Não é atendimento"
        onConfirm={demote}
      />
    </Card>
  )
}
