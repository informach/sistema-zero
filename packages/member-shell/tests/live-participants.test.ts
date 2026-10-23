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

test('curso ao vivo: o cartão diz a parte da criança e se ela concluiu a parte da turma', () => {
  const sections = [
    { id: 'a', title: 'Conhecer o jogo' },
    { id: 'b', title: 'Mover o Dino' },
  ]
  const child = {
    admission: 'admitted',
    seenAt: '2026-11-07T17:00:00Z',
    activity: {
      stepId: null,
      sectionId: 'b',
      completedSectionIds: ['a'],
      saveState: 'saved',
      reportedAt: '2026-11-07T17:00:00Z',
    },
  } as LiveParticipation
  expect(participantStatus(child, '2026-11-07T17:00:05Z', sections, 'a')).toMatchObject({
    step: 'Parte 2 · Mover o Dino',
    done: true,
  })
  expect(participantStatus(child, '2026-11-07T17:00:05Z', sections, 'b').done).toBe(false)
  // A conclusão é durável: vale mesmo com o relato velho; a parte, não.
  expect(participantStatus(child, '2026-11-07T17:00:30Z', sections, 'a')).toMatchObject({
    step: 'Aguardando atualização da parte',
    done: true,
  })
  expect(participantStatus(child, '2026-11-07T17:00:05Z', sections).done).toBe(false)
})
