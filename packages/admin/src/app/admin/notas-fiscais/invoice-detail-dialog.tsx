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
  onClose,
  onNavigate,
  onChanged,
}: {
  invoiceId: string | null
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
      toast.error((err as ApiError).message ?? 'Falha ao carregar a nota.')
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
      toast.info('O estado da nota mudou — detalhe atualizado.')
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
      toast.success('Reprocessamento solicitado.')
      setConfirmingRetry(false)
      await afterMutation()
    } catch (err) {
      await handleStaleState(err, 'Não foi possível reprocessar.')
    } finally {
      setRetrying(false)
    }
  }

  async function doEmitNow() {
    if (!invoiceId) return
    setEmittingNow(true)
    try {
      await apiSend(`/api/nfse/invoices/${encodeURIComponent(invoiceId)}/emit-now`, 'POST')
      toast.success('Emissão antecipada — a nota será emitida em instantes.')
      setConfirmingEmitNow(false)
      await afterMutation()
    } catch (err) {
      await handleStaleState(err, 'Não foi possível antecipar a emissão.')
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
        title="Detalhe da nota fiscal"
        description={invoice ? `NFS-e · ambiente ${invoice.ambiente}` : undefined}
        className="max-w-2xl"
        footer={
          invoice ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {canDownloadPdf(invoice) ? (
                <Button variant="outline" onClick={openPdf}>
                  <FileDown className="size-4" /> Baixar PDF
                </Button>
              ) : null}
              {canEmitNow(invoice) ? (
                confirmingEmitNow ? (
                  <>
                    <p className="w-full text-right text-xs text-muted-foreground">
                      Emite <span className="font-semibold">sem esperar o fim da garantia</span> (em
                      até 30s). Um estorno posterior continua cancelando a nota.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingEmitNow(false)}
                      disabled={emittingNow}
                    >
                      Não
                    </Button>
                    <Button onClick={doEmitNow} disabled={emittingNow}>
                      {emittingNow ? <Spinner /> : <Zap className="size-4" />}
                      Confirmar emissão agora
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setConfirmingEmitNow(true)}>
                    <Zap className="size-4" /> Emitir agora
                  </Button>
                )
              ) : null}
              {canRetryInvoice(invoice) ? (
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
                      {retrying ? <Spinner /> : <RotateCcw className="size-4" />}
                      Confirmar reprocessamento
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setConfirmingRetry(true)}>
                    <RotateCcw className="size-4" /> Reprocessar
                  </Button>
                )
              ) : null}
              {canSubstituteInvoice(invoice) ? (
                <Button variant="outline" onClick={() => setSubstituteOpen(true)}>
                  <Replace className="size-4" /> Substituir
                </Button>
              ) : null}
              {canCancelInvoice(invoice) ? (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  <Ban className="size-4" /> Cancelar
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
          <InvoiceSnapshot invoice={invoice} events={detail.events} onNavigate={onNavigate} />
        )}
      </Dialog>

      {invoice ? (
        <CancelInvoiceDialog
          invoice={invoice}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onDone={afterMutation}
        />
      ) : null}
      {invoice ? (
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
}: {
  invoice: InvoiceView
  events: InvoiceEventView[]
  onNavigate: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <Field label="Identificador">
        <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{inv.id}</code>
      </Field>

      {inv.lastError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <span className="font-semibold">Último erro:</span> {inv.lastError}
        </p>
      ) : null}
      {inv.skipReason ? (
        <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          <span className="font-semibold">Motivo da dispensa:</span> {inv.skipReason}
        </p>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <Row label="Status" value={<InvoiceStatusBadge status={inv.status} />} />
        <Row label="Valor" value={formatCentsStr(inv.amountInCents)} />
        <Row label="Descrição do serviço" value={inv.serviceDescription} />
        <Row label="Competência" value={formatDateOnly(inv.competenceDate)} />
        <Row label="DPS (nº · série)" value={formatDps(inv.dpsSeries, inv.dpsNumber)} />
        {inv.accessKey ? (
          <Row label="Chave de acesso" value={<CopyValue value={inv.accessKey} />} />
        ) : null}
        <Row label="Ambiente" value={inv.ambiente} />
        <Row label="Tentativas" value={String(inv.attempts)} />
        <Row
          label="Garantia"
          value={inv.guaranteeDays !== null ? `${inv.guaranteeDays} dias` : '—'}
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <Row label="Cliente" value={inv.customer.name} />
        <Row label="E-mail" value={inv.customer.email} />
        <Row label="Documento" value={formatDocument(inv.customer.document)} />
        <Row
          label="Transação"
          value={
            <span className="inline-flex items-center gap-1.5">
              <CopyValue value={inv.paymentId} truncate />
              <Link
                href="/admin/pagamentos/transacoes"
                className="text-xs text-primary hover:underline"
              >
                Ver transações
              </Link>
            </span>
          }
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <Row label="Pago em" value={formatDate(inv.paidAt)} />
        <Row label="Agendada para" value={formatDate(inv.scheduledFor)} />
        <Row label="Emitida em" value={formatDate(inv.emittedAt)} />
        <Row label="PDF armazenado" value={formatDate(inv.pdfStoredAt)} />
        <Row label="E-mail enviado" value={formatDate(inv.emailSentAt)} />
        <Row label="Criada" value={formatDate(inv.createdAt)} />
      </div>

      {inv.cancelReason || inv.cancelledAt || inv.cancelRequestedBy ? (
        <div className="rounded-lg border border-border p-3">
          <Row label="Motivo do cancelamento" value={inv.cancelReason ?? '—'} />
          <Row label="Solicitado por" value={inv.cancelRequestedBy ?? '—'} />
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

      <div>
        <h3 className="mb-2 text-sm font-semibold">Linha do tempo</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ol className="space-y-3 border-l border-border pl-4">
            {events.map((ev) => {
              const summary = summarizeEventDetail(ev.detail)
              return (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-primary/60" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{ev.type}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(ev.createdAt)}
                    </span>
                  </div>
                  {ev.actor ? (
                    <p className="text-xs text-muted-foreground">por {ev.actor}</p>
                  ) : null}
                  {summary ? (
                    <p className="break-all text-xs text-muted-foreground">{summary}</p>
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

/** Valor copiável (id/chave): código truncado + botão de copiar o valor inteiro. */
function CopyValue({ value, truncate = false }: { value: string; truncate?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(value, 'Valor')}
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-xs transition-colors hover:bg-muted"
      title="Copiar"
    >
      <span className="break-all">{truncate ? truncateAccessKey(value) : value}</span>
      <Copy className="size-3 shrink-0 text-muted-foreground" />
    </button>
  )
}

/** Referência a outra nota (substituição) — clique troca o detalhe exibido. */
function InvoiceLink({ id, onNavigate }: { id: string; onNavigate: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      className="font-mono text-xs text-primary hover:underline"
      title="Abrir esta nota"
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
      toast.success('Cancelamento solicitado.')
      onClose()
      await onDone()
    } catch (err) {
      if ((err as ApiError).code === 'INVALID_STATE') {
        toast.info('O estado da nota mudou — detalhe atualizado.')
        onClose()
        await onDone()
      } else {
        toast.error((err as ApiError).message ?? 'Não foi possível cancelar a nota.')
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
      description="O cancelamento é registrado na prefeitura e não pode ser desfeito."
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
            {submitting ? <Spinner /> : <Ban className="size-4" />}
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <Field
        label="Motivo do cancelamento"
        hint="Obrigatório — entre 3 e 500 caracteres."
        htmlFor="cancel-reason"
      >
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Ex.: estorno do pagamento dentro da garantia"
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
      toast.success('Nota substituta criada.')
      onClose()
      await onDone()
      if (created?.id) onNavigate(created.id)
    } catch (err) {
      if ((err as ApiError).code === 'INVALID_STATE') {
        toast.info('O estado da nota mudou — detalhe atualizado.')
        onClose()
        await onDone()
      } else {
        toast.error((err as ApiError).message ?? 'Não foi possível substituir a nota.')
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
      description="Corrija os dados errados — só os campos preenchidos serão alterados."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={doSubstitute} disabled={submitting || !hasField}>
            {submitting ? <Spinner /> : <Replace className="size-4" />}
            Emitir substituta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          A nota original será <span className="font-semibold">cancelada por substituição</span> e
          uma nova nota será emitida com os dados corrigidos.
        </p>
        <Field label="Nome do cliente" hint={`Atual: ${invoice.customer.name}`} htmlFor="sub-name">
          <Input
            id="sub-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Deixe vazio para manter"
          />
        </Field>
        <Field
          label="CPF/CNPJ"
          hint={`Atual: ${formatDocument(invoice.customer.document)}`}
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
          hint={`Atual: ${invoice.serviceDescription}`}
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
