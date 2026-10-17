import { afterEach, expect, test } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { handoffFixture, PROFILE_ID } from '../../pensa/src/components/pensa.fixture'
import {
  usePensaMissionHandoff,
  usePensaMissionSession,
} from '../src/components/kids/use-pensa-mission-session'
import type { CloudPeek } from '../src/lib/creations-cloud'

const originalFetch = globalThis.fetch
function replaceFetch(run: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>) {
  globalThis.fetch = Object.assign(run, { preconnect: originalFetch.preconnect })
}
afterEach(() => {
  globalThis.fetch = originalFetch
})
function saved(creationId: string): CloudPeek {
  return {
    summary: {
      itemId: creationId,
      name: 'Jogo',
      kind: 'studio',
      itemUpdatedAt: 1,
      revision: 7,
      bytes: 10,
      thumb: null,
      syncedAt: 2,
    },
    serverNow: 2,
    load: async () => {
      throw new Error('This test only inspects the saved revision')
    },
  }
}
test('concluir aguarda a criação salva e envia a revisão da conta', async () => {
  const handoff = handoffFixture()
  const events: string[] = []
  let body: unknown
  replaceFetch(async (_input, init) => {
    expect(new Headers(init?.headers).get('x-sz-viewer')).toBe(PROFILE_ID)
    events.push('write')
    body = JSON.parse(String(init?.body))
    return Response.json({
      ...handoff,
      progress: { ...handoff.progress, status: 'completed', progressRevision: 1 },
    })
  })
  const { result } = renderHook(() =>
    usePensaMissionSession({
      handoff,
      viewerId: PROFILE_ID,
      cloud: {
        confirm: async () => {
          events.push('confirm')
        },
        peek: async (id) => {
          events.push('peek')
          return saved(id)
        },
      },
      update() {},
      retry() {},
      navigate() {},
    }),
  )
  await act(async () => {
    await result.current?.onComplete()
  })
  expect(events).toEqual(['confirm', 'peek', 'write'])
  expect(body).toMatchObject({
    confirmed: true,
    expectedProgressRevision: 0,
    contentRevision: 1,
    deliveries: [
      {
        assetSlotId: null,
        creation: {
          tool: 'studio',
          profileId: PROFILE_ID,
          creationId: handoff.studioProjectId,
          saveRevision: '7',
        },
      },
    ],
  })
})

test('o handoff envia o perfil estável que o BFF exige', async () => {
  const handoff = handoffFixture()
  const requested: string[] = []
  replaceFetch(async (_input, init) => {
    requested.push(new Headers(init?.headers).get('x-sz-viewer') ?? '')
    return Response.json(handoff)
  })
  const { result } = renderHook(() =>
    usePensaMissionHandoff(handoff.mission.id, 'studio', PROFILE_ID),
  )
  await waitFor(() => expect(result.current.status).toBe('success'))
  expect(requested).toEqual([PROFILE_ID])
})
test('trocar perfil durante a confirmação impede aplicar a resposta antiga', async () => {
  const handoff = handoffFixture()
  let release = () => {}
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  let writes = 0
  replaceFetch(async () => {
    writes += 1
    return Response.json(handoff)
  })
  const { result, rerender } = renderHook(
    ({ viewerId }) =>
      usePensaMissionSession({
        handoff,
        viewerId,
        cloud: { confirm: () => waiting, peek: async (id) => saved(id) },
        update() {},
        retry() {},
        navigate() {},
      }),
    { initialProps: { viewerId: PROFILE_ID } },
  )
  const confirmation = result.current!.onComplete()
  await act(async () => {
    await Promise.resolve()
  })
  rerender({ viewerId: '10000000-0000-4000-8000-000000000099' })
  release()
  await expect(confirmation).rejects.toThrow('O perfil ou a missão mudou')
  expect(writes).toBe(0)
})
test('uma falha de salvamento não conclui a missão', async () => {
  const handoff = handoffFixture()
  let writes = 0
  replaceFetch(async () => {
    writes += 1
    return Response.json(handoff)
  })
  const { result } = renderHook(() =>
    usePensaMissionSession({
      handoff,
      viewerId: PROFILE_ID,
      cloud: {
        confirm: async () => {
          throw new Error('offline')
        },
        peek: async (id) => saved(id),
      },
      update() {},
      retry() {},
      navigate() {},
    }),
  )
  await expect(result.current!.onComplete()).rejects.toBeDefined()
  expect(writes).toBe(0)
})

test('a sessão de arte exibe e aceita somente os elementos da missão aberta', async () => {
  const handoff = handoffFixture()
  const slotId = '10000000-0000-4000-8000-000000000077'
  const otherId = '10000000-0000-4000-8000-000000000078'
  handoff.mission = {
    ...handoff.mission,
    kind: 'asset',
    destination: 'pinta',
    assetSlotIds: [slotId],
  }
  handoff.assetSlots = [slotId, otherId].map((id) => ({
    id,
    name: id === slotId ? 'Carta' : 'Cenário de outra missão',
    kind: 'sprite',
    description: 'Arte do jogo.',
    source: 'create',
    existing: null,
  }))
  let confirmed = 0
  const { result } = renderHook(() =>
    usePensaMissionSession({
      handoff,
      viewerId: PROFILE_ID,
      cloud: {
        confirm: async () => {
          confirmed++
        },
        peek: async (id) => saved(id),
      },
      update() {},
      retry() {},
      navigate() {},
    }),
  )
  expect(result.current?.assetSlots.map((slot) => slot.id)).toEqual([slotId])
  await expect(
    result.current!.onBindCreation({ assetSlotId: otherId, creationId: 'arte' }),
  ).rejects.toThrow('missão atual')
  expect(confirmed).toBe(0)
})
