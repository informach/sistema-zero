import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { CreateProfileService } from '../../src/application/profiles/create-profile.service'
import { ProfileAdmissionService } from '../../src/application/profiles/profile-admission.service'
import {
  ProfileCreationConflictError,
  ProfileLimitReachedError,
  ProfileNotFoundError,
} from '../../src/domain/profile/profile.errors'
import {
  FakeProfileAllowanceGateway,
  FakeProfileJourneyGateway,
  InMemoryProfileRepository,
  silentLogger,
} from '../fakes/in-memory'

function setup() {
  let now = new Date('2026-10-18T12:00:00Z')
  const profiles = new InMemoryProfileRepository()
  const allowance = new FakeProfileAllowanceGateway()
  allowance.maxProfiles = 1
  const journey = new FakeProfileJourneyGateway()
  const clock = () => new Date(now)
  const admission = new ProfileAdmissionService(profiles, journey, clock, silentLogger)
  const create = new CreateProfileService(profiles, allowance, randomUUID, clock, admission)
  const command = {
    requestId: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Sofia',
    birthDate: '2016-05-10',
  }
  return {
    profiles,
    allowance,
    journey,
    admission,
    create,
    command,
    advance() {
      now = new Date(now.getTime() + 2_000)
    },
  }
}

test('pending creation owns its quota and retries the same ID after Members becomes available', async () => {
  const s = setup()
  s.journey.result = 'not_ready'
  const pending = await s.create.execute(s.command)
  expect(pending.admissionState).toBe('pending')
  expect(await s.profiles.listActiveByAccount(s.command.accountUserId)).toEqual([])
  expect((await s.profiles.listForParent(s.command.accountUserId)).map((p) => p.id)).toEqual([
    pending.id,
  ])
  await expect(
    s.create.execute({
      ...s.command,
      requestId: randomUUID(),
      name: 'Debora',
    }),
  ).rejects.toBeInstanceOf(ProfileLimitReachedError)
  s.advance()
  s.journey.result = 'admitted'
  const ready = await s.create.execute(s.command)
  expect(ready.id).toBe(pending.id)
  expect(ready.admissionState).toBe('ready')
  expect(s.profiles.byId.size).toBe(1)
  expect(s.profiles.admissionJobs.get(ready.id)?.status).toBe('completed')
  expect(s.journey.calls).toEqual([
    { profileId: pending.id, accountUserId: s.command.accountUserId },
    { profileId: pending.id, accountUserId: s.command.accountUserId },
  ])
})

test('a creation request cannot change its body and a completed retry does not recheck allowance', async () => {
  const s = setup()
  const first = await s.create.execute(s.command)
  await expect(s.create.execute({ ...s.command, name: 'Debora' })).rejects.toBeInstanceOf(
    ProfileCreationConflictError,
  )
  expect((await s.create.execute(s.command)).id).toBe(first.id)
  expect(s.allowance.calls).toBe(1)
  expect(s.profiles.byId.size).toBe(1)
  expect(s.journey.calls).toHaveLength(1)
})

test('concurrent retries cannot create a second child or duplicate voice consent', async () => {
  const s = setup()
  const command = { ...s.command, voiceInputEnabled: true, parentAuthRecent: true }
  const [first, second] = await Promise.all([s.create.execute(command), s.create.execute(command)])
  expect(first.id).toBe(second.id)
  expect(s.profiles.byId.size).toBe(1)
  expect(s.profiles.voiceInputEvents).toHaveLength(1)
  expect(s.profiles.admissionJobs.size).toBe(1)
})

test('archive between Members initialization and ACK cancels the same job without resurrection', async () => {
  const s = setup()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let initialized!: () => void
  const initializing = new Promise<void>((resolve) => {
    initialized = resolve
  })
  s.journey.initialize = async () => {
    initialized()
    await gate
    return 'admitted'
  }
  const creation = s.create.execute(s.command)
  // Observe rejection even while this test performs the conflicting archive.
  const observed = creation.then(
    () => null,
    (error: unknown) => error,
  )
  await initializing
  const [pending] = await s.profiles.listForParent(s.command.accountUserId)
  await s.profiles.archiveOwned(
    { profileId: pending!.id, accountUserId: s.command.accountUserId },
    new Date(),
  )
  release()
  expect(await observed).toBeInstanceOf(ProfileNotFoundError)
  const cancelled = await s.profiles.findById(pending!.id)
  expect(cancelled?.isArchived).toBe(true)
  expect(cancelled?.admissionState).toBe('pending')
  expect(s.profiles.admissionJobs.get(pending!.id)?.status).toBe('cancelled')
  expect(s.profiles.byId.size).toBe(1)
})
