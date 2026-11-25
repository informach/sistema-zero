'use client'
import type { CommerceCatalogOffer, CommerceContact } from '@sistemazero/core/commerce'
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
import { loadEfi, tokenizeEfiCard } from '@sistemazero/ui/efi-card-token'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Check, CreditCard, Lock, ShieldCheck, Users } from 'lucide-react'
import { type FormEvent, type ReactNode, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import type { CommerceAddress, PurchaseView } from '../../lib/commerce'
import {
  accessText,
  annualSavingsCents,
  guaranteeText,
  intervalText,
  isRecurring,
  money,
  payButtonText,
  perMonthCents,
  pixAllowed,
  planName,
  planShortName,
  profilesText,
  renewalText,
} from './commerce-copy'

/** O cupom cotado pelo catálogo (via funil). O valor final volta como `expectedPriceCents`. */
export interface CouponQuote {
  couponCode: string
  listPriceCents: number
  discountCents: number
  finalPriceCents: number
}

const contactLabels: Record<'nome' | 'cpf' | 'telefone', string> = {
  nome: 'Nome completo',
  cpf: 'Seu CPF',
  telefone: 'Seu telefone',
}
const addressLabels: Record<keyof CommerceAddress, string> = {
  street: 'Rua',
  number: 'Número',
  neighborhood: 'Bairro',
  zipcode: 'CEP',
  city: 'Cidade',
  state: 'UF',
  complement: 'Complemento',
}
const emptyAddress: CommerceAddress = {
  street: '',
  number: '',
  neighborhood: '',
  zipcode: '',
  city: '',
  state: '',
}
const maskCpf = (cpf: string) => {
  const digits = onlyDigits(cpf, 11)
  return digits.length === 11 ? `CPF •••.•••.•••-${digits.slice(-2)}` : null
}
const maskPhone = (phone: string) => {
  const digits = onlyDigits(phone, 13).replace(/^55(?=\d{10,11}$)/, '')
  if (digits.length < 10) return null
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}••••-${digits.slice(-4)}`
}
/** "MM/AAAA" (ou "MM/AA") do campo único de validade, como no Canvas. */
function readExpiry(value: string): { month: string; year: string } {
  const digits = onlyDigits(value, 6)
  const month = digits.slice(0, 2)
  const rest = digits.slice(2)
  return { month, year: rest.length === 2 ? `20${rest}` : rest }
}

/** O título pequeno de cada parte do formulário (Canvas: `.st`). */
export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p
      id={id}
      className="m-0 font-extrabold text-muted-foreground text-xs uppercase tracking-[0.08em]"
    >
      {children}
    </p>
  )
}

/**
 * O resumo ao lado do formulário (Canvas: "Resumo" na assinatura, "Você está comprando" no curso).
 * Preço, garantia, prazo e perfis vêm todos da oferta.
 */
export function OrderSummary({
  offer,
  method,
  coupon,
  imageUrl,
}: {
  offer: CommerceCatalogOffer
  method: 'pix' | 'card'
  coupon?: CouponQuote | null
  imageUrl?: string
}) {
  const recurring = isRecurring(offer)
  const total = coupon?.finalPriceCents ?? offer.priceCents
  const access = accessText(offer)
  const guarantee = guaranteeText(offer)
  const profiles = profilesText(offer)
  return (
    <aside
      aria-label="Resumo do pedido"
      className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5 border-border bg-muted/40 p-6 max-[720px]:border-t min-[721px]:border-l"
    >
      <SectionTitle>{recurring ? 'Resumo' : 'Você está comprando'}</SectionTitle>
      {recurring ? (
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
          ) : null}
          <span className="flex min-w-0 flex-col">
            <strong>{offer.product.name}</strong>
            <span className="text-muted-foreground text-sm">{planName(offer)}</span>
          </span>
        </div>
      ) : (
        <>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-36 w-full rounded-2xl object-cover" />
          ) : null}
          <div className="flex flex-col gap-1">
            <strong className="sz-display text-xl leading-tight">{offer.name}</strong>
            {access ? <span className="text-muted-foreground text-sm">{access}</span> : null}
          </div>
        </>
      )}
      <div className="flex flex-col gap-2 border-border border-t pt-3.5">
        <div className="flex justify-between gap-3 text-[15px]">
          <span className="text-muted-foreground">{recurring ? planName(offer) : 'Curso'}</span>
          <span>
            {money(offer.priceCents)}
            {recurring ? ` ${intervalText(offer)}` : ''}
          </span>
        </div>
        {!recurring ? (
          <div className="flex justify-between gap-3 text-[15px]">
            <span className="text-muted-foreground">Cupom</span>
            {coupon ? (
              <span>
                {coupon.couponCode} · − {money(coupon.discountCents)}
              </span>
            ) : (
              <span className="text-muted-foreground">·</span>
            )}
          </div>
        ) : null}
        <div className="flex justify-between gap-3 border-border border-t pt-2.5 font-extrabold text-lg">
          <span>{recurring ? 'Total hoje' : 'Total'}</span>
          <span>{money(total)}</span>
        </div>
        <span className="text-muted-foreground text-[13px]">{renewalText(offer, method)}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm leading-snug">
        {guarantee ? (
          <li className="flex gap-2">
            <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            {guarantee}
          </li>
        ) : null}
        <li className="flex gap-2">
          <Lock className="size-5 shrink-0 text-success" aria-hidden="true" />
          Pagamento protegido. Os dados do cartão não ficam com a gente.
        </li>
        {profiles ? (
          <li className="flex gap-2">
            <Users className="size-5 shrink-0 text-success" aria-hidden="true" />
            {profiles}
          </li>
        ) : null}
      </ul>
    </aside>
  )
}

function ChoiceButton({
  checked,
  disabled,
  onClick,
  children,
  className,
}: {
  checked: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-card font-extrabold text-[15px] text-foreground shadow-[inset_0_0_0_2px_var(--color-border)] transition-shadow disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'bg-primary/10 text-primary shadow-[inset_0_0_0_3px_var(--color-primary)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function PurchaseForm({
  view,
  busy,
  onPay,
  onSwitchPlan,
  onQuote,
  imageUrl,
}: {
  view: PurchaseView
  busy: boolean
  onPay: (data: Record<string, unknown>) => Promise<void>
  /** Trocar para o outro plano do mesmo produto (mensal ou anual). */
  onSwitchPlan?: (offerSlug: string) => Promise<void>
  /** Cotar um cupom no catálogo; lança com a frase do servidor quando não vale. */
  onQuote?: (couponCode: string) => Promise<CouponQuote>
  imageUrl?: string
}) {
  const id = useId()
  const offer = view.offer
  const recurring = isRecurring(offer)
  const canPix = pixAllowed(offer)
  const [method, setMethod] = useState<'pix' | 'card'>(canPix ? 'pix' : 'card')
  const [contact, setContact] = useState(view.contact)
  const [birth, setBirth] = useState(view.birth)
  const [address, setAddress] = useState(view.address ?? emptyAddress)
  const [edit, setEdit] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [installments, setInstallments] = useState('1')
  const [installmentOptions, setInstallmentOptions] = useState<
    { installment: number; value: number; has_interest: boolean }[]
  >([])
  const [quoting, setQuoting] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [message, setMessage] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<CouponQuote | null>(null)
  const [couponError, setCouponError] = useState('')
  const [applying, setApplying] = useState(false)
  const submitting = useRef(false)
  const total = coupon?.finalPriceCents ?? offer.priceCents
  const plans = [...(view.plans ?? [])].sort(
    (a, b) => (b.billingIntervalMonths ?? 0) - (a.billingIntervalMonths ?? 0),
  )
  const savings = annualSavingsCents(plans)
  const allowsCoupon = !recurring && offer.content?.allowsCoupon === true && Boolean(onQuote)
  const installmentsMax = offer.installmentsMax ?? 1
  const missing = (key: keyof typeof contactLabels) =>
    key === 'cpf'
      ? !isValidCpf(view.contact.cpf)
      : key === 'telefone'
        ? onlyDigits(view.contact.telefone, 20).length < 10
        : view.contact[key].trim().length < 2
  const missingKeys = (['nome', 'cpf', 'telefone'] as const).filter(missing)
  const shownKeys = edit ? (['nome', 'cpf', 'telefone'] as const) : missingKeys
  const needsSubscriptionData = recurring && method === 'card'
  const missingAddress = (Object.keys(addressLabels) as (keyof CommerceAddress)[]).filter(
    (key) => key !== 'complement' && !view.address?.[key],
  )
  const subscriptionFields = edit
    ? (Object.keys(addressLabels) as (keyof CommerceAddress)[])
    : missingAddress
  const identityLine = [
    view.contact.email,
    recurring ? maskPhone(view.contact.telefone) : maskCpf(view.contact.cpf),
  ]
    .filter(Boolean)
    .join(' · ')
  async function quoteInstallments() {
    if (recurring || installmentsMax <= 1 || quoting || tokenizing || busy) return
    const config = view.cardConfig
    const number = onlyDigits(card.number, 19)
    if (!config?.available || !config.accountIdentifier || number.length < 13) return
    setQuoting(true)
    try {
      const sdk = await loadEfi()
      const brand = normalizeBrand(await sdk.CreditCard.setCardNumber(number).verifyCardBrand())
      if (!brand) return
      const result = await sdk.CreditCard.setAccount(config.accountIdentifier)
        .setEnvironment(config.environment)
        .setBrand(brand)
        .setTotal(total)
        .getInstallments()
      if (!('installments' in result)) return
      setInstallmentOptions(
        result.installments.filter(
          (p) => p.installment >= 1 && p.installment <= installmentsMax && Number.isFinite(p.value),
        ),
      )
    } catch {
      // Sem a consulta do parcelamento, a compra segue em uma vez.
      setInstallmentOptions([])
    } finally {
      setQuoting(false)
    }
  }
  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!onQuote || !code || applying || busy) return
    setApplying(true)
    setCouponError('')
    try {
      const quoted = await onQuote(code)
      setCoupon(quoted)
      setInstallmentOptions([])
      setInstallments('1')
    } catch (error) {
      setCoupon(null)
      setCouponError(
        typeof error === 'object' &&
          error &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Não foi possível conferir o cupom agora. Tente novamente.',
      )
    } finally {
      setApplying(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current || busy || quoting || applying || !accepted) return
    submitting.current = true
    setMessage('')
    setTokenizing(true)
    try {
      const data: Record<string, unknown> = {
        contact,
        method,
        acceptedTerms: accepted,
        termsVersion: view.termsVersion,
        expectedPriceCents: total,
        ...(coupon ? { couponCode: coupon.couponCode } : {}),
      }
      if (method === 'card') {
        const config = view.cardConfig
        if (!config?.available || !config.accountIdentifier)
          throw new Error(
            'O pagamento por cartão está indisponível. Tente novamente em alguns instantes.',
          )
        const number = onlyDigits(card.number, 19)
        const expiry = readExpiry(card.expiry)
        const sdk = await loadEfi()
        const brand = normalizeBrand(await sdk.CreditCard.setCardNumber(number).verifyCardBrand())
        if (
          !brand ||
          !luhnCheck(number) ||
          number.length !== cardLengthFor(brand) ||
          card.cvv.length !== cvvLengthFor(brand) ||
          !isExpiryInFuture(expiry.month, expiry.year, new Date())
        )
          throw new Error('Confira os dados e a validade do cartão.')
        const token = await tokenizeEfiCard(
          { accountIdentifier: config.accountIdentifier, environment: config.environment },
          {
            brand,
            number,
            cvv: card.cvv,
            expirationMonth: expiry.month,
            expirationYear: expiry.year,
            holderName: card.name.trim(),
            holderDocument: onlyDigits(contact.cpf, 11),
            reuse: recurring,
          },
        )
        Object.assign(data, {
          token: token.payment_token,
          brand,
          last4: number.slice(-4),
          installments: Number(installments),
        })
        setCard({ number: '', name: '', expiry: '', cvv: '' })
        if (recurring) Object.assign(data, { birth, address })
      }
      await onPay(data)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir. Confira o andamento antes de tentar novamente.',
      )
    } finally {
      submitting.current = false
      setTokenizing(false)
    }
  }
  const working = busy || tokenizing || quoting || applying
  return (
    <div className="flex flex-wrap">
      <form
        onSubmit={submit}
        className="flex min-w-0 flex-[999_1_440px] flex-col gap-[22px] px-7 py-6 max-[480px]:px-4"
      >
        {recurring && plans.length > 1 ? (
          <div className="flex flex-col gap-2.5">
            <SectionTitle id={`${id}-plano`}>Escolha o plano</SectionTitle>
            <div
              role="radiogroup"
              aria-labelledby={`${id}-plano`}
              className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1"
            >
              {plans.map((plan) => {
                const annual = plan.billingIntervalMonths === 12
                return (
                  <ChoiceButton
                    key={plan.slug}
                    checked={plan.slug === offer.slug}
                    disabled={working || !onSwitchPlan}
                    onClick={() => {
                      if (plan.slug !== offer.slug) void onSwitchPlan?.(plan.slug)
                    }}
                    className="flex-col items-start justify-start gap-1.5 p-4 text-left font-normal"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <strong className="text-base">{planShortName(plan)}</strong>
                      {annual && savings ? (
                        <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-extrabold text-success text-xs">
                          Economize {money(savings)}
                        </span>
                      ) : null}
                    </span>
                    <span>
                      <strong className="sz-display text-[26px]">{money(plan.priceCents)}</strong>
                      <span className="text-muted-foreground"> {intervalText(plan)}</span>
                    </span>
                    <span className="text-muted-foreground text-[13px]">
                      {annual
                        ? `${money(perMonthCents(plan))} por mês · Pix à vista ou cartão`
                        : 'Renovação automática no cartão'}
                    </span>
                  </ChoiceButton>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <SectionTitle>Seus dados</SectionTitle>
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-muted px-4 py-3.5">
            <span className="flex min-w-0 items-center gap-3">
              {missingKeys.length === 0 ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="size-[18px]" strokeWidth={2.6} aria-hidden="true" />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col">
                <strong>{view.contact.nome || 'Sua conta'}</strong>
                <span className="break-all text-muted-foreground text-sm">{identityLine}</span>
              </span>
            </span>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-link text-sm underline-offset-2 hover:underline"
              aria-expanded={edit}
              onClick={() => setEdit(!edit)}
            >
              {edit ? 'Pronto' : 'Corrigir'}
            </button>
          </div>
          {shownKeys.length === 1 && shownKeys[0] === 'cpf' && !edit ? (
            <Field
              label="Falta só o seu CPF"
              htmlFor={`${id}-cpf`}
              hint="Para emitir a nota fiscal. Fica salvo para as próximas compras."
            >
              <Input
                id={`${id}-cpf`}
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={contact.cpf}
                onChange={(e) => setContact((c) => ({ ...c, cpf: e.target.value }))}
              />
            </Field>
          ) : shownKeys.length ? (
            <div className="flex flex-col gap-2.5">
              {!edit ? (
                <span className="text-muted-foreground text-[13px]">
                  Faltam alguns dados para a cobrança. Ficam salvos para as próximas compras.
                </span>
              ) : null}
              {shownKeys.map((key) => (
                <Field key={key} label={contactLabels[key]} htmlFor={`${id}-${key}`}>
                  <Input
                    id={`${id}-${key}`}
                    required
                    autoComplete={key === 'nome' ? 'name' : key === 'telefone' ? 'tel' : 'off'}
                    inputMode={key === 'nome' ? 'text' : 'numeric'}
                    value={contact[key]}
                    onChange={(e) =>
                      setContact((c: CommerceContact) => ({ ...c, [key]: e.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-[13px]">
              Usamos os dados da sua conta. Não precisa preencher nada de novo.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <SectionTitle id={`${id}-forma`}>Como pagar</SectionTitle>
          <div
            role="radiogroup"
            aria-labelledby={`${id}-forma`}
            className="grid grid-cols-2 gap-2.5"
          >
            <ChoiceButton
              checked={method === 'pix'}
              disabled={!canPix || working}
              onClick={() => setMethod('pix')}
              className="h-[52px]"
            >
              <PixIcon />
              Pix
            </ChoiceButton>
            <ChoiceButton
              checked={method === 'card'}
              disabled={working}
              onClick={() => setMethod('card')}
              className="h-[52px]"
            >
              <CreditCard className="size-5" aria-hidden="true" />
              Cartão de crédito
            </ChoiceButton>
          </div>
          {!canPix ? (
            <p className="m-0 text-muted-foreground text-[13px]">
              No plano mensal o pagamento é só no cartão, porque a renovação é automática.
            </p>
          ) : null}
          {method === 'pix' ? (
            <p className="m-0 rounded-2xl border border-border border-dashed px-3.5 py-3 text-muted-foreground text-sm">
              {recurring
                ? 'O QR Code aparece no próximo passo. No anual pelo Pix, você paga o ano à vista, sem renovação automática.'
                : 'O QR Code aparece no próximo passo. O curso abre assim que o Pix cair, em poucos segundos.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <Field label="Número do cartão" htmlFor={`${id}-card`}>
                <Input
                  id={`${id}-card`}
                  autoComplete="cc-number"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  required
                  maxLength={23}
                  onBlur={quoteInstallments}
                  onChange={(e) => {
                    setCard((c) => ({ ...c, number: e.target.value }))
                    setInstallmentOptions([])
                    setInstallments('1')
                  }}
                />
              </Field>
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-2.5 max-[480px]:grid-cols-2">
                <Field
                  label="Nome no cartão"
                  htmlFor={`${id}-holder`}
                  className="max-[480px]:col-span-2"
                >
                  <Input
                    id={`${id}-holder`}
                    autoComplete="cc-name"
                    value={card.name}
                    required
                    onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                  />
                </Field>
                <Field label="Validade" htmlFor={`${id}-expiry`}>
                  <Input
                    id={`${id}-expiry`}
                    autoComplete="cc-exp"
                    placeholder="MM/AAAA"
                    inputMode="numeric"
                    maxLength={7}
                    value={card.expiry}
                    required
                    onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                  />
                </Field>
                <Field label="CVV" htmlFor={`${id}-cvv`}>
                  <Input
                    id={`${id}-cvv`}
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={4}
                    type="password"
                    value={card.cvv}
                    required
                    onChange={(e) => setCard((c) => ({ ...c, cvv: onlyDigits(e.target.value, 4) }))}
                  />
                </Field>
              </div>
              {!recurring && installmentsMax > 1 ? (
                <Field
                  label="Parcelas"
                  htmlFor={`${id}-installments`}
                  hint={
                    installmentOptions.length
                      ? undefined
                      : quoting
                        ? 'Consultando as parcelas.'
                        : 'As outras parcelas aparecem depois do número do cartão.'
                  }
                >
                  <Select
                    id={`${id}-installments`}
                    value={installments}
                    disabled={quoting}
                    onChange={(e) => setInstallments(e.target.value)}
                  >
                    {installmentOptions.length ? (
                      installmentOptions.map((p) => (
                        <option key={p.installment} value={p.installment}>
                          {p.installment}x de {money(p.value)}
                          {p.has_interest ? ' com juros' : ' sem juros'}
                        </option>
                      ))
                    ) : (
                      <option value="1">1x de {money(total)} sem juros</option>
                    )}
                  </Select>
                </Field>
              ) : null}
              {recurring ? (
                <p className="m-0 text-muted-foreground text-[13px]">
                  O cartão fica guardado com segurança para as renovações. Você pode trocar{' '}
                  {offer.product.audience === 'kids' ? 'em Conta' : 'em Compras'}.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {needsSubscriptionData && (edit || !view.birth || subscriptionFields.length) ? (
          <fieldset className="m-0 grid grid-cols-2 gap-2.5 border-0 p-0">
            <legend className="mb-2.5">
              <SectionTitle>Para a assinatura no cartão</SectionTitle>
            </legend>
            {edit || !view.birth ? (
              <Field label="Seu nascimento" htmlFor={`${id}-birth`} className="col-span-2">
                <Input
                  id={`${id}-birth`}
                  type="date"
                  value={birth}
                  required
                  onChange={(e) => setBirth(e.target.value)}
                />
              </Field>
            ) : null}
            {subscriptionFields.map((key) => (
              <Field
                key={key}
                label={addressLabels[key]}
                htmlFor={`${id}-${key}`}
                className={key === 'street' ? 'col-span-2' : ''}
              >
                <Input
                  id={`${id}-${key}`}
                  value={address[key] ?? ''}
                  required={key !== 'complement'}
                  maxLength={key === 'state' ? 2 : 200}
                  onChange={(e) =>
                    setAddress((a) => ({
                      ...a,
                      [key]: key === 'state' ? e.target.value.toUpperCase() : e.target.value,
                    }))
                  }
                />
              </Field>
            ))}
          </fieldset>
        ) : null}

        {allowsCoupon ? (
          <details className="border-border border-t pt-3.5" open={Boolean(coupon)}>
            <summary className="cursor-pointer font-bold text-[15px]">Tem um cupom?</summary>
            {coupon ? (
              <div
                className="mt-2.5 flex flex-wrap items-center justify-between gap-2"
                role="status"
              >
                <span className="text-sm">
                  Cupom <strong>{coupon.couponCode}</strong> aplicado: −{' '}
                  {money(coupon.discountCents)}
                </span>
                <Button
                  variant="link"
                  className="px-0"
                  disabled={working}
                  onClick={() => {
                    setCoupon(null)
                    setCouponInput('')
                    setInstallmentOptions([])
                    setInstallments('1')
                  }}
                >
                  Tirar o cupom
                </Button>
              </div>
            ) : (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <Input
                    aria-label="Código do cupom"
                    placeholder="Código do cupom"
                    className="uppercase"
                    value={couponInput}
                    maxLength={60}
                    aria-describedby={couponError ? `${id}-coupon-error` : undefined}
                    onChange={(e) => {
                      setCouponInput(e.target.value)
                      setCouponError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void applyCoupon()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-12 shrink-0 rounded-full px-[18px] font-extrabold"
                    disabled={working || !couponInput.trim()}
                    onClick={applyCoupon}
                  >
                    {applying ? 'Conferindo…' : 'Aplicar'}
                  </Button>
                </div>
                {couponError ? (
                  <p
                    id={`${id}-coupon-error`}
                    role="alert"
                    className="m-0 text-destructive text-sm"
                  >
                    {couponError}
                  </p>
                ) : null}
              </div>
            )}
          </details>
        ) : null}

        <label className="flex items-start gap-2.5 text-sm leading-snug">
          <input
            type="checkbox"
            className="m-0 size-5 shrink-0 accent-primary"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            Concordo com as condições desta {recurring ? 'assinatura' : 'compra'} e com os{' '}
            <a href={view.termsUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a
              href={view.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Política de Privacidade
            </a>
            .
          </span>
        </label>
        {message ? (
          <p role="alert" className="m-0 text-destructive text-sm">
            {message}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={working || !accepted}
          className="h-[52px] w-full rounded-full font-extrabold text-base"
        >
          {busy || tokenizing ? 'Processando…' : payButtonText(offer, method, total)}
        </Button>
      </form>
      <OrderSummary offer={offer} method={method} coupon={coupon} imageUrl={imageUrl} />
    </div>
  )
}

function PixIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2.5 4.2 4.2-4.2 4.2-4.2-4.2zM12 13.1l4.2 4.2-4.2 4.2-4.2-4.2zM2.5 12l4.2-4.2 4.2 4.2-4.2 4.2zM13.1 12l4.2-4.2 4.2 4.2-4.2 4.2z" />
    </svg>
  )
}
