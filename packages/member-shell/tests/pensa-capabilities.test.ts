import { expect, mock, test } from 'bun:test'
import {
  PENSA_ACTOR,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaId,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { loadPensaContext } = await import('../src/server/pensa/context')

test('current capabilities use earned blocks and never borrow the observer staff privilege', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  const facts = (await members.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)).body
  facts.code.profileId = pensaId(72)
  facts.code.level = 'coder'
  facts.code.blocks = ['sz_g2d_setup_stage', 'sz_g2d_top_down']
  facts.art = [
    { profileId: PENSA_ACTOR.profileId, level: 'explorer', access: { pinta: true, molda: true } },
  ]
  members.pensaTeamCapabilities = async () => ({ status: 200, body: facts })
  const actual = await loadPensaContext(
    members,
    { ...PENSA_USER, role: 'staff' },
    PENSA_ACTOR,
    context.view.project.id,
    '',
  )
  const programmer = actual.capabilities.participants.find(
    (person) => person.profileId === facts.code.profileId,
  )
  expect(programmer?.blockIds).toEqual(['sz_g2d_setup_stage', 'sz_g2d_top_down'])
  expect(programmer?.molda).toBe(false)
  expect(
    actual.capabilities.participants.find((person) => person.profileId === PENSA_ACTOR.profileId)
      ?.molda,
  ).toBe(true)
})

test('resource lookup failure remains unavailable instead of becoming a blocked capability', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  members.pensaTeamCapabilities = async () => {
    throw new Error('service offline')
  }
  await expect(
    loadPensaContext(members, PENSA_USER, PENSA_ACTOR, context.view.project.id, ''),
  ).rejects.toThrow('conferir os recursos')
})

test('project polling does not search lesson material or call an AI provider', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  members.zappyKnowledgeSearch = mock(async () => ({ status: 200, body: { hits: [] } }))
  await loadPensaContext(members, PENSA_USER, PENSA_ACTOR, context.view.project.id, '')
  expect(members.zappyKnowledgeSearch).not.toHaveBeenCalled()
})

test('lesson excerpts never enter the model context when current course access cannot be confirmed', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  members.zappyKnowledgeSearch = async () => ({
    status: 200,
    body: {
      hits: [
        {
          kind: 'lesson',
          courseId: pensaId(80),
          courseSlug: 'private-course',
          courseTitle: 'Curso privado',
          lessonId: pensaId(81),
          lessonTitle: 'Cartas',
          sourceType: 'rich-text',
          content: 'PRIVATE PAID LESSON BODY',
        },
      ],
    },
  })
  members.getMyCourseReadonly = async () => {
    throw new Error('access service unavailable')
  }
  const actual = await loadPensaContext(
    members,
    PENSA_USER,
    PENSA_ACTOR,
    context.view.project.id,
    'jogo da memória',
  )
  expect(actual.sources).toEqual([])
  expect(actual.references.find((reference) => reference.id === pensaId(81))?.href).toBeNull()
  expect(JSON.stringify(actual)).not.toContain('PRIVATE PAID LESSON BODY')
})
