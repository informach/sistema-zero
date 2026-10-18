import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
  configurable: true,
})
const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { AtendimentoClient } = await import('../src/app/admin/atendimento/atendimento-client')
const { UserMenu } = await import('../src/components/admin/user-menu')

const APP = 'https://atendimento.sistemazero.com.br'
const originalFetch = globalThis.fetch

const STATS = {
  counts: { new: 4, open: 6, waiting: 2 },
  resolvedToday: 3,
  resolved7d: 18,
  sla: { atRisk: 1, breached: 2, unassigned: 5 },
  volume: [{ date: '2026-10-17', created: 4 }],
}

const ATTENTION = {
  total: 3,
  items: [
    {
      id: 'tk-1',
      subject: 'Não consigo entrar',
      requester: 'Ana',
      assignedToName: null,
      slaState: 'breached',
      remainingMinutes: -30,
    },
  ],
}

function stubFetch(routes: Record<string, { status: number; body: unknown }>) {
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    const hit = routes[url]
    if (!hit) return Promise.reject(new Error(`rota inesperada: ${url}`))
    return Promise.resolve(
      new Response(JSON.stringify(hit.body), {
        status: hit.status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }) as typeof fetch
}

async function montar(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  // Deixa as duas buscas do painel resolverem.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return { container, root }
}

afterEach(() => {
  globalThis.fetch = originalFetch
  document.body.innerHTML = ''
})

test('o painel mostra os números e leva ao atendimento já no filtro certo', async () => {
  stubFetch({
    '/api/helpdesk/stats': { status: 200, body: STATS },
    '/api/helpdesk/attention': { status: 200, body: ATTENTION },
  })
  const { container, root } = await montar(React.createElement(AtendimentoClient, { appUrl: APP }))

  const text = container.textContent ?? ''
  expect(text).toContain('SLA estourado')
  expect(text).toContain('Aguardando cliente')
  expect(text).toContain('Estourado há 30 min')

  const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
  expect(hrefs).toContain(`${APP}/`)
  expect(hrefs).toContain(`${APP}/tickets?queue=attention`)
  expect(hrefs).toContain(`${APP}/tickets?queue=unassigned`)
  expect(hrefs).toContain(`${APP}/tickets?status=waiting`)
  expect(hrefs).toContain(`${APP}/tickets/tk-1`)
  // Total maior que a lista: o atalho para o resto da fila aparece.
  expect(text).toContain('Ver os 3 tickets no atendimento')
  // Tudo abre em outra aba, sem dar ao app de atendimento acesso a esta janela.
  for (const a of container.querySelectorAll('a')) {
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
  }
  await act(async () => root.unmount())
})

test('falha ao carregar os números vira traço e aviso, nunca zero', async () => {
  stubFetch({
    '/api/helpdesk/stats': {
      status: 502,
      body: { error: { code: 'UPSTREAM', message: 'O atendimento não respondeu.' } },
    },
    '/api/helpdesk/attention': { status: 200, body: { total: 0, items: [] } },
  })
  const { container, root } = await montar(React.createElement(AtendimentoClient, { appUrl: APP }))

  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    'O atendimento não respondeu.',
  )
  const values = [...container.querySelectorAll('p.tabular-nums')].map((p) => p.textContent)
  expect(values.length).toBe(8)
  expect(values.every((v) => v === '—')).toBe(true)
  expect(container.textContent).toContain('Nenhum ticket com o prazo em risco agora.')
  // O gráfico não fica pulsando como se ainda carregasse.
  expect(container.textContent).toContain('O gráfico volta quando os números carregarem.')
  await act(async () => root.unmount())
})

test('sem a URL do app, o painel funciona e os atalhos somem', async () => {
  stubFetch({
    '/api/helpdesk/stats': { status: 200, body: STATS },
    '/api/helpdesk/attention': { status: 200, body: ATTENTION },
  })
  const { container, root } = await montar(React.createElement(AtendimentoClient, { appUrl: null }))
  expect(container.querySelectorAll('a').length).toBe(0)
  expect(container.textContent).toContain('HELPDESK_APP_URL')
  expect(container.textContent).toContain('Não consigo entrar')
  await act(async () => root.unmount())
})

const USER = {
  id: 'u-1',
  email: 'tocha@example.com',
  firstName: 'Tocha',
  lastName: 'Luz',
  role: 'admin',
  status: 'active',
}

test('o menu do avatar lista os outros apps em nova aba, acima do Sair', async () => {
  const { container, root } = await montar(
    React.createElement(UserMenu, {
      user: USER,
      apps: [
        { id: 'helpdesk', label: 'Atendimento', href: APP },
        { id: 'marketing', label: 'Marketing', href: 'https://marketing.sistemazero.com.br' },
      ],
    }),
  )
  const trigger = container.querySelector('button[aria-label="Conta"]') as HTMLButtonElement
  await act(async () => trigger.click())

  const links = [...container.querySelectorAll('a')]
  expect(links.map((a) => a.textContent)).toEqual([
    'Atendimento(abre em nova aba)',
    'Marketing(abre em nova aba)',
  ])
  expect(links.every((a) => a.getAttribute('target') === '_blank')).toBe(true)
  expect(links.every((a) => a.getAttribute('rel') === 'noopener noreferrer')).toBe(true)
  const buttons = [...container.querySelectorAll('button')].map((b) => b.textContent)
  expect(buttons.at(-1)).toBe('Sair')
  await act(async () => root.unmount())
})

test('o menu sem lista de apps (componente cru) continua só com o Sair', async () => {
  const { container, root } = await montar(React.createElement(UserMenu, { user: USER }))
  const trigger = container.querySelector('button[aria-label="Conta"]') as HTMLButtonElement
  await act(async () => trigger.click())
  expect(container.querySelectorAll('a').length).toBe(0)
  expect(container.textContent).not.toContain('Apps')
  expect(container.textContent).toContain('Sair')
  await act(async () => root.unmount())
})
