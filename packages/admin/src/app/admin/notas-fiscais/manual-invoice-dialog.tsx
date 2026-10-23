'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { FilePlus2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { extractExistingInvoiceId, isValidUuid } from '@/lib/nfse'

/**
 * Emissão MANUAL por pagamento (backfill/antecipação): pede o código da venda (UUID),
 * POST `/api/nfse/invoices` e abre o detalhe da nota criada. Erros do contrato
 * aparecem inline; `INVOICE_ALREADY_EXISTS` oferece abrir a nota existente
 * quando o id é extraível da mensagem. `initialPaymentId` chega preenchido pelo link
 * "Emitir nota desta venda" (Vendas → `?emitir=`).
 */
export function ManualInvoiceDialog({
  open,
  initialPaymentId = '',
  onClose,
  onCreated,
  onOpenInvoice,
}: {
  open: boolean
  /** O código da venda já preenchido (vindo de Vendas). */
  initialPaymentId?: string
  onClose: () => void
  /** Nota criada — o pai abre o detalhe e recarrega lista+stats. */
  onCreated: (id: string) => Promise<void>
  /** Abre o detalhe de uma nota (usado p/ a nota já existente do pagamento). */
  onOpenInvoice: (id: string) => void
}) {
  const [paymentId, setPaymentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (open) {
      setPaymentId(initialPaymentId)
      setError(null)
    }
  }, [open, initialPaymentId])

  const trimmed = paymentId.trim()
  const validId = isValidUuid(trimmed)
  const existingId =
    error?.code === 'INVOICE_ALREADY_EXISTS'
      ? extractExistingInvoiceId(error.message, trimmed)
      : null

  async function doCreate() {
    setSubmitting(true)
    setError(null)
    try {
      const created = await apiSend<{ id: string }>('/api/nfse/invoices', 'POST', {
        paymentId: trimmed,
      })
      toast.success('Nota criada. Ela sai em instantes.')
      onClose()
      await onCreated(created.id)
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Emitir nota à mão"
      description="Para uma venda antiga sem nota, ou quando a nota precisa sair antes do fim da garantia."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={doCreate} disabled={submitting || !validId}>
            {submitting ? <Spinner /> : <FilePlus2 className="size-4" aria-hidden />}
            Emitir nota
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          A nota sai <span className="font-semibold">agora, sem esperar a garantia</span>. Se a
          venda for estornada depois, a nota é cancelada.
        </p>
        <Field
          label="Código da venda"
          hint="Fica nos detalhes técnicos da venda, em Vendas."
          htmlFor="manual-payment-id"
        >
          <Input
            id="manual-payment-id"
            value={paymentId}
            onChange={(e) => {
              setPaymentId(e.target.value)
              setError(null)
            }}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="font-mono"
          />
        </Field>
        {trimmed.length > 0 && !validId ? (
          <p className="text-xs text-muted-foreground">
            Esse código não parece o de uma venda. Copie de novo nos detalhes técnicos da venda.
          </p>
        ) : null}
        {error ? (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <p>{error.message}</p>
            {existingId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onOpenInvoice(existingId)
                }}
              >
                Abrir a nota existente
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
