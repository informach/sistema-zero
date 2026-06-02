import { useState } from 'react'
import BoletoCheckout from './BoletoCheckout'
import CardCheckout from './CardCheckout'
import PixCheckout from './PixCheckout'

type Tab = 'pix' | 'cartao' | 'boleto'

export default function CheckoutTabs({ email, priceCents }: { email: string; priceCents: number }) {
  const [tab, setTab] = useState<Tab>('pix')

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2" role="tablist">
        <TabButton active={tab === 'pix'} onClick={() => setTab('pix')} label="Pix" />
        <TabButton active={tab === 'cartao'} onClick={() => setTab('cartao')} label="Cartão" />
        <TabButton active={tab === 'boleto'} onClick={() => setTab('boleto')} label="Boleto" />
      </div>

      {tab === 'pix' && <PixCheckout />}
      {tab === 'cartao' && <CardCheckout priceCents={priceCents} />}
      {tab === 'boleto' && <BoletoCheckout email={email} />}
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
