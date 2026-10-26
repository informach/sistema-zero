import { expect, test } from 'bun:test'
import {
  adultProductionSeedFailed,
  parseAdultProductionSeedArgs,
  runAdultProductionSeed,
} from '../../scripts/adult-journey-production-seed'
import { AdultJourneyService } from '../../src/application/adult-journey/adult-journey.service'
import type { SeedCourse } from '../../src/application/adult-journey/adult-journey-seed'
import type { Course } from '../../src/domain/course/course'
import { InMemoryAdultJourneyRepository } from '../fakes/adult-journey-in-memory'

const levels: [SeedCourse['level'], SeedCourse['track']][] = [
  ['primeiros-passos', '2d'],
  ['iniciante', '2d'],
  ['iniciante', '3d'],
  ['intermediario', '2d'],
  ['intermediario', '3d'],
  ['avancado', '2d'],
  ['avancado', '3d'],
]
function fixture(count = 7) {
  const courses = levels.slice(0, count).map(
    ([level, track], index): SeedCourse => ({
      id: crypto.randomUUID(),
      slug: `curso-${index}`,
      title: `Curso ${index}`,
      status: 'published',
      audience: 'adult',
      modality: 'recorded',
      level,
      track,
    }),
  )
  const repo = new InMemoryAdultJourneyRepository({ events: [] })
  repo.reached.set('existing-learner', 4)
  repo.grants.set('existing-learner', new Set(['studio', 'pinta']))
  const service = new AdultJourneyService(
    repo,
    {
      findCourseById: async (id) =>
        (courses.find((c) => c.id === id) as Course | undefined) ?? null,
      findCoursesByIds: async (ids) =>
        courses.filter((course) => ids.includes(course.id)) as Course[],
    },
    () => new Date(),
  )
  const ports = {
    service,
    listCourses: async () => courses,
    listShowcaseCourseIds: async () => courses.slice(0, 1).map((c) => c.id),
  }
  return { courses, repo, service, ports }
}

test('production journey parser refuses force/reseed and accidental apply; default is plan', () => {
  expect(parseAdultProductionSeedArgs([])).toEqual({ mode: 'plan', allowPartial: false })
  expect(parseAdultProductionSeedArgs(['apply', '--allow-partial'])).toEqual({
    mode: 'apply',
    allowPartial: true,
  })
  for (const args of [
    ['--apply'],
    ['apply', '--force'],
    ['plan', '--allow-partial'],
    ['reseed'],
    ['apply', '--allow-partial', '--force'],
  ])
    expect(() => parseAdultProductionSeedArgs(args)).toThrow()
})

test('status/plan distinguish absent, partial and complete without writing policy or student state', async () => {
  for (const [count, expected] of [
    [0, 'missing-planned'],
    [2, 'missing-partial'],
    [7, 'missing-complete'],
  ] as const) {
    const f = fixture(count)
    for (const mode of ['plan', 'status'] as const) {
      const report = await runAdultProductionSeed({ mode, allowPartial: false }, f.ports)
      expect(report.before.state).toBe(expected)
      expect(report.outcome).toBe('read-only')
      expect(f.repo.record).toBeNull()
    }
    expect(f.repo.reached.get('existing-learner')).toBe(4)
    expect([...f.repo.grants.get('existing-learner')!]).toEqual(['studio', 'pinta'])
  }
})

test('planned and partially bound stages require explicit apply without overwriting', async () => {
  for (const count of [0, 2]) {
    const f = fixture(count)
    const report = await runAdultProductionSeed({ mode: 'apply', allowPartial: false }, f.ports)
    expect(adultProductionSeedFailed(report)).toBe(true)
    expect(f.repo.record).toBeNull()
  }
})

test('explicit partial apply uses canonical seed-once, keeps milestone and never replaces an existing policy', async () => {
  const f = fixture(2)
  const report = await runAdultProductionSeed({ mode: 'apply', allowPartial: true }, f.ports)
  expect(report.outcome).toBe('applied-partial')
  expect(f.repo.record?.policy.stages).toHaveLength(7)
  expect(f.repo.record?.policy.stages[0]?.requirements[0]?.milestone).toBe('showcase')
  const before = JSON.stringify(f.repo.record)
  expect(
    (await runAdultProductionSeed({ mode: 'apply', allowPartial: true }, f.ports)).outcome,
  ).toBe('preserved-existing')
  expect(JSON.stringify(f.repo.record)).toBe(before)
  expect(f.repo.reached.get('existing-learner')).toBe(4)
  expect([...f.repo.grants.get('existing-learner')!]).toEqual(['studio', 'pinta'])
})

test('complete apply and a competing Admin save keep the insert-if-absent boundary', async () => {
  const f = fixture()
  expect(
    (await runAdultProductionSeed({ mode: 'apply', allowPartial: false }, f.ports)).outcome,
  ).toBe('applied-complete')
  const race = fixture()
  const seed = race.service.seedIfAbsent.bind(race.service)
  race.service.seedIfAbsent = async (input) => {
    const record = await race.service.configure(input, 0)
    record.policy.stages[0]!.title = 'Admin concorrente'
    await race.service.configure(record.policy, record.version)
    return seed(input)
  }
  const report = await runAdultProductionSeed({ mode: 'apply', allowPartial: false }, race.ports)
  expect(report.outcome).toBe('preserved-concurrent')
  expect(race.repo.record?.version).toBe(2)
  expect(race.repo.record?.policy.stages[0]?.title).toBe('Admin concorrente')
})

test('invalid seed result has a failing exit contract without leaking driver error detail', async () => {
  const f = fixture()
  f.service.seedIfAbsent = async () => {
    throw new Error('postgres://secret@private-host')
  }
  const report = await runAdultProductionSeed({ mode: 'apply', allowPartial: false }, f.ports)
  expect(report.outcome).toBe('failed')
  expect(adultProductionSeedFailed(report)).toBe(true)
  expect(JSON.stringify(report)).not.toContain('secret')
  expect(f.repo.record).toBeNull()
})

test('explicit planned apply without courses creates seven locked stages without granting new tools', async () => {
  const f = fixture(0)
  const report = await runAdultProductionSeed({ mode: 'apply', allowPartial: true }, f.ports)
  expect(report.outcome).toBe('applied-partial')
  expect(f.repo.record?.policy.stages).toHaveLength(7)
  const view = await f.service.get('new-learner')
  expect(view.capabilities).toEqual([])
  expect(view.stages.some((stage) => stage.completed || stage.available)).toBe(false)
})
