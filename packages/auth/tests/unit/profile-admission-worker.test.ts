import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { ProfileAdmissionWorker } from '../../src/application/maintenance/profile-admission-worker'
import { ProfileAdmissionService } from '../../src/application/profiles/profile-admission.service'
import type {
  ProfileAdmissionFailure,
  ProfileAdmissionJob,
  ProfileAdmissionRepository,
} from '../../src/domain/ports/profile-admission-repository.port'

const logger: Logger = { debug() {}, info() {}, warn() {}, error() {} }
const now = new Date('2026-10-18T12:00:00Z')
const job: ProfileAdmissionJob = {
  profileId: randomUUID(),
  accountUserId: randomUUID(),
  leaseId: randomUUID(),
  attempts: 1,
}

function repository() {
  const retries: { job: ProfileAdmissionJob; at: Date; failure: ProfileAdmissionFailure }[] = []
  const completed: ProfileAdmissionJob[] = []
  const port: ProfileAdmissionRepository = {
    async claimPending() {
      return []
    },
    async claimProfile() {
      return { ...job }
    },
    async complete(claim) {
      completed.push({ ...claim })
      return 'ready'
    },
    async retry(claim, _, at, failure) {
      retries.push({ job: { ...claim }, at, failure })
      return true
    },
  }
  return { port, retries, completed }
}

test('Members failure retains the same leased profile and schedules durable retry', async () => {
  const { port, retries, completed } = repository()
  const admission = new ProfileAdmissionService(
    port,
    {
      async initialize() {
        throw new Error('unavailable')
      },
    },
    () => now,
    logger,
  )
  await admission.tryProfile(job.profileId, job.accountUserId)
  expect(completed).toEqual([])
  expect(retries).toEqual([
    { job, at: new Date(now.getTime() + 1_000), failure: 'MEMBERS_UNAVAILABLE' },
  ])
})

test('initializing seed cannot ACK a profile into ready', async () => {
  const { port, retries, completed } = repository()
  const admission = new ProfileAdmissionService(
    port,
    {
      async initialize() {
        return 'not_ready'
      },
    },
    () => now,
    logger,
  )
  await admission.tryProfile(job.profileId, job.accountUserId)
  expect(completed).toEqual([])
  expect(retries[0]?.failure).toBe('JOURNEY_NOT_READY')
})

test('admission captures the lease before the remote wait and accepts cancellation after purge', async () => {
  const { port, retries, completed } = repository()
  const mutable = { ...job }
  port.claimProfile = async () => mutable
  port.complete = async (claim) => {
    completed.push({ ...claim })
    return 'cancelled'
  }
  const admission = new ProfileAdmissionService(
    port,
    {
      async initialize(owner) {
        expect(owner).toEqual({ profileId: job.profileId, accountUserId: job.accountUserId })
        mutable.profileId = randomUUID()
        mutable.accountUserId = randomUUID()
        mutable.leaseId = randomUUID()
        return 'admitted'
      },
    },
    () => now,
    logger,
  )
  await admission.tryProfile(job.profileId, job.accountUserId)
  expect(completed).toEqual([job])
  expect(retries).toEqual([])
})

test('one cycle has a bounded count and never preclaims leases behind a slow remote call', async () => {
  const { port } = repository()
  const limits: number[] = []
  let admitted = 0
  port.claimPending = async (_, __, limit) => {
    limits.push(limit)
    return [{ ...job }]
  }
  const admission = new ProfileAdmissionService(
    port,
    {
      async initialize() {
        admitted++
        return 'admitted'
      },
    },
    () => now,
    logger,
  )
  expect(await admission.runCycle()).toBe(20)
  expect(admitted).toBe(20)
  expect(limits).toEqual(Array(20).fill(1))
})

test('worker starts at boot, schedules another cycle and drains its active cycle at stop', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let started!: () => void
  const secondStarted = new Promise<void>((resolve) => {
    started = resolve
  })
  let cycles = 0
  let continueCycle: (() => boolean) | undefined
  const worker = new ProfileAdmissionWorker(
    {
      async runCycle(shouldContinue) {
        cycles++
        continueCycle = shouldContinue
        if (cycles === 2) {
          started()
          await gate
        }
        return 0
      },
    },
    logger,
    5,
  )
  worker.start()
  try {
    await secondStarted
    expect(cycles).toBe(2)
    expect(continueCycle?.()).toBe(true)
    let stopped = false
    const stop = worker.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    expect(continueCycle?.()).toBe(false)
    release()
    await stop
    expect(stopped).toBe(true)
  } finally {
    release()
    await worker.stop()
  }
})
