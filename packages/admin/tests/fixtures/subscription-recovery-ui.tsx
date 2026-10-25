import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { RecoveryPolicyView } from '../../src/lib/subscription-recovery'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  usePathname: () => '/admin/pagamentos/regularizacao',
}))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { RecoveryPolicyClient } = await import(
  '../../src/app/admin/pagamentos/regularizacao/recovery-policy-client'
)
const originalFetch = globalThis.fetch
const close: Array<() => Promise<void>> = []
const calls: { method: string; body: unknown }[] = []
let record: RecoveryPolicyView
let failRead = false
const reviewCalls: string[] = []
let review: (path: string) => Promise<Response>
const confirmationCalls: unknown[] = []
const confirmationPaths: string[] = []
let confirmation: () => Promise<Response>
let write: () => Promise<Response>
beforeEach(() => {
  calls.length = 0
  failRead = false
  reviewCalls.length = 0
  confirmationCalls.length = 0
  confirmationPaths.length = 0
  confirmation = async () => Response.json({ confirmed: true })
  review = async () => Response.json({ items: [], total: 0, limit: 25, offset: 0 })
  record = {
    configurationReady: true,
    configuration: {
      version: 1,
      windowDays: 7,
      reminderDays: [3, 6],
      enabled: false,
      activatedAt: null,
      updatedAt: '2026-10-24T12:00:00Z',
      updatedBy: 'qa-admin',
    },
  }
  write = async () =>
    Response.json({ ...record, configuration: { ...record.configuration, version: 2 } })
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      if (String(input).startsWith('/api/payments/recovery/review?')) {
        reviewCalls.push(String(input))
        return review(String(input))
      }
      if (
        String(input).endsWith('/confirm-period') ||
        String(input).endsWith('/confirm-payment') ||
        String(input).endsWith('/admit') ||
        String(input).endsWith('/resolve-subsequent-payment')
      ) {
        confirmationPaths.push(String(input))
        confirmationCalls.push(typeof init?.body === 'string' ? JSON.parse(init.body) : null)
        return confirmation()
      }
      if (String(input) !== '/api/payments/recovery/policy')
        throw new Error('Unexpected QA request')
      const method = init?.method ?? 'GET'
      calls.push({ method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null })
      if (method === 'PUT') return write()
      return failRead
        ? Response.json({ error: { message: 'Falha de leitura QA' } }, { status: 503 })
        : Response.json(record)
    },
    originalFetch,
  )
})
afterEach(async () => {
  for (const dispose of close.splice(0)) await dispose()
  globalThis.fetch = originalFetch
})
async function mount(role = 'admin') {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  close.push(async () => {
    await act(async () => root.unmount())
    element.remove()
  })
  await act(async () => {
    root.render(<RecoveryPolicyClient currentRole={role} />)
  })
  return element
}
function button(element: HTMLElement, text: string) {
  const found = [...element.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === text,
  )
  if (!found) throw new Error(`Missing QA button ${text}`)
  return found
}
async function submit(element: HTMLElement) {
  await act(async () => {
    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}
test('staff sees both-audience policy, with writes disabled', async () => {
  const element = await mount('staff')
  expect(element.textContent).toContain('Kids e Adultos')
  expect(
    [...element.querySelector('form')!.querySelectorAll('input')].every((input) => input.disabled),
  ).toBe(true)
  expect(button(element, 'Salvar configuração').disabled).toBe(true)
  await submit(element)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
})
test('failed load never exposes seeded defaults as current server policy', async () => {
  failRead = true
  const element = await mount()
  expect(element.querySelector('[role=alert]')?.textContent).toContain('Falha de leitura QA')
  expect(
    [...element.querySelectorAll('button')].some(
      (item) => item.textContent === 'Salvar configuração',
    ),
  ).toBe(false)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
})
test('unconfigured communications disable activation but allow an explicit inactive policy', async () => {
  record.configurationReady = false
  const element = await mount()
  expect(element.querySelector<HTMLInputElement>('input[type=checkbox]')?.disabled).toBe(true)
  await submit(element)
  expect(calls.filter((call) => call.method === 'PUT')).toEqual([
    {
      method: 'PUT',
      body: { expectedVersion: 1, windowDays: 7, reminderDays: [3, 6], enabled: false },
    },
  ])
})
test('two submit events share one request and preserve the read version', async () => {
  let release: (value: Response) => void = () => {}
  write = () =>
    new Promise((resolve) => {
      release = resolve
    })
  const element = await mount()
  await submit(element)
  await submit(element)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1)
  await act(async () => {
    release(Response.json({ ...record, configuration: { ...record.configuration, version: 2 } }))
  })
  expect(element.textContent).toContain('Configuração salva')
})
test('uncertain save is not retried automatically; explicit reload reconciles it', async () => {
  write = async () => {
    throw new Error('QA connection lost')
  }
  const element = await mount()
  await submit(element)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1)
  expect(element.querySelector('[role=alert]')).not.toBeNull()
  record.configuration = { ...record.configuration!, version: 2, enabled: true }
  await act(async () => button(element, 'Recarregar configuração').click())
  expect(element.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked).toBe(true)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1)
})

const reviewItem = {
  kind: 'OPERATION',
  id: 'qa-operation',
  subscriptionId: 'qa-subscription',
  paymentId: 'qa-payment',
  audience: 'unknown',
  state: 'UNKNOWN',
  reason: 'PAYMENT_CONFIRMATION_REQUIRED',
  amountInCents: '9700',
  version: 1,
  openedAt: '2026-10-24T12:00:00Z',
  deadlineAt: null,
  customerName: 'Titular QA',
  customerEmail: 'qa@example.invalid',
}
const reviewPage = (item = reviewItem) => ({ items: [item], total: 1, limit: 25, offset: 0 })

test('queue exposes uncertain payment with audience unknown, with no financial action', async () => {
  review = async () => Response.json(reviewPage())
  const element = await mount('staff')
  expect(element.textContent).toContain('Titular QA')
  expect(element.textContent).toContain('qa@example.invalid')
  expect(element.textContent).toContain('Resultado ainda não confirmado')
  expect(element.textContent).toContain('Não repetir a cobrança')
  expect(element.textContent).toContain('Público a confirmar')
  expect(element.textContent).not.toContain('PAYMENT_CONFIRMATION_REQUIRED')
  expect(calls.every((call) => call.method === 'GET')).toBe(true)
  expect(reviewCalls).toHaveLength(1)
})

test('entrada histórica exige política ativa e público explícito, com um único POST auditável', async () => {
  if (!record.configuration) throw new Error('Missing QA policy')
  record.configuration = { ...record.configuration, enabled: true }
  review = async () =>
    Response.json(reviewPage({ ...reviewItem, kind: 'ADMISSION', state: 'HISTORICAL' }))
  const staff = await mount('staff')
  expect(button(staff, 'Revisar e iniciar acompanhamento').disabled).toBe(true)
  await close.pop()?.()
  const pending = Promise.withResolvers<Response>()
  confirmation = () => pending.promise
  const admin = await mount()
  expect(button(admin, 'Revisar e iniciar acompanhamento').disabled).toBe(true)
  const select = [...admin.querySelectorAll('label')]
    .find((label) => label.textContent?.includes('Público da assinatura'))
    ?.querySelector('select')
  if (!select) throw new Error('Missing audience selection')
  await act(async () => {
    select.value = 'adult'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {
    button(admin, 'Revisar e iniciar acompanhamento').click()
    button(admin, 'Revisar e iniciar acompanhamento').click()
  })
  expect(confirmationPaths).toEqual(['/api/payments/recovery/payments/qa-payment/admit'])
  expect(confirmationCalls).toHaveLength(1)
  expect(confirmationCalls[0]).toMatchObject({ expectedVersion: 1, audience: 'adult' })
  const command = confirmationCalls[0]
  if (!command || typeof command !== 'object') throw new Error('Missing admission command')
  expect(Object.keys(command).sort()).toEqual(['audience', 'expectedVersion', 'requestId'])
  review = async () =>
    Response.json(reviewPage({ ...reviewItem, kind: 'CASE', audience: 'adult', state: 'OPEN' }))
  await act(async () => pending.resolve(Response.json({ admitted: true, caseId: 'qa-case' })))
  expect(admin.textContent).toContain('Revisão registrada')
  expect(admin.textContent).toContain('O prazo começará no aceite do primeiro aviso')
  expect(admin.textContent).not.toContain('Revisar e iniciar acompanhamento')
})

test('política inativa não permite iniciar entrada histórica', async () => {
  review = async () =>
    Response.json(
      reviewPage({ ...reviewItem, kind: 'ADMISSION', audience: 'kids', state: 'HISTORICAL' }),
    )
  const admin = await mount()
  expect(button(admin, 'Revisar e iniciar acompanhamento').disabled).toBe(true)
  expect(admin.textContent).toContain('Ative a política')
  expect(confirmationCalls).toHaveLength(0)
})

test('queue read failure stays visible instead of claiming no cases', async () => {
  review = async () => Response.json({ error: { code: 'QA_UNAVAILABLE' } }, { status: 503 })
  const element = await mount()
  expect(element.textContent).toContain('Não foi possível carregar as conferências')
  expect(element.textContent).not.toContain('Nenhuma conferência neste filtro')
})

test('audience change discards late response from previous queue filter', async () => {
  const pending = Promise.withResolvers<Response>()
  review = async (path) =>
    path.includes('audience=adult')
      ? Response.json(reviewPage({ ...reviewItem, audience: 'adult', customerName: 'Adulto QA' }))
      : pending.promise
  const element = await mount()
  const select = element.querySelector<HTMLSelectElement>('select')!
  await act(async () => {
    select.value = 'adult'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(element.textContent).toContain('Adulto QA')
  await act(async () =>
    pending.resolve(
      Response.json(reviewPage({ ...reviewItem, customerName: 'Resposta antiga QA' })),
    ),
  )
  expect(element.textContent).not.toContain('Resposta antiga QA')
  expect(element.textContent).toContain('Adulto QA')
})

test.each([
  'period',
  'payment',
  'resolution',
] as const)('staff cannot confirm %s and administrator sends only the fence and request id once', async (kind) => {
  const label =
    kind === 'resolution'
      ? 'Conferir ciclo posterior pago'
      : kind === 'period'
        ? 'Conferir período na operadora'
        : 'Conferir pagamento na operadora'
  const field = kind === 'payment' ? 'expectedAttempt' : 'expectedVersion'
  review = async () =>
    Response.json(
      reviewPage({
        ...reviewItem,
        kind: kind === 'resolution' ? 'CASE' : kind === 'period' ? 'PERIOD' : 'OPERATION',
        state: kind === 'period' ? 'REVIEW_REQUIRED' : 'UNKNOWN',
      }),
    )
  const staff = await mount('staff')
  expect(button(staff, label).disabled).toBe(true)
  expect(confirmationCalls).toHaveLength(0)
  await close.pop()?.()
  const pending = Promise.withResolvers<Response>()
  confirmation = () => pending.promise
  const admin = await mount()
  await act(async () => {
    button(admin, label).click()
    button(admin, label).click()
  })
  expect(confirmationCalls).toHaveLength(1)
  expect(confirmationPaths).toEqual([
    kind === 'resolution'
      ? '/api/payments/recovery/cases/qa-operation/resolve-subsequent-payment'
      : kind === 'period'
        ? '/api/payments/recovery/payments/qa-payment/confirm-period'
        : '/api/payments/recovery/operations/qa-operation/confirm-payment',
  ])
  const body = confirmationCalls[0] as Record<string, unknown>
  expect(body[field]).toBe(1)
  expect(typeof body.requestId).toBe('string')
  expect(Object.keys(body).sort()).toEqual([field, 'requestId'])
  review = async () => Response.json({ items: [], total: 0, limit: 25, offset: 0 })
  await act(async () => pending.resolve(Response.json({ confirmed: true })))
  expect(admin.textContent).toContain(
    kind === 'resolution'
      ? 'Acompanhamento encerrado com prova'
      : kind === 'period'
        ? 'Período conferido e registrado'
        : 'Pagamento confirmado e conferência registrada',
  )
  expect(admin.textContent).toContain('Nenhuma conferência neste filtro')
  expect(confirmationCalls).toHaveLength(1)
})
