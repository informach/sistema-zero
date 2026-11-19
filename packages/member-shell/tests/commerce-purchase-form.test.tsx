import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PurchaseForm } from '../src/components/commerce/purchase-form'
import type { PurchaseView } from '../src/lib/commerce'

function view(months: number | null): PurchaseView {
  return {
    mode: 'purchase',
    checkoutId: crypto.randomUUID(),
    origin: { kind: 'promotion', offerRef: 'plano' },
    offer: {
      id: crypto.randomUUID(),
      slug: 'plano',
      name: 'Plano',
      status: 'active',
      isAvailable: true,
      priceCents: 9000,
      pricingMode: months === null ? 'one_time' : 'subscription',
      billingIntervalMonths: months,
      installmentsMax: null,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
      product: {
        id: crypto.randomUUID(),
        sku: 'PLANO',
        name: 'Plano',
        audience: 'kids',
        status: 'active',
      },
      content: null,
      includes: [],
    },
    contact: { nome: 'Responsável', email: 'qa@example.invalid', cpf: '', telefone: '' },
    birth: '',
    address: null,
    status: 'READY',
    accessGranted: false,
    payment: null,
    termsUrl: '/termos',
    privacyUrl: '/privacidade',
    termsVersion: 'v1',
    config: { kind: 'purchase', offerRef: 'plano' },
  }
}

test.each([
  [1, 'por mês'],
  [3, 'a cada 3 meses'],
  [6, 'a cada 6 meses'],
  [12, 'por ano'],
] as const)('purchase form shows the actual %s-month billing interval', (months, label) => {
  const html = renderToStaticMarkup(
    <PurchaseForm view={view(months)} busy={false} onPay={async () => {}} />,
  )
  expect(html).toContain(label)
  if (months !== 1) expect(html).not.toContain('por mês')
  if (months !== 12) expect(html).not.toContain('Pagamento anual')
})

test('one-time purchase does not claim recurring billing', () => {
  const html = renderToStaticMarkup(
    <PurchaseForm view={view(null)} busy={false} onPay={async () => {}} />,
  )
  expect(html).toContain('Pagamento único.')
  expect(html).not.toContain('por mês')
  expect(html).not.toContain('por ano')
})
