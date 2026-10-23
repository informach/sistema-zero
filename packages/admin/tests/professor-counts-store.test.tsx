import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ensureProfessorCounts, useProfessorOverview, useProfessorOverviewFailed } = await import(
  '../src/components/admin/professor-counts-store'
)
const { getPlatform, setPlatform } = await import('../src/components/admin/platform-store')

function CountsConsumer() {
  const overview = useProfessorOverview()
  return <div>{overview?.counts.pendingSubmissions ?? 'carregando'}</div>
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) return
    await act(async () => {
      await Promise.resolve()
    })
  }
  throw new Error('A atualização esperada não aconteceu.')
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('contadores da Sala do Professor', () => {
  test('ao voltar para a janela busca entregas novas mesmo dentro do TTL', async () => {
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = Object.assign(
      async () => {
        requests += 1
        return Response.json({
          counts: {
            pendingSubmissions: requests,
            unreadThreads: 0,
            moderationPending: 0,
            openReports: 0,
          },
          recent: { submissions: [], threads: [] },
        })
      },
      { preconnect: () => {} },
    ) satisfies typeof fetch

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await ensureProfessorCounts(true)
      await act(async () => root.render(<CountsConsumer />))
      expect(container.textContent).toBe('1')

      await act(async () => window.dispatchEvent(new Event('focus')))
      await waitFor(() => requests === 2)

      expect(container.textContent).toBe('2')
    } finally {
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    }
  })

  test('refresh forçado durante um fetch em voo agenda e aguarda uma nova consulta', async () => {
    const originalFetch = globalThis.fetch
    const first = Promise.withResolvers<Response>()
    const second = Promise.withResolvers<Response>()
    let requests = 0
    globalThis.fetch = Object.assign(
      async () => {
        requests += 1
        return requests === 1 ? first.promise : second.promise
      },
      { preconnect: () => {} },
    ) satisfies typeof fetch

    try {
      const initial = ensureProfessorCounts(true)
      const forced = ensureProfessorCounts(true)
      expect(requests).toBe(1)

      first.resolve(
        Response.json({
          counts: {
            pendingSubmissions: 1,
            unreadThreads: 0,
            moderationPending: 0,
            openReports: 0,
          },
          recent: { submissions: [], threads: [] },
        }),
      )
      await initial
      await waitFor(() => requests === 2)

      second.resolve(
        Response.json({
          counts: {
            pendingSubmissions: 2,
            unreadThreads: 0,
            moderationPending: 0,
            openReports: 0,
          },
          recent: { submissions: [], threads: [] },
        }),
      )
      await forced
      expect(requests).toBe(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('trocar a lente larga os itens da outra comunidade: se a nova leitura falha, é erro', async () => {
    const originalFetch = globalThis.fetch
    const originalPlatform = getPlatform()
    let failing = false
    globalThis.fetch = Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        if (failing) return Response.json({ message: 'fora do ar' }, { status: 503 })
        const platform = new URL(String(input), 'http://admin.test').searchParams.get('platform')
        return Response.json({
          counts: {
            pendingSubmissions: platform === 'kids' ? 7 : 3,
            unreadThreads: 0,
            moderationPending: 0,
            openReports: 0,
          },
          recent: { submissions: [], threads: [] },
        })
      },
      { preconnect: () => {} },
    ) satisfies typeof fetch

    function Consumer() {
      const overview = useProfessorOverview()
      const failed = useProfessorOverviewFailed()
      return (
        <div>
          {failed ? 'erro' : 'ok'}:{overview?.counts.pendingSubmissions ?? 'nada'}
        </div>
      )
    }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      setPlatform('kids')
      await ensureProfessorCounts(true)
      await act(async () => root.render(<Consumer />))
      expect(container.textContent).toBe('ok:7')

      failing = true
      await act(async () => setPlatform('adult'))
      await waitFor(() => container.textContent === 'erro:nada')
      expect(container.textContent).toBe('erro:nada')
    } finally {
      await act(async () => setPlatform(originalPlatform))
      await ensureProfessorCounts()
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
