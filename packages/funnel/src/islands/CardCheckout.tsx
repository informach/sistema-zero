import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api-fetch'
import { CardFormSchema, pathErrors } from '../lib/checkout-schema'
import { Field, inputClass } from './checkout-fields'

/** Opção de parcela (subset do `Installment` do payment-token-efi que usamos). */
interface InstallmentOption {
  installment: number
  value: number
  has_interest: boolean
}

// Identificador de conta da Efí (público, seguro no browser) + ambiente. Lidos de
// vars PUBLIC_* (inlined pelo Vite no bundle do cliente). Default = sandbox.
const EFI_ACCOUNT = String(import.meta.env.PUBLIC_EFI_ACCOUNT_IDENTIFIER ?? '')
const EFI_ENV: 'sandbox' | 'production' =
  import.meta.env.PUBLIC_EFI_SANDBOX === 'false' ? 'production' : 'sandbox'

interface ChargeResp {
  paymentId: string
  status: string
  card: { brand: string; last4: string; installments: number } | null
}
interface StatusResp {
  status: string
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function loadEfi() {
  return (await import('payment-token-efi')).default
}

/** Só dígitos, com teto de tamanho (impede letras/símbolos no campo). */
function onlyDigits(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max)
}
/** Máscara do cartão: dígitos agrupados de 4 em 4 (máx 19) → "4242 4242 4242 4242". */
function maskCardNumber(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 19)
  return d.replace(/(.{4})/g, '$1 ').trim()
}
/** Máscara de CPF: "000.000.000-00". */
function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`
  return d
}

export default function CardCheckout({
  priceCents,
  couponCode,
}: {
  priceCents: number
  couponCode?: string
}) {
  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [cpf, setCpf] = useState('')
  const [birth, setBirth] = useState('')
  const [installments, setInstallments] = useState(1)

  const [brand, setBrand] = useState<string | null>(null)
  const [installmentsList, setInstallmentsList] = useState<InstallmentOption[] | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  // Ao sair do campo do número: detecta a bandeira e busca as parcelas na Efí.
  async function loadInstallments() {
    const digits = number.replace(/\D/g, '')
    if (digits.length < 13 || !EFI_ACCOUNT) return
    try {
      const EfiPay = await loadEfi()
      const b = await EfiPay.CreditCard.setCardNumber(digits).verifyCardBrand()
      if (!b || b === 'undefined' || b === 'unsupported') {
        setBrand(null)
        setInstallmentsList(null)
        return
      }
      setBrand(b)
      const res = await EfiPay.CreditCard.setAccount(EFI_ACCOUNT)
        .setEnvironment(EFI_ENV)
        .setBrand(b)
        .setTotal(priceCents)
        .getInstallments()
      setInstallmentsList('installments' in res ? res.installments : null)
    } catch {
      setBrand(null)
      setInstallmentsList(null)
    }
  }

  // Polling curto caso o cartão volte PENDING (raro — cartão é síncrono).
  useEffect(() => {
    if (!paymentId) return
    const startedAt = Date.now()
    const MAX_MS = 60 * 1000
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        clearInterval(timer)
        return
      }
      try {
        const r = await apiGet<StatusResp>(`/api/checkout/${paymentId}`)
        if (r.status === 'PAID') {
          clearInterval(timer)
          window.location.href = '/obrigado'
        } else if (r.status === 'FAILED') {
          clearInterval(timer)
          setErro('Pagamento recusado. Verifique os dados ou use outro cartão.')
        }
      } catch {
        /* tenta no próximo ciclo */
      }
    }, 3500)
    return () => clearInterval(timer)
  }, [paymentId])

  async function submit() {
    setErro(null)
    const parsed = CardFormSchema.safeParse({
      number,
      holderName,
      expirationMonth: expMonth,
      expirationYear: expYear,
      cvv,
      cpf,
      birth,
      installments,
    })
    if (!parsed.success) {
      setErrors(pathErrors(parsed.error))
      return
    }
    setErrors({})

    if (!EFI_ACCOUNT) {
      setErro('Pagamento por cartão indisponível no momento. Use Pix.')
      return
    }

    setProcessing(true)
    try {
      const EfiPay = await loadEfi()
      const digits = parsed.data.number
      const cardBrand = brand ?? (await EfiPay.CreditCard.setCardNumber(digits).verifyCardBrand())
      if (!cardBrand || cardBrand === 'undefined' || cardBrand === 'unsupported') {
        setErro('Cartão não suportado. Confira o número.')
        return
      }
      const cpfDigits = parsed.data.cpf.replace(/\D/g, '')
      const tok = await EfiPay.CreditCard.setAccount(EFI_ACCOUNT)
        .setEnvironment(EFI_ENV)
        .setCreditCardData({
          brand: cardBrand,
          number: digits,
          cvv: parsed.data.cvv,
          expirationMonth: parsed.data.expirationMonth,
          expirationYear: parsed.data.expirationYear,
          holderName: parsed.data.holderName,
          holderDocument: cpfDigits,
          reuse: false,
        })
        .getPaymentToken()

      if (!('payment_token' in tok)) {
        setErro('Não foi possível validar o cartão. Confira os dados e tente novamente.')
        return
      }

      const body = {
        token: tok.payment_token,
        brand: cardBrand,
        last4: digits.slice(-4),
        installments: parsed.data.installments,
        attemptId: crypto.randomUUID(),
        couponCode,
        customer: {
          document: cpfDigits,
          birth: parsed.data.birth,
        },
      }
      const r = await apiPost<ChargeResp>('/api/checkout/card', body)
      if (r.status === 'PAID') {
        window.location.href = '/obrigado'
        return
      }
      if (r.status === 'FAILED') {
        setErro('Pagamento recusado. Verifique os dados ou use outro cartão.')
        return
      }
      setPaymentId(r.paymentId) // PENDING → poll curto
    } catch {
      setErro('Não foi possível processar o cartão. Confira os dados e tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field label="Número do cartão" error={errors.number}>
        <input
          className={inputClass}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={number}
          onChange={(e) => setNumber(maskCardNumber(e.target.value))}
          onBlur={loadInstallments}
        />
      </Field>
      <Field label="Nome impresso no cartão" error={errors.holderName}>
        <input
          className={inputClass}
          autoComplete="cc-name"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Mês (MM)" error={errors.expirationMonth}>
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="cc-exp-month"
            placeholder="05"
            maxLength={2}
            value={expMonth}
            onChange={(e) => setExpMonth(onlyDigits(e.target.value, 2))}
          />
        </Field>
        <Field label="Ano (AAAA)" error={errors.expirationYear}>
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="cc-exp-year"
            placeholder="2030"
            maxLength={4}
            value={expYear}
            onChange={(e) => setExpYear(onlyDigits(e.target.value, 4))}
          />
        </Field>
        <Field label="CVV" error={errors.cvv}>
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            value={cvv}
            onChange={(e) => setCvv(onlyDigits(e.target.value, 4))}
          />
        </Field>
      </div>
      <Field label="Parcelas">
        <select
          className={inputClass}
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
        >
          {installmentsList ? (
            installmentsList.map((i) => (
              <option key={i.installment} value={i.installment}>
                {i.installment}x de {brl(i.value)}
                {i.has_interest ? ' (com juros)' : ' sem juros'}
              </option>
            ))
          ) : (
            <option value={1}>1x de {brl(priceCents)}</option>
          )}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF do titular" error={errors.cpf}>
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
          />
        </Field>
        <Field label="Nascimento (AAAA-MM-DD)" error={errors.birth}>
          <input
            className={inputClass}
            placeholder="1990-01-31"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </Field>
      </div>
      {erro && <p className="text-center text-sm text-red-400">{erro}</p>}
      <button type="submit" disabled={processing} className="btn btn-primary disabled:opacity-60">
        {processing ? 'Processando…' : `Pagar ${brl(priceCents)}`}
      </button>
      <p className="text-center text-xs text-muted">
        Seus dados do cartão são enviados com segurança direto ao processador (Efí). Não passam pelo
        nosso servidor.
      </p>
    </form>
  )
}
