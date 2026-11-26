import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const nextNavigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...nextNavigation,
  useRouter: () => ({
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    push: () => {},
    refresh: () => {},
    replace: () => {},
  }),
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { CourseFormDialog } = await import('../src/app/admin/membros/cursos/course-form-dialog')
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const offer = (
  slug: string,
  pricingMode: 'one_time' | 'subscription',
  priceCents: number,
  extra: Record<string, unknown> = {},
) => ({
  id: `id-${slug}`,
  slug,
  name: slug === 'guia-pais-1-ano' ? 'Guia dos pais (1 ano)' : slug,
  status: 'active',
  priceCents,
  pricingMode,
  accessMode: 'fixed',
  accessDurationValue: 12,
  accessDurationUnit: 'months',
  isAvailable: true,
  productId: 'p-guia',
  content: null,
  ...extra,
})

const product = (
  id: string,
  courseRef: string,
  primaryOfferId: string | null,
  status = 'active',
) => ({
  id,
  status,
  primaryOfferId,
  fulfillment: { accessType: 'course', courseRef },
})

/**
 * O catálogo em páginas de 1 item (revisão do Lote 6): a régua precisa ler todas, e só passam as
 * ofertas que a área dos pais consegue vender.
 */
const OFFERS = [
  offer('guia-pais-1-ano', 'one_time', 2700),
  offer('comunidade-mensal', 'subscription', 9700),
  // O presente do mesmo curso: nem principal nem marcada para a página.
  offer('guia-presente-15-dias', 'one_time', 0),
  // Marcada "Pode ser vendida na página do produto".
  offer('guia-promo', 'one_time', 1900, { content: { pageSellable: true } }),
  // Principal de outro curso.
  offer('outro-curso', 'one_time', 4700, { productId: 'p-outro' }),
  // Principal de um produto pausado.
  offer('pausado', 'one_time', 4700, { productId: 'p-pausado' }),
]
const PRODUCTS = [
  product('p-guia', 'transformando-o-vilao-em-aliado', 'id-guia-pais-1-ano'),
  product('p-outro', 'outro', 'id-outro-curso'),
  product('p-pausado', 'transformando-o-vilao-em-aliado', 'id-pausado', 'paused'),
]
function paged(path: string, items: unknown[]) {
  const offset = Number(new URL(path, 'http://x').searchParams.get('offset') ?? 0)
  return Response.json({
    items: items.slice(offset, offset + 1),
    total: items.length,
    limit: 1,
    offset,
  })
}

/** Oferta de venda do curso para pais (Lote 6, 25/11/2026). */
test('curso para pais escolhe a oferta avulsa de venda e ela vai no PATCH', async () => {
  const sent: Record<string, unknown>[] = []
  const offersQueried: string[] = []
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const path = String(url)
    if (init?.method === 'PATCH') sent.push(JSON.parse(String(init.body)))
    if (path.startsWith('/api/catalog/offers')) {
      offersQueried.push(path)
      return paged(path, OFFERS)
    }
    if (path.startsWith('/api/catalog/products')) return paged(path, PRODUCTS)
    return Response.json(path.includes('/journey/') ? { policy: {} } : {})
  }) as unknown as typeof fetch
  const course = {
    id: '11111111-1111-1111-1111-111111111111',
    version: 2,
    slug: 'transformando-o-vilao-em-aliado',
    title: 'Transformando o vilão em aliado',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    salesPageUrl: null,
    salesOfferRef: null,
    status: 'draft',
    audience: 'kids',
    learner: 'parents',
    level: 'iniciante',
    track: '2d',
    careerSlot: null,
    journeyRole: 'reward',
    sequentialLock: true,
    videoBeforeActivity: false,
    studioUnlockBlocks: [],
  } as unknown as Parameters<typeof CourseFormDialog>[0]['editing']
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(
        <CourseFormDialog
          open
          editing={course}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })
    await act(async () => new Promise((r) => setTimeout(r, 0)))
    const select = document.querySelector('#salesOfferRef') as HTMLSelectElement | null
    expect(select !== null).toBe(true)
    expect(offersQueried[0]).toContain('audience=kids')
    // Todas as páginas lidas; só a principal do produto do curso e a marcada para a página.
    expect(offersQueried.length).toBe(OFFERS.length)
    const values = [...(select?.options ?? [])].map((o) => o.value)
    expect(values).toEqual(['', 'guia-pais-1-ano', 'guia-promo'])
    expect(select?.options[1]?.textContent).toContain('1 ano')
    await act(async () => {
      if (!select) return
      select.value = 'guia-pais-1-ano'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const save = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Salvar',
    )
    await act(async () => save?.click())
    await act(async () => new Promise((r) => setTimeout(r, 0)))
    expect(sent).toHaveLength(1)
    expect(sent[0]?.salesOfferRef).toBe('guia-pais-1-ano')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('revisão do Lote 6: com o catálogo fora, a oferta guardada continua escolhida', async () => {
  globalThis.fetch = (async (url: string) => {
    const path = String(url)
    if (path.startsWith('/api/catalog/'))
      return Response.json({ error: { code: 'UPSTREAM', message: 'fora' } }, { status: 502 })
    return Response.json(path.includes('/journey/') ? { policy: {} } : {})
  }) as unknown as typeof fetch
  const course = {
    id: '11111111-1111-1111-1111-111111111111',
    version: 2,
    slug: 'transformando-o-vilao-em-aliado',
    title: 'Transformando o vilão em aliado',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    salesPageUrl: null,
    salesOfferRef: 'guia-pais-1-ano',
    status: 'draft',
    audience: 'kids',
    learner: 'parents',
    level: 'iniciante',
    track: '2d',
    careerSlot: null,
    journeyRole: 'reward',
    sequentialLock: true,
    videoBeforeActivity: false,
    studioUnlockBlocks: [],
  } as unknown as Parameters<typeof CourseFormDialog>[0]['editing']
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(
        <CourseFormDialog
          open
          editing={course}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })
    await act(async () => new Promise((r) => setTimeout(r, 0)))
    const select = document.querySelector('#salesOfferRef') as HTMLSelectElement | null
    expect(select?.value).toBe('guia-pais-1-ano')
    expect(document.body.textContent ?? '').toContain('A oferta escolhida continua guardada')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
