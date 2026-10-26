import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { CreatorMasterySubmission } from '../src/lib/mastery'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MasterySubmission } = await import('../src/components/mastery-submission')
const originalFetch = globalThis.fetch
const cleanups: (() => Promise<void>)[] = []
function stubFetch(handler: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>) {
  globalThis.fetch = Object.assign(handler, { preconnect: originalFetch.preconnect })
}
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  globalThis.fetch = originalFetch
})
const oldEvidence = '30000000-0000-4000-8000-000000000001'
const newEvidence = '30000000-0000-4000-8000-000000000002'
const reviewed: CreatorMasterySubmission = {
  id: '30000000-0000-4000-8000-000000000003',
  evidenceId: oldEvidence,
  evidenceTitle: 'Primeira versão',
  masteryId: 'python2d',
  level: 1,
  policyVersion: 1,
  rubricVersion: 1,
  submittedAt: '2026-10-25T12:00:00Z',
  message: null,
  status: 'changes-requested',
  feedback: 'Revise a colisão.',
  criteria: [],
  credits: [],
  reviewedAt: '2026-10-25T13:00:00Z',
}
async function mount(ids = [oldEvidence, newEvidence], available = true) {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  const router = {
    bfcacheId: 'test',
    back() {},
    forward() {},
    refresh() {},
    hmrRefresh() {},
    push() {},
    replace() {},
    prefetch() {},
  }
  await act(async () =>
    root.render(
      <AppRouterContext.Provider value={router}>
        <MasterySubmission
          areaId="python2d"
          level={1}
          skin="kids"
          hasAccess
          available={available}
          current={reviewed}
          evidence={ids.map((id) => ({
            id,
            title: id === oldEvidence ? 'Versão já avaliada' : 'Nova versão',
            createdAt: '2026-10-25T14:00:00Z',
            lessonId: 'lesson',
            kind: 'studio',
          }))}
        />
      </AppRouterContext.Provider>,
    ),
  )
  cleanups.push(async () => {
    await act(async () => root.unmount())
    element.remove()
  })
  return element
}
async function chooseAndSubmit(element: HTMLElement) {
  const select = element.querySelector('select')!
  await act(async () => {
    select.value = newEvidence
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}
test('after review, the current evidence is excluded and a genuinely new version can be submitted', async () => {
  const calls: Record<string, unknown>[] = []
  stubFetch(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)))
    return Response.json({
      ...reviewed,
      id: 'new-submission',
      evidenceId: newEvidence,
      status: 'pending',
      feedback: null,
    })
  })
  const element = await mount()
  expect([...element.querySelectorAll('option')].map((option) => option.value)).not.toContain(
    oldEvidence,
  )
  await chooseAndSubmit(element)
  expect(calls).toEqual([{ evidenceId: newEvidence }])
  expect(element.textContent).toContain('Versão enviada. A equipe vai avaliar')
  expect(element.querySelector('form')).toBeNull()
})
test.each([
  'approved',
  'changes-requested',
] as const)('idempotent %s reply never announces a new pending review', async (status) => {
  stubFetch(async () => Response.json({ ...reviewed, evidenceId: newEvidence, status }))
  const element = await mount()
  await chooseAndSubmit(element)
  expect(element.textContent).not.toContain('Versão enviada. A equipe vai avaliar')
  expect(element.textContent).toContain('Salve uma nova versão para enviar novamente')
  expect(element.querySelector('[role="alert"]')?.textContent).toContain(
    status === 'approved' ? 'já foi aprovada' : 'já foi avaliada',
  )
})
test('a reviewed version alone and an unavailable level never offer a submission form', async () => {
  const onlyReviewed = await mount([oldEvidence])
  expect(onlyReviewed.querySelector('form')).toBeNull()
  expect(onlyReviewed.textContent).toContain('Mudar apenas o recado não cria uma nova entrega')
  const locked = await mount([newEvidence], false)
  expect(locked.querySelector('form')).toBeNull()
  expect(locked.textContent).toContain('Conclua o par de entrada e o nível anterior')
  expect(locked.textContent).toContain('Revise a colisão')
})
