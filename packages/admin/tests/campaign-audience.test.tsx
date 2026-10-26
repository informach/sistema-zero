import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ADULT_COURSE_UNPUBLISHED_MESSAGE, AUDIENCE_LOCKED_MESSAGE, ConvitesClient, previewUrl } =
  await import('../src/app/admin/embaixadores/convites-client')

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
async function mount(
  items: unknown[],
  save: (call: Call) => Response,
  courses?: (call: Call) => Response,
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
    if (call.method === 'GET' && courses && call.url.startsWith('/api/members/courses?'))
      return courses(call)
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
const submit = () =>
  act(async () =>
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  )

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

test('nova campanha nasce na comunidade selecionada e envia o público explícito', async () => {
  const { calls, root } = await mount([], () => Response.json({ campaign: campaign() }))
  await act(async () => button('Nova campanha').click())
  expect(document.body.textContent).toContain('Público do presente')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Adulto')
  expect(document.querySelector('input[name="campaign-audience"]')).toBeNull()
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

const courseList = (status: string | null) => () =>
  Response.json({
    items:
      status === null
        ? [{ slug: 'cade-todo-mundo-adulto-rascunho', status: 'draft' }]
        : [
            { slug: 'cade-todo-mundo-adulto-2', status: 'published' },
            { slug: 'cade-todo-mundo-adulto', status },
          ],
    total: 1,
  })
const courseCalls = (calls: Call[]) =>
  calls.filter((c) => c.url.startsWith('/api/members/courses?'))

test('público adulto com o curso adulto em rascunho: o editor avisa', async () => {
  const { calls, root } = await mount([campaign()], () => Response.json({}), courseList('draft'))
  await act(async () => button('Editar').click())
  const status = [...document.querySelectorAll('[role="dialog"] [role="status"]')].map(
    (el) => el.textContent,
  )
  expect(status).toContain(ADULT_COURSE_UNPUBLISHED_MESSAGE)
  const url = new URL(courseCalls(calls)[0]!.url, 'https://admin.test')
  expect(url.searchParams.get('q')).toBe('cade-todo-mundo-adulto')
  expect(url.searchParams.get('audience')).toBe('adult')
  await act(async () => root.unmount())
})

test('curso adulto ausente da lista também avisa; só o slug exato conta', async () => {
  const { root } = await mount([campaign()], () => Response.json({}), courseList(null))
  await act(async () => button('Editar').click())
  expect(document.body.textContent).toContain(ADULT_COURSE_UNPUBLISHED_MESSAGE)
  await act(async () => root.unmount())
})

test('curso adulto publicado, lista sem permissão ou público Kids: sem aviso', async () => {
  for (const [audience, courses] of [
    ['adult', courseList('published')],
    ['adult', () => Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })],
    ['kids', courseList('draft')],
  ] as const) {
    const { calls, root } = await mount([campaign({ audience })], () => Response.json({}), courses)
    await act(async () => button('Editar').click())
    expect(document.body.textContent).not.toContain(ADULT_COURSE_UNPUBLISHED_MESSAGE)
    if (audience === 'kids') expect(courseCalls(calls)).toHaveLength(0)
    await act(async () => root.unmount())
    document.body.innerHTML = ''
  }
})
