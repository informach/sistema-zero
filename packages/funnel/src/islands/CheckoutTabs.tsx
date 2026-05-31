import { useState } from 'react'
import PixCheckout from './PixCheckout'

type Tab = 'pix' | 'cartao' | 'boleto'

export default function CheckoutTabs() {
  const [tab, setTab] = useState<Tab>('pix')

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setTab('pix')}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            tab === 'pix' ? 'border-lime bg-lime text-[#0b0f14]' : 'border-line text-muted'
          }`}
        >
          Pix
        </button>
        <TabEmBreve label="Cartão" />
        <TabEmBreve label="Boleto" />
      </div>

      {tab === 'pix' && <PixCheckout />}
    </div>
  )
}

function TabEmBreve({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex flex-col items-center rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted opacity-60"
    >
      {label}
      <span className="text-[10px] font-normal text-cyan">em breve</span>
    </button>
  )
}
