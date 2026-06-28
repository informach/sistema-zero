import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '../lib/api-fetch'
import {
  brandLabel,
  type CardBrand,
  cardLengthFor,
  cardPlaceholder,
  cvvLengthFor,
  isExpiryInFuture,
  maskCardNumber,
  normalizeBrand,
  onlyDigits,
} from '../lib/card-utils'
import { CardFormSchema, type CheckoutContactInput, pathErrors } from '../lib/checkout-schema'
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

// Fluxo oficial da Efí (payment-token-efi): isScriptBlocked() no load →
// verifyCardBrand() DURANTE a digitação → getInstallments() com a bandeira →
// getPaymentToken() no submit → cobrança one-step no backend (via gateway).

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

// O CPF do titular vem dos "Dados pessoais" compartilhados do checkout (prop
// `contact`) — o form do cartão não o coleta mais.
export default function CardCheckout({
  contact,
  priceCents,
  couponCode,
  successPath,
  installmentsMax,
}: {
  contact: CheckoutContactInput | null
  priceCents: number
  couponCode?: string
  /** Para onde ir quando o pagamento confirmar (próximo passo do funil; obrigatório). */
  successPath: string
  /** Máximo de parcelas da OFERTA (catálogo). Limita a lista da Efí; `null` = sem teto. */
  installmentsMax?: number | null
}) {
  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [installments, setInstallments] = useState(1)

  const [brand, setBrand] = useState<CardBrand | null>(null)
  const [installmentsList, setInstallmentsList] = useState<InstallmentOption[] | null>(null)
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  const [scriptBlocked, setScriptBlocked] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  // Corrida: só a consulta mais recente pode aplicar estado (o SDK da Efí não
  // expõe AbortController, então o controle é por id monotônico + cleanup do Effect).
  const reqIdRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // No mount: detecta adblock bloqueando o script de fingerprint da Efí
  // (passo recomendado pela doc — sem ele a tokenização falha no submit).
  useEffect(() => {
    if (!EFI_ACCOUNT) return
    let alive = true
    loadEfi()
      .then((EfiPay) => EfiPay.CreditCard.isScriptBlocked())
      .then((blocked) => {
        if (alive) setScriptBlocked(blocked)
      })
      .catch(() => {
        /* não confirmou bloqueio → segue habilitado */
      })
    return () => {
      alive = false
    }
  }, [])

  // Quando a bandeira muda, reclampa PAN e CVV (ex.: amex tem 15 dígitos e CVV 4).
  useEffect(() => {
    setNumber((prev) => maskCardNumber(prev, brand))
    setCvv((prev) => prev.slice(0, cvvLengthFor(brand)))
  }, [brand])

  // Cleanup no unmount: cancela o debounce e invalida respostas em voo.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      reqIdRef.current++
    },
    [],
  )

  // Digitação do número: mascara ciente da bandeira e agenda a detecção. A consulta
  // de parcelas fica em um Effect dependente de bandeira+valor, para reagir a cupom.
  function onNumberChange(raw: string) {
    const rawDigits = raw.replace(/\D/g, '')
    const prevDigits = number.replace(/\D/g, '')
    // Se o BIN (6 primeiros dígitos) mudou, a bandeira conhecida não vale mais —
    // mascara como desconhecida p/ não cortar dígitos de um cartão colado por cima.
    const sameBin = rawDigits.slice(0, 6) === prevDigits.slice(0, 6)
    const effectiveBrand = sameBin ? brand : null
    setNumber(maskCardNumber(raw, effectiveBrand))
    if (!sameBin) {
      setBrand(null)
      setInstallmentsList(null)
      setInstallments(1)
    }
    scheduleBrandDetection(onlyDigits(raw, cardLengthFor(effectiveBrand)))
  }

  function scheduleBrandDetection(digits: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (digits.length < 6 || !EFI_ACCOUNT) {
      reqIdRef.current++ // invalida consultas em voo
      setBrand(null)
      setInstallmentsList(null)
      setInstallments(1)
      return
    }
    debounceRef.current = setTimeout(() => void detectBrand(digits), 400)
  }

  async function detectBrand(digits: string) {
    const myId = ++reqIdRef.current
    try {
      const EfiPay = await loadEfi()
      const b = normalizeBrand(await EfiPay.CreditCard.setCardNumber(digits).verifyCardBrand())
      if (reqIdRef.current !== myId) return // resposta obsoleta — descarta
      setBrand(b)
      if (!b) {
        setInstallmentsList(null)
        setInstallments(1)
      }
    } catch (e) {
      // Falha na detecção não trava o pagamento; o submit re-verifica a bandeira.
      console.error('[checkout/cartão] detecção de bandeira falhou:', e)
      if (reqIdRef.current === myId) {
        setBrand(null)
        setInstallmentsList(null)
        setInstallments(1)
      }
    }
  }

  // Consulta/reconsulta parcelas quando a bandeira, o total (cupom) ou o teto da
  // oferta mudam. Evita listar parcelas calculadas com preço antigo.
  // ⚠️ A obsolescência aqui é SÓ o flag `ignore` do cleanup — NÃO o `reqIdRef`
  // (que é do `detectBrand`). O React roda o cleanup antes de re-executar o
  // Effect, então no máximo uma instância tem `ignore=false`. Compartilhar o
  // `reqIdRef` travava o spinner: um `detectBrand` da MESMA bandeira incrementa o
  // contador sem o Effect re-rodar, invalidando a consulta em voo sem nada que
  // restaurasse `loadingInstallments`.
  useEffect(() => {
    if (!brand || !EFI_ACCOUNT) {
      setInstallmentsList(null)
      setLoadingInstallments(false)
      setInstallments(1)
      return undefined
    }

    let ignore = false
    setLoadingInstallments(true)
    setInstallmentsList(null)

    ;(async () => {
      try {
        const EfiPay = await loadEfi()
        const res = await EfiPay.CreditCard.setAccount(EFI_ACCOUNT)
          .setEnvironment(EFI_ENV)
          .setBrand(brand)
          .setTotal(priceCents)
          .getInstallments()
        if (ignore) return
        const raw = 'installments' in res ? res.installments : null
        // Limita ao máximo de parcelas da OFERTA (catálogo). `installmentsMax` nulo = sem teto.
        const list =
          raw && installmentsMax ? raw.filter((i) => i.installment <= installmentsMax) : raw
        setInstallmentsList(list)
        // Mantém a parcela escolhida se ainda existir na lista nova; senão, 1x.
        setInstallments((cur) => (list?.some((i) => i.installment === cur) ? cur : 1))
      } catch (e) {
        // Falha na consulta de parcelas NÃO trava o pagamento — cai no fallback 1x.
        // Loga p/ diagnóstico (a Efí devolve {code, error, error_description} — sem dado sensível).
        console.error('[checkout/cartão] consulta de parcelas falhou:', e)
        if (!ignore) {
          setInstallmentsList(null)
          setInstallments(1)
        }
      } finally {
        if (!ignore) setLoadingInstallments(false)
      }
    })()

    return () => {
      ignore = true
    }
  }, [brand, priceCents, installmentsMax])

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
          window.location.href = successPath
        } else if (r.status === 'FAILED') {
          clearInterval(timer)
          setErro('Pagamento recusado. Verifique os dados ou use outro cartão.')
        }
      } catch {
        /* tenta no próximo ciclo */
      }
    }, 3500)
    return () => clearInterval(timer)
  }, [paymentId, successPath])

  async function submit() {
    setErro(null)
    // Os dados pessoais (e-mail/nome/CPF) são o gate do pagamento — sem eles o
    // botão fica desabilitado; o guard cobre estados intermediários.
    if (!contact) {
      setErro('Preencha seus dados pessoais acima para pagar com cartão.')
      return
    }
    const parsed = CardFormSchema.safeParse({
      number,
      holderName,
      expirationMonth: expMonth,
      expirationYear: expYear,
      cvv,
      installments,
    })
    if (!parsed.success) {
      setErrors(pathErrors(parsed.error))
      return
    }
    // Regras que o schema não conhece: validade no passado (depende de `now`).
    if (!isExpiryInFuture(parsed.data.expirationMonth, parsed.data.expirationYear, new Date())) {
      setErrors({ expirationMonth: 'Cartão vencido.' })
      return
    }
    setErrors({})

    if (!EFI_ACCOUNT) {
      setErro('Pagamento por cartão indisponível no momento. Use Pix.')
      return
    }
    if (scriptBlocked) {
      setErro('Desative o bloqueador de anúncios para pagar com cartão, ou use Pix.')
      return
    }

    setProcessing(true)
    try {
      const EfiPay = await loadEfi()
      const digits = parsed.data.number
      // SEMPRE re-verifica a bandeira dos dígitos atuais — o estado `brand`
      // pode estar velho se o número foi editado depois da última detecção.
      const cardBrand = normalizeBrand(
        await EfiPay.CreditCard.setCardNumber(digits).verifyCardBrand(),
      )
      if (!cardBrand) {
        setErro('Cartão não suportado. Confira o número.')
        return
      }
      // Coerência com a bandeira (o schema só valida formato genérico).
      if (digits.length !== cardLengthFor(cardBrand)) {
        setErrors({
          number: `O número deste cartão deve ter ${cardLengthFor(cardBrand)} dígitos.`,
        })
        return
      }
      if (parsed.data.cvv.length !== cvvLengthFor(cardBrand)) {
        setErrors({ cvv: `O CVV deste cartão deve ter ${cvvLengthFor(cardBrand)} dígitos.` })
        return
      }
      const cpfDigits = contact.cpf.replace(/\D/g, '')
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
        contact,
      }
      const r = await apiPost<ChargeResp>('/api/checkout/card', body)
      if (r.status === 'PAID') {
        window.location.href = successPath
        return
      }
      if (r.status === 'FAILED') {
        setErro('Pagamento recusado. Verifique os dados ou use outro cartão.')
        return
      }
      setPaymentId(r.paymentId) // PENDING → poll curto
    } catch (e) {
      // Loga o erro real p/ diagnóstico (tokenização da Efí lança {code, error,
      // error_description}; o apiPost lança em não-2xx) — sem dado sensível.
      console.error('[checkout/cartão] pagamento falhou:', e)
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
      {scriptBlocked && (
        <p className="rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          Detectamos um bloqueador de anúncios (adblock). Ele impede a verificação de segurança da
          operadora do cartão — desative-o para pagar com cartão, ou pague com Pix.
        </p>
      )}
      <Field label="Número do cartão" error={errors.number}>
        <input
          className={inputClass}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder={cardPlaceholder(brand)}
          maxLength={brand === 'amex' ? 17 : 19}
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
        />
        {brand && (
          <span className="mt-1 block text-xs text-muted">Bandeira: {brandLabel(brand)}</span>
        )}
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
            maxLength={cvvLengthFor(brand)}
            value={cvv}
            onChange={(e) => setCvv(onlyDigits(e.target.value, cvvLengthFor(brand)))}
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
        {loadingInstallments && (
          <span className="mt-1 block text-xs text-muted">Consultando parcelas…</span>
        )}
      </Field>
      {erro && <p className="text-center text-sm text-red-400">{erro}</p>}
      <button
        type="submit"
        disabled={processing || scriptBlocked || !contact}
        className="btn btn-primary disabled:opacity-60"
      >
        {processing ? 'Processando…' : `Pagar ${brl(priceCents)}`}
      </button>
      {!contact && (
        <p className="text-center text-xs text-muted">
          Preencha seus dados pessoais acima para pagar com cartão.
        </p>
      )}
      <p className="text-center text-xs text-muted">
        Seus dados do cartão são enviados com segurança direto ao processador (Efí). Não passam pelo
        nosso servidor.
      </p>
    </form>
  )
}
