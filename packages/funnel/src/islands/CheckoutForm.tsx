import { formatTelefone } from '@sistemazero/ui/phone'
import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '../lib/api-fetch'
import { maskCpf } from '../lib/card-utils'
import { type CheckoutContactInput, CheckoutContactSchema } from '../lib/checkout-schema'
import { fieldErrors } from '../lib/contact-schema'
import type { CouponPresentation } from '../lib/coupon-query'
import { formatBRLFromCents2 } from '../lib/money'
import CardCheckout from './CardCheckout'
import { Field, inputClass } from './checkout-fields'
import PixCheckout from './PixCheckout'

type Method = 'pix' | 'cartao'

/** Contato inicial (lead + query params do pré-checkout) p/ pré-popular o form. */
export interface InitialContact {
  nome: string
  email: string
  cpf: string
  /** Telefone pré-preenchido do lead/pré-checkout (editável; obrigatório no envio). */
  telefone: string
}

/** Oferta IRMÃ do alternador mensal↔anual (dados vindos do catálogo, via página). */
export interface AltOfferInfo {
  slug: string
  label: string | null
  priceCents: number
  billingIntervalMonths: number | null
}

/** Sufixo de preço por periodicidade ("/mês", "/ano"; vazio = pagamento único). */
function intervalSuffix(interval: number | null): string {
  if (interval === 1) return '/mês'
  if (interval === 12) return '/ano'
  return ''
}

interface QuoteResp {
  ok: boolean
  priceCents: number
  discountCents: number
  finalPriceCents: number
  couponCode: string | null
  message?: string
}

/**
 * Checkout estilo Hotmart (tema escuro nosso): "Dados pessoais" (e-mail +
 * confirmação + nome + CPF, pré-populados do lead) e formas de pagamento como
 * radio-cards (Pix default + cartão). NADA é cobrado sem os dados pessoais
 * completos: o Pix só gera o QR por clique (botão desabilitado até validar) e o
 * cartão exige o mesmo contato — ambos enviam `contact` no corpo, o servidor
 * atualiza o lead e repassa à Efí (devedor/titular).
 */
export default function CheckoutForm({
  funnel,
  initialContact,
  priceCents,
  allowCoupon = false,
  successPath,
  isKids = false,
  installmentsMax = null,
  pricingMode = 'one_time',
  billingIntervalMonths = null,
  offerSlug,
  altOffer = null,
  initialChoice = 'main',
  initialCoupon = { status: 'none' },
  accessLabel = null,
  estimatedAccessEnd = null,
  guaranteeDays = 7,
  termsHref,
  privacyHref,
}: {
  /** Chave do funil (`audience/produto`) — garante o lead de quem cai DIRETO no checkout. */
  funnel: string
  initialContact: InitialContact
  priceCents: number
  allowCoupon?: boolean
  /** Próximo passo após o pagamento confirmar (oferta principal → /upsell ou /obrigado).
   *  Obrigatório: a página injeta o caminho POR FUNIL (sem default — evita mandar o
   *  comprador de outro funil para o /obrigado do funil padrão). */
  successPath: string
  /** Funil kids → os dados são do RESPONSÁVEL (quem compra); o título deixa claro. */
  isKids?: boolean
  /** Máximo de parcelas da OFERTA (catálogo) — limita o seletor do cartão. */
  installmentsMax?: number | null
  /** `one_time` (avulso, como sempre) ou `subscription` (recorrente). */
  pricingMode?: string
  /** Periodicidade da assinatura da oferta PRINCIPAL (1 = mensal, 12 = anual). */
  billingIntervalMonths?: number | null
  /** Slug da oferta PRINCIPAL (enviado quando o alternador escolhe explicitamente). */
  offerSlug?: string
  /** Oferta IRMÃ do alternador (mensal ↔ anual); null = sem alternador. */
  altOffer?: AltOfferInfo | null
  /** Plano pré-selecionado no alternador (`?oferta=` do link /renovar). */
  initialChoice?: 'main' | 'alt'
  /** Estado vindo da cotação SSR do cupom presente na URL. */
  initialCoupon?: CouponPresentation
  /** Duração publicada pela oferta (`30 dias`, por exemplo). */
  accessLabel?: string | null
  /** Estimativa se o pagamento for aprovado agora; a confirmação usa a data real. */
  estimatedAccessEnd?: string | null
  guaranteeDays?: number
  termsHref: string
  privacyHref: string
}) {
  // Garante o lead da sessão para quem cai DIRETO no checkout (sem passar pela
  // oferta/pré-checkout): a cobrança exige lead no cookie. Idempotente: quem já
  // tem lead válido só o reaproveita; bot sem JS não insere linha no banco.
  useEffect(() => {
    apiPost('/api/leads', { funnel }).catch(() => {})
  }, [funnel])

  const [nome, setNome] = useState(initialContact.nome)
  const [email, setEmail] = useState(initialContact.email)
  // Confirmação pré-populada quando o e-mail veio do pré-checkout (acabou de ser
  // digitado lá); quem editar o e-mail aqui precisa confirmar de novo.
  const [emailConfirm, setEmailConfirm] = useState(initialContact.email)
  const [cpf, setCpf] = useState(maskCpf(initialContact.cpf))
  // Telefone: fonte da verdade do checkout (a Efí exige na assinatura). Pré-preenche
  // do lead/pré-checkout, mas é editável e SEMPRE enviado no `contact`.
  const [telefone, setTelefone] = useState(formatTelefone(initialContact.telefone))
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Alternador mensal↔anual: qual das duas ofertas irmãs está escolhida.
  const [choice, setChoice] = useState<'main' | 'alt'>(altOffer ? initialChoice : 'main')
  const chosen =
    choice === 'alt' && altOffer
      ? {
          slug: altOffer.slug,
          priceCents: altOffer.priceCents,
          interval: altOffer.billingIntervalMonths,
          isSubscription: true,
        }
      : {
          slug: offerSlug,
          priceCents,
          interval: billingIntervalMonths,
          isSubscription: pricingMode === 'subscription',
        }
  // Métodos por modo: avulso = Pix + cartão; assinatura mensal = SÓ cartão
  // recorrente; assinatura ANUAL = cartão recorrente E Pix à vista (12 meses).
  const pixAvailable = !chosen.isSubscription || chosen.interval === 12
  const couponAllowed = allowCoupon && !chosen.isSubscription

  const [method, setMethod] = useState<Method>(pixAvailable ? 'pix' : 'cartao')
  // Trocar p/ uma escolha sem Pix (mensal) precisa mover a seleção p/ o cartão.
  const effectiveMethod: Method = pixAvailable ? method : 'cartao'

  const initialCouponCode = initialCoupon.status === 'none' ? '' : initialCoupon.code
  const initialAppliedCode = initialCoupon.status === 'valid' ? initialCoupon.code : null
  const initialDiscount = initialCoupon.status === 'valid' ? initialCoupon.discountCents : 0
  const initialCouponMessage =
    initialCoupon.status === 'valid'
      ? `Cupom ${initialCoupon.code} aplicado. Você economizou ${formatBRLFromCents2(initialCoupon.discountCents)}.`
      : initialCoupon.status === 'invalid' || initialCoupon.status === 'error'
        ? initialCoupon.message
        : null

  const [couponInput, setCouponInput] = useState(initialCouponCode)
  const [appliedCode, setAppliedCode] = useState<string | null>(initialAppliedCode)
  const [discountCents, setDiscountCents] = useState(initialDiscount)
  const [couponMsg, setCouponMsg] = useState<string | null>(initialCouponMessage)
  const [couponDecisionRequired, setCouponDecisionRequired] = useState(
    initialCoupon.status === 'invalid' || initialCoupon.status === 'error',
  )
  const [applying, setApplying] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const finalCents = Math.max(0, chosen.priceCents - (couponAllowed ? discountCents : 0))
  const couponCode = couponAllowed ? (appliedCode ?? undefined) : undefined

  // Validação contínua: os botões de pagar só habilitam com tudo válido; os
  // erros por campo só aparecem depois que o campo foi tocado (blur).
  const parsed = useMemo(
    () => CheckoutContactSchema.safeParse({ nome, email, cpf, telefone }),
    [nome, email, cpf, telefone],
  )
  const schemaErrors = useMemo(() => (parsed.success ? {} : fieldErrors(parsed.error)), [parsed])
  const emailsMatch = email.trim().toLowerCase() === emailConfirm.trim().toLowerCase()
  const confirmError = emailConfirm.trim()
    ? emailsMatch
      ? undefined
      : 'Os e-mails não coincidem.'
    : 'Confirme seu e-mail.'
  const contactValid = parsed.success && emailsMatch && emailConfirm.trim() !== ''
  const contact: CheckoutContactInput | null = contactValid && parsed.success ? parsed.data : null

  function touch(field: string) {
    setTouched((p) => ({ ...p, [field]: true }))
  }
  function errorFor(field: 'nome' | 'email' | 'cpf' | 'telefone'): string | undefined {
    return touched[field] ? schemaErrors[field] : undefined
  }

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setApplying(true)
    setCouponMsg(null)
    try {
      const r = await apiPost<QuoteResp>('/api/checkout/quote', { couponCode: code })
      if (r.ok && r.couponCode) {
        setAppliedCode(r.couponCode)
        setDiscountCents(r.discountCents)
        setCouponDecisionRequired(false)
        setCouponMsg(
          `Cupom ${r.couponCode} aplicado. Você economizou ${formatBRLFromCents2(r.discountCents)}.`,
        )
        syncCouponInUrl(r.couponCode)
      } else {
        setAppliedCode(null)
        setDiscountCents(0)
        setCouponDecisionRequired(true)
        setCouponMsg(r.message ?? 'Não encontramos esse cupom para esta oferta. Confira o código.')
      }
    } catch {
      setAppliedCode(null)
      setDiscountCents(0)
      setCouponDecisionRequired(true)
      setCouponMsg('Não foi possível validar o cupom agora. Nenhuma cobrança foi feita.')
    } finally {
      setApplying(false)
    }
  }

  function removeCoupon() {
    setAppliedCode(null)
    setDiscountCents(0)
    setCouponInput('')
    setCouponMsg(null)
    setCouponDecisionRequired(false)
    syncCouponInUrl(null)
  }

  function continueWithoutCoupon() {
    removeCoupon()
  }

  function syncCouponInUrl(code: string | null) {
    const url = new URL(window.location.href)
    url.searchParams.delete('coupon')
    if (code) url.searchParams.set('cupom', code)
    else url.searchParams.delete('cupom')
    window.history.replaceState({}, '', url)
  }

  const couponBlocksPayment = couponAllowed && couponDecisionRequired
  const purchaseGate = couponBlocksPayment
    ? 'Resolva o cupom acima antes de escolher o pagamento.'
    : !termsAccepted
      ? 'Confirme os Termos e a Política de Privacidade para liberar o pagamento.'
      : null

  return (
    <div className="flex flex-col gap-7">
      {/* Alternador mensal ↔ anual (ofertas irmãs do catálogo). */}
      {altOffer && (
        <fieldset>
          <legend className="text-lg font-bold text-ink">Escolha o seu plano</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PlanCard
              id="plano-principal"
              checked={choice === 'main'}
              onSelect={() => setChoice('main')}
              title={billingIntervalMonths === 12 ? 'Anual' : 'Mensal'}
              price={`${formatBRLFromCents2(priceCents)}${intervalSuffix(billingIntervalMonths)}`}
            />
            <PlanCard
              id="plano-alternativo"
              checked={choice === 'alt'}
              onSelect={() => setChoice('alt')}
              title={altOffer.billingIntervalMonths === 12 ? 'Anual' : 'Mensal'}
              price={`${formatBRLFromCents2(altOffer.priceCents)}${intervalSuffix(altOffer.billingIntervalMonths)}`}
              badge={altOffer.label ?? undefined}
            />
          </div>
        </fieldset>
      )}

      {/* Cupom de desconto — só nas ofertas que o habilitam (catálogo); nunca em assinatura. */}
      {couponAllowed && (
        <div>
          <label htmlFor="coupon" className="mb-1 block text-sm font-semibold text-ink">
            Código de palestra, escola ou clínica
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              className={`${inputClass} uppercase`}
              placeholder="Digite o código"
              value={couponInput}
              disabled={appliedCode !== null}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase())
                if (couponDecisionRequired) setCouponMsg(null)
              }}
            />
            {appliedCode ? (
              <button
                type="button"
                onClick={removeCoupon}
                className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void applyCoupon()}
                disabled={applying || !couponInput.trim()}
                className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-60"
              >
                {applying ? '...' : 'Aplicar'}
              </button>
            )}
          </div>
          {couponMsg && (
            <p className={`mt-1 text-sm ${appliedCode ? 'text-lime' : 'text-red-400'}`}>
              {couponMsg}
            </p>
          )}
          {couponDecisionRequired && (
            <button
              type="button"
              onClick={continueWithoutCoupon}
              className="mt-3 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink transition hover:border-lime/60"
            >
              Continuar por {formatBRLFromCents2(chosen.priceCents)} sem cupom
            </button>
          )}
          {appliedCode && (
            <p className="mt-2 text-sm text-muted">
              Total: <span className="font-bold text-lime">{formatBRLFromCents2(finalCents)}</span>{' '}
              <span className="text-xs line-through">{formatBRLFromCents2(chosen.priceCents)}</span>
            </p>
          )}
        </div>
      )}

      {!chosen.isSubscription && (
        <section
          aria-label="Resumo da compra"
          className="rounded-2xl border border-line/70 bg-card/40 p-4 sm:p-5"
        >
          <h2 className="text-lg font-bold text-ink">Resumo da compra</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <SummaryRow label="Preço" value={formatBRLFromCents2(chosen.priceCents)} />
            {appliedCode && discountCents > 0 && (
              <SummaryRow
                label={`Cupom ${appliedCode}`}
                value={`− ${formatBRLFromCents2(discountCents)}`}
                accent
              />
            )}
            <SummaryRow label="Total" value={formatBRLFromCents2(finalCents)} strong />
            {accessLabel && (
              <SummaryRow label="Acesso" value={`${accessLabel} a partir da aprovação`} />
            )}
            <SummaryRow label="Garantia" value={`${guaranteeDays} dias`} />
            <SummaryRow label="Renovação automática" value="Não" />
          </dl>
          {estimatedAccessEnd && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Se o pagamento for aprovado agora, a data estimada de término é {estimatedAccessEnd}.
              A confirmação mostrará a data exata.
            </p>
          )}
        </section>
      )}

      {/* ── Dados pessoais ─────────────────────────────────────────────── */}
      <section aria-labelledby="dados-pessoais">
        <h2 id="dados-pessoais" className="text-lg font-bold text-ink">
          {isKids ? 'Dados pessoais do responsável' : 'Dados pessoais'}
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Seu e-mail" error={errorFor('email')}>
            <input
              className={inputClass}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Digite seu e-mail para receber a compra"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => touch('email')}
            />
          </Field>
          <Field
            label="Confirme seu e-mail"
            error={touched.emailConfirm ? confirmError : undefined}
          >
            <input
              className={inputClass}
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="Digite novamente seu e-mail"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              onBlur={() => touch('emailConfirm')}
            />
          </Field>
          <Field label="Nome completo" error={errorFor('nome')}>
            <input
              className={inputClass}
              autoComplete="name"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => touch('nome')}
            />
          </Field>
          <Field label="CPF" error={errorFor('cpf')}>
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              onBlur={() => touch('cpf')}
            />
          </Field>
          <Field label="Telefone / WhatsApp" error={errorFor('telefone')}>
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              onBlur={() => touch('telefone')}
            />
          </Field>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line/70 bg-card/30 p-4 text-sm leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-lime"
        />
        <span>
          Li e concordo com os{' '}
          <a
            className="font-semibold text-ink underline"
            href={termsHref}
            target="_blank"
            rel="noreferrer"
          >
            Termos
          </a>{' '}
          e com a{' '}
          <a
            className="font-semibold text-ink underline"
            href={privacyHref}
            target="_blank"
            rel="noreferrer"
          >
            Política de Privacidade
          </a>
          .{' '}
          {accessLabel && !chosen.isSubscription
            ? `Entendo que esta compra libera ${accessLabel} de acesso e não cria uma assinatura.`
            : chosen.isSubscription
              ? 'Entendo que esta compra cria uma assinatura com renovação conforme o plano escolhido.'
              : 'Entendo as condições desta compra.'}
        </span>
      </label>

      {/* ── Forma de pagamento ─────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-lg font-bold text-ink">Escolha a forma de pagamento</legend>
        <div className="mt-4 flex flex-col gap-3">
          {pixAvailable && (
            <MethodCard
              id="metodo-pix"
              checked={effectiveMethod === 'pix'}
              onSelect={() => setMethod('pix')}
              label={chosen.isSubscription ? 'Pix (1 ano à vista)' : 'Pix'}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7.2 7.2L4 10.4a2.3 2.3 0 000 3.2l3.2 3.2m9.6-9.6l3.2 3.2a2.3 2.3 0 010 3.2l-3.2 3.2M10.4 4L7.2 7.2m9.6 0L13.6 4a2.3 2.3 0 00-3.2 0L7.2 7.2m9.6 9.6l-3.2 3.2a2.3 2.3 0 01-3.2 0l-3.2-3.2m9.6-9.6l-4 4a2.3 2.3 0 01-3.2 0l-4-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              {chosen.isSubscription && (
                <p className="mb-3 text-sm text-muted">
                  Você paga {formatBRLFromCents2(chosen.priceCents)} uma vez e garante 12 meses de
                  acesso. Perto do fim, a gente te avisa por e-mail para renovar.
                </p>
              )}
              {purchaseGate ? (
                <PaymentGate message={purchaseGate} />
              ) : (
                <PixCheckout
                  contact={contact}
                  couponCode={couponCode}
                  successPath={successPath}
                  offerSlug={chosen.slug}
                />
              )}
            </MethodCard>
          )}

          <MethodCard
            id="metodo-cartao"
            checked={effectiveMethod === 'cartao'}
            onSelect={() => setMethod('cartao')}
            label={
              chosen.isSubscription
                ? 'Cartão de crédito (renovação automática)'
                : 'Cartão de crédito'
            }
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="5.5"
                  width="18"
                  height="13"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M6.5 14.5h4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            }
          >
            {purchaseGate ? (
              <PaymentGate message={purchaseGate} />
            ) : (
              <CardCheckout
                contact={contact}
                priceCents={chosen.isSubscription ? chosen.priceCents : finalCents}
                couponCode={couponCode}
                successPath={successPath}
                installmentsMax={installmentsMax}
                mode={chosen.isSubscription ? 'subscription' : 'payment'}
                offerSlug={chosen.slug}
                intervalMonths={chosen.interval}
              />
            )}
          </MethodCard>
        </div>
      </fieldset>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string
  value: string
  strong?: boolean
  accent?: boolean
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'border-t border-line pt-2' : ''}`}>
      <dt className={strong ? 'font-bold text-ink' : 'text-muted'}>{label}</dt>
      <dd
        className={`${strong ? 'font-extrabold text-lime' : 'font-semibold text-ink'} ${accent ? 'text-lime' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function PaymentGate({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-ink"
    >
      {message}
    </p>
  )
}

/** Card do alternador de plano (mensal ↔ anual). */
function PlanCard({
  id,
  checked,
  onSelect,
  title,
  price,
  badge,
}: {
  id: string
  checked: boolean
  onSelect: () => void
  title: string
  price: string
  badge?: string
}) {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border p-4 transition ${
        checked ? 'border-lime/60 bg-card/50' : 'border-line/70 bg-card/30'
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-black">
          {badge}
        </span>
      )}
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="radio"
          name="plano"
          checked={checked}
          onChange={onSelect}
          className="h-4 w-4 accent-lime"
        />
        <span className={`font-semibold ${checked ? 'text-ink' : 'text-muted'}`}>{title}</span>
      </span>
      <span className={`pl-6 text-sm font-bold ${checked ? 'text-lime' : 'text-muted'}`}>
        {price}
      </span>
    </label>
  )
}

/** Radio-card de forma de pagamento (estilo Hotmart): painel expande no selecionado. */
function MethodCard({
  id,
  checked,
  onSelect,
  label,
  icon,
  children,
}: {
  id: string
  checked: boolean
  onSelect: () => void
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border transition ${
        checked ? 'border-lime/60 bg-card/50' : 'border-line/70 bg-card/30'
      }`}
    >
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 font-semibold text-ink"
      >
        <input
          id={id}
          type="radio"
          name="forma-de-pagamento"
          checked={checked}
          onChange={onSelect}
          className="h-4 w-4 accent-lime"
        />
        <span className={checked ? 'text-lime' : 'text-muted'}>{icon}</span>
        {label}
      </label>
      {checked && <div className="border-t border-line/60 p-4 sm:p-5">{children}</div>}
    </div>
  )
}
