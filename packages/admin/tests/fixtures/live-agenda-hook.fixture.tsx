import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveCatalogView } from '@sistemazero/core/live'
import type { LiveAgendaState } from '../../src/app/admin/professor/ao-vivo/use-live-agenda'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { useLiveAgenda } = await import('../../src/app/admin/professor/ao-vivo/use-live-agenda')
const originalFetch = globalThis.fetch
const roots: Array<() => void> = []
afterEach(() => {
  for (const close of roots.splice(0)) close()
  globalThis.fetch = originalFetch
})

function catalog(id: string, nextCursor: string | null): LiveCatalogView {
  return {
    programs: [],
    cohorts: [
      {
        id,
        programId: 'program',
        title: id,
        timeZone: 'America/Sao_Paulo',
        capacity: 8,
        accessDays: 30,
        teacherIds: [],
        status: 'open',
        createdAt: '2026-10-23T10:00:00Z',
      },
    ],
    sessions: [],
    enrollments: [],
    nextCursor,
  }
}
function mount() {
  let state: LiveAgendaState
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let active = true
  const close = () => {
    if (!active) return
    active = false
    act(() => root.unmount())
    element.remove()
  }
  roots.push(close)
  function Probe() {
    state = useLiveAgenda()
    return null
  }
  act(() => root.render(<Probe />))
  return { current: () => state, close }
}
async function waitFor(check: () => void) {
  for (let index = 0; index < 100; index++) {
    try {
      check()
      return
    } catch (error) {
      if (index === 99) throw error
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
    }
  }
}

test('uma página atrasada não reaparece depois de atualizar a agenda', async () => {
  const page = Promise.withResolvers<void>()
  let initialReads = 0
  let pageSignal: AbortSignal | null | undefined
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('cursor=')) {
        pageSignal = init?.signal
        await page.promise // Also exercise a transport that resolves after cancellation.
        return Response.json(catalog('obsolete-page', null))
      }
      initialReads++
      return Response.json(
        catalog(initialReads === 1 ? 'initial' : 'fresh', initialReads === 1 ? 'cursor' : null),
      )
    },
    { preconnect: originalFetch.preconnect },
  )
  const view = mount()
  await waitFor(() => expect(view.current().data?.nextCursor).toBe('cursor'))
  let pending!: Promise<void>
  act(() => {
    pending = view.current().loadMore()
  })
  act(() => view.current().retry())
  await waitFor(() => expect(view.current().data?.cohorts[0]?.id).toBe('fresh'))
  page.resolve()
  await act(async () => {
    await pending
  })
  expect(view.current().data?.cohorts.map((item) => item.id)).toEqual(['fresh'])
  expect(pageSignal?.aborted).toBe(true)
  expect(view.current().loadingMore).toBe(false)
})

test('dois cliques no mesmo render reservam uma única página', async () => {
  const page = Promise.withResolvers<void>()
  let pageReads = 0
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      if (String(input).includes('cursor=')) {
        pageReads++
        await page.promise
        return Response.json(catalog('next', null))
      }
      return Response.json(catalog('initial', 'cursor'))
    },
    { preconnect: originalFetch.preconnect },
  )
  const view = mount()
  await waitFor(() => expect(view.current().data?.nextCursor).toBe('cursor'))
  let pending!: Promise<void>[]
  act(() => {
    pending = [view.current().loadMore(), view.current().loadMore()]
  })
  page.resolve()
  await act(async () => {
    await Promise.all(pending)
  })
  expect(pageReads).toBe(1)
  expect(view.current().data?.cohorts.map((item) => item.id)).toEqual(['initial', 'next'])
})

test('sair da tela cancela a página que ainda estava sendo lida', async () => {
  const page = Promise.withResolvers<void>()
  let pageSignal: AbortSignal | null | undefined
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('cursor=')) {
        pageSignal = init?.signal
        await page.promise
        return Response.json(catalog('obsolete-page', null))
      }
      return Response.json(catalog('initial', 'cursor'))
    },
    { preconnect: originalFetch.preconnect },
  )
  const view = mount()
  await waitFor(() => expect(view.current().data?.nextCursor).toBe('cursor'))
  let pending!: Promise<void>
  act(() => {
    pending = view.current().loadMore()
  })
  view.close()
  page.resolve()
  await act(async () => {
    await pending
  })
  expect(pageSignal?.aborted).toBe(true)
})

test('a paginação espera a nova primeira página durante uma atualização', async () => {
  const refreshed = Promise.withResolvers<void>()
  const page = Promise.withResolvers<void>()
  let firstReads = 0
  let pageReads = 0
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      if (String(input).includes('cursor=')) {
        pageReads++
        await page.promise
        return Response.json(catalog('obsolete-page', null))
      }
      firstReads++
      if (firstReads === 1) return Response.json(catalog('initial', 'cursor'))
      await refreshed.promise
      return Response.json(catalog('fresh', null))
    },
    { preconnect: originalFetch.preconnect },
  )
  const view = mount()
  await waitFor(() => expect(view.current().data?.nextCursor).toBe('cursor'))
  act(() => view.current().retry())
  let pending!: Promise<void>
  act(() => {
    pending = view.current().loadMore()
  })
  refreshed.resolve()
  await waitFor(() => expect(view.current().data?.cohorts[0]?.id).toBe('fresh'))
  page.resolve()
  await act(async () => {
    await pending
  })
  expect(view.current().data?.cohorts.map((item) => item.id)).toEqual(['fresh'])
  expect(pageReads).toBe(0)
})
