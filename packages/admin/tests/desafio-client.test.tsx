import { afterEach, beforeEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
// O `next/image` do Zappy no `LoadError` monta a URL a partir de `window.location`, e em
// `about:blank` o happy-dom recusa.
if (window.location.href === 'about:blank') {
  ;(window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    'http://localhost/',
  )
}
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { PlatformProvider } = await import('../src/components/admin/platform-provider')
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { DesafioClient } = await import('../src/app/admin/professor/desafio/desafio-client')

const theme = (slug: string, title: string) => ({
  slug,
  emoji: '*',
  title,
  description: `Descrição de ${title}`,
})

const months = {
  months: [
    {
      monthKey: 'm:2026-10',
      month: '2026-10',
      current: true,
      source: 'definido',
      theme: theme('espaco', 'Espaço'),
      customThemeId: null,
      updatedAt: null,
    },
    {
      monthKey: 'm:2026-11',
      month: '2026-11',
      current: false,
      source: 'sorteio',
      theme: theme('oceano', 'Oceano'),
      customThemeId: null,
      updatedAt: null,
    },
  ],
}
const themes = { builtin: [theme('espaco', 'Espaço'), theme('oceano', 'Oceano')], custom: [] }

let fail = false
let calls: Array<{ path: string; method: string }>
const originalFetch = globalThis.fetch

beforeEach(() => {
  fail = false
  calls = []
  globalThis.fetch = Object.assign(
    (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const path = new URL(String(input), 'http://admin.test').pathname
      calls.push({ path, method: init?.method ?? 'GET' })
      if (fail) return Response.json({ message: 'fora do ar' }, { status: 503 })
      if (path.endsWith('/challenge/months')) return Response.json(months)
      return Response.json(themes)
    }) as typeof fetch,
    { preconnect: originalFetch.preconnect },
  )
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

async function mount() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <PlatformProvider initialPlatform="kids">
        <DesafioClient />
      </PlatformProvider>,
    )
  })
  await act(async () => {})
  return {
    container,
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('os meses viram cartões: o mês no ar é o escuro e o escolhido pela equipe volta ao sorteio', async () => {
  const f = await mount()
  const cards = [...f.container.querySelectorAll('li')]
  expect(cards.length).toBe(2)
  const [atual, proximo] = cards
  expect(atual?.getAttribute('aria-current')).toBe('date')
  expect(atual?.className.includes('bg-menu')).toBe(true)
  expect(atual?.textContent).toContain('No ar agora')
  expect(atual?.textContent).toContain('Escolhido pela equipe')
  const botoes = (li: Element | undefined) =>
    [...(li?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim())
  expect(botoes(atual)).toContain('Voltar ao sorteio')
  expect(proximo?.textContent).toContain('Sorteado')
  expect(proximo?.textContent?.includes('No ar agora')).toBe(false)
  expect(botoes(proximo).includes('Voltar ao sorteio')).toBe(false)
  expect(f.container.textContent).toContain('Biblioteca de temas')
  await f.close()
})

test('falha ao carregar mostra o aviso de erro com tentar de novo, nunca a lista vazia', async () => {
  fail = true
  const f = await mount()
  expect(f.container.textContent).toContain('Não conseguimos carregar o desafio do mês')
  const retry = [...f.container.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === 'Tentar de novo',
  )
  expect(retry !== undefined).toBe(true)
  fail = false
  await act(async () => {
    retry?.click()
  })
  await act(async () => {})
  expect(f.container.textContent).toContain('No ar agora')
  expect(calls.every((c) => c.method === 'GET')).toBe(true)
  await f.close()
})
