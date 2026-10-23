import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
// O Zappy dos estados vazios é um `next/image`, que resolve o endereço contra a página.
if (window.location.href === 'about:blank') {
  ;(window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    'http://localhost/',
  )
}
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Processo isolado (ver `account-id-details.test.ts`): trocar `next/navigation` aqui não vaza
// para os outros arquivos da suíte.
let search = new URLSearchParams()
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    push: () => {},
    refresh: () => {},
    replace: () => {},
  }),
  useSearchParams: () => search,
  usePathname: () => '/admin/membros/u1',
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../../src/components/admin/platform-provider')
const { setPlatform } = await import('../../src/components/admin/platform-store')
const { ModerationClient } = await import(
  '../../src/app/admin/comunidade/moderacao/moderation-client'
)
const { MemberDetailClient } = await import(
  '../../src/app/admin/membros/[userId]/member-detail-client'
)

const ACCOUNT_ID = '33333333-3333-4333-8333-333333333333'
const PROFILE_ID = '44444444-4444-4444-8444-444444444444'
const SPACE_ID = '55555555-5555-4555-8555-555555555555'
const originalFetch = globalThis.fetch
const close: Array<() => Promise<void>> = []

beforeEach(() => {
  setPlatform('kids')
  search = new URLSearchParams()
  globalThis.fetch = Object.assign(
    (async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input), 'http://admin.test')
      if (url.pathname === '/api/hub/admin/spaces')
        return Response.json({
          items: [{ id: SPACE_ID, name: 'Clube dos Criadores', audience: 'kids' }],
          total: 1,
        })
      if (url.pathname === '/api/hub/admin/pending' || url.pathname === '/api/hub/admin/reports')
        return Response.json({ items: [], total: 0 })
      if (url.pathname === '/api/hub/admin/mutes-bans')
        return Response.json({
          items: [
            {
              id: 'mb1',
              userId: ACCOUNT_ID,
              spaceId: SPACE_ID,
              channelId: null,
              kind: 'mute',
              expiresAt: null,
              reason: 'Spam no mural',
              createdBy: 'equipe',
              createdAt: '2026-10-20T12:00:00.000Z',
            },
          ],
        })
      if (url.pathname === `/api/members/${ACCOUNT_ID}`)
        return Response.json({
          userId: ACCOUNT_ID,
          user: {
            id: ACCOUNT_ID,
            email: 'familia@example.com',
            firstName: 'Lia',
            lastName: 'Souza',
            role: 'customer',
            status: 'active',
            phone: null,
            signupSource: null,
            passwordSet: true,
            version: 1,
            createdAt: '2026-10-01T12:00:00.000Z',
            updatedAt: '2026-10-01T12:00:00.000Z',
          },
          entitlements: [],
          progress: [],
          profiles: [{ id: PROFILE_ID, name: 'Davi', avatarUrl: null, progress: [] }],
        })
      return Response.json({ error: { code: 'TEST', message: 'fora do teste' } }, { status: 404 })
    }) as typeof fetch,
    { preconnect: originalFetch.preconnect },
  )
})

afterEach(async () => {
  for (const cleanup of close.splice(0)) await cleanup()
  globalThis.fetch = Object.assign(async () => Response.json({}, { status: 404 }), {
    preconnect: originalFetch.preconnect,
  }) satisfies typeof fetch
})

async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(<PlatformProvider initialPlatform="kids">{node}</PlatformProvider>),
  )
  await settle()
  close.push(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  return container
}

function buttonNamed(root: ParentNode, label: string) {
  return [...root.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined
}

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('Moderação: o campo é Espaço, e o ID da conta só aparece nos detalhes técnicos', async () => {
  search = new URLSearchParams({ aba: 'silenciados' })
  const container = await mount(<ModerationClient currentRole="admin" />)
  expect(container.querySelector('label[for="mod-space"]')?.textContent).toContain('Espaço')
  expect(container.textContent).not.toContain('Servidor')
  expect(container.textContent).toContain('no campo Espaço')

  const select = container.querySelector('#mod-space') as HTMLSelectElement
  await act(async () => {
    select.value = SPACE_ID
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await settle()

  // A linha do silenciado: selo, desde quando e o motivo; o ID fica fechado.
  const section = container.querySelector('section[aria-label="Silenciados"]') as HTMLElement
  const details = section.querySelector('details') as HTMLDetailsElement
  expect(details.querySelector('summary')?.textContent).toBe('Detalhes técnicos')
  expect(details.textContent).toContain(ACCOUNT_ID)
  const card = details.parentElement as HTMLElement
  const mainLine = [...card.children]
    .filter((child) => child !== details)
    .map((child) => child.textContent)
    .join(' ')
  expect(mainLine).toContain('Silenciado')
  expect(mainLine).not.toContain(ACCOUNT_ID)
  expect(container.textContent).toContain('Na ficha da conta, abra Detalhes técnicos')

  // As confirmações dizem "Esta conta", não o ID cru.
  await act(async () => buttonNamed(section, 'Tirar o silêncio')?.click())
  const liftDialog = document.querySelector('[role="dialog"]') as HTMLElement
  expect(liftDialog.textContent).toContain('Esta conta volta a poder postar')
  expect(liftDialog.textContent).not.toContain(ACCOUNT_ID)
  await act(async () => buttonNamed(liftDialog, 'Cancelar')?.click())

  await typeInto(container.querySelector('#mb-user') as HTMLInputElement, ACCOUNT_ID)
  await act(async () => buttonNamed(section, 'Aplicar')?.click())
  const muteDialog = document.querySelector('[role="dialog"]') as HTMLElement
  expect(muteDialog.textContent).toContain('Esta conta não pode postar')
  expect(muteDialog.textContent).not.toContain(ACCOUNT_ID)
})

test('Ficha da conta: ID nos detalhes técnicos, sem selo de comunidade e com recado em grupo', async () => {
  const container = await mount(
    <MemberDetailClient userId={ACCOUNT_ID} currentUser={{ id: 'equipe-1', role: 'staff' }} />,
  )
  // Sem selo ao lado do nome: a conta pode estar nas duas comunidades.
  expect(container.querySelector('h1')?.nextElementSibling).toBeNull()

  // Só leitura: a faixa aparece uma vez só.
  const notices = [...container.querySelectorAll('[role="note"]')].filter((node) =>
    node.textContent?.includes('Só leitura'),
  )
  expect(notices.length).toBe(1)

  // O ID que a Moderação pede está na ficha, fechado, com botão de copiar.
  const technical = [...container.querySelectorAll('details')].find(
    (node) => node.querySelector('summary')?.textContent?.trim() === 'Detalhes técnicos',
  ) as HTMLDetailsElement
  expect(technical.textContent).toContain(ACCOUNT_ID)
  expect(buttonNamed(technical, 'Copiar o ID')).toBeDefined()

  // O "Mais": recado em grupo para a criança escolhida e "Conceder acesso" apagado.
  const summary = [...container.querySelectorAll('summary')].find(
    (node) => node.textContent?.trim() === 'Mais',
  ) as HTMLElement
  await act(async () => summary.click())
  const group = [...container.querySelectorAll('a')].find(
    (link) => link.textContent?.trim() === 'Mandar recado em grupo',
  ) as HTMLAnchorElement
  expect(group.getAttribute('href')).toBe(`/admin/professor/recados?userId=${PROFILE_ID}&compose=1`)
  const grant = buttonNamed(container, 'Conceder acesso') as HTMLButtonElement
  expect(grant.disabled).toBe(true)
  expect(grant.title).toBe('Só Admin concede acesso.')
})
