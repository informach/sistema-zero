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
