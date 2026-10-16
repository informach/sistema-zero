import { afterEach, expect, mock, test } from 'bun:test'
import { createPensaJourney, type PensaJourneyView } from '@sistemazero/core/pensa'
import {
  nextMissionLabel,
  openNextPensaMission,
  resolveNextPensaMission,
} from '../src/lib/pensa-next-mission'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('a saved Pro journey continues directly in the isolated Pro route', async () => {
  const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const journey = createPensaJourney(projectId, 'cycle', '')
  journey.stage = 'building'
  journey.missionIds = ['move']
  const view: PensaJourneyView = {
    project: { id: projectId, name: 'Jogo', status: 'active' },
    studioAuthoring: 'code',
    journey,
    cycles: [],
    operation: null,
  }
  globalThis.fetch = Object.assign(
    async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('/v2/')
          ? view
          : { nextTaskId: 'move', tasks: [{ id: 'move', destination: 'studio' }] },
      ),
    { preconnect: originalFetch.preconnect },
  )
  expect(await resolveNextPensaMission(projectId)).toEqual({
    path: '/estudio/pro/pensa-aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa?tarefa=move',
    destination: 'studio',
  })
})

test.each([
  'paused',
  'archived',
  'observing',
  'preparing',
  'closed',
] as const)('próxima missão volta ao Pensa quando a jornada está %s', async (status) => {
  const journey = createPensaJourney('p1', 'c1', '')
  journey.stage = status === 'paused' || status === 'archived' ? 'building' : status
  journey.paused = status === 'paused'
  journey.missionIds = ['task1']
  const view: PensaJourneyView = {
    project: { id: 'p1', name: 'Jogo', status: status === 'archived' ? 'archived' : 'active' },
    journey,
    cycles: [],
    operation: null,
  }
  const fetch = mock(async (url: RequestInfo | URL) =>
    Response.json(
      String(url).includes('/v2/')
        ? view
        : { nextTaskId: 'task1', tasks: [{ id: 'task1', destination: 'studio' }] },
    ),
  )
  globalThis.fetch = Object.assign(fetch, { preconnect: originalFetch.preconnect })
  const navigate = mock()
  await openNextPensaMission('p1', navigate)
  expect(navigate).toHaveBeenCalledWith('/pensa?plano=p1')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('jornada em construção abre somente uma tarefa do ciclo ativo', async () => {
  const journey = createPensaJourney('p1', 'c1', '')
  journey.stage = 'building'
  journey.missionIds = ['task1']
  const view: PensaJourneyView = {
    project: { id: 'p1', name: 'Jogo', status: 'active' },
    journey,
    cycles: [],
    operation: null,
  }
  let nextTaskId = 'old-task'
  globalThis.fetch = Object.assign(
    mock(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('/v2/')
          ? view
          : {
              nextTaskId,
              tasks: [
                { id: 'old-task', destination: 'studio' },
                { id: 'task1', destination: 'pinta' },
              ],
            },
      ),
    ),
    { preconnect: originalFetch.preconnect },
  )
  const navigate = mock()
  await openNextPensaMission('p1', navigate)
  expect(navigate).toHaveBeenLastCalledWith('/pensa?plano=p1')
  nextTaskId = 'task1'
  await openNextPensaMission('p1', navigate)
  expect(navigate).toHaveBeenLastCalledWith('/pinta?tarefa=task1')
})

test('M1: o destino da próxima missão sai sem navegar, e o rótulo diz a OUTRA oficina', async () => {
  const journey = createPensaJourney('p1', 'c1', '')
  journey.stage = 'building'
  journey.missionIds = ['task2']
  const view: PensaJourneyView = {
    project: { id: 'p1', name: 'Jogo', status: 'active' },
    journey,
    cycles: [],
    operation: null,
  }
  globalThis.fetch = Object.assign(
    mock(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('/v2/')
          ? view
          : { nextTaskId: 'task2', tasks: [{ id: 'task2', destination: 'pinta' }] },
      ),
    ),
    { preconnect: originalFetch.preconnect },
  )
  const next = await resolveNextPensaMission('p1')
  expect(next).toEqual({ path: '/pinta?tarefa=task2', destination: 'pinta' })
  expect(nextMissionLabel(next.destination, 'studio')).toBe('Continuar no Pinta')
  // Na mesma oficina, ou de volta ao plano, fica o rótulo de sempre.
  expect(nextMissionLabel('pinta', 'pinta')).toBeUndefined()
  expect(nextMissionLabel(null, 'studio')).toBeUndefined()
  expect(nextMissionLabel('studio', 'molda')).toBe('Continuar no Estúdio')
  expect(nextMissionLabel('molda', 'studio')).toBe('Continuar no Molda')
})

/** Uma missão da etapa com o andamento que a régua da equipe lê. */
function missao(
  id: string,
  destination: 'studio' | 'pinta' | 'molda',
  extra: {
    status?: 'planned' | 'in_progress' | 'completed'
    dependencies?: string[]
    assigneeProfileId?: string | null
  } = {},
) {
  return {
    id,
    destination,
    dependencies: extra.dependencies ?? [],
    progress: { status: extra.status ?? 'planned' },
    ...(extra.assigneeProfileId !== undefined
      ? { assigneeProfileId: extra.assigneeProfileId }
      : {}),
  }
}

function planoEmEquipe(viewer: string, tasks: ReturnType<typeof missao>[], art = ['bia']) {
  const journey = createPensaJourney('p1', 'c1', '')
  journey.stage = 'building'
  journey.missionIds = tasks.map((t) => t.id)
  const view: PensaJourneyView = {
    project: { id: 'p1', name: 'Jogo', status: 'active' },
    journey,
    cycles: [],
    operation: null,
    role: viewer === 'leo' ? 'owner' : 'member',
    team: {
      viewerProfileId: viewer,
      ownerProfileId: 'leo',
      memberCount: 1,
      shareEnabled: true,
      roles: { code: 'leo', art },
    },
  }
  globalThis.fetch = Object.assign(
    mock(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('/v2/')
          ? view
          : // O `nextTaskId` do servidor aponta a próxima do PLANO (a do Estúdio), não a da Bia.
            { nextTaskId: tasks[0]?.id ?? null, tasks },
      ),
    ),
    { preconnect: originalFetch.preconnect },
  )
}

test('em EQUIPE: a artista vai à próxima missão DELA, não à do Estúdio de quem programa', async () => {
  planoEmEquipe('bia', [missao('m-estudio', 'studio'), missao('m-arte', 'pinta')])
  const next = await resolveNextPensaMission('p1')
  expect(next).toEqual({ path: '/pinta?tarefa=m-arte', destination: 'pinta' })
  // Concluiu no Molda e a próxima dela é no Pinta: "Continuar no Pinta".
  expect(nextMissionLabel(next.destination, 'molda', { backToPlan: next.backToPlan })).toBe(
    'Continuar no Pinta',
  )
})

test('em EQUIPE: quem programa segue para o Estúdio mesmo com arte na frente', async () => {
  planoEmEquipe('leo', [missao('m-arte', 'pinta'), missao('m-estudio', 'studio')])
  expect(await resolveNextPensaMission('p1')).toEqual({
    path: '/estudio?tarefa=m-estudio',
    destination: 'studio',
  })
})

test('em EQUIPE sem missão minha: volta ao plano, com o rótulo "Voltar ao plano"', async () => {
  // A única arte já foi começada pela OUTRA artista, e o Estúdio depende dela.
  planoEmEquipe(
    'bia',
    [
      missao('m-arte', 'pinta', { status: 'in_progress', assigneeProfileId: 'ana' }),
      missao('m-estudio', 'studio', { dependencies: ['m-arte'] }),
    ],
    ['bia', 'ana'],
  )
  const next = await resolveNextPensaMission('p1')
  expect(next).toEqual({ path: '/pensa?plano=p1', destination: null, backToPlan: true })
  expect(nextMissionLabel(next.destination, 'pinta', { backToPlan: next.backToPlan })).toBe(
    'Voltar ao plano',
  )
})

test('plano solo (team sem ninguém que entrou): segue a régua de sempre do servidor', async () => {
  const journey = createPensaJourney('p1', 'c1', '')
  journey.stage = 'building'
  journey.missionIds = ['m-estudio', 'm-arte']
  const view: PensaJourneyView = {
    project: { id: 'p1', name: 'Jogo', status: 'active' },
    journey,
    cycles: [],
    operation: null,
    team: {
      viewerProfileId: 'leo',
      ownerProfileId: 'leo',
      memberCount: 0,
      shareEnabled: false,
      roles: { code: 'leo', art: ['leo'] },
    },
  }
  globalThis.fetch = Object.assign(
    mock(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).includes('/v2/')
          ? view
          : {
              nextTaskId: 'm-arte',
              tasks: [missao('m-estudio', 'studio'), missao('m-arte', 'pinta')],
            },
      ),
    ),
    { preconnect: originalFetch.preconnect },
  )
  expect(await resolveNextPensaMission('p1')).toEqual({
    path: '/pinta?tarefa=m-arte',
    destination: 'pinta',
  })
})
