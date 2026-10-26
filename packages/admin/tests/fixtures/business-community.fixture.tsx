import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register({ url: 'http://localhost/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  usePathname: () => '/admin/catalogo/produtos',
}))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../../src/components/admin/platform-provider')
const { setPlatform } = await import('../../src/components/admin/platform-store')
const { ProductsClient } = await import('../../src/app/admin/catalogo/produtos/products-client')
const { CouponsClient } = await import('../../src/app/admin/catalogo/cupons/coupons-client')

test('catalog lists retire requests and drafts when Kids changes to Adultos', async () => {
  const original = globalThis.fetch
  const requests: { url: URL; signal: AbortSignal | null; reply: (response: Response) => void }[] =
    []
  let notify: (() => void) | null = null
  globalThis.fetch = Object.assign(
    (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) =>
      new Promise<Response>((reply) => {
        requests.push({
          url: new URL(String(input), 'http://localhost'),
          signal: options?.signal ?? null,
          reply,
        })
        notify?.()
      }),
    { preconnect: original.preconnect },
  )
  const waitForCount = async (count: number) => {
    if (requests.length >= count) return
    await new Promise<void>((resolve) => {
      notify = () => {
        if (requests.length >= count) resolve()
      }
    })
    notify = null
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const product = (name: string) => ({
    id: name,
    name,
    sku: name,
    kind: 'course',
    status: 'active',
  })
  try {
    setPlatform('kids')
    await act(async () =>
      root.render(
        <PlatformProvider initialPlatform="kids">
          <ProductsClient />
        </PlatformProvider>,
      ),
    )
    await waitForCount(1)
    expect(requests[0]?.url.searchParams.get('audience')).toBe('kids')
    await act(async () => setPlatform('adult'))
    expect(requests[0]?.signal?.aborted).toBe(true)
    await waitForCount(2)
    expect(requests[1]?.url.searchParams.get('audience')).toBe('adult')
    expect(requests[1]?.url.searchParams.get('offset')).toBe('0')
    await act(async () =>
      requests[1]?.reply(Response.json({ items: [product('Adulto atual')], total: 1 })),
    )
    await act(async () =>
      requests[0]?.reply(Response.json({ items: [product('Kids atrasado')], total: 1 })),
    )
    expect(host.textContent).toContain('Adulto atual')
    expect(host.textContent).not.toContain('Kids atrasado')

    await act(async () =>
      root.render(
        <PlatformProvider initialPlatform="adult">
          <CouponsClient />
        </PlatformProvider>,
      ),
    )
    await waitForCount(3)
    await act(async () => requests[2]?.reply(Response.json({ items: [], total: 0 })))
    const create = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Novo cupom'),
    )
    expect(create).toBeDefined()
    await act(async () => create?.click())
    await waitForCount(4)
    expect(requests[3]?.url.searchParams.get('audience')).toBe('adult')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    await act(async () => setPlatform('kids'))
    expect(requests[3]?.signal?.aborted).toBe(true)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await waitForCount(5)
    expect(requests[4]?.url.searchParams.get('audience')).toBe('kids')
    await act(async () => {
      requests[3]?.reply(Response.json({ items: [], total: 0 }))
      requests[4]?.reply(Response.json({ items: [], total: 0 }))
    })
  } finally {
    await act(async () => root.unmount())
    host.remove()
    globalThis.fetch = original
  }
})

const { TransactionsClient } = await import(
  '../../src/app/admin/pagamentos/transacoes/transactions-client'
)
test('financial UI scopes lists and totals; unknown history is explicit and resets on community change', async () => {
  const original = globalThis.fetch
  const requests: URL[] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input), 'http://localhost')
      requests.push(url)
      if (url.pathname.endsWith('/stats'))
        return Response.json({
          totalCount: 0,
          paidCount: 0,
          paidAmountInCents: '0',
          refundedAmountInCents: '0',
          byStatus: [],
          byMethod: [],
        })
      return Response.json({ items: [], total: 0 })
    },
    { preconnect: original.preconnect },
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    setPlatform('kids')
    await act(async () =>
      root.render(
        <PlatformProvider initialPlatform="kids">
          <TransactionsClient currentRole="admin" />
        </PlatformProvider>,
      ),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(
      requests.filter((r) => r.pathname.startsWith('/api/payments/')).length,
    ).toBeGreaterThanOrEqual(2)
    expect(requests.every((r) => r.searchParams.get('audience') === 'kids')).toBe(true)
    const checkpoint = requests.length
    const checkbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(checkbox).not.toBeNull()
    await act(async () => checkbox.click())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(
      requests.slice(checkpoint).every((r) => r.searchParams.get('audience') === 'unassigned'),
    ).toBe(true)
    expect(requests.length).toBeGreaterThan(checkpoint)
    const beforeAdult = requests.length
    await act(async () => setPlatform('adult'))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false)
    expect(requests.length).toBeGreaterThan(beforeAdult)
    expect(
      requests.slice(beforeAdult).every((r) => r.searchParams.get('audience') === 'adult'),
    ).toBe(true)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    globalThis.fetch = original
  }
})
