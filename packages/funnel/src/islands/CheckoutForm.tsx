import { useMemo, useState } from 'react'
import { apiPost } from '../lib/api-fetch'
import { maskCpf } from '../lib/card-utils'
import { type CheckoutContactInput, CheckoutContactSchema } from '../lib/checkout-schema'
import { fieldErrors } from '../lib/contact-schema'
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
  initialContact,
  priceCents,
  allowCoupon = false,
}: {
  initialContact: InitialContact
  priceCents: number
  allowCoupon?: boolean
}) {
  const [nome, setNome] = useState(initialContact.nome)
  const [email, setEmail] = useState(initialContact.email)
  // Confirmação pré-populada quando o e-mail veio do pré-checkout (acabou de ser
  // digitado lá); quem editar o e-mail aqui precisa confirmar de novo.
  const [emailConfirm, setEmailConfirm] = useState(initialContact.email)
  const [cpf, setCpf] = useState(maskCpf(initialContact.cpf))
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [method, setMethod] = useState<Method>('pix')

  const [couponInput, setCouponInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [discountCents, setDiscountCents] = useState(0)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const finalCents = Math.max(0, priceCents - discountCents)
  const couponCode = appliedCode ?? undefined

  // Validação contínua: os botões de pagar só habilitam com tudo válido; os
  // erros por campo só aparecem depois que o campo foi tocado (blur).
  const parsed = useMemo(
    () => CheckoutContactSchema.safeParse({ nome, email, cpf }),
    [nome, email, cpf],
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
  function errorFor(field: 'nome' | 'email' | 'cpf'): string | undefined {
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
        setCouponMsg(`Cupom ${r.couponCode} aplicado: -${formatBRLFromCents2(r.discountCents)}.`)
      } else {
        setAppliedCode(null)
        setDiscountCents(0)
        setCouponMsg(r.message ?? 'Cupom inválido.')
      }
    } catch {
      setCouponMsg('Não foi possível validar o cupom. Tente novamente.')
    } finally {
      setApplying(false)
    }
  }

  function removeCoupon() {
    setAppliedCode(null)
    setDiscountCents(0)
    setCouponInput('')
    setCouponMsg(null)
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Cupom de desconto — só nas ofertas que o habilitam (catálogo). */}
      {allowCoupon && (
        <div>
          <label htmlFor="coupon" className="mb-1 block text-sm text-muted">
            Cupom de desconto
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              className={`${inputClass} uppercase`}
              placeholder="Ex.: PROMO10"
              value={couponInput}
              disabled={appliedCode !== null}
              onChange={(e) => setCouponInput(e.target.value)}
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
          {appliedCode && (
            <p className="mt-2 text-sm text-muted">
              Total: <span className="font-bold text-lime">{formatBRLFromCents2(finalCents)}</span>{' '}
              <span className="text-xs line-through">{formatBRLFromCents2(priceCents)}</span>
            </p>
          )}
        </div>
      )}

      {/* ── Dados pessoais ─────────────────────────────────────────────── */}
      <section aria-labelledby="dados-pessoais">
        <h2 id="dados-pessoais" className="text-lg font-bold text-ink">
          Dados pessoais
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
        </div>
      </section>

      {/* ── Forma de pagamento ─────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-lg font-bold text-ink">Escolha a forma de pagamento</legend>
        <div className="mt-4 flex flex-col gap-3">
          <MethodCard
            id="metodo-pix"
            checked={method === 'pix'}
            onSelect={() => setMethod('pix')}
            label="Pix"
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
            <PixCheckout contact={contact} couponCode={couponCode} />
          </MethodCard>

          <MethodCard
            id="metodo-cartao"
            checked={method === 'cartao'}
            onSelect={() => setMethod('cartao')}
            label="Cartão de crédito"
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
            <CardCheckout contact={contact} priceCents={finalCents} couponCode={couponCode} />
          </MethodCard>
        </div>
      </fieldset>
    </div>
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
          className="h-4 w-4 accent-[#c4f042]"
        />
        <span className={checked ? 'text-lime' : 'text-muted'}>{icon}</span>
        {label}
      </label>
      {checked && <div className="border-t border-line/60 p-4 sm:p-5">{children}</div>}
    </div>
  )
}
