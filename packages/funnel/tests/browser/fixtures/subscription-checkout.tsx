import { createRoot } from 'react-dom/client'
import CheckoutForm from '../../../src/islands/CheckoutForm'

const kids = new URLSearchParams(location.search).get('audience') !== 'adult'
const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <main className="mx-auto max-w-2xl p-4 sm:p-8">
    <CheckoutForm
      funnel={`${kids ? 'kids' : 'pro'}/comunidade-dos-criadores`}
      initialContact={{
        nome: 'Pessoa de Teste',
        email: 'qa@example.test',
        cpf: '529.982.247-25',
        telefone: '(11) 99999-9999',
      }}
      priceCents={9700}
      allowCoupon
      isKids={kids}
      successPath="/obrigado"
      pricingMode="subscription"
      billingIntervalMonths={1}
      offerSlug="mensal"
      altOffer={{ slug: 'anual', priceCents: 97000, billingIntervalMonths: 12, label: null }}
      initialCoupon={{
        status: 'valid',
        code: 'PRIMEIRA50',
        listPriceCents: 9700,
        discountCents: 4850,
        finalPriceCents: 4850,
      }}
      termsHref="/termos"
      privacyHref="/privacidade"
    />
  </main>,
)
