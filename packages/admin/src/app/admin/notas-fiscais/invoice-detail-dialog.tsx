'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { Ban, Copy, FileDown, Replace, RotateCcw, Zap } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  canCancelInvoice,
  canDownloadPdf,
  canEmitNow,
  canRetryInvoice,
  canSubstituteInvoice,
  formatDateOnly,
  formatDocument,
  formatDps,
  invoiceEventLabel,
  invoiceEventReason,
  invoiceMainDate,
  invoiceProblemSummary,
  isKnownInvoiceEvent,
  isValidCancelReason,
  summarizeEventDetail,
  truncateAccessKey,
} from '@/lib/nfse'
import type { InvoiceDetail, InvoiceEventView, InvoiceView } from '@/lib/types'
import { copyToClipboard } from './copy-to-clipboard'
import { InvoiceStatusBadge } from './invoice-status-badge'

/**
 * Detalhe da nota fiscal: snapshot completo + timeline de eventos + ações por
 * estado (baixar PDF, emitir agora, reprocessar, cancelar, substituir). Busca o
 * detalhe no BFF ao abrir; `onChanged` recarrega lista+stats após uma mutação.
 */
export function InvoiceDetailDialog({
  invoiceId,
  canWrite,
  onClose,
  onNavigate,
  onChanged,
}: {
  invoiceId: string | null
  canWrite: boolean
  onClose: () => void
  /** Troca a nota exibida (links substitui/substituída). */
  onNavigate: (id: string) => void
  onChanged: () => Promise<void>
}) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const [confirmingRetry, setConfirmingRetry] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [confirmingEmitNow, setConfirmingEmitNow] = useState(false)
  const [emittingNow, setEmittingNow] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [substituteOpen, setSubstituteOpen] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      setDetail(await apiGet<InvoiceDetail>(`/api/nfse/invoices/${encodeURIComponent(id)}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'A nota não carregou. Tente de novo.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setDetail(null)
    setConfirmingRetry(false)
    setConfirmingEmitNow(false)
    setCancelOpen(false)
    setSubstituteOpen(false)
    if (invoiceId) load(invoiceId)
  }, [invoiceId, load])

  async function afterMutation() {
    if (invoiceId) await load(invoiceId)
    await onChanged()
  }

  /**
   * INVALID_STATE (409) = a nota mudou por baixo (ex.: o worker emitiu a
   * SCHEDULED em segundos enquanto o detalhe estava aberto). Não é falha —
   * re-busca o detalhe pra UI alcançar o estado real.
   */
  async function handleStaleState(err: unknown, fallback: string) {
    const apiError = err as ApiError
    if (apiError.code === 'INVALID_STATE') {
      toast.info('A nota mudou enquanto você olhava. Mostramos como ela está agora.')
      setConfirmingRetry(false)
      setConfirmingEmitNow(false)
      await afterMutation()
      return
    }
    toast.error(apiError.message ?? fallback)
  }

  async function doRetry() {
    if (!invoiceId) return
    setRetrying(true)
    try {
      await apiSend(`/api/nfse/invoices/${encodeURIComponent(invoiceId)}/retry`, 'POST')
      toast.success('Pedimos para tentar de novo.')
      setConfirmingRetry(false)
      await afterMutation()
    } catch (err) {
      await handleStaleState(err, 'Não deu para tentar de novo agora.')
    } finally {
      setRetrying(false)
    }
  }

  async function doEmitNow() {
    if (!invoiceId) return
    setEmittingNow(true)
    try {
      await apiSend(`/api/nfse/invoices/${encodeURIComponent(invoiceId)}/emit-now`, 'POST')
      toast.success('A nota vai sair em instantes, sem esperar a garantia.')
      setConfirmingEmitNow(false)
      await afterMutation()
    } catch (err) {
      await handleStaleState(err, 'Não deu para emitir agora.')
    } finally {
      setEmittingNow(false)
    }
  }

  function openPdf() {
    if (!invoiceId) return
    window.open(`/api/nfse/invoices/${encodeURIComponent(invoiceId)}/pdf`, '_blank', 'noopener')
  }

  const invoice = detail?.invoice ?? null

  return (
    <>
      <Dialog
        open={invoiceId !== null}
        onClose={onClose}
        title="Nota fiscal"
        description={invoice ? invoice.customer.name : undefined}
        className="max-w-2xl"
        footer={
          invoice ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {canDownloadPdf(invoice) ? (
                <Button variant="outline" onClick={openPdf}>
                  <FileDown className="size-4" aria-hidden /> Baixar PDF
                </Button>
              ) : null}
              {canWrite && canEmitNow(invoice) ? (
                confirmingEmitNow ? (
                  <>
                    <p className="w-full text-right text-xs text-muted-foreground">
                      A nota sai{' '}
                      <span className="font-semibold">sem esperar o fim da garantia</span>, em até
                      30 segundos. Se a venda for estornada depois, a nota é cancelada.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingEmitNow(false)}
                      disabled={emittingNow}
                    >
                      Não
                    </Button>
                    <Button onClick={doEmitNow} disabled={emittingNow}>
                      {emittingNow ? <Spinner /> : <Zap className="size-4" aria-hidden />}
                      Sim, emitir agora
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setConfirmingEmitNow(true)}>
                    <Zap className="size-4" aria-hidden /> Emitir agora
                  </Button>
                )
              ) : null}
              {canWrite && canRetryInvoice(invoice) ? (
                confirmingRetry ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingRetry(false)}
                      disabled={retrying}
                    >
                      Não
                    </Button>
                    <Button onClick={doRetry} disabled={retrying}>
                      {retrying ? <Spinner /> : <RotateCcw className="size-4" aria-hidden />}
                      Sim, tentar de novo
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setConfirmingRetry(true)}>
                    <RotateCcw className="size-4" aria-hidden /> Tentar de novo
                  </Button>
                )
              ) : null}
              {canWrite && canSubstituteInvoice(invoice) ? (
                <Button variant="outline" onClick={() => setSubstituteOpen(true)}>
                  <Replace className="size-4" aria-hidden /> Substituir
                </Button>
              ) : null}
              {canWrite && canCancelInvoice(invoice) ? (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  <Ban className="size-4" aria-hidden /> Cancelar a nota
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {loading || !detail || !invoice ? (
          <div className="py-10 text-center">
            <Spinner className="mx-auto" />
          </div>
        ) : (
          <InvoiceSnapshot
            invoice={invoice}
            events={detail.events}
            onNavigate={onNavigate}
            canAct={canWrite}
          />
        )}
      </Dialog>

      {invoice && canWrite ? (
        <CancelInvoiceDialog
          invoice={invoice}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onDone={afterMutation}
        />
      ) : null}
      {invoice && canWrite ? (
        <SubstituteInvoiceDialog
          invoice={invoice}
          open={substituteOpen}
          onClose={() => setSubstituteOpen(false)}
          onDone={afterMutation}
          onNavigate={onNavigate}
        />
      ) : null}
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function InvoiceSnapshot({
  invoice: inv,
  events,
  onNavigate,
  canAct,
}: {
  invoice: InvoiceView
  events: InvoiceEventView[]
  onNavigate: (id: string) => void
  /** Quem olha tem os botões da nota (Admin)? Muda a frase do problema. */
  canAct: boolean
}) {
  const problem = invoiceProblemSummary(inv, canAct)
  const mainDate = invoiceMainDate(inv)
  return (
    <div className="flex flex-col gap-4 text-sm">
      {problem ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive"
        >
          <p className="font-semibold">{problem}</p>
          {inv.lastError ? (
            <p className="mt-1 text-xs">
              <span className="font-semibold">O que o emissor respondeu:</span> {inv.lastError}
            </p>
          ) : null}
        </div>
      ) : null}
      {inv.skipReason ? (
        <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          <span className="font-semibold">Por que foi dispensada:</span> {inv.skipReason}
        </p>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <Row label="Situação" value={<InvoiceStatusBadge status={inv.status} />} />
        <Row label="Valor" value={formatCentsStr(inv.amountInCents)} />
        <Row label={mainDate.label} value={formatDate(mainDate.iso)} />
        {inv.accessKey ? (
          <Row
            label="Chave de acesso"
            value={<CopyValue value={inv.accessKey} label="Chave de acesso" />}
          />
        ) : null}
        <Row label="Serviço" value={inv.serviceDescription} />
        <Row
          label="Garantia"
          value={inv.guaranteeDays !== null ? `${inv.guaranteeDays} dias` : '—'}
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <Row label="Quem comprou" value={inv.customer.name} />
        <Row label="E-mail" value={inv.customer.email} />
        <Row label="CPF ou CNPJ" value={formatDocument(inv.customer.document)} />
        <Row label="Pago em" value={formatDate(inv.paidAt)} />
        <Row label="E-mail da nota enviado" value={formatDate(inv.emailSentAt)} />
        <Row
          label="Venda"
          value={
            <Link
              href={`/admin/pagamentos/transacoes?busca=${encodeURIComponent(inv.paymentId)}`}
              className="text-primary hover:underline"
            >
              Ver em Vendas
            </Link>
          }
        />
      </div>

      {inv.cancelReason || inv.cancelledAt || inv.cancelRequestedBy ? (
        <div className="rounded-lg border border-border p-3">
          <Row label="Motivo do cancelamento" value={inv.cancelReason ?? '—'} />
          <Row label="Pedido por" value={inv.cancelRequestedBy ?? '—'} />
          <Row label="Cancelada em" value={formatDate(inv.cancelledAt)} />
        </div>
      ) : null}

      {inv.substitutesId || inv.substitutedById ? (
        <div className="rounded-lg border border-border p-3">
          {inv.substitutesId ? (
            <Row
              label="Substitui a nota"
              value={<InvoiceLink id={inv.substitutesId} onNavigate={onNavigate} />}
            />
          ) : null}
          {inv.substitutedById ? (
            <Row
              label="Substituída pela nota"
              value={<InvoiceLink id={inv.substitutedById} onNavigate={onNavigate} />}
            />
          ) : null}
        </div>
      ) : null}

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
        <div className="mt-2">
          <Row label="Código da nota" value={<CopyValue value={inv.id} label="Código da nota" />} />
          <Row
            label="Código da venda"
            value={<CopyValue value={inv.paymentId} label="Código da venda" />}
          />
          <Row label="DPS (número e série)" value={formatDps(inv.dpsSeries, inv.dpsNumber)} />
          <Row label="Competência" value={formatDateOnly(inv.competenceDate)} />
          <Row label="Ambiente" value={inv.ambiente} />
          <Row label="Tentativas" value={String(inv.attempts)} />
          <Row label="Agendada para" value={formatDate(inv.scheduledFor)} />
          <Row label="PDF guardado" value={formatDate(inv.pdfStoredAt)} />
          <Row label="Criada" value={formatDate(inv.createdAt)} />
          {inv.lastError && !problem ? (
            <Row label="Última resposta do emissor" value={inv.lastError} />
          ) : null}
        </div>
      </details>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Linha do tempo</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nada aconteceu com esta nota ainda.</p>
        ) : (
          <ol className="space-y-3 border-l border-border pl-4">
            {events.map((ev) => {
              const summary = summarizeEventDetail(ev.detail)
              const reason = invoiceEventReason(ev.detail)
              const known = isKnownInvoiceEvent(ev.type)
              return (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-primary/60" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{invoiceEventLabel(ev.type)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(ev.createdAt)}
                    </span>
                  </div>
                  {ev.actor ? (
                    <p className="text-xs text-muted-foreground">
                      por {ev.actor === 'system' ? 'o sistema' : ev.actor}
                    </p>
                  ) : null}
                  {reason ? <p className="text-xs text-muted-foreground">{reason}</p> : null}
                  {summary || !known ? (
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Detalhes técnicos</summary>
                      {known ? null : <p className="mt-1 font-mono">{ev.type}</p>}
                      {summary ? <p className="mt-1 break-all">{summary}</p> : null}
                    </details>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

/** Valor copiável (id/chave): o código + botão de copiar o valor inteiro. */
function CopyValue({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(value, label)}
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left font-mono text-xs transition-colors hover:bg-muted"
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <span className="break-all">{value}</span>
      <Copy className="size-3 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

/** Referência a outra nota (substituição): o clique troca o detalhe exibido. */
function InvoiceLink({ id, onNavigate }: { id: string; onNavigate: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      className="font-mono text-xs text-primary hover:underline"
      title="Abrir esta nota"
      aria-label="Abrir esta nota"
    >
      {truncateAccessKey(id)}
    </button>
  )
}

function CancelInvoiceDialog({
  invoice,
  open,
  onClose,
  onDone,
}: {
  invoice: InvoiceView
  open: boolean
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  async function doCancel() {
    setSubmitting(true)
    try {
      await apiSend(`/api/nfse/invoices/${encodeURIComponent(invoice.id)}/cancel`, 'POST', {
        reason: reason.trim(),
      })
      toast.success('Pedimos o cancelamento à prefeitura.')
      onClose()
      await onDone()
    } catch (err) {
      if ((err as ApiError).code === 'INVALID_STATE') {
        toast.info('A nota mudou enquanto você olhava. Mostramos como ela está agora.')
        onClose()
        await onDone()
      } else {
        toast.error((err as ApiError).message ?? 'A nota não foi cancelada. Tente de novo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancelar nota fiscal"
      description="O cancelamento fica registrado na prefeitura. Não dá para desfazer."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={doCancel}
            disabled={submitting || !isValidCancelReason(reason)}
          >
            {submitting ? <Spinner /> : <Ban className="size-4" aria-hidden />}
            Cancelar a nota
          </Button>
        </>
      }
    >
      <Field
        label="Motivo do cancelamento"
        hint="Escreva entre 15 e 255 letras. A prefeitura exige o motivo."
        htmlFor="cancel-reason"
      >
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={255}
          placeholder="Ex.: a compra foi estornada dentro da garantia"
        />
      </Field>
    </Dialog>
  )
}

function SubstituteInvoiceDialog({
  invoice,
  open,
  onClose,
  onDone,
  onNavigate,
}: {
  invoice: InvoiceView
  open: boolean
  onClose: () => void
  onDone: () => Promise<void>
  onNavigate: (id: string) => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCustomerName('')
      setCustomerDocument('')
      setServiceDescription('')
    }
  }, [open])

  const hasField =
    customerName.trim().length > 0 ||
    customerDocument.trim().length > 0 ||
    serviceDescription.trim().length > 0

  async function doSubstitute() {
    setSubmitting(true)
    try {
      const body: Record<string, string> = {}
      if (customerName.trim()) body.customerName = customerName.trim()
      if (customerDocument.trim()) body.customerDocument = customerDocument.trim()
      if (serviceDescription.trim()) body.serviceDescription = serviceDescription.trim()
      const created = await apiSend<{ id: string }>(
        `/api/nfse/invoices/${encodeURIComponent(invoice.id)}/substitute`,
        'POST',
        body,
      )
      toast.success('A nota nova foi criada no lugar da antiga.')
      onClose()
      await onDone()
      if (created?.id) onNavigate(created.id)
    } catch (err) {
      if ((err as ApiError).code === 'INVALID_STATE') {
        toast.info('A nota mudou enquanto você olhava. Mostramos como ela está agora.')
        onClose()
        await onDone()
      } else {
        toast.error((err as ApiError).message ?? 'A nota não foi substituída. Tente de novo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Substituir nota fiscal"
      description="Corrija o que saiu errado. Só os campos preenchidos mudam."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={doSubstitute} disabled={submitting || !hasField}>
            {submitting ? <Spinner /> : <Replace className="size-4" aria-hidden />}
            Emitir a nota nova
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          A nota de agora é <span className="font-semibold">cancelada e trocada</span> por uma nota
          nova com os dados corrigidos.
        </p>
        <Field
          label="Nome de quem comprou"
          hint={`Hoje: ${invoice.customer.name}`}
          htmlFor="sub-name"
        >
          <Input
            id="sub-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Deixe vazio para manter"
          />
        </Field>
        <Field
          label="CPF ou CNPJ"
          hint={`Hoje: ${formatDocument(invoice.customer.document)}`}
          htmlFor="sub-document"
        >
          <Input
            id="sub-document"
            value={customerDocument}
            onChange={(e) => setCustomerDocument(e.target.value)}
            placeholder="Deixe vazio para manter"
          />
        </Field>
        <Field
          label="Descrição do serviço"
          hint={`Hoje: ${invoice.serviceDescription}`}
          htmlFor="sub-description"
        >
          <Textarea
            id="sub-description"
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            placeholder="Deixe vazio para manter"
          />
        </Field>
      </div>
    </Dialog>
  )
}
