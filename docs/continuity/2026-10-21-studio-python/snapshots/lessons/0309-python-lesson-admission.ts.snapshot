import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { freemem } from 'node:os'
import { z } from 'zod'

export const PythonLessonAdmissionSchema = z
  .object({
    version: z.literal(1),
    role: z.enum(['admin', 'kids']),
    attemptId: z.uuid(),
    reviewedPlanSha256: z.string().regex(/^[a-f0-9]{64}$/),
    observedAt: z.iso.datetime({ offset: true }),
    nextTree: z
      .object({
        role: z.enum(['adminNext', 'kidsNext']),
        processId: z.number().int().positive(),
        createdAt: z.iso.datetime({ offset: true }),
        executable: z.string().min(1),
        cliSha256: z.string().regex(/^[a-f0-9]{64}$/),
        workingSetMiB: z.number().finite().positive(),
      })
      .strict(),
    envelopes: z
      .object({
        browserMiB: z.union([z.literal(1024), z.literal(1536)]),
        nextTreeMiB: z.literal(2048),
        retainedBaseGrowthMiB: z.literal(256),
        hostReserveMiB: z.literal(512),
      })
      .strict(),
  })
  .strict()

export function evaluatePythonLessonAdmission(
  input: unknown,
  observation: { role: 'admin' | 'kids'; nowMs: number; freeBytes: number },
) {
  const plan = PythonLessonAdmissionSchema.parse(input)
  assert.equal(plan.role, observation.role, 'Admission belongs to another audience')
  assert.equal(plan.nextTree.role, plan.role === 'admin' ? 'adminNext' : 'kidsNext')
  assert.equal(plan.envelopes.browserMiB, plan.role === 'admin' ? 1024 : 1536)
  assert(
    plan.nextTree.workingSetMiB <= plan.envelopes.nextTreeMiB,
    'Next exceeded this attempt budget',
  )
  const ageMs = observation.nowMs - Date.parse(plan.observedAt)
  assert(ageMs >= 0 && ageMs <= 10_000, 'Admission observation must be fresh, not future dated')
  assert(Number.isFinite(observation.freeBytes) && observation.freeBytes >= 0)
  const nextGrowthMiB = Math.max(0, plan.envelopes.nextTreeMiB - plan.nextTree.workingSetMiB)
  const requiredFreeMiB =
    Math.ceil(
      (plan.envelopes.browserMiB +
        nextGrowthMiB +
        plan.envelopes.retainedBaseGrowthMiB +
        plan.envelopes.hostReserveMiB) /
        256,
    ) * 256
  const observedFreeMiB = observation.freeBytes / 1024 ** 2
  return {
    ...plan,
    evaluatedAt: new Date(observation.nowMs).toISOString(),
    nextGrowthMiB,
    requiredFreeMiB,
    observedFreeMiB,
    admitted: observedFreeMiB >= requiredFreeMiB,
  }
}

export type PythonLessonAdmission = ReturnType<typeof evaluatePythonLessonAdmission> & {
  admissionSha256: string
}

export async function readPythonLessonAdmission(
  path: string,
  expectedSha256: string,
  role: 'admin' | 'kids',
): Promise<PythonLessonAdmission> {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/)
  const bytes = await readFile(path)
  const admissionSha256 = createHash('sha256').update(bytes).digest('hex')
  assert.equal(admissionSha256, expectedSha256, 'Per-attempt admission bytes changed')
  return {
    ...evaluatePythonLessonAdmission(JSON.parse(bytes.toString('utf8')), {
      role,
      nowMs: Date.now(),
      freeBytes: freemem(),
    }),
    admissionSha256,
  }
}

export async function launchAdmittedPythonLessonBrowser<T>(
  admission: ReturnType<typeof evaluatePythonLessonAdmission>,
  launch: () => Promise<T>,
): Promise<T> {
  assert(
    admission.admitted,
    `Browser admission refused: ${Math.floor(admission.observedFreeMiB)} MiB free, ${admission.requiredFreeMiB} MiB required by this attempt`,
  )
  return launch()
}
