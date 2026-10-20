import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type * as P from '@sistemazero/core/pensa'
import {
  DrizzlePensaTeamRepository,
  type DrizzlePensaTeamRepositoryDeps,
} from '../../src/infrastructure/persistence/drizzle/pensa-team.repository'

/**
 * Team context for a kids project: the Kids app forces staff into a profile of their own account,
 * so the staff preview must also reach that profile, but only when the member-shell BFF vouches
 * that the session is the staff's own and not support. Teammates never get the preview.
 */
const staffAccount = randomUUID()
const staffProfile = randomUUID()
const kidAccount = randomUUID()
const kidProfile = randomUUID()
const projectId = randomUUID()

function fixture(opts: { programmer: string; artists?: string[]; owner?: string }) {
  const calls: Array<{ profileId: string; accountId: string; privileged: boolean }> = []
  const state = {
    project: { audience: 'kids', userId: opts.owner ?? staffProfile, accountId: staffAccount },
    members: [{ profileId: kidProfile, accountId: kidAccount }],
    team: { programmerProfileId: opts.programmer, artistProfileIds: opts.artists ?? [] },
  }
  const fakes = {
    projects: { repo: { get: async () => state }, base: () => ({}) },
    gamification: {
      async execute(
        profileId: string,
        accountId: string,
        o: { audience: string; privileged?: boolean },
      ) {
        calls.push({ profileId, accountId, privileged: o.privileged === true })
        return o.privileged
          ? { level: null, kidsPreview: { kind: 'staff-preview', capabilities: ['studio'] } }
          : { level: { slug: 'coder' }, kidsJourney: { earned: { level: 'coder' } } }
      },
    },
    accessCheck: { execute: async () => ({ grants: [], communities: [] }) },
    studioUnlocks: { execute: async () => ({ blocks: [] }) },
    creations: { list: async () => [], get: async () => null },
    creationDownload: { execute: async () => null },
    authGateway: null,
    avatars: { execute: async () => ({}) },
  }
  const repository = new DrizzlePensaTeamRepository(
    fakes as unknown as DrizzlePensaTeamRepositoryDeps,
  )
  return { repository, calls }
}

const staffInProfile: P.PensaActor = {
  profileId: staffProfile,
  accountId: staffAccount,
  privileged: true,
}

test('a vouched staff profile session of its own account gets the preview for its own entry', async () => {
  const f = fixture({ programmer: staffProfile, artists: [kidProfile] })
  const facts = await f.repository.context(staffInProfile, projectId, { ownStaffProfile: true })
  expect(facts.code.kidsPreview?.kind).toBe('staff-preview')
  expect(facts.code.access).toEqual({ studio: true, pinta: true, molda: true })
  // The teammate (another family's child) keeps the real journey, never the preview.
  expect(facts.art[0]?.kidsPreview).toBeUndefined()
  expect(facts.art[0]?.kidsJourney).toBeDefined()
  expect(f.calls).toEqual([
    { profileId: staffProfile, accountId: staffAccount, privileged: true },
    { profileId: kidProfile, accountId: kidAccount, privileged: false },
  ])
})

test('without the vouch (support session or old BFF) the staff profile reads its real journey', async () => {
  const f = fixture({ programmer: staffProfile })
  for (const session of [undefined, {}, { ownStaffProfile: false }]) {
    const facts = await f.repository.context(staffInProfile, projectId, session)
    expect(facts.code.kidsPreview).toBeUndefined()
    expect(facts.code.kidsJourney).toBeDefined()
  }
  expect(f.calls.every((call) => !call.privileged)).toBe(true)
})

test('the vouch never turns a non-privileged actor or another profile into the preview', async () => {
  const f = fixture({ programmer: kidProfile })
  const customer = { ...staffInProfile, privileged: false }
  await f.repository.context(customer, projectId, { ownStaffProfile: true })
  // Staff looking at a project where someone else programs: that person is not the actor.
  await f.repository.context(staffInProfile, projectId, { ownStaffProfile: true })
  expect(f.calls.every((call) => !call.privileged)).toBe(true)
})

test('the staff account itself (no profile) keeps the preview without any vouch', async () => {
  const f = fixture({ programmer: staffAccount, owner: staffAccount })
  const facts = await f.repository.context(
    { profileId: staffAccount, accountId: staffAccount, privileged: true },
    projectId,
  )
  expect(facts.code.kidsPreview?.kind).toBe('staff-preview')
  expect(f.calls).toEqual([{ profileId: staffAccount, accountId: staffAccount, privileged: true }])
})
