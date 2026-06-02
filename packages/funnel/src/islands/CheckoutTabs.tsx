import { useState } from 'react'
import { apiPost } from '../lib/api-fetch'
import { formatBRLFromCents2 } from '../lib/money'
import CardCheckout from './CardCheckout'
import PixCheckout from './PixCheckout'

type Tab = 'pix' | 'cartao'

interface QuoteResp {
  ok: boolean
  priceCents: number
  discountCents: number
  finalPriceCents: number
  couponCode: string | null
  message?: string
}

// `email` é mantido no contrato (o checkout.astro passa) mas não é mais usado aqui
// desde que o boleto saiu do checkout — fica para um eventual retorno do método.
export default function CheckoutTabs({ priceCents }: { email: string; priceCents: number }) {
  const [tab, setTab] = useState<Tab>('pix')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [discountCents, setDiscountCents] = useState(0)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const finalCents = Math.max(0, priceCents - discountCents)
  const couponCode = appliedCode ?? undefined

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
    <div>
      {/* Cupom de desconto */}
      <div className="mb-5">
        <label htmlFor="coupon" className="mb-1 block text-sm text-muted">
          Cupom de desconto
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink uppercase"
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

      <div className="mb-6 grid grid-cols-2 gap-2" role="tablist">
        <TabButton active={tab === 'pix'} onClick={() => setTab('pix')} label="Pix" />
        <TabButton active={tab === 'cartao'} onClick={() => setTab('cartao')} label="Cartão" />
      </div>

      {tab === 'pix' && <PixCheckout couponCode={couponCode} />}
      {tab === 'cartao' && <CardCheckout priceCents={finalCents} couponCode={couponCode} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        active ? 'border-lime bg-lime text-[#0b0f14]' : 'border-line text-muted'
      }`}
    >
      {label}
    </button>
  )
}
