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
let write: () => Promise<Response>
beforeEach(() => {
  calls.length = 0
  failRead = false
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
  expect([...element.querySelectorAll('input')].every((input) => input.disabled)).toBe(true)
  expect(button(element, 'Salvar configuração').disabled).toBe(true)
  await submit(element)
  expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
})
test('failed load never exposes seeded defaults as current server policy', async () => {
  failRead = true
  const element = await mount()
  expect(element.querySelector('[role=alert]')?.textContent).toContain('Falha de leitura QA')
  expect(element.querySelector('form')).toBeNull()
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
