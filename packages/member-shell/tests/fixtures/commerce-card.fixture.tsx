import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import type { CommerceView, PurchaseView } from '../../src/lib/commerce'

GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const pending: {
  resolve(value: CommerceView): void
  reject(error: unknown): void
  body: Record<string, unknown> | undefined
}[] = []
function requestAt(index: number) {
  const request = pending[index]
  if (!request) throw new Error(`Pedido ${index} não foi iniciado`)
  return request
}
mock.module('../../src/lib/api', () => ({
  apiSend: (_path: string, _method: string, body?: Record<string, unknown>) =>
    new Promise<CommerceView>((resolve, reject) => pending.push({ resolve, reject, body })),
  apiGet: async () => ({ items: [] }),
}))
mock.module('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }))
const { CommerceCard } = await import('../../src/components/commerce/commerce-card')
let host = document.createElement('div')
let root = createRoot(host)
const included: Extract<CommerceView, { mode: 'included' }> = {
  mode: 'included',
  courseTitle: 'Cadê Todo Mundo?',
  continueUrl: '/pais/familia',
  message: 'Já faz parte do seu acesso.',
}
const gift: Extract<CommerceView, { mode: 'gift' }> = {
  mode: 'gift',
  state: 'active',
  config: { kind: 'gift', campaignCode: 'curso' },
  gift: {
    offerId: 'oferta',
    offerTitle: 'Cadê',
    courseSlug: 'cade',
    courseTitle: 'Cadê',
    learner: 'child',
    accessDays: 7,
    includesMural: false,
  },
}
async function render(mode: 'gift' | 'purchase' = 'gift', preview = false, offerRef = 'cade') {
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'promotion', offerRef }}
        mode={mode}
        preview={preview}
        title="Curso"
        buttonLabel={mode === 'gift' ? 'Ativar presente' : 'Comprar'}
      />,
    ),
  )
}
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  host = document.createElement('div')
  root = createRoot(host)
  pending.length = 0
})
test('trocar presente por compra remove o acesso incluído anterior', async () => {
  await render()
  await act(async () => requestAt(0).resolve(included))
  expect(host.textContent).toContain('Continuar com meu filho')
  await render('purchase')
  expect(host.textContent).toContain('Comprar')
  expect(host.textContent).not.toContain('Continuar com meu filho')
})
test('prévia não conserva o atalho de um presente real', async () => {
  await render()
  await act(async () => requestAt(0).resolve(included))
  await render('gift', true)
  expect(host.textContent).not.toContain('Continuar com meu filho')
  expect(host.querySelector('button')?.disabled).toBe(true)
})
test('outra origem não exibe o curso incluído da origem anterior', async () => {
  await render()
  await act(async () => requestAt(0).resolve(included))
  await render('gift', false, 'outro-curso')
  expect(host.textContent).not.toContain('Cadê Todo Mundo? já está incluído')
})
test.each([
  'resolve',
  'reject',
] as const)('resposta antiga (%s) não substitui uma conferência mais recente', async (kind) => {
  await render()
  await act(async () => window.dispatchEvent(new Event('sz-commerce-updated')))
  await act(async () => requestAt(1).resolve(included))
  await act(async () =>
    kind === 'resolve'
      ? requestAt(0).resolve(gift)
      : requestAt(0).reject(new Error('Pedido antigo falhou')),
  )
  expect(host.textContent).toContain('Continuar com meu filho')
  expect(host.textContent).not.toContain('Ativar presente')
})

// Lote 5 (25/11/2026): os cartões novos e as telas do mini checkout.
const text = () => (host.textContent ?? '').replace(/\u00a0/g, ' ')
const monthly: CommerceCatalogOffer = {
  id: '40000000-0000-4000-8000-000000000001',
  slug: 'comunidade-mensal',
  name: 'Comunidade mensal',
  status: 'active',
  isAvailable: true,
  priceCents: 9700,
  pricingMode: 'subscription',
  billingIntervalMonths: 1,
  installmentsMax: null,
  accessMode: 'billing_cycle',
  accessDurationValue: null,
  accessDurationUnit: null,
  guaranteeDays: 7,
  product: {
    id: '50000000-0000-4000-8000-000000000001',
    audience: 'kids',
    sku: 'comunidade-dos-criadores',
    name: 'Comunidade dos Criadores',
    status: 'active',
  },
  content: { maxProfiles: 3, altOffer: { slug: 'comunidade-anual' } },
  includes: [],
}
const annual: CommerceCatalogOffer = {
  ...monthly,
  id: '40000000-0000-4000-8000-000000000002',
  slug: 'comunidade-anual',
  priceCents: 97000,
  billingIntervalMonths: 12,
}
const course: CommerceCatalogOffer = {
  ...monthly,
  id: '40000000-0000-4000-8000-000000000003',
  slug: 'guia-pais-1-ano',
  name: 'Transformando o vilão em aliado',
  priceCents: 2700,
  pricingMode: 'one_time',
  billingIntervalMonths: null,
  installmentsMax: 3,
  accessMode: 'fixed',
  accessDurationValue: 12,
  accessDurationUnit: 'months',
  product: {
    ...monthly.product,
    id: '50000000-0000-4000-8000-000000000003',
    sku: 'GUIA',
    kind: 'course',
  },
  content: { allowsCoupon: true },
}
function purchase(target: CommerceCatalogOffer, over: Partial<PurchaseView>): PurchaseView {
  return {
    mode: 'purchase',
    checkoutId: '60000000-0000-4000-8000-000000000001',
    origin: { kind: 'offer', offerRef: target.slug },
    offer: target,
    contact: { nome: 'Ana', email: 'ana@example.invalid', cpf: '52998224725', telefone: '' },
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
async function openCourse() {
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'offer', offerRef: course.slug }}
        mode="purchase"
        variant="course"
        offer={course}
        title={course.name}
        badge="Curso para pais"
        buttonLabel="Comprar o curso"
      />,
    ),
  )
  const button = [...host.querySelectorAll('button')].find(
    (b) => b.textContent === 'Comprar o curso',
  )
  await act(async () => button?.click())
}
test('destaque da Comunidade: perfis e garantia da oferta e os dois preços', async () => {
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'community' }}
        mode="purchase"
        variant="community"
        offer={monthly}
        plans={[monthly, annual]}
        title="Seus filhos também podem criar os próprios jogos"
        buttonLabel="Assinar a Comunidade"
      />,
    ),
  )
  expect(text()).toContain('Até 3 perfis de criança na mesma conta, um para cada filho')
  expect(text()).toContain('R$ 97 por mês ou R$ 970 por ano')
  expect(text()).toContain('tem 7 dias de garantia')
  expect(pending.length).toBe(0)
})
test('cartão do curso: selo, preço e pagamento único', async () => {
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'offer', offerRef: course.slug }}
        mode="purchase"
        variant="course"
        offer={course}
        title={course.name}
        badge="Curso para pais"
        eyebrow="Para você"
        chips={['7 aulas curtas']}
        buttonLabel="Comprar o curso"
      />,
    ),
  )
  expect(text()).toContain('Curso para pais')
  expect(text()).toContain('R$ 27')
  expect(text()).toContain('pagamento único')
  expect(text()).toContain('7 aulas curtas')
})
test('Pix: o QR, o copia e cola, a validade e o conferir', async () => {
  await openCourse()
  await act(async () =>
    requestAt(0).resolve(
      purchase(course, {
        status: 'PENDING',
        payment: {
          status: 'PENDING',
          pix: { copiaECola: '00020126pix', expiresAt: '2026-11-26T02:59:00.000Z' },
        },
      }),
    ),
  )
  expect(text()).toContain('Comprar o curso')
  expect(text()).toContain('Escaneie o QR Code no app do seu banco')
  expect(text()).toContain('Válido até')
  expect(text()).toContain('Já paguei, conferir')
  expect(text()).toContain('em Conta, em Compras em andamento')
  expect(host.querySelector('[aria-current="step"]')?.textContent).toBe('2 · Pagar')
})
test('Pronto: o curso já é seu, sem exclamação', async () => {
  await openCourse()
  await act(async () =>
    requestAt(0).resolve(purchase(course, { status: 'PAID', accessGranted: true })),
  )
  expect(text()).toContain('O curso já é seu')
  expect(text()).toContain('Pagamento confirmado')
  expect(host.querySelector('[aria-current="step"]')?.textContent).toBe('3 · Pronto')
  const done = host.querySelector('[role="status"]')?.textContent ?? ''
  expect(done).not.toContain('!')
})

// Revisão do Lote 5 (25/11/2026).
async function openCommunity() {
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'community' }}
        mode="purchase"
        variant="community"
        offer={monthly}
        plans={[monthly, annual]}
        title="Seus filhos também podem criar os próprios jogos"
        buttonLabel="Assinar a Comunidade"
      />,
    ),
  )
  const button = [...host.querySelectorAll('button')].find(
    (b) => b.textContent === 'Assinar a Comunidade',
  )
  await act(async () => button?.click())
}
test('revisão: a tela do Pix mostra o valor cobrado com o cupom', async () => {
  await openCourse()
  await act(async () =>
    requestAt(0).resolve(
      purchase(course, {
        status: 'PENDING',
        payment: {
          status: 'PENDING',
          pix: { copiaECola: '00020126pix', expiresAt: null },
          charge: {
            listPriceCents: 2700,
            discountCents: 700,
            chargedPriceCents: 2000,
            couponCode: 'PAIS10',
          },
        },
      }),
    ),
  )
  const summary = host.querySelector('aside[aria-label="Resumo do pedido"]')?.textContent ?? ''
  expect(summary.replace(/ /g, ' ')).toContain('PAIS10 · − R$ 7')
  expect(summary.replace(/ /g, ' ')).toContain('R$ 20')
})
test('revisão: o Pronto da Comunidade não promete os cursos para pais', async () => {
  await openCommunity()
  await act(async () =>
    requestAt(0).resolve(purchase(monthly, { status: 'PAID', accessGranted: true })),
  )
  expect(text()).toContain('A Comunidade dos Criadores está liberada')
  expect(text()).toContain('o Estúdio e o Mural já estão liberados para os seus filhos')
  expect(text()).not.toContain('cursos para pais')
})
test('revisão: outra assinatura e outro produto avulso não falam da Comunidade nem de curso', async () => {
  const tool: CommerceCatalogOffer = {
    ...monthly,
    product: {
      ...monthly.product,
      sku: 'estudio-completo',
      name: 'Estúdio Completo',
      kind: 'tool',
    },
  }
  await act(async () =>
    root.render(
      <CommerceCard
        origin={{ kind: 'promotion', offerRef: tool.slug }}
        mode="purchase"
        offer={tool}
        title="Estúdio"
        buttonLabel="Abrir"
      />,
    ),
  )
  await act(async () =>
    [...host.querySelectorAll('button')].find((b) => b.textContent === 'Abrir')?.click(),
  )
  await act(async () =>
    requestAt(0).resolve(purchase(tool, { status: 'PAID', accessGranted: true })),
  )
  expect(text()).toContain('Fazer a assinatura')
  expect(text()).toContain('Sua assinatura está ativa')
  expect(text()).toContain('O acesso a Estúdio Completo já está liberado para os seus filhos.')
  expect(text()).not.toMatch(/Comunidade|Mural|cursos de criação/)
})
test('revisão: o plano escolhido continua quando a oferta muda e a tela recarrega', async () => {
  await openCommunity()
  const complete = {
    contact: {
      nome: 'Ana Souza',
      email: 'ana@example.invalid',
      cpf: '52998224725',
      telefone: '11988887777',
    },
  }
  await act(async () =>
    requestAt(0).resolve(purchase(monthly, { ...complete, plans: [monthly, annual] })),
  )
  const annualButton = [...host.querySelectorAll('[role="radiogroup"] button')].find((b) =>
    b.textContent?.startsWith('Anual'),
  ) as HTMLButtonElement | undefined
  await act(async () => annualButton?.click())
  expect(requestAt(1).body).toMatchObject({ action: 'inspect', offerRef: annual.slug })
  expect(requestAt(1).body?.checkoutId).toBeUndefined()
  await act(async () =>
    requestAt(1).resolve(
      purchase(annual, {
        ...complete,
        checkoutId: '60000000-0000-4000-8000-000000000002',
        plans: [annual, monthly],
      }),
    ),
  )
  const terms = host.querySelector('input[type="checkbox"]') as HTMLInputElement | null
  await act(async () => terms?.click())
  await act(async () => {
    host
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(requestAt(2).body).toMatchObject({ action: 'pay', offerRef: annual.slug })
  await act(async () =>
    requestAt(2).reject({ code: 'OFFER_CHANGED', message: 'As condições da oferta mudaram.' }),
  )
  expect(requestAt(3).body).toMatchObject({ action: 'inspect', offerRef: annual.slug })
})
