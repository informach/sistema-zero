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

// Processo isolado (ver `turma-community-scope.test.ts`): trocar `next/navigation` aqui não
// vaza para os outros arquivos da suíte.
let search = new URLSearchParams()
const replaced: string[] = []
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    push: () => {},
    refresh: () => {},
    replace: (path: string) => replaced.push(path),
  }),
  useSearchParams: () => search,
  usePathname: () => '/admin/professor/recados',
}))
mock.module('@/components/editor/rich-text-editor', () => ({
  RichTextEditor: () => <textarea aria-label="Resposta" />,
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../../src/components/admin/platform-provider')
const { setPlatform } = await import('../../src/components/admin/platform-store')
const { RecadosClient } = await import('../../src/app/admin/professor/recados/recados-client')
const { EntregasClient } = await import('../../src/app/admin/professor/entregas/entregas-client')
const { waitingItems } = await import('../../src/app/admin/professor/professor-home-client')

const calls: Array<{ path: string; params: URLSearchParams; method: string; body: unknown }> = []
const originalFetch = globalThis.fetch
const close: Array<() => Promise<void>> = []

function threadRow(id: string, audience: 'kids' | 'adult', childName: string | null) {
  return {
    id,
    userId: `u-${id}`,
    accountId: `a-${id}`,
    audience,
    contextType: 'general',
    contextRef: null,
    courseId: null,
    courseTitle: null,
    lessonId: null,
    title: null,
    lastMessageAt: '2026-10-22T12:00:00.000Z',
    createdAt: '2026-10-22T12:00:00.000Z',
    lastMessagePreview: 'Oi',
    lastMessageRole: 'student',
    messageCount: 1,
    unread: true,
    workflowStatus: 'waiting_teacher',
    accountName: 'Responsável',
    accountEmail: 'r@example.com',
    childName,
  }
}

beforeEach(() => {
  setPlatform('kids')
  search = new URLSearchParams()
  replaced.length = 0
  calls.length = 0
  globalThis.fetch = Object.assign(
    (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(String(input), 'http://admin.test')
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      calls.push({ path: url.pathname, params: url.searchParams, method, body })
      if (url.pathname === '/api/members/courses') return Response.json({ items: [], total: 0 })
      if (url.pathname === '/api/members/teacher-threads/read-all')
        return Response.json({ updated: 0 })
      if (url.pathname === '/api/members/teacher-threads') {
        // O recado t9 não está na primeira página: só aparece nos recados de quem mandou.
        if (url.searchParams.get('userId') === 'u-t9')
          return Response.json({ threads: [threadRow('t9', 'kids', 'Bia')] })
        return Response.json({ threads: [threadRow('t1', 'kids', 'Davi')] })
      }
      if (url.pathname === '/api/members/teacher-threads/t9')
        return Response.json({ ...threadRow('t9', 'kids', null), messages: [], nextCursor: null })
      if (url.pathname.endsWith('/read')) return Response.json({})
      if (url.pathname === '/api/members/studio-submissions')
        return Response.json({ items: [], total: 0 })
      if (url.pathname.startsWith('/api/members/teacher-broadcasts')) return Response.json([])
      return Response.json({ error: { code: 'TEST', message: 'fora do teste' } }, { status: 404 })
    }) as typeof fetch,
    { preconnect: originalFetch.preconnect },
  )
})

afterEach(async () => {
  for (const cleanup of close.splice(0)) await cleanup()
  // Processo isolado: o que ainda sair depois do teste (o recarregar dos contadores depois de
  // ler um recado) recebe um 404 quieto, nunca a rede de verdade.
  globalThis.fetch = Object.assign(async () => Response.json({}, { status: 404 }), {
    preconnect: originalFetch.preconnect,
  }) satisfies typeof fetch
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(<PlatformProvider initialPlatform="kids">{node}</PlatformProvider>),
  )
  // A busca por nome espera 250 ms antes de valer: deixa esse tempo passar dentro do `act`.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })
  await settle()
  close.push(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  return container
}

async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

async function choose(select: HTMLSelectElement, value: string) {
  await act(async () => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await settle()
}

/** O selo de comunidade ao lado do título da tela. */
const chip = (container: HTMLElement) =>
  container.querySelector('h1')?.nextElementSibling?.textContent

function lastList(path: string) {
  return calls.filter((call) => call.path === path && call.method === 'GET').at(-1)
}

test('Recados: o filtro Comunidade nasce na lente, junta as duas e volta para a lente', async () => {
  const container = await mount(<RecadosClient />)
  const select = container.querySelector('#rec-community') as HTMLSelectElement
  expect([...select.options].map((option) => option.textContent)).toEqual([
    'Só a Comunidade dos Criadores',
    'As duas comunidades',
  ])
  expect(select.value).toBe('kids')
  expect(lastList('/api/members/teacher-threads')?.params.get('audience')).toBe('kids')
  expect(chip(container)).toBe('Comunidade dos Criadores')

  await choose(select, '')
  expect(lastList('/api/members/teacher-threads')?.params.has('audience')).toBe(false)
  // O selo acompanha o filtro: a fila mostra as duas comunidades.
  expect(chip(container)).toBe('Kids e Adultos juntos')
  // As duas comunidades: cada recado diz de qual comunidade é.
  expect(container.textContent).toContain('Kids')

  // "Marcar todos como lidos" cobre o que aparece: sem filtro de comunidade.
  const markAll = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Marcar todos como lidos',
  ) as HTMLButtonElement
  await act(async () => markAll.click())
  expect(document.body.textContent).toContain('Todos os recados não lidos das duas comunidades')
  const confirmButton = [...document.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Marcar como lidos',
  ) as HTMLButtonElement
  await act(async () => confirmButton.click())
  await settle()
  const readAll = calls.find((call) => call.path === '/api/members/teacher-threads/read-all')
  expect((readAll?.body as Record<string, unknown>).audience).toBeUndefined()

  await act(async () => setPlatform('adult'))
  await settle()
  const after = container.querySelector('#rec-community') as HTMLSelectElement
  expect(after.value).toBe('adult')
  expect(after.options[0]?.textContent).toBe('Só a Comunidade Sistema Zero')
  expect(lastList('/api/members/teacher-threads')?.params.get('audience')).toBe('adult')
})

test('Projetos: "As duas comunidades" tira o filtro de audiência da fila', async () => {
  const container = await mount(<EntregasClient />)
  const select = container.querySelector('#ent-community') as HTMLSelectElement
  expect(select.value).toBe('kids')
  expect(lastList('/api/members/studio-submissions')?.params.get('audience')).toBe('kids')
  expect(chip(container)).toBe('Comunidade dos Criadores')
  await choose(select, '')
  expect(chip(container)).toBe('Kids e Adultos juntos')
  const list = calls.filter(
    (call) => call.path === '/api/members/studio-submissions' && call.params.get('limit') === '30',
  )
  expect(list.at(-1)?.params.has('audience')).toBe(false)
})

test('Recados aberto pela Home: o nome vem dos recados de quem mandou, nunca do endereço', async () => {
  search = new URLSearchParams({ abrir: 't9' })
  const container = await mount(<RecadosClient />)
  await settle()
  const dialog = container.querySelector('[role="dialog"]')
  expect(dialog?.getAttribute('aria-label')).toBe('Recados com Bia')
  const byUser = calls.find(
    (call) => call.path === '/api/members/teacher-threads' && call.params.get('userId') === 'u-t9',
  )
  expect(byUser?.params.get('audience')).toBe('kids')
  expect(replaced.at(-1)).toBe('/admin/professor/recados')
})

test('Hoje: o link de um recado leva só o id, sem o nome da criança', () => {
  const items = waitingItems(
    {
      counts: { pendingSubmissions: 0, unreadThreads: 1, moderationPending: 0, openReports: 0 },
      recent: {
        submissions: [],
        threads: [threadRow('t1', 'kids', 'Davi')] as never,
      },
    },
    'kids',
  )
  const recado = items.find((item) => item.kind === 'recados')
  expect(recado?.href).toBe('/admin/professor/recados?abrir=t1')
  expect(recado?.href.includes('Davi')).toBe(false)
  expect(recado?.name).toBe('Davi')
})
