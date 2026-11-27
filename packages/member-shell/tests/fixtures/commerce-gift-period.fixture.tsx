import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ReferralGiftOfferView } from '@sistemazero/core/referrals'
import type { CommerceView } from '../../src/lib/commerce'

GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { CommercePanel } = await import('../../src/components/commerce/commerce-panel')
const nativeFetch = globalThis.fetch
let root: ReturnType<typeof createRoot> | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  globalThis.fetch = nativeFetch
})

test.each([
  { days: 181, months: 6, label: '6 meses de acesso.', absent: /181 dias/ },
  { days: 7, months: undefined, label: '7 dias de acesso.', absent: /15 dias|meses/ },
  { days: 30, months: undefined, label: '30 dias de acesso.', absent: /1 mês/ },
  { days: 1, months: undefined, label: '1 dia de acesso.', absent: /1 dias/ },
  {
    days: null,
    months: undefined,
    label: 'Sem cobrança ou cartão.',
    absent: /dias de acesso|meses de acesso/,
  },
])('o painel do presente preserva a unidade: $label', async ({ days, months, label, absent }) => {
  const gift: ReferralGiftOfferView = {
    offerId: crypto.randomUUID(),
    offerTitle: 'Curso',
    courseSlug: 'curso',
    courseTitle: 'Curso',
    learner: 'parents',
    accessDays: days,
    accessMonths: months,
    includesMural: false,
  }
  const view: CommerceView = {
    mode: 'gift',
    gift,
    state: 'active',
    config: { kind: 'gift', campaignCode: 'curso' },
  }
  let requests = 0
  globalThis.fetch = (async (url, options) => {
    expect(String(url)).toBe('/api/commerce')
    expect(JSON.parse(String(options?.body)).action).toBe('inspect')
    requests++
    return new Response(JSON.stringify(view), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  const host = document.createElement('div')
  root = createRoot(host)
  await act(async () =>
    root?.render(<CommercePanel origin={{ kind: 'promotion', offerRef: 'curso' }} />),
  )
  const text = host.textContent ?? ''
  expect(text).toContain(label)
  expect(text).not.toMatch(absent)
  expect(text).toContain('Sem cobrança ou cartão.')
  expect(requests).toBe(1)
})
