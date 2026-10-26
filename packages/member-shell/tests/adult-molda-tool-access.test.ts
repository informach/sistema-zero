import { expect, mock, test } from 'bun:test'
import type { AdultJourneyView } from '@sistemazero/core/journey'
import { MOLDA_TOOL_FAMILIES } from '@sistemazero/molda/tools'
import { creatorSceneFixture } from '../qa/creator-journey-fixtures'
import { adultMoldaOpenBands, adultMoldaToolAccess } from '../src/lib/adult-molda-tool-access'
import {
  PENSA_ACTOR,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaId,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { loadPensaContext } = await import('../src/server/pensa/context')
const curriculum = creatorSceneFixture('adult', 'mastery').view
function journey(capabilities: AdultJourneyView['capabilities'], legacy = false): AdultJourneyView {
  return {
    audience: 'adult',
    policyVersion: 1,
    configured: true,
    stages: [],
    capabilities,
    ...(legacy ? {} : { curriculum }),
  }
}

test('the adult Molda host projects exactly the earned curriculum bands and preserves the full legacy grant', () => {
  const basic = adultMoldaToolAccess(journey(['molda']))!
  expect(basic.allow).toContain('model.pieces')
  expect(basic.allow).not.toContain('animate.batch')
  expect(basic.allow).not.toContain('model.skin')
  expect(adultMoldaToolAccess(journey(['molda', 'molda-intermediate']))?.allow).toContain(
    'animate.batch',
  )
  expect(
    adultMoldaToolAccess(journey(['molda', 'molda-intermediate', 'molda-professional'])),
  ).toBeUndefined()
  expect(adultMoldaToolAccess(journey(['molda'], true))).toBeUndefined()
  expect(adultMoldaOpenBands(journey([], true))).toEqual([])
})

test('Pensa uses each adult participant band without borrowing another participant or the old full-access rule', async () => {
  const context = pensaContext()
  const members = pensaContextMembers(context)
  const facts = (await members.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)).body
  facts.base.project.audience = 'adult'
  facts.code.journey = journey(['molda', 'studio'])
  facts.code.access.molda = true
  facts.art = [
    {
      profileId: pensaId(72),
      level: 'god',
      access: { pinta: false, molda: true },
      journey: journey(['molda'], true),
    },
  ]
  members.pensaTeamCapabilities = async () => ({ status: 200, body: facts })
  const actual = await loadPensaContext(
    members,
    PENSA_USER,
    { ...PENSA_ACTOR, audience: 'adult' },
    context.view.project.id,
    '',
  )
  const programmer = actual.capabilities.participants.find(
    (person) => person.profileId === facts.code.profileId,
  )!
  const artist = actual.capabilities.participants.find(
    (person) => person.profileId === pensaId(72),
  )!
  expect(programmer.moldaTools).toEqual(
    MOLDA_TOOL_FAMILIES.filter((tool) => tool.band === 'basic').map((tool) => tool.id),
  )
  expect(artist.moldaTools).toEqual(MOLDA_TOOL_FAMILIES.map((tool) => tool.id))
})
