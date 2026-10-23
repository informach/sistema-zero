import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  evaluatePythonLessonAdmission,
  launchAdmittedPythonLessonBrowser,
  readPythonLessonAdmission,
} from '../../community-kids/tests/e2e/python-lesson-admission'

const now = Date.parse('2026-10-20T18:40:00Z')
function input(role: 'admin' | 'kids' = 'admin') {
  return {
    version: 1,
    role,
    attemptId: randomUUID(),
    reviewedPlanSha256: 'a'.repeat(64),
    observedAt: new Date(now).toISOString(),
    nextTree: {
      role: role === 'admin' ? 'adminNext' : 'kidsNext',
      processId: 1234,
      createdAt: '2026-10-20T18:39:00.1234567+00:00',
      executable: 'C:\\node.exe',
      cliSha256: 'b'.repeat(64),
      workingSetMiB: 1536,
    },
    envelopes: {
      browserMiB: role === 'admin' ? 1024 : 1536,
      nextTreeMiB: 2048,
      retainedBaseGrowthMiB: 256,
      hostReserveMiB: 512,
    },
  }
}
const observe = (role: 'admin' | 'kids' = 'admin', freeMiB = 2304, nowMs = now) => ({
  role,
  nowMs,
  freeBytes: freeMiB * 1024 ** 2,
})

function compact(role: 'admin' | 'kids' = 'admin') {
  const legacy = input(role)
  return {
    ...legacy,
    version: 2,
    profileId: 'lessons-desktop-compact-r2',
    nextTree: { ...legacy.nextTree, workingSetMiB: 606.1953125, heapMiB: 768 },
    envelopes: {
      browserMiB: 1024,
      nextTreeMiB: 1024,
      retainedBaseGrowthMiB: 128,
      hostReserveMiB: 512,
      roundingMiB: 128,
    },
  }
}

function shared(role: 'admin' | 'kids' = 'admin') {
  const prior = compact(role)
  return {
    ...prior,
    version: 3,
    profileId: 'lessons-desktop-shared-r1',
    envelopes: {
      browserMiB: 1024,
      combinedTreeMiB: 2048,
      retainedBaseGrowthMiB: 128,
      hostReserveMiB: 512,
      roundingMiB: 128,
    },
  }
}

test('shared v3 admits recorded R7 Next growth with the same whole budget and preserves v2', () => {
  for (const role of ['admin', 'kids'] as const) {
    const plan = shared(role)
    plan.nextTree.workingSetMiB = 1040.31640625
    const decision = evaluatePythonLessonAdmission(plan, observe(role, 1664))
    expect(decision.requiredFreeMiB).toBe(1664)
    expect(decision.admitted).toBe(true)
    expect(evaluatePythonLessonAdmission(plan, observe(role, 1664 - 1 / 1024)).admitted).toBe(false)
    expect(() =>
      evaluatePythonLessonAdmission(
        { ...compact(role), nextTree: plan.nextTree },
        observe(role, 4000),
      ),
    ).toThrow('exceeded')
    expect(evaluatePythonLessonAdmission(shared(role), observe(role, 2176)).requiredFreeMiB).toBe(
      2176,
    )
  }
})

test('shared v3 reserves only the remaining combined allocation without double counting browser', () => {
  const plan = shared()
  plan.nextTree.workingSetMiB = 1280
  expect(evaluatePythonLessonAdmission(plan, observe('admin', 1408)).requiredFreeMiB).toBe(1408)
  plan.nextTree.workingSetMiB = 2048
  expect(evaluatePythonLessonAdmission(plan, observe('admin', 640)).requiredFreeMiB).toBe(640)
  plan.nextTree.workingSetMiB = 2048.001
  expect(() => evaluatePythonLessonAdmission(plan, observe('admin', 4000))).toThrow('exceeded')
})

test('shared v3 rejects profile/version and envelope tampering, invalid numbers and stale authority', () => {
  const original = shared()
  for (const invalid of [
    { ...original, version: 2 },
    { ...original, profileId: 'lessons-desktop-compact-r2' },
    { ...original, envelopes: { ...original.envelopes, combinedTreeMiB: 3072 } },
    { ...original, envelopes: { ...original.envelopes, browserMiB: 1536 } },
    { ...original, envelopes: { ...original.envelopes, nextTreeMiB: 1024 } },
    { ...original, nextTree: { ...original.nextTree, heapMiB: 1024 } },
    { ...original, nextTree: { ...original.nextTree, workingSetMiB: NaN } },
    { ...original, nextTree: { ...original.nextTree, workingSetMiB: Infinity } },
    { ...original, nextTree: { ...original.nextTree, workingSetMiB: -1 } },
  ])
    expect(() => evaluatePythonLessonAdmission(invalid, observe())).toThrow()
  expect(() => evaluatePythonLessonAdmission(original, observe('kids'))).toThrow()
  expect(() =>
    evaluatePythonLessonAdmission(original, observe('admin', 4000, now + 10001)),
  ).toThrow('fresh')
})

test('explicit compact v2 accounts remaining Next growth for either audience without changing v1', () => {
  for (const role of ['admin', 'kids'] as const) {
    const result = evaluatePythonLessonAdmission(compact(role), observe(role, 2176))
    expect(result.requiredFreeMiB).toBe(2176)
    expect(result.admitted).toBe(true)
    expect(
      evaluatePythonLessonAdmission(compact(role), observe(role, 2176 - 1 / 1024)).admitted,
    ).toBe(false)
  }
  expect(evaluatePythonLessonAdmission(input(), observe()).requiredFreeMiB).toBe(2304)
})

test('compact rejects tampered profile, heap, thresholds, unknown fields, wrong audience and stale observations', () => {
  const original = compact()
  for (const invalid of [
    { ...original, profileId: 'custom' },
    { ...original, profileId: 'lessons-desktop-compact-r1' },
    { ...original, nextTree: { ...original.nextTree, heapMiB: 1024 } },
    { ...original, nextTree: { ...original.nextTree, workingSetMiB: 1025 } },
    { ...original, envelopes: { ...original.envelopes, browserMiB: 512 } },
    { ...original, envelopes: { ...original.envelopes, hostReserveMiB: 256 } },
    { ...original, bypass: true },
    { ...input(), profileId: original.profileId },
  ])
    expect(() => evaluatePythonLessonAdmission(invalid, observe())).toThrow()
  expect(() => evaluatePythonLessonAdmission(original, observe('kids'))).toThrow()
  expect(() =>
    evaluatePythonLessonAdmission(original, observe('admin', 4000, now + 10001)),
  ).toThrow()
})

test('approved incremental budgets admit Admin at 2304 and Kids at 2816 MiB, not generic 4096', () => {
  const admin = evaluatePythonLessonAdmission(input(), observe())
  const kids = evaluatePythonLessonAdmission(input('kids'), observe('kids', 2816))
  expect(admin.admitted).toBe(true)
  expect(admin.requiredFreeMiB).toBe(2304)
  expect(kids.admitted).toBe(true)
  expect(kids.requiredFreeMiB).toBe(2816)
})

test('low-memory decision refuses the launch operation before any browser is created', async () => {
  const decision = evaluatePythonLessonAdmission(input(), {
    ...observe(),
    freeBytes: 2304 * 1024 ** 2 - 1,
  })
  expect(decision.admitted).toBe(false)
  let launched = false
  await expect(
    launchAdmittedPythonLessonBrowser(decision, async () => {
      launched = true
    }),
  ).rejects.toThrow('admission refused')
  expect(launched).toBe(false)
})

test('admitted decision executes the operation exactly once', async () => {
  let launches = 0
  const result = await launchAdmittedPythonLessonBrowser(
    evaluatePythonLessonAdmission(input(), observe()),
    async () => ++launches,
  )
  expect(result).toBe(1)
  expect(launches).toBe(1)
})

test('remaining Next growth is accounted for without counting retained RSS twice', () => {
  const plan = input()
  plan.nextTree.workingSetMiB = 1025
  const decision = evaluatePythonLessonAdmission(plan, observe())
  expect(decision.nextGrowthMiB).toBe(1023)
  expect(decision.requiredFreeMiB).toBe(2816)
  expect(decision.admitted).toBe(false)
})

test('refuses Next that exceeded the fixed budget instead of reducing growth to zero', () => {
  const plan = input()
  plan.nextTree.workingSetMiB = 2049
  expect(() => evaluatePythonLessonAdmission(plan, observe())).toThrow('exceeded')
})

test('refuses stale, future-dated or foreign audience observations', () => {
  expect(() =>
    evaluatePythonLessonAdmission(input(), observe('admin', 4096, now + 10_001)),
  ).toThrow('fresh')
  expect(() => evaluatePythonLessonAdmission(input(), observe('admin', 4096, now - 1))).toThrow(
    'fresh',
  )
  expect(() => evaluatePythonLessonAdmission(input(), observe('kids'))).toThrow('another audience')
  const plan = input()
  plan.nextTree.role = 'kidsNext'
  expect(() => evaluatePythonLessonAdmission(plan, observe())).toThrow()
})

test('refuses altered envelopes, malformed metadata and invalid free-memory observations', () => {
  const plan = input()
  plan.envelopes.hostReserveMiB = 1
  expect(() => evaluatePythonLessonAdmission(plan, observe())).toThrow()
  expect(() =>
    evaluatePythonLessonAdmission({ ...input(), password: 'must-not-be-retained' }, observe()),
  ).toThrow()
  expect(() => evaluatePythonLessonAdmission(input(), { ...observe(), freeBytes: NaN })).toThrow()
  expect(() => evaluatePythonLessonAdmission(input(), { ...observe(), freeBytes: -1 })).toThrow()
})

test('changed admission file bytes are rejected before an operation can launch', async () => {
  const out = await mkdtemp(join(tmpdir(), 'lesson-admission-'))
  const path = join(out, 'admission.json')
  const bytes = JSON.stringify(input())
  const sha = createHash('sha256').update(bytes).digest('hex')
  try {
    await writeFile(path, `${bytes}\n`)
    await expect(readPythonLessonAdmission(path, sha, 'admin')).rejects.toThrow('bytes changed')
  } finally {
    await rm(out, { recursive: true, force: true })
  }
})
