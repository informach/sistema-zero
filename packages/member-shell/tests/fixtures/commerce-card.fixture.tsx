import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { CommerceView } from '../../src/lib/commerce'

GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const pending: { resolve(value: CommerceView): void; reject(error: Error): void }[] = []
mock.module('../../src/lib/api', () => ({
  apiSend: () => new Promise<CommerceView>((resolve, reject) => pending.push({ resolve, reject })),
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
  await act(async () => pending[0].resolve(included))
  expect(host.textContent).toContain('Continuar com meu filho')
  await render('purchase')
  expect(host.textContent).toContain('Comprar')
  expect(host.textContent).not.toContain('Continuar com meu filho')
})
test('prévia não conserva o atalho de um presente real', async () => {
  await render()
  await act(async () => pending[0].resolve(included))
  await render('gift', true)
  expect(host.textContent).not.toContain('Continuar com meu filho')
  expect(host.querySelector('button')?.disabled).toBe(true)
})
test('outra origem não exibe o curso incluído da origem anterior', async () => {
  await render()
  await act(async () => pending[0].resolve(included))
  await render('gift', false, 'outro-curso')
  expect(host.textContent).not.toContain('Cadê Todo Mundo? já está incluído')
})
test.each([
  'resolve',
  'reject',
] as const)('resposta antiga (%s) não substitui uma conferência mais recente', async (kind) => {
  await render()
  await act(async () => window.dispatchEvent(new Event('sz-commerce-updated')))
  await act(async () => pending[1].resolve(included))
  await act(async () =>
    kind === 'resolve'
      ? pending[0].resolve(gift)
      : pending[0].reject(new Error('Pedido antigo falhou')),
  )
  expect(host.textContent).toContain('Continuar com meu filho')
  expect(host.textContent).not.toContain('Ativar presente')
})
