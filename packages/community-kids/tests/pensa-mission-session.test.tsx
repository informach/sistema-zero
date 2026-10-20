import { afterEach, expect, test } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  handoffFixture,
  PROFILE_ID,
  projectFixture,
} from '../../pensa/src/components/pensa.fixture'
import {
  usePensaMissionHandoff,
  usePensaMissionOutline,
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

/*
 * O painel nas oficinas (20/10/2026): "missão N de M", o nome da próxima e quem recebe a arte
 * numa equipe. Tudo LIDO do que o servidor devolveu; nada decidido no navegador.
 */
const SECOND_MISSION = '10000000-0000-4000-8000-000000000007'

test('a contagem e a próxima missão vêm do plano aceito, na ordem do plano', async () => {
  const handoff = handoffFixture()
  handoff.nextAction = {
    type: 'mission',
    missionId: SECOND_MISSION,
    destination: 'pinta',
    mode: 'build',
  }
  const requested: string[] = []
  replaceFetch(async (input, init) => {
    requested.push(`${String(input)} ${new Headers(init?.headers).get('x-sz-viewer')}`)
    return Response.json(projectFixture())
  })
  const outline = renderHook(() => usePensaMissionOutline(handoff, PROFILE_ID))
  await waitFor(() => expect(outline.result.current).not.toBeNull())
  expect(requested).toEqual([`/api/pensa/projects/${handoff.project.id} ${PROFILE_ID}`])
  expect(outline.result.current?.missions.map((mission) => mission.title)).toEqual([
    'Prepare o Estúdio para seu jogo',
    'Prepare os seis pares de cartas',
    'Experimente seu jogo',
  ])
  const { result } = renderHook(() =>
    usePensaMissionSession({
      handoff,
      viewerId: PROFILE_ID,
      cloud: null,
      update() {},
      retry() {},
      navigate() {},
      outline: outline.result.current,
    }),
  )
  expect(result.current?.order).toEqual({ index: 1, total: 3 })
  expect(result.current?.nextMission).toEqual({
    title: 'Prepare os seis pares de cartas',
    destination: 'pinta',
  })
  // Fora de equipe ninguém recebe a arte.
  expect(result.current?.handoffTo).toBeNull()
})

test('sem o plano (ou com o plano de outra revisão) o painel fica sem número', async () => {
  const handoff = handoffFixture()
  const other = projectFixture()
  if (!other.revision) throw new Error('Missing fixture revision')
  other.revision = { ...other.revision, id: '10000000-0000-4000-8000-000000000099' }
  let calls = 0
  replaceFetch(async () => {
    calls++
    return Response.json(other)
  })
  const outline = renderHook(() => usePensaMissionOutline(handoff, PROFILE_ID))
  await waitFor(() => expect(calls).toBe(1))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(outline.result.current).toBeNull()
  const { result } = renderHook(() =>
    usePensaMissionSession({
      handoff,
      viewerId: PROFILE_ID,
      cloud: null,
      update() {},
      retry() {},
      navigate() {},
    }),
  )
  expect(result.current?.order).toBeNull()
  expect(result.current?.nextMission).toBeNull()
})

test('em equipe, a artista vê quem programa e recebe a arte', () => {
  const PROGRAMMER = '10000000-0000-4000-8000-000000000055'
  const handoff = handoffFixture()
  handoff.team = {
    ...handoff.team,
    programmerProfileId: PROGRAMMER,
    artistProfileIds: [PROFILE_ID],
    memberCount: 1,
    people: [
      ...handoff.team.people,
      { profileId: PROGRAMMER, firstName: 'Bia', photoUrl: null, owner: false, joinedAt: null },
    ],
  }
  const session = (next = handoff) =>
    renderHook(() =>
      usePensaMissionSession({
        handoff: next,
        viewerId: PROFILE_ID,
        cloud: null,
        update() {},
        retry() {},
        navigate() {},
      }),
    ).result.current
  expect(session()?.handoffTo).toEqual({ name: 'Bia' })
  // Sem primeiro nome, a mesma palavra da janela da equipe.
  const unnamed = structuredClone(handoff)
  unnamed.team.people = unnamed.team.people.map((person) =>
    person.profileId === PROGRAMMER ? { ...person, firstName: null } : person,
  )
  expect(session(unnamed)?.handoffTo).toEqual({ name: 'Colega' })
  // Quem programa não entrega a si mesmo.
  const own = structuredClone(handoff)
  own.team.programmerProfileId = PROFILE_ID
  expect(session(own)?.handoffTo).toBeNull()
})
