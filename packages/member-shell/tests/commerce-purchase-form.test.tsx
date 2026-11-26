import { describe, expect, test } from 'bun:test'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { renderToStaticMarkup } from 'react-dom/server'
import { perMonthCents, purchaseDialogTitle } from '../src/components/commerce/commerce-copy'
import { OrderSummary, PurchaseForm } from '../src/components/commerce/purchase-form'
import type { PurchaseView } from '../src/lib/commerce'

function offer(
  months: number | null,
  over: Partial<CommerceCatalogOffer> = {},
): CommerceCatalogOffer {
  return {
    id: crypto.randomUUID(),
    slug: months === 12 ? 'plano-anual' : 'plano',
    name: 'Plano',
    status: 'active',
    isAvailable: true,
    priceCents: months === 12 ? 97000 : 9700,
    pricingMode: months === null ? 'one_time' : 'subscription',
    billingIntervalMonths: months,
    installmentsMax: months === null ? 3 : null,
    accessMode: months === null ? 'fixed' : 'billing_cycle',
    accessDurationValue: months === null ? 12 : null,
    accessDurationUnit: months === null ? 'months' : null,
    product: {
      id: '30000000-0000-4000-8000-000000000001',
      sku: 'PLANO',
      name: 'Comunidade dos Criadores',
      audience: 'kids',
      status: 'active',
    },
    content: null,
    includes: [],
    ...over,
  }
}
function view(target: CommerceCatalogOffer, over: Partial<PurchaseView> = {}): PurchaseView {
  return {
    mode: 'purchase',
    checkoutId: crypto.randomUUID(),
    origin: { kind: 'offer', offerRef: target.slug },
    offer: target,
    contact: { nome: 'Responsável', email: 'qa@example.invalid', cpf: '', telefone: '11988887777' },
    birth: '',
    address: null,
    status: 'READY',
    accessGranted: false,
    payment: null,
    termsUrl: '/termos',
    privacyUrl: '/privacidade',
    termsVersion: 'v1',
    config: { kind: 'purchase', offerRef: target.slug },
    ...over,
  }
}
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
const form = (v: PurchaseView) =>
  text(
    renderToStaticMarkup(
      <PurchaseForm
        view={v}
        busy={false}
        onPay={async () => {}}
        onQuote={async () => ({
          couponCode: 'X',
          listPriceCents: 0,
          discountCents: 0,
          finalPriceCents: 0,
        })}
      />,
    ),
  )

describe('resumo do pedido', () => {
  test.each([
    [1, 'por mês'],
    [3, 'a cada 3 meses'],
    [6, 'a cada 6 meses'],
    [12, 'por ano'],
  ] as const)('mostra o intervalo de cobrança de verdade (%s meses)', (months, label) => {
    const html = text(renderToStaticMarkup(<OrderSummary offer={offer(months)} method="card" />))
    expect(html).toContain(label)
    if (months !== 1) expect(html).not.toContain('por mês')
    expect(html).toContain('Total hoje')
  })
  test('compra avulsa não promete renovação nem acesso vitalício', () => {
    const html = text(renderToStaticMarkup(<OrderSummary offer={offer(null)} method="pix" />))
    expect(html).toContain('Pagamento único, sem assinatura.')
    expect(html).toContain('Acesso por 1 ano')
    expect(html).not.toMatch(/por mês|por ano|vitalíci|sem prazo/i)
  })
  test('garantia e perfis vêm da oferta, nunca de um número fixo', () => {
    const sem = text(renderToStaticMarkup(<OrderSummary offer={offer(12)} method="card" />))
    expect(sem).not.toContain('Garantia')
    expect(sem).not.toContain('perfis')
    const com = text(
      renderToStaticMarkup(
        <OrderSummary
          offer={offer(12, { guaranteeDays: 7, content: { maxProfiles: 3 } })}
          method="card"
        />,
      ),
    )
    expect(com).toContain('Garantia de 7 dias')
    expect(com).toContain('Até 3 perfis de criança na mesma conta')
  })
  test('o cupom cotado muda o total', () => {
    const html = text(
      renderToStaticMarkup(
        <OrderSummary
          offer={offer(null)}
          method="pix"
          coupon={{
            couponCode: 'PAIS10',
            listPriceCents: 9700,
            discountCents: 700,
            finalPriceCents: 9000,
          }}
        />,
      ),
    )
    expect(html).toContain('PAIS10')
    expect(html).toContain('R$ 90')
  })
  test('revisão: o por mês do anual arredonda para cima (12 vezes nunca dá menos que o anual)', () => {
    const anual = offer(12)
    expect(perMonthCents(anual)).toBe(8084)
    expect(perMonthCents(anual) * 12).toBeGreaterThanOrEqual(anual.priceCents)
    expect(perMonthCents(offer(12, { priceCents: 120000 }))).toBe(10000)
  })
  test('revisão: produto avulso que não é curso não é chamado de curso', () => {
    const avulso = offer(null)
    const html = text(renderToStaticMarkup(<OrderSummary offer={avulso} method="pix" />))
    expect(html).toContain('Produto')
    expect(html).not.toContain('Curso')
    expect(purchaseDialogTitle(avulso)).toBe('Finalizar a compra')
    const curso = offer(null, { product: { ...avulso.product, kind: 'course' } })
    expect(text(renderToStaticMarkup(<OrderSummary offer={curso} method="pix" />))).toContain(
      'Curso',
    )
    expect(purchaseDialogTitle(curso)).toBe('Comprar o curso')
  })
  test('revisão: só a Comunidade é "Assinar a Comunidade"; outra assinatura fica neutra', () => {
    const comunidade = offer(1, {
      product: { ...offer(1).product, sku: 'comunidade-dos-criadores' },
    })
    expect(purchaseDialogTitle(comunidade)).toBe('Assinar a Comunidade dos Criadores')
    expect(purchaseDialogTitle(offer(1))).toBe('Fazer a assinatura')
  })
  test('revisão: o resumo do Pix mostra o valor cobrado sem cupom vazio', () => {
    const html = text(
      renderToStaticMarkup(
        <OrderSummary
          offer={offer(null)}
          method="pix"
          coupon={{ couponCode: '', listPriceCents: 9700, discountCents: 0, finalPriceCents: 9700 }}
        />,
      ),
    )
    expect(html).not.toContain(' − ')
  })
})

describe('formulário do mini checkout', () => {
  test('assinatura com os dois planos: anual primeiro, economia calculada e Pix só no anual', () => {
    const monthly = offer(1)
    const annual = offer(12)
    const html = form(view(monthly, { plans: [monthly, annual] }))
    expect(html).toContain('Escolha o plano')
    expect(html.indexOf('Anual')).toBeLessThan(html.indexOf('Mensal'))
    expect(html).toContain('Economize R$ 194')
    expect(html).toContain('R$ 80,84 por mês')
    expect(html).toContain('No plano mensal o pagamento é só no cartão')
    expect(html).toContain('Assinar por R$ 97 ao mês')
    expect(html).not.toContain('Tem um cupom')
  })
  test('anual no Pix: o botão diz o valor; assinatura não aceita cupom', () => {
    const annual = offer(12, { content: { allowsCoupon: true } })
    const html = form(view(annual))
    expect(html).toContain('Gerar o Pix de R$ 970')
    expect(html).toContain('No anual pelo Pix, você paga o ano à vista')
    expect(html).not.toContain('Tem um cupom')
  })
  test('curso avulso: pede só o que falta e mostra o cupom quando a oferta aceita', () => {
    const html = form(view(offer(null, { content: { allowsCoupon: true } })))
    expect(html).toContain('Falta só o seu CPF')
    expect(html).toContain('Tem um cupom?')
    expect(html).toContain('Gerar o Pix')
    expect(html).toContain('O curso abre assim que o Pix cair')
    expect(form(view(offer(null)))).not.toContain('Tem um cupom')
  })
  test('com os dados completos, não pede nada de novo', () => {
    const html = form(
      view(offer(null), {
        contact: {
          nome: 'Responsável',
          email: 'qa@example.invalid',
          cpf: '52998224725',
          telefone: '11988887777',
        },
      }),
    )
    expect(html).toContain('Usamos os dados da sua conta. Não precisa preencher nada de novo.')
    expect(html).toContain('CPF •••.•••.•••-25')
  })
  test('a copy segue a Light Copy: sem exclamação e sem travessão', () => {
    for (const html of [
      form(view(offer(1), { plans: [offer(1), offer(12)] })),
      form(view(offer(null, { content: { allowsCoupon: true } }))),
    ]) {
      expect(html).not.toContain('!')
      expect(html).not.toContain('—')
    }
  })
})
