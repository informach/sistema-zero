import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ConvitesClient } = await import('../src/app/admin/embaixadores/convites-client')
const { OriginClient } = await import('../src/app/admin/origem-das-vendas/origin-client')
const { PlatformProvider } = await import('../src/components/admin/platform-provider')
const { setPlatform } = await import('../src/components/admin/platform-store')

/**
 * Lote 7 do Admin (25/11/2026): as abas de Campanhas, o painel das ofertas dos embaixadores, a
 * campanha de venda com o endereço antigo e a Origem das vendas.
 */

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  document.body.innerHTML = ''
})

type Call = { url: string; method: string; body: unknown }
const GUIA_ANO = '11111111-1111-4111-8111-111111111111'
const GUIA_15 = '22222222-2222-4222-8222-222222222222'
const DESAFIO = '33333333-3333-4333-8333-333333333333'
const offers = [
  {
    id: GUIA_ANO,
    slug: 'guia-1-ano',
    name: 'Guia 1 ano',
    status: 'active',
    priceCents: 2700,
    pricingMode: 'one_time',
    accessMode: 'lifetime',
    productId: 'p-guia',
    productName: 'Guia',
    items: [],
    content: null,
  },
  {
    id: GUIA_15,
    slug: 'guia-15-dias',
    name: 'Guia 15 dias',
    status: 'paused',
    priceCents: 0,
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 15,
    accessDurationUnit: 'days',
    productId: 'p-guia',
    productName: 'Guia',
    items: [],
    content: null,
  },
  {
    id: DESAFIO,
    slug: 'desafio',
    name: 'Desafio do Primeiro Jogo',
    status: 'active',
    priceCents: 6700,
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    productId: 'p-desafio',
    productName: 'Desafio',
    items: [],
    content: null,
  },
]
const products = [
  {
    id: 'p-guia',
    sku: 'guia',
    status: 'active',
    primaryOfferId: GUIA_ANO,
    fulfillment: { accessType: 'course', courseRef: 'guia' },
  },
  {
    id: 'p-desafio',
    sku: 'desafio',
    status: 'active',
    primaryOfferId: DESAFIO,
    fulfillment: { accessType: 'course', courseRef: 'desafio' },
  },
]
const courses = [{ slug: 'guia', learner: 'parents' }]

function mockFetch(handle: (call: Call) => Response | undefined) {
  const calls: Call[] = []
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }
    calls.push(call)
    const custom = handle(call)
    if (custom) return custom
    if (call.url.startsWith('/api/catalog/offers'))
      return Response.json({ items: offers, total: offers.length })
    if (call.url.startsWith('/api/catalog/products'))
      return Response.json({ items: products, total: products.length })
    if (call.url.startsWith('/api/members/courses'))
      return Response.json({ items: courses, total: courses.length })
    return Response.json({ items: [], total: 0 })
  }) as typeof fetch
  return calls
}
async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  await act(async () => new Promise((r) => setTimeout(r, 0)))
  return { container, root }
}
const button = (label: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)
const setValue = async (el: HTMLInputElement | HTMLSelectElement, value: string) =>
  act(async () => {
    const proto =
      el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(
      new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    )
  })

test('as três abas: as setas andam pela posição e Ofertas abre o painel', async () => {
  setPlatform('kids')
  mockFetch((call) =>
    call.url.includes('/ambassador-offers') ? Response.json({ gift: [], referral: [] }) : undefined,
  )
  const { root } = await mount(
    <PlatformProvider initialPlatform="kids">
      <ConvitesClient currentRole="admin" />
    </PlatformProvider>,
  )
  try {
    const tabs = [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent)
    expect(tabs).toEqual(['Campanhas', 'Embaixadores', 'Ofertas dos embaixadores'])
    const first = document.querySelector<HTMLButtonElement>('[role="tab"]')!
    await act(async () =>
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
    )
    await act(async () => new Promise((r) => setTimeout(r, 0)))
    const selected = document.querySelector('[role="tab"][aria-selected="true"]')
    expect(selected?.textContent).toBe('Ofertas dos embaixadores')
    expect(document.activeElement === selected).toBe(true)
    expect(document.body.textContent).toContain('O que os embaixadores podem mandar')
  } finally {
    await act(async () => root.unmount())
  }
})

test('ofertas dos embaixadores: ligar outra do mesmo curso dá o recado sem gravar; o resto grava a lista', async () => {
  setPlatform('kids')
  const calls = mockFetch((call) => {
    if (call.url.includes('/ambassador-offers') && call.method === 'GET')
      return Response.json({
        gift: [
          {
            offerId: GUIA_ANO,
            enabled: true,
            position: 0,
            audience: 'kids',
            kind: 'gift',
            updatedAt: '',
          },
          {
            offerId: GUIA_15,
            enabled: false,
            position: 1,
            audience: 'kids',
            kind: 'gift',
            updatedAt: '',
          },
        ],
        referral: [],
        counts: { [GUIA_ANO]: { gifts: 212, purchases: 0, subscriptions: 0 } },
      })
    if (call.url.includes('/ambassador-offers') && call.method === 'PUT')
      return Response.json({
        items: (call.body as { items: { offerId: string; enabled: boolean }[] }).items.map(
          (item, position) => ({
            ...item,
            position,
            audience: 'kids',
            kind: 'gift',
            updatedAt: '',
          }),
        ),
      })
    return undefined
  })
  const { AmbassadorOffersPanel } = await import(
    '../src/app/admin/embaixadores/ambassador-offers-panel'
  )
  const { root } = await mount(
    <PlatformProvider initialPlatform="kids">
      <AmbassadorOffersPanel audience="kids" canWrite />
    </PlatformProvider>,
  )
  try {
    expect(document.body.textContent).toContain('Para os pais')
    expect(document.body.textContent).toContain('Guia 1 ano')
    // O contador de cada oferta (o referrals conta pelos links pessoais).
    expect(document.body.textContent).toContain('212 resgates pelos embaixadores')
    expect(document.body.textContent).toContain('0 resgates pelos embaixadores')
    // Ligar o Guia 15 dias: o mesmo produto do Guia 1 ano.
    const toggle = document.getElementById(`oferta-gift-${GUIA_15}`) as HTMLButtonElement
    await act(async () => toggle.click())
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      'Guia 1 ano e Guia 15 dias são do mesmo curso. Deixe só uma delas ligada nesta lista.',
    )
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
    // Descer o Guia 1 ano grava a lista inteira, na ordem nova.
    await act(async () =>
      [...document.querySelectorAll('button')]
        .find((b) => b.getAttribute('aria-label') === 'Descer Guia 1 ano')!
        .click(),
    )
    const put = calls.find((c) => c.method === 'PUT')
    expect(put?.body).toEqual({
      audience: 'kids',
      kind: 'gift',
      items: [
        { offerId: GUIA_15, enabled: false },
        { offerId: GUIA_ANO, enabled: true },
      ],
    })
  } finally {
    await act(async () => root.unmount())
  }
})

test('campanha de venda: a oferta com página, o destino e o endereço antigo vão no POST', async () => {
  setPlatform('kids')
  const calls = mockFetch((call) =>
    call.method === 'POST' && call.url.includes('/campaigns')
      ? Response.json({ error: { message: 'Fica aberto para conferir' } }, { status: 409 })
      : undefined,
  )
  const { root } = await mount(
    <PlatformProvider initialPlatform="kids">
      <ConvitesClient currentRole="admin" />
    </PlatformProvider>,
  )
  try {
    await act(async () => button('Nova campanha')!.click())
    await act(async () =>
      [...document.querySelectorAll('[role="radio"]')]
        .find((b) => b.textContent?.startsWith('Vender uma oferta'))!
        .dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    const sale = document.querySelector<HTMLSelectElement>('select[name="campaign-sale-offer"]')!
    // Só as ofertas com página de venda: o presente do Guia (pausado) não aparece.
    const values = [...sale.options].map((o) => o.value)
    expect(values).toContain(DESAFIO)
    expect(values).not.toContain(GUIA_15)
    await setValue(sale, DESAFIO)
    const checkout = document.querySelectorAll<HTMLInputElement>(
      'input[name="campaign-link-target"]',
    )[1]!
    await act(async () => checkout.click())
    const inputs = [...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input')]
    const [name, title, code] = inputs.filter((i) => i.type !== 'checkbox')
    await setValue(name!, 'Black Friday')
    await setValue(title!, 'Black Friday do Desafio')
    await setValue(code!, 'black-desafio')
    await act(async () =>
      document.querySelector<HTMLInputElement>('input[name="campaign-redirect"]')!.click(),
    )
    await setValue(
      document.querySelector<HTMLInputElement>('input[name="campaign-redirect-path"]')!,
      'sistemazero.com.br/kids/desafio-primeiro-jogo',
    )
    // O padrão do "Redirecionar até" é daqui a 30 dias.
    const until = document.querySelector<HTMLInputElement>('input[name="campaign-redirect-until"]')!
    expect(until.value.length).toBe(10)
    await act(async () =>
      document
        .querySelector('[role="dialog"] form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    const post = calls.find((c) => c.method === 'POST')?.body as Record<string, unknown>
    expect(post).toMatchObject({
      kind: 'sale',
      saleOfferId: DESAFIO,
      linkTarget: 'checkout',
      redirectPath: '/kids/desafio-primeiro-jogo',
      audience: 'kids',
    })
    expect(post.giftOfferId).toBeUndefined()
    expect(typeof post.redirectUntil).toBe('string')
  } finally {
    await act(async () => root.unmount())
  }
})

test('o prazo do bônus nasce em 45 dias ao ligar o bônus', async () => {
  setPlatform('kids')
  mockFetch((call) =>
    call.url.includes('/ambassadors?')
      ? Response.json({
          items: [{ id: 'amb', name: 'Patrícia', email: 'p@x.com', status: 'active' }],
          total: 1,
        })
      : undefined,
  )
  const { root } = await mount(
    <PlatformProvider initialPlatform="kids">
      <ConvitesClient currentRole="admin" />
    </PlatformProvider>,
  )
  try {
    await act(async () => button('Nova campanha')!.click())
    await act(async () => button('Buscar embaixador')!.click())
    await act(async () => button('Patrícia · p@x.com')!.click())
    await act(async () =>
      document.querySelector<HTMLInputElement>('input[name="campaign-commission"]')!.click(),
    )
    expect(
      document.querySelector<HTMLInputElement>('input[name="campaign-commission-window"]')!.value,
    ).toBe('45')
  } finally {
    await act(async () => root.unmount())
  }
})

test('Origem das vendas: números, aviso do teto e a equipe sem acesso', async () => {
  setPlatform('kids')
  const report = {
    from: '2026-10-26T00:00:00.000Z',
    to: '2026-11-25T00:00:00.000Z',
    totals: {
      newPeople: 612,
      gifts: 318,
      purchases: 147,
      subscriptions: 96,
      revenueCents: '3842000',
      referralShare: 0.3,
    },
    byOrigin: [
      {
        origin: 'campaign',
        newPeople: 175,
        gifts: 116,
        purchases: 46,
        subscriptions: 11,
        revenueCents: '473600',
      },
    ],
    weeks: [],
    places: [
      { place: 'pais-curso-fechado', purchases: 12, subscriptions: 2, revenueCents: '171800' },
    ],
    paths: [],
    ambassadors: [],
    campaigns: [],
    latest: [],
    truncated: true,
  }
  // A primeira leitura (30 dias) responde; a seguinte (o período novo) falha: a tela não pode
  // seguir com os números do período anterior.
  let originReads = 0
  const calls = mockFetch((call) => {
    if (!call.url.startsWith('/api/admin/referrals/origins')) return undefined
    originReads++
    return originReads === 1 ? Response.json(report) : new Response('falha', { status: 502 })
  })
  const { root } = await mount(
    <PlatformProvider initialPlatform="kids">
      <OriginClient currentRole="admin" />
    </PlatformProvider>,
  )
  try {
    const text = (document.body.textContent ?? '').replace(/\s/g, ' ')
    expect(text).toContain('Pessoas novas612')
    expect(text).toContain('30%')
    expect(text).toContain('Área dos pais · curso fechado')
    expect(text).toContain('Escolha um período menor')
    expect(calls.some((c) => c.url.includes('audience=kids'))).toBe(true)
    // Trocou o período e o novo falhou: os números de antes saem da tela.
    const select = [...document.querySelectorAll('select')].find((el) =>
      [...el.options].some((o) => o.value === '7d'),
    ) as HTMLSelectElement
    await setValue(select, '7d')
    await act(async () => new Promise((r) => setTimeout(r, 0)))
    const after = (document.body.textContent ?? '').replace(/\s/g, ' ')
    expect(after.includes('Pessoas novas612')).toBe(false)
  } finally {
    await act(async () => root.unmount())
  }
  const staffCalls = mockFetch(() => undefined)
  const staff = await mount(
    <PlatformProvider initialPlatform="kids">
      <OriginClient currentRole="staff" />
    </PlatformProvider>,
  )
  try {
    expect(document.body.textContent).toContain('só a administração vê esta página')
    expect(staffCalls.some((c) => c.url.includes('/origins'))).toBe(false)
  } finally {
    await act(async () => staff.root.unmount())
  }
})
