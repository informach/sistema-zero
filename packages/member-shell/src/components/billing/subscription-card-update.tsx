'use client'

import { Button } from '@sistemazero/ui/button'
import {
  cardLengthFor,
  cvvLengthFor,
  isExpiryInFuture,
  isValidCpf,
  luhnCheck,
  normalizeBrand,
  onlyDigits,
} from '@sistemazero/ui/credit-card'
import { Dialog } from '@sistemazero/ui/dialog'
import { loadEfi, tokenizeEfiCard } from '@sistemazero/ui/efi-card-token'
import { Input } from '@sistemazero/ui/input'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { apiGet, apiSend } from '../../lib/api'
import type {
  SubscriptionCardConfigView,
  SubscriptionCardIntentView,
} from '../../lib/subscription-card'

/** Preventiva: altera apenas o cartão dos próximos ciclos, sem liquidar atrasados. */
export function SubscriptionCardUpdate({
  subscriptionId,
  onUpdated,
  className,
}: {
  subscriptionId: string
  onUpdated: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        Alterar cartão
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Alterar cartão da assinatura"
        description="Sem cobrança imediata. O novo cartão será usado nos próximos ciclos."
      >
        {open ? (
          <CardUpdateForm
            key={subscriptionId}
            subscriptionId={subscriptionId}
            onUpdated={onUpdated}
          />
        ) : null}
      </Dialog>
    </>
  )
}

const emptyFields = { number: '', name: '', cpf: '', month: '', year: '', cvv: '' }
type CardFields = typeof emptyFields

function CardUpdateForm({
  subscriptionId,
  onUpdated,
}: {
  subscriptionId: string
  onUpdated: () => void
}) {
  const formId = useId()
  const path = `/api/payments/my/subscriptions/${subscriptionId}/card-intents`
  const [config, setConfig] = useState<SubscriptionCardConfigView | null>(null)
  const [intent, setIntent] = useState<SubscriptionCardIntentView | null>(null)
  const [fields, setFields] = useState<CardFields>(emptyFields)
  const [phase, setPhase] = useState<'LOADING' | 'FORM' | 'BUSY' | 'RESULT' | 'UNAVAILABLE'>(
    'LOADING',
  )
  const [message, setMessage] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    requestRef.current = controller
    Promise.all([
      apiGet<SubscriptionCardConfigView>('/api/payments/my/card-config', undefined, {
        signal: controller.signal,
      }),
      apiGet<{ intent: SubscriptionCardIntentView | null }>(path, undefined, {
        signal: controller.signal,
      }),
    ])
      .then(([currentConfig, current]) => {
        if (controller.signal.aborted) return
        setConfig(currentConfig)
        setIntent(current.intent)
        if (!currentConfig.available || !currentConfig.accountIdentifier) {
          setMessage('A alteração de cartão está indisponível. Entre em contato com o atendimento.')
          setPhase('UNAVAILABLE')
        } else {
          setPhase(current.intent && current.intent.state !== 'READY' ? 'RESULT' : 'FORM')
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setMessage('Não foi possível consultar a assinatura. Feche e abra novamente para conferir.')
        setPhase('UNAVAILABLE')
      })
    return () => {
      controller.abort()
      requestRef.current = null
    }
  }, [path])

  async function checkStatus(id: string, signal: AbortSignal) {
    const current = await apiGet<SubscriptionCardIntentView>(`${path}/${id}`, undefined, { signal })
    if (signal.aborted) return
    setMessage('')
    setIntent(current)
    setPhase('RESULT')
    if (current.state === 'SUCCEEDED') onUpdated()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const controller = requestRef.current
    if (submitting.current || !controller || !config?.accountIdentifier || phase !== 'FORM') return
    const number = onlyDigits(fields.number, 19)
    if (
      !luhnCheck(number) ||
      !fields.name.trim() ||
      !isValidCpf(fields.cpf) ||
      !/^\d{2}$/.test(fields.month) ||
      !/^\d{4}$/.test(fields.year) ||
      !isExpiryInFuture(fields.month, fields.year, new Date())
    ) {
      setMessage('Confira número, nome do titular, CPF e validade do cartão.')
      return
    }
    submitting.current = true
    setPhase('BUSY')
    setMessage('')
    let currentIntent = intent
    let executionSent = false
    try {
      if (!currentIntent || Date.parse(currentIntent.expiresAt) <= Date.now()) {
        currentIntent = await apiSend<SubscriptionCardIntentView>(path, 'POST', {}, undefined, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setIntent(currentIntent)
      }
      const sdk = await loadEfi()
      if (controller.signal.aborted) return
      if (await sdk.CreditCard.isScriptBlocked()) throw new Error('Tokenização indisponível')
      if (controller.signal.aborted) return
      const brand = normalizeBrand(await sdk.CreditCard.setCardNumber(number).verifyCardBrand())
      if (controller.signal.aborted) return
      if (
        !brand ||
        number.length !== cardLengthFor(brand) ||
        !new RegExp(`^\\d{${cvvLengthFor(brand)}}$`).test(fields.cvv)
      ) {
        throw new Error('Dados de cartão inválidos')
      }
      const token = await tokenizeEfiCard(
        { accountIdentifier: config.accountIdentifier, environment: config.environment },
        {
          brand,
          number,
          cvv: fields.cvv,
          expirationMonth: fields.month,
          expirationYear: fields.year,
          holderName: fields.name.trim(),
          holderDocument: onlyDigits(fields.cpf, 11),
          reuse: true,
        },
      )
      if (controller.signal.aborted) return
      setFields(emptyFields)
      executionSent = true
      const result = await apiSend<SubscriptionCardIntentView>(
        `${path}/${currentIntent.id}`,
        'POST',
        {
          paymentToken: token.payment_token,
          card: { brand, last4: number.slice(-4) },
        },
        undefined,
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      setIntent(result)
      setPhase('RESULT')
      if (result.state === 'SUCCEEDED') onUpdated()
    } catch {
      if (controller.signal.aborted) return
      setFields(emptyFields)
      if (executionSent && currentIntent) {
        setPhase('RESULT')
        setMessage(
          'A resposta não foi confirmada. Confira a solicitação antes de tentar alterar novamente.',
        )
        try {
          await checkStatus(currentIntent.id, controller.signal)
        } catch {
          // Continua bloqueado na consulta: jamais repetir automaticamente a escrita.
        }
      } else {
        setMessage('Não foi possível validar o cartão. Confira os dados e tente novamente.')
        setPhase('FORM')
      }
    } finally {
      submitting.current = false
    }
  }

  async function refresh() {
    const signal = requestRef.current?.signal
    if (!intent || !signal || submitting.current) return
    submitting.current = true
    setMessage('')
    try {
      await checkStatus(intent.id, signal)
    } catch {
      if (!signal.aborted)
        setMessage('Não foi possível conferir agora. Tente consultar novamente mais tarde.')
    } finally {
      submitting.current = false
    }
  }

  const statusText =
    intent?.state === 'SUCCEEDED'
      ? 'Cartão atualizado. Não fizemos uma cobrança imediata. Valores em atraso não foram pagos por esta alteração.'
      : intent?.state === 'REJECTED'
        ? 'Esta solicitação não foi concluída. Feche e abra novamente para conferir a situação da assinatura.'
        : 'Sua solicitação está em conferência. Não envie os dados novamente. Você pode fechar esta janela e consultar depois.'

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Alterar o cartão não paga cobranças em atraso e não muda o preço ou a data da assinatura.
      </p>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {phase === 'LOADING' ? <p role="status">Consultando assinatura…</p> : null}
      {phase === 'RESULT' ? (
        <div className="space-y-3">
          <p role="status">{statusText}</p>
          {intent && intent.state !== 'SUCCEEDED' && intent.state !== 'REJECTED' ? (
            <Button variant="outline" onClick={() => void refresh()}>
              Conferir solicitação
            </Button>
          ) : null}
        </div>
      ) : null}
      {phase === 'FORM' || phase === 'BUSY' ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-3" autoComplete="off">
          <fieldset disabled={phase === 'BUSY'} className="space-y-3">
            {(
              [
                ['number', 'Número do cartão', 'numeric', 23],
                ['name', 'Nome do titular', 'text', 100],
                ['cpf', 'CPF do titular', 'numeric', 14],
                ['month', 'Mês de validade (MM)', 'numeric', 2],
                ['year', 'Ano de validade (AAAA)', 'numeric', 4],
                ['cvv', 'Código de segurança (CVV)', 'numeric', 4],
              ] as const
            ).map(([key, label, inputMode, maxLength]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`${formId}-${key}`} className="text-sm font-medium">
                  {label}
                </label>
                <Input
                  id={`${formId}-${key}`}
                  type={key === 'cvv' ? 'password' : 'text'}
                  inputMode={inputMode}
                  maxLength={maxLength}
                  required
                  value={fields[key]}
                  onChange={(event) => {
                    const value =
                      inputMode === 'numeric'
                        ? onlyDigits(event.target.value, key === 'number' ? 19 : maxLength)
                        : event.target.value
                    setFields((previous) => ({ ...previous, [key]: value }))
                  }}
                />
              </div>
            ))}
            <Button type="submit">
              {phase === 'BUSY' ? 'Atualizando cartão…' : 'Salvar cartão sem cobrança'}
            </Button>
          </fieldset>
        </form>
      ) : null}
    </div>
  )
}
