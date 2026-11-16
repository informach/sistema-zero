import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { AUDIENCE_LOCKED_MESSAGE, ConvitesClient, previewUrl } = await import(
  '../src/app/admin/embaixadores/convites-client'
)
const { GIFT_CATALOG_UNAVAILABLE_MESSAGE, GIFT_OFFER_LOCKED_MESSAGE, GIFT_OFFER_REQUIRED_MESSAGE } =
  await import('../src/app/admin/embaixadores/campaign-gift-offer')

/** Público do presente nas campanhas (20/10/2026): coluna, editor, trava e prévia. */

const { PlatformProvider } = await import('../src/components/admin/platform-provider')
const { setPlatform } = await import('../src/components/admin/platform-store')
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  document.body.innerHTML = ''
})

const campaign = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'Anúncio Reels',
  publicTitle: 'Seu primeiro jogo, de presente',
  description: '',
  context: 'ad',
  code: 'reels-adulto',
  channel: '',
  status: 'draft',
  state: 'draft',
  audience: 'adult',
  startsAt: '2026-11-01T03:00:00.000Z',
  endsAt: '2026-12-01T02:59:00.000Z',
  shareUrl: 'https://funil.test/bolsa/reels-adulto',
  updatedAt: '2026-10-20T12:00:00.000Z',
  stats: { redemptions: 0, conversions: 0, pending: 0, failed: 0 },
  ...over,
})

type Call = { url: string; method: string; body: unknown }
const OFFER_KIDS = '22222222-2222-4222-8222-222222222222'
const OFFER_ADULT = '33333333-3333-4333-8333-333333333333'
const OFFER_PARENTS = '44444444-4444-4444-8444-444444444444'
const OFFER_SUBSCRIPTION = '55555555-5555-4555-8555-555555555555'
const OFFER_DRAFT = '66666666-6666-4666-8666-666666666666'
const OFFER_MONTHS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MURAL_KIDS = '77777777-7777-4777-8777-777777777777'
const MURAL_ADULT = '88888888-8888-4888-8888-888888888888'
const offer = (over: Record<string, unknown>) => ({
  status: 'paused',
  productId: '99999999-9999-4999-8999-999999999999',
  productName: 'Cadê Todo Mundo',
  pricingMode: 'one_time',
  accessMode: 'fixed',
  accessDurationValue: 7,
  accessDurationUnit: 'days',
  items: [],
  ...over,
})
/** As ofertas de cada público, como o `/api/catalog/offers?audience=` devolve. */
const catalogOffers: Record<string, unknown[]> = {
  kids: [
    offer({
      id: OFFER_KIDS,
      slug: 'cade-todo-mundo-7-dias',
      name: 'Cadê Todo Mundo 7 dias',
      items: [{ productId: MURAL_KIDS, sortOrder: 0 }],
    }),
    offer({
      id: OFFER_PARENTS,
      slug: 'vilao-em-aliado',
      name: 'Vilão em aliado',
      status: 'active',
      productName: 'Transformando o vilão em aliado',
      accessMode: 'lifetime',
      accessDurationValue: null,
      accessDurationUnit: null,
    }),
    offer({
      id: OFFER_SUBSCRIPTION,
      slug: 'comunidade-mensal',
      name: 'Comunidade mensal',
      status: 'active',
      pricingMode: 'subscription',
      accessMode: 'billing_cycle',
    }),
    offer({ id: OFFER_DRAFT, slug: 'rascunho', name: 'Oferta em rascunho', status: 'draft' }),
    // Prazo em meses não vira presente (o referrals recusa): fica fora da lista.
    offer({
      id: OFFER_MONTHS,
      slug: 'cade-todo-mundo-1-mes',
      name: 'Cadê Todo Mundo 1 mês',
      status: 'active',
      accessDurationValue: 1,
      accessDurationUnit: 'months',
    }),
  ],
  adult: [
    offer({
      id: OFFER_ADULT,
      slug: 'cade-todo-mundo-adulto-7-dias',
      name: 'Cadê Todo Mundo adulto 7 dias',
      productName: 'Cadê Todo Mundo adulto',
      items: [{ productId: MURAL_ADULT, sortOrder: 0 }],
    }),
  ],
}
/** A busca `q=mural-dos-criadores` traz os dois; só o do público da campanha conta. */
const muralProducts = [
  {
    id: MURAL_KIDS,
    slug: 'mural-dos-criadores',
    fulfillment: { accessType: 'community', courseRef: 'mural-dos-criadores' },
  },
  {
    id: MURAL_ADULT,
    slug: 'adult-mural-dos-criadores',
    fulfillment: { accessType: 'community', courseRef: 'adult-mural-dos-criadores' },
  },
]
async function mount(
  items: unknown[],
  save: (call: Call) => Response,
  options: { catalogDown?: boolean; detail?: (call: Call) => Response } = {},
) {
  const audience =
    (items[0] as { audience?: string } | undefined)?.audience === 'kids' ? 'kids' : 'adult'
  setPlatform(audience)
  const calls: Call[] = []
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }
    calls.push(call)
    if (call.method === 'GET' && call.url.includes('/campaigns?'))
      return Response.json({ items, total: items.length })
    if (call.method === 'GET' && call.url.includes('/ambassadors?'))
      return Response.json({
        items: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Viviane',
            email: 'viviane@example.com',
            status: 'active',
          },
        ],
        total: 1,
      })
    if (call.method === 'GET' && call.url.startsWith('/api/catalog/') && options.catalogDown)
      return Response.json({ error: { message: 'Catálogo fora' } }, { status: 503 })
    if (call.method === 'GET' && call.url.startsWith('/api/catalog/offers?')) {
      const audience = new URL(call.url, 'https://admin.test').searchParams.get('audience') ?? ''
      const list = catalogOffers[audience] ?? []
      return Response.json({ items: list, total: list.length })
    }
    if (call.method === 'GET' && call.url.startsWith('/api/catalog/products?'))
      return Response.json({ items: muralProducts, total: muralProducts.length })
    if (call.method === 'GET' && options.detail && call.url.includes('/campaigns/'))
      return options.detail(call)
    if (call.method === 'GET') return Response.json({ error: { message: 'x' } }, { status: 503 })
    return save(call)
  }) as typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <PlatformProvider initialPlatform={audience}>
        <ConvitesClient currentRole="admin" />
      </PlatformProvider>,
    ),
  )
  return { container, calls, root }
}
const button = (label: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === label)!
const giftSelect = () =>
  document.querySelector<HTMLSelectElement>('[role="dialog"] select[name="campaign-gift-offer"]')!
const choose = (offerId: string) =>
  act(async () => {
    const select = giftSelect()
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(
      select,
      offerId,
    )
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
const submit = () =>
  act(async () =>
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  )

test('campanha vincula embaixador com comissão explícita e remove vínculo sem deixar comissão ativa', async () => {
  const { calls, root } = await mount([campaign({ audience: 'kids' })], () =>
    Response.json({ error: { message: 'Manter editor aberto para conferir' } }, { status: 409 }),
  )
  try {
    await act(async () => button('Editar').click())
    let toggle = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!
    expect(toggle.checked).toBe(false)
    expect(toggle.disabled).toBe(true)
    await act(async () => button('Buscar embaixador').click())
    await act(async () => button('Viviane · viviane@example.com').click())
    expect(toggle.disabled).toBe(false)
    await submit()
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      ambassadorId: '11111111-1111-4111-8111-111111111111',
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionWindowDays: null,
    })
    await act(async () => toggle.click())
    const amounts = document.querySelectorAll<HTMLInputElement>(
      '[role="dialog"] input[type="number"]',
    )
    expect(amounts[0]!.value).toBe('30')
    expect(amounts[1]!.value).toBe('80')
    await act(async () => {
      for (const [index, text] of ['45.50', '90.25', '30'].entries()) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          amounts[index],
          text,
        )
        amounts[index]!.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    await submit()
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toMatchObject({
      commissionEnabled: true,
      commissionAmountCents: 4550,
      commissionAnnualAmountCents: 9025,
      commissionWindowDays: 30,
    })
    await act(async () => button('Remover vínculo').click())
    toggle = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!
    expect(toggle.checked).toBe(false)
    expect(toggle.disabled).toBe(true)
    await submit()
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toMatchObject({
      ambassadorId: null,
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionWindowDays: null,
    })
  } finally {
    await act(async () => root.unmount())
  }
})

test('editor preserva beneficiário e comissão habilitada ao editar outros campos', async () => {
  const { calls, root } = await mount(
    [
      campaign({
        audience: 'kids',
        ambassadorId: '11111111-1111-4111-8111-111111111111',
        ambassadorName: 'Viviane',
        commissionEnabled: true,
        commissionAmountCents: 4500,
        commissionWindowDays: 30,
      }),
    ],
    () => Response.json({ campaign: campaign() }),
  )
  try {
    await act(async () => button('Editar').click())
    expect(document.body.textContent).toContain('Vinculado: Viviane')
    expect(document.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)
    await submit()
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      ambassadorId: '11111111-1111-4111-8111-111111111111',
      commissionEnabled: true,
      commissionAmountCents: 4500,
      commissionAnnualAmountCents: null,
      commissionWindowDays: 30,
    })
  } finally {
    await act(async () => root.unmount())
  }
})

test('a lista mostra o público, e campanha antiga sem o campo é Kids', async () => {
  const { container, root } = await mount(
    [campaign(), campaign({ id: 'c2', name: 'Feira', code: 'feira', audience: undefined })],
    () => Response.json({}),
  )
  const headers = [...container.querySelectorAll('th')].map((th) => th.textContent)
  expect(headers.slice(0, 3)).toEqual(['Campanha', 'Público', 'Situação'])
  const rows = [...container.querySelectorAll('tbody tr')]
  expect(rows[0]!.children[1]!.textContent).toBe('Adulto')
  expect(rows[1]!.children[1]!.textContent).toBe('Kids')
  expect(container.textContent).toContain('seu público e seu prazo para novos cadastros')
  await act(async () => root.unmount())
})

test('separar o mensal de um acordo legado conserva o anual exibido', async () => {
  const { calls, root } = await mount(
    [
      campaign({
        audience: 'kids',
        ambassadorId: '11111111-1111-4111-8111-111111111111',
        commissionEnabled: true,
        commissionAmountCents: 4500,
        commissionWindowDays: 30,
      }),
    ],
    () => Response.json({ campaign: campaign() }),
  )
  try {
    await act(async () => button('Editar').click())
    const amounts = document.querySelectorAll<HTMLInputElement>(
      '[role="dialog"] input[type="number"]',
    )
    expect(amounts[1]!.value).toBe('45')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        amounts[0],
        '30',
      )
      amounts[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await submit()
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      commissionAmountCents: 3000,
      commissionAnnualAmountCents: 4500,
    })
  } finally {
    await act(async () => root.unmount())
  }
})

test('nova campanha nasce na comunidade selecionada e envia o público explícito', async () => {
  const { calls, root } = await mount([], () => Response.json({ campaign: campaign() }))
  await act(async () => button('Nova campanha').click())
  expect(document.body.textContent).toContain('Público do presente')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Adulto')
  expect(document.querySelector('input[name="campaign-audience"]')).toBeNull()
  await choose(OFFER_ADULT)
  await submit()
  const post = calls.find((call) => call.method === 'POST')!
  expect(post.url).toBe('/api/admin/referrals/campaigns?audience=adult')
  expect((post.body as { audience: string }).audience).toBe('adult')
  await act(async () => root.unmount())
})

test('fora do rascunho o público trava, e o 409 vira um recado claro', async () => {
  const { calls, root } = await mount(
    [campaign({ status: 'active', state: 'active', audience: 'kids' })],
    () =>
      Response.json({ error: { code: 'CAMPAIGN_AUDIENCE_LOCKED', message: 'x' } }, { status: 409 }),
  )
  await act(async () => button('Editar').click())
  expect(document.querySelector('input[name="campaign-audience"]')).toBeNull()
  expect(document.body.textContent).toContain('troque a comunidade antes de abrir o formulário')
  await submit()
  const patch = calls.find((call) => call.method === 'PATCH')!
  // O público vai sempre explícito, para o PATCH nunca trocar por omissão.
  expect((patch.body as { audience: string }).audience).toBe('kids')
  expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toBe(
    AUDIENCE_LOCKED_MESSAGE,
  )
  await act(async () => root.unmount())
})

test('rascunho também permanece no público da lente', async () => {
  const { root } = await mount([campaign()], () => Response.json({ campaign: campaign() }))
  await act(async () => button('Editar').click())
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Adulto')
  expect(document.querySelector('input[name="campaign-audience"]')).toBeNull()
  await act(async () => root.unmount())
})

test('a prévia leva o público', () => {
  const adult = new URL(previewUrl(campaign() as never))
  expect(adult.pathname).toBe('/bolsa/previa')
  expect(adult.searchParams.get('audience')).toBe('adult')
  expect(
    new URL(previewUrl(campaign({ audience: undefined }) as never)).searchParams.get('audience'),
  ).toBe('kids')
})

/** Oferta de presente (15/11/2026): o campo obrigatório, a lista e os erros novos. */

test('nova campanha Kids exige a oferta de presente e lista só pagamento único em dias ou sem prazo', async () => {
  const { calls, root } = await mount([campaign({ audience: 'kids' })], () =>
    Response.json({ campaign: campaign({ audience: 'kids', giftOfferId: OFFER_KIDS }) }),
  )
  try {
    await act(async () => button('Nova campanha').click())
    const options = [...giftSelect().options].map((o) => ({
      value: o.value,
      text: o.textContent,
      disabled: o.disabled,
    }))
    expect(options.map((o) => o.value)).toEqual(['', OFFER_KIDS, OFFER_PARENTS, OFFER_DRAFT])
    expect(options[1]!.text).toBe(
      'Cadê Todo Mundo 7 dias · Cadê Todo Mundo + Mural · 7 dias · Pausada',
    )
    expect(options[2]!.text).toBe('Vilão em aliado · Transformando o vilão em aliado · sem prazo')
    // Rascunho aparece com a situação, mas o Catálogo não entrega oferta em rascunho.
    expect(options[3]!.disabled).toBe(true)
    expect(options[3]!.text).toContain('Rascunho')
    expect(
      calls.some((c) => c.url.includes('/api/catalog/offers?') && c.url.includes('audience=kids')),
    ).toBe(true)

    await submit()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
    expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toBe(
      GIFT_OFFER_REQUIRED_MESSAGE,
    )

    await choose(OFFER_KIDS)
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Inclui Cadê Todo Mundo + Mural. Prazo: 7 dias. Situação no Catálogo: Pausada.',
    )
    await submit()
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      audience: 'kids',
      giftOfferId: OFFER_KIDS,
    })
  } finally {
    await act(async () => root.unmount())
  }
})

test('a lista e o detalhe mostram a oferta, e a campanha antiga mostra a oferta padrão', async () => {
  const { container, calls, root } = await mount(
    [
      campaign({ audience: 'kids', giftOfferId: OFFER_PARENTS }),
      campaign({ id: 'c2', name: 'Feira', code: 'feira', audience: 'kids', giftOfferId: null }),
    ],
    () => Response.json({ campaign: campaign({ audience: 'kids', giftOfferId: OFFER_PARENTS }) }),
    {
      detail: () =>
        Response.json({
          campaign: campaign({ audience: 'kids', giftOfferId: OFFER_PARENTS }),
          history: [],
          redemptions: [],
        }),
    },
  )
  try {
    const headers = [...container.querySelectorAll('th')].map((th) => th.textContent)
    const column = headers.indexOf('Presente')
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows[0]!.children[column]!.textContent).toBe(
      'Vilão em aliadoTransformando o vilão em aliado · sem prazo',
    )
    expect(rows[1]!.children[column]!.textContent).toBe('Oferta padrão do Cadê')

    await act(async () => button('Detalhes').click())
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Presente: Vilão em aliado (Transformando o vilão em aliado · sem prazo).',
    )
    await act(async () => button('Duplicar como nova edição').click())
    expect(giftSelect().value).toBe(OFFER_PARENTS)
    const code = [...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input')].find(
      (input) => input.pattern === '[a-z0-9-]{4,32}',
    )!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        code,
        'feira-2',
      )
      code.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await submit()
    const duplicate = calls.find((c) => c.url.includes('/duplicate'))
    expect(duplicate?.method).toBe('POST')
    expect(duplicate?.body).toMatchObject({ giftOfferId: OFFER_PARENTS })
  } finally {
    await act(async () => root.unmount())
  }
})

test('campanha antiga sem oferta salva sem mandar a oferta (o referrals conserva)', async () => {
  const { calls, root } = await mount(
    [campaign({ audience: 'kids', status: 'active', state: 'active', giftOfferId: null })],
    () => Response.json({ campaign: campaign() }),
  )
  try {
    await act(async () => button('Editar').click())
    expect(giftSelect().value).toBe('')
    expect(giftSelect().disabled).toBe(false)
    expect(giftSelect().options[0]!.textContent).toBe('Oferta padrão do Cadê (campanha antiga)')
    await submit()
    const patch = calls.find((c) => c.method === 'PATCH')!
    expect(patch.body as object).not.toHaveProperty('giftOfferId')
  } finally {
    await act(async () => root.unmount())
  }
})

test('fora do rascunho a oferta trava, e os erros novos viram recados claros', async () => {
  for (const [code, status, expected] of [
    ['CAMPAIGN_GIFT_OFFER_LOCKED', 409, GIFT_OFFER_LOCKED_MESSAGE],
    ['CATALOG_UNAVAILABLE', 503, GIFT_CATALOG_UNAVAILABLE_MESSAGE],
  ] as const) {
    const { calls, root } = await mount(
      [
        campaign({
          audience: 'adult',
          status: 'active',
          state: 'active',
          giftOfferId: OFFER_ADULT,
        }),
      ],
      () => Response.json({ error: { code, message: 'x' } }, { status }),
    )
    try {
      await act(async () => button('Editar').click())
      expect(giftSelect().disabled).toBe(true)
      expect(giftSelect().value).toBe(OFFER_ADULT)
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        GIFT_OFFER_LOCKED_MESSAGE,
      )
      await submit()
      expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
        giftOfferId: OFFER_ADULT,
      })
      expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toBe(expected)
    } finally {
      await act(async () => root.unmount())
      document.body.innerHTML = ''
    }
  }
})

test('catálogo fora: o campo avisa e deixa tentar de novo', async () => {
  const { root } = await mount([campaign()], () => Response.json({}), { catalogDown: true })
  try {
    await act(async () => button('Nova campanha').click())
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'As ofertas do Catálogo não carregaram.',
    )
    expect(button('Tentar de novo')).toBeDefined()
  } finally {
    await act(async () => root.unmount())
  }
})
