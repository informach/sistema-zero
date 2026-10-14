import { expect, test } from 'bun:test'
import type { LiveParticipation } from '@sistemazero/core/live'
import { orderedParticipants, participantStatus } from '../src/lib/live/participants'

test('help and speaking queues retain request order, without mutating the room', () => {
  const make = (learnerId: string, helpAt: string | null, handAt: string | null) =>
    ({
      learnerId,
      helpAt,
      handAt,
      joinedAt: '2026-11-07T17:00:00Z',
      admission: 'admitted',
    }) as LiveParticipation
  const children = [
    make('hand', null, '2026-11-07T17:01:00Z'),
    make('later-help', '2026-11-07T17:03:00Z', null),
    make('first-help', '2026-11-07T17:02:00Z', null),
  ]
  expect(orderedParticipants(children).map((item) => item.learnerId)).toEqual([
    'first-help',
    'later-help',
    'hand',
  ])
  expect(children[0]!.learnerId).toBe('hand')
})
test('an old save report is never displayed as a current saved project', () => {
  const child = {
    admission: 'admitted',
    seenAt: '2026-11-07T17:00:00Z',
    activity: { stepId: 'scene', saveState: 'saved', reportedAt: '2026-11-07T17:00:00Z' },
  } as LiveParticipation
  const steps = [{ id: 'scene', title: 'Criar o cenário' }]
  expect(participantStatus(child, '2026-11-07T17:00:05Z', steps)).toMatchObject({
    step: 'Criar o cenário',
    save: 'Projeto guardado',
  })
  expect(participantStatus(child, '2026-11-07T17:00:16Z', steps)).toMatchObject({
    presence: 'Reconectando',
    save: 'Salvamento sem atualização recente',
  })
})
