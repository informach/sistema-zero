'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, CircleHelp, MessageCircleMore, Plus, RefreshCw, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../lib/api'
import {
  CUSTOMER_TICKET_CATEGORIES,
  CUSTOMER_TICKET_CATEGORY_LABEL,
  CUSTOMER_TICKET_STATUS_LABEL,
  type CustomerTicketCategory,
  type CustomerTicketDetail,
  type CustomerTicketMessageView,
  type CustomerTicketPage,
  type CustomerTicketStatus,
  type CustomerTicketView,
} from '../lib/customer-helpdesk'

const EMPTY_PAGE: CustomerTicketPage = { items: [], total: 0, hasMore: false, nextCursor: null }
const PORTAL_PAGE_SIZE = 50

/** Junta páginas consecutivas e atualiza uma eventual duplicata com dados novos. */
export function mergeCustomerTicketPages(
  current: CustomerTicketPage,
  next: CustomerTicketPage,
): CustomerTicketPage {
  const nextById = new Map(next.items.map((ticket) => [ticket.id, ticket]))
  const currentIds = new Set(current.items.map((ticket) => ticket.id))
  return {
    total: next.total,
    hasMore: next.hasMore,
    nextCursor: next.nextCursor,
    items: [
      ...current.items.map((ticket) => nextById.get(ticket.id) ?? ticket),
      ...next.items.filter((ticket) => !currentIds.has(ticket.id)),
    ],
  }
}

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

function messageError(error: unknown): { text: string; parentGateExpired: boolean } {
  const apiError = error as Partial<ApiError> | null
  if (apiError?.code === 'PARENT_GATE_REQUIRED' || apiError?.code === 'ACCOUNT_SESSION_REQUIRED') {
    return {
      text: 'A confirmação da Área dos Pais expirou. Confirme sua senha novamente para continuar.',
      parentGateExpired: true,
    }
  }
  if (apiError?.status === 429) {
    return {
      text: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.',
      parentGateExpired: false,
    }
  }
  return {
    text: 'Não foi possível concluir agora. Verifique a conexão e tente novamente.',
    parentGateExpired: false,
  }
}

/**
 * Central de conversa do cliente. A identidade continua no BFF e no Helpdesk;
 * este componente recebe apenas o snapshot serializável do primeiro render e
 * conversa exclusivamente com os endpoints same-origin do app.
 */
export function CustomerHelpdeskPortal({
  initialPage = EMPTY_PAGE,
  initialLoadFailed = false,
  parentAreaHref,
}: {
  initialPage?: CustomerTicketPage
  initialLoadFailed?: boolean
  /** Presente apenas no Kids, caso o portão parental expire enquanto a página está aberta. */
  parentAreaHref?: string
}) {
  const [page, setPage] = useState(initialPage)
  const [mode, setMode] = useState<'list' | 'new' | 'detail'>('list')
  const [detail, setDetail] = useState<CustomerTicketDetail | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(
    initialLoadFailed ? 'Não foi possível carregar seus chamados.' : null,
  )
  const [gateExpired, setGateExpired] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<CustomerTicketCategory | ''>('')
  const [firstMessage, setFirstMessage] = useState('')
  const [reply, setReply] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const sortedMessages = useMemo(
    () => [...(detail?.messages ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [detail?.messages],
  )

  function clearFeedback() {
    setError(null)
    setGateExpired(false)
    setNotice(null)
  }

  function registerError(reason: unknown) {
    const next = messageError(reason)
    setError(next.text)
    setGateExpired(next.parentGateExpired)
  }

  async function reloadList() {
    setLoadingList(true)
    clearFeedback()
    try {
      const next = await apiGet<CustomerTicketPage>(
        `/api/helpdesk/portal/tickets?limit=${PORTAL_PAGE_SIZE}`,
      )
      setPage(next)
    } catch (reason) {
      registerError(reason)
    } finally {
      setLoadingList(false)
    }
  }

  async function loadMore() {
    if (loadingMore || !page.hasMore || !page.nextCursor) return
    setLoadingMore(true)
    clearFeedback()
    try {
      const next = await apiGet<CustomerTicketPage>(
        `/api/helpdesk/portal/tickets?limit=${PORTAL_PAGE_SIZE}&cursor=${encodeURIComponent(page.nextCursor)}`,
      )
      setPage((current) => mergeCustomerTicketPages(current, next))
    } catch (reason) {
      registerError(reason)
    } finally {
      setLoadingMore(false)
    }
  }

  /**
   * `keepDraft`: o "Atualizar" do detalhe recarrega a conversa (a resposta da
   * equipe chega por aqui, não há polling) sem apagar o que o cliente digitava.
   */
  async function openTicket(id: string, options: { keepDraft?: boolean } = {}) {
    setLoadingDetail(true)
    clearFeedback()
    try {
      const next = await apiGet<CustomerTicketDetail>(`/api/helpdesk/portal/tickets/${id}`)
      setDetail(next)
      if (!options.keepDraft) setReply('')
      setMode('detail')
    } catch (reason) {
      registerError(reason)
    } finally {
      setLoadingDetail(false)
    }
  }

  function showList() {
    setMode('list')
    setDetail(null)
    clearFeedback()
  }

  function showNewTicket() {
    setMode('new')
    setFormErrors({})
    clearFeedback()
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (subject.trim().length < 3)
      nextErrors.subject = 'Escreva um assunto com pelo menos 3 caracteres.'
    if (!firstMessage.trim()) nextErrors.body = 'Conte para a equipe como podemos ajudar.'
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setSaving(true)
    clearFeedback()
    try {
      const created = await apiSend<{
        ticket: CustomerTicketView
        message: CustomerTicketMessageView
      }>('/api/helpdesk/portal/tickets', 'POST', {
        subject: subject.trim(),
        body: firstMessage.trim(),
        ...(category ? { category } : {}),
      })
      setPage((current) => ({
        ...current,
        items: [
          created.ticket,
          ...current.items.filter((ticket) => ticket.id !== created.ticket.id),
        ],
        total: current.total + 1,
      }))
      setDetail({ ticket: created.ticket, messages: [created.message] })
      setSubject('')
      setCategory('')
      setFirstMessage('')
      setMode('detail')
      setNotice('Chamado enviado. A equipe responderá por aqui e, quando necessário, por e-mail.')
    } catch (reason) {
      registerError(reason)
    } finally {
      setSaving(false)
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail) return
    if (!reply.trim()) {
      setFormErrors({ reply: 'Escreva uma mensagem antes de enviar.' })
      return
    }

    setSaving(true)
    setFormErrors({})
    clearFeedback()
    try {
      const created = await apiSend<{
        ticket: CustomerTicketView
        message: CustomerTicketMessageView
      }>(`/api/helpdesk/portal/tickets/${detail.ticket.id}/messages`, 'POST', {
        body: reply.trim(),
      })
      setDetail((current) =>
        current
          ? {
              ticket: created.ticket,
              messages: current.messages.some((message) => message.id === created.message.id)
                ? current.messages
                : [...current.messages, created.message],
            }
          : current,
      )
      setPage((current) => ({
        ...current,
        items: [
          created.ticket,
          ...current.items.filter((ticket) => ticket.id !== created.ticket.id),
        ],
      }))
      setReply('')
      setNotice('Mensagem enviada. O chamado voltou para a equipe.')
    } catch (reason) {
      registerError(reason)
    } finally {
      setSaving(false)
    }
  }

  const feedback = error ? (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <p>{error}</p>
      {gateExpired && parentAreaHref ? (
        <a
          href={parentAreaHref}
          className="mt-1 inline-block font-semibold underline underline-offset-4"
        >
          Voltar para a Área dos Pais
        </a>
      ) : null}
    </div>
  ) : notice ? (
    <p
      role="status"
      className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground"
    >
      {notice}
    </p>
  ) : null

  if (mode === 'new') {
    return (
      <section className="mx-auto max-w-2xl space-y-5" aria-labelledby="support-title">
        <header className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={showList} aria-label="Voltar aos chamados">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 id="support-title" className="text-2xl font-bold tracking-tight">
              Abrir chamado
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Descreva o que aconteceu. Quanto mais contexto você enviar, mais rápido conseguimos
              ajudar.
            </p>
          </div>
        </header>
        {feedback}
        <Card>
          <CardContent className="pt-6">
            <form noValidate onSubmit={createTicket} className="space-y-4">
              <Field label="Assunto" htmlFor="support-subject" error={formErrors.subject}>
                <Input
                  id="support-subject"
                  value={subject}
                  maxLength={300}
                  autoFocus
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Ex.: não consigo acessar meu curso"
                />
              </Field>
              <Field label="Sobre o que você precisa de ajuda?" htmlFor="support-category">
                <Select
                  id="support-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as CustomerTicketCategory | '')
                  }
                >
                  <option value="">Escolha uma categoria</option>
                  {CUSTOMER_TICKET_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {CUSTOMER_TICKET_CATEGORY_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Como podemos ajudar?"
                htmlFor="support-first-message"
                error={formErrors.body}
              >
                <Textarea
                  id="support-first-message"
                  value={firstMessage}
                  maxLength={10_000}
                  rows={7}
                  onChange={(event) => setFirstMessage(event.target.value)}
                  placeholder="Conte o que você tentou fazer e o que apareceu na tela."
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" type="button" onClick={showList} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner className="size-4" /> : <Send className="size-4" />}
                  Enviar chamado
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (mode === 'detail' && detail) {
    return (
      <section className="mx-auto max-w-2xl space-y-5" aria-labelledby="support-title">
        <header className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={showList} aria-label="Voltar aos chamados">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="support-title" className="truncate text-2xl font-bold tracking-tight">
                {detail.ticket.subject}
              </h1>
              <Badge variant={statusVariant(detail.ticket.status)}>
                {CUSTOMER_TICKET_STATUS_LABEL[detail.ticket.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.ticket.category
                ? CUSTOMER_TICKET_CATEGORY_LABEL[detail.ticket.category]
                : 'Atendimento'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openTicket(detail.ticket.id, { keepDraft: true })}
            disabled={loadingDetail}
            aria-label="Atualizar a conversa"
          >
            {loadingDetail ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            Atualizar
          </Button>
        </header>
        {feedback}
        <div className="space-y-3" aria-live="polite">
          {sortedMessages.map((message) => (
            <ConversationMessage key={message.id} message={message} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Enviar uma mensagem</CardTitle>
            <CardDescription>
              Se a equipe estava aguardando você, esta resposta reabre o chamado automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={sendReply} className="space-y-3">
              <Field label="Sua mensagem" htmlFor="support-reply" error={formErrors.reply}>
                <Textarea
                  id="support-reply"
                  value={reply}
                  rows={5}
                  maxLength={10_000}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Escreva sua resposta para a equipe."
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner className="size-4" /> : <Send className="size-4" />}
                  Enviar mensagem
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="support-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="support-title"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight"
          >
            <CircleHelp className="size-6 text-primary" /> Atendimento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus chamados e fale diretamente com a equipe da Sistema Zero.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reloadList()}
            disabled={loadingList}
          >
            {loadingList ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
            Atualizar
          </Button>
          <Button size="sm" onClick={showNewTicket}>
            <Plus className="size-4" /> Abrir chamado
          </Button>
        </div>
      </header>
      {feedback}
      {loadingDetail ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Abrindo conversa...
          </CardContent>
        </Card>
      ) : page.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MessageCircleMore className="size-8 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">Você ainda não tem chamados.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando precisar, a equipe está por aqui.
              </p>
            </div>
            <Button onClick={showNewTicket}>
              <Plus className="size-4" /> Abrir chamado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-2" aria-label="Seus chamados">
            {page.items.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => void openTicket(ticket.id)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(ticket.status)}>
                      {CUSTOMER_TICKET_STATUS_LABEL[ticket.status]}
                    </Badge>
                    {ticket.category ? (
                      <span className="text-xs text-muted-foreground">
                        {CUSTOMER_TICKET_CATEGORY_LABEL[ticket.category]}
                      </span>
                    ) : null}
                    <time className="ml-auto text-xs text-muted-foreground">
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
              <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Spinner className="size-4" /> : null}
                Carregar mais chamados
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function ConversationMessage({ message }: { message: CustomerTicketMessageView }) {
  const fromCustomer = message.direction !== 'outbound'
  return (
    <article
      className={`rounded-xl border p-4 shadow-sm ${fromCustomer ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'}`}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{fromCustomer ? 'Você' : (message.fromName ?? 'Equipe Sistema Zero')}</strong>
        <span className="text-muted-foreground">{formatWhen(message.createdAt)}</span>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.bodyText}</p>
    </article>
  )
}
