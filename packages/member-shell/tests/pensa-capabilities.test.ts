import { expect, mock, test } from 'bun:test'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import {
  PENSA_ACTOR,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaId,
  pensaKidsJourney,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { loadPensaContext } = await import('../src/server/pensa/context')

test('current capabilities use earned blocks and never borrow the observer staff privilege', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  const facts = (await members.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)).body
  facts.code.profileId = pensaId(72)
  facts.code.level = 'coder'
  facts.code.kidsJourney = pensaKidsJourney('coder', ['studio', 'pinta'])
  facts.code.blocks = ['sz_g2d_setup_stage', 'sz_g2d_top_down']
  facts.art = [
    {
      profileId: PENSA_ACTOR.profileId,
      level: 'explorer',
      kidsJourney: pensaKidsJourney('explorer', ['studio', 'pinta', 'molda']),
      access: { pinta: true, molda: true },
    },
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

test('Pensa resources and Molda bands follow each participant capabilities rather than fixed ranks', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  const facts = (await members.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)).body
  facts.code.level = 'noob'
  facts.code.kidsJourney = pensaKidsJourney('noob', [
    'studio',
    'ai',
    'pensa',
    'molda',
    'molda-intermediate',
  ])
  facts.code.access.molda = true
  facts.art = [
    {
      profileId: pensaId(72),
      level: 'god',
      kidsJourney: pensaKidsJourney('god', []),
      access: { pinta: true, molda: true },
    },
  ]
  members.pensaTeamCapabilities = async () => ({ status: 200, body: facts })
  const actual = await loadPensaContext(
    members,
    PENSA_USER,
    PENSA_ACTOR,
    context.view.project.id,
    '',
  )
  const programmer = actual.capabilities.participants.find(
    (p) => p.profileId === PENSA_ACTOR.profileId,
  )
  expect(programmer).toMatchObject({
    rank: 'noob',
    studio: true,
    tutor: true,
    molda: true,
    pinta: false,
  })
  expect(programmer?.moldaTools).toContain('model.pieces')
  expect(programmer?.moldaTools).toContain('animate.batch')
  expect(programmer?.moldaTools).not.toContain('model.skin')
  const artist = actual.capabilities.participants.find((p) => p.profileId === pensaId(72))
  expect(artist).toMatchObject({
    rank: 'god',
    studio: false,
    pinta: false,
    molda: false,
    tutor: false,
    blockIds: [],
    moldaTools: [],
  })
})

test('own team preview keeps full existing resources without creating a learner rank', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  const actor = { ...PENSA_ACTOR, accountId: PENSA_ACTOR.profileId, privileged: true }
  const user = {
    ...PENSA_USER,
    role: 'staff',
    activeProfile: undefined,
    kids: { kind: 'parent' as const, sessionId: pensaId(90), authenticatedAt: 1_700_000_000 },
  }
  const facts = (await members.pensaTeamCapabilities(actor, context.view.project.id)).body
  facts.code.level = null
  facts.code.kidsJourney = undefined
  facts.code.kidsPreview = {
    audience: 'kids',
    kind: 'staff-preview',
    mode: 'active',
    policyVersion: 2,
    tierAccess: initialKidsJourneyPolicy().tierAccess,
    capabilities: [
      'studio',
      'pro',
      'bridge',
      'ai',
      'pensa',
      'pinta',
      'molda',
      'molda-intermediate',
      'molda-professional',
    ],
    readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
  }
  facts.code.blocks = []
  facts.code.access = { studio: false, pinta: false, molda: false }
  members.pensaTeamCapabilities = async () => ({ status: 200, body: facts })
  const actual = await loadPensaContext(members, user, actor, context.view.project.id, '')
  expect(actual.capabilities.participants[0]).toMatchObject({
    rank: null,
    studio: true,
    pinta: true,
    molda: true,
    tutor: true,
  })
  expect(actual.capabilities.participants[0]?.blockIds.length).toBeGreaterThan(0)
  facts.code.profileId = pensaId(72)
  await expect(loadPensaContext(members, user, actor, context.view.project.id, '')).rejects.toThrow(
    'jornada',
  )
  facts.code.profileId = actor.profileId
  await expect(
    loadPensaContext(members, PENSA_USER, actor, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
})

test('missing or unavailable participant policy cannot fabricate Noob or empty-resource success', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  const facts = (await members.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)).body
  facts.code.kidsJourney = undefined
  members.pensaTeamCapabilities = async () => ({ status: 200, body: facts })
  await expect(
    loadPensaContext(members, PENSA_USER, PENSA_ACTOR, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
  facts.code.kidsJourney = {
    ...pensaKidsJourney(),
    readiness: { status: 'unavailable', horizon: null, issues: [] },
  }
  await expect(
    loadPensaContext(members, PENSA_USER, PENSA_ACTOR, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
})

function staffPreviewFacts(facts: Awaited<ReturnType<typeof previewFactsSource>>) {
  facts.code.level = null
  facts.code.kidsJourney = undefined
  facts.code.kidsPreview = {
    audience: 'kids',
    kind: 'staff-preview',
    mode: 'active',
    policyVersion: 2,
    tierAccess: initialKidsJourneyPolicy().tierAccess,
    capabilities: ['studio', 'pro', 'bridge', 'ai', 'pensa', 'pinta', 'molda'],
    readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
  }
  facts.code.blocks = []
  facts.code.access = { studio: false, pinta: false, molda: false }
  return facts
}
async function previewFactsSource(context = pensaContext()) {
  return (
    await pensaContextMembers(context).pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)
  ).body
}

test('staff in a Kids profile of its OWN account vouches the session and accepts the preview', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  // The Kids app forces staff into a profile: `PENSA_USER` is that student session, with the role kept.
  const actor = { ...PENSA_ACTOR, privileged: true }
  const user = { ...PENSA_USER, role: 'admin' }
  const facts = staffPreviewFacts(await previewFactsSource(context))
  const sent: unknown[] = []
  members.pensaTeamCapabilities = async (...args) => {
    sent.push(args[2])
    return { status: 200, body: facts }
  }
  const actual = await loadPensaContext(members, user, actor, context.view.project.id, '')
  expect(sent).toEqual([{ staffSession: 'own-account' }])
  expect(actual.capabilities.participants[0]).toMatchObject({
    rank: null,
    studio: true,
    pinta: true,
    molda: true,
    tutor: true,
  })
})

test('a support session in a staff profile never vouches nor accepts the preview', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  const actor = { ...PENSA_ACTOR, privileged: true }
  const facts = staffPreviewFacts(await previewFactsSource(context))
  const sent: unknown[] = []
  members.pensaTeamCapabilities = async (...args) => {
    sent.push(args[2])
    return { status: 200, body: facts }
  }
  const support = {
    ...PENSA_USER,
    role: 'staff',
    kids: undefined,
    act: { sub: pensaId(95), mode: 'readonly' as const },
  }
  await expect(
    loadPensaContext(members, support, actor, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
  // A profile of ANOTHER account, or an inactive staff member, does not vouch either.
  const foreign = {
    ...PENSA_USER,
    role: 'staff',
    activeProfile: { accountId: pensaId(96) },
  }
  await expect(
    loadPensaContext(members, foreign, actor, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
  await expect(
    loadPensaContext(
      members,
      { ...PENSA_USER, role: 'staff', status: 'suspended' },
      actor,
      context.view.project.id,
      '',
    ),
  ).rejects.toThrow('jornada')
  expect(sent).toEqual([undefined, undefined, undefined])
})

test('a customer profile is unchanged: no vouch, real journey, preview refused', async () => {
  const context = pensaContext(),
    members = pensaContextMembers(context)
  const sent: unknown[] = []
  const real = await previewFactsSource(context)
  members.pensaTeamCapabilities = async (...args) => {
    sent.push(args[2])
    return { status: 200, body: real }
  }
  const actual = await loadPensaContext(
    members,
    PENSA_USER,
    PENSA_ACTOR,
    context.view.project.id,
    '',
  )
  expect(actual.capabilities.participants[0]?.rank).toBe('god')
  const preview = staffPreviewFacts(await previewFactsSource(context))
  members.pensaTeamCapabilities = async (...args) => {
    sent.push(args[2])
    return { status: 200, body: preview }
  }
  await expect(
    loadPensaContext(members, PENSA_USER, PENSA_ACTOR, context.view.project.id, ''),
  ).rejects.toThrow('jornada')
  expect(sent).toEqual([undefined, undefined])
})
