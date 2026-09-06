import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { RankingContent } = await import('../src/app/admin/membros/ranking/ranking-content')

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (condition()) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  throw new Error('A atualização esperada não aconteceu.')
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('ranking administrativo por plataforma', () => {
  test('a primeira consulta da nova plataforma começa no offset zero', async () => {
    const originalFetch = globalThis.fetch
    const requests: URL[] = []
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        const url = new URL(String(input), 'http://admin.test')
        requests.push(url)
        return Response.json({
          items: [],
          total: 100,
          totalParticipants: 100,
          limit: 20,
          offset: Number(url.searchParams.get('offset')),
          searchTruncated: false,
        })
      },
      { preconnect: () => {} },
    ) satisfies typeof fetch
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(<RankingContent key="kids" platform="kids" />)
      })
      await waitFor(
        () =>
          requests.some(
            (request) =>
              request.searchParams.get('audience') === 'kids' &&
              request.searchParams.get('offset') === '0',
          ) &&
          container.querySelector<HTMLButtonElement>('button[aria-label="Próxima"]')?.disabled ===
            false,
      )

      const next = container.querySelector<HTMLButtonElement>('button[aria-label="Próxima"]')
      if (!next) throw new Error('Botão de próxima página não encontrado.')
      await act(async () => next.click())
      await waitFor(() =>
        requests.some(
          (request) =>
            request.searchParams.get('audience') === 'kids' &&
            request.searchParams.get('offset') === '20',
        ),
      )

      const beforeSwitch = requests.length
      await act(async () => root.render(<RankingContent key="adult" platform="adult" />))
      await waitFor(() => requests.length > beforeSwitch)
      const firstAdult = requests
        .slice(beforeSwitch)
        .find((request) => request.searchParams.get('audience') === 'adult')
      expect(firstAdult?.searchParams.get('offset')).toBe('0')
    } finally {
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
