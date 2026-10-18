import { expect, test } from 'bun:test'
import {
  StudioPythonInspectionJobStateSchema,
  studioPythonInspectionJobId,
  studioPythonInspectionSandboxId,
  verifyStudioPythonInspectionJobState,
} from './python-inspection-job'
import { StudioPythonInputReferenceSchema } from './python-validation-input'

const reference = () =>
  StudioPythonInputReferenceSchema.parse({
    version: 1,
    inputId: 'a'.repeat(32),
    requestId: '01234567-89ab-4cde-8fab-0123456789ab',
    generation: '11234567-89ab-4cde-8fab-0123456789ab',
    projectId: 'owned-job',
    owner: 'b'.repeat(64),
    executionId: 'python-owned-1234567890abcdef',
    revision: 'c'.repeat(64),
    expiresAt: 900_000,
  })

test('SDK ownership names encode every SHA bit into lowercase DNS-safe 63 characters', () => {
  const vectors = [
    ['0'.repeat(64), 'a'.repeat(52)],
    ['f'.repeat(64), `${'7'.repeat(51)}q`],
    // Independent CPython base64.b32encode(bytes(range(32))) vector.
    [
      Array.from({ length: 32 }, (_, byte) => byte.toString(16).padStart(2, '0')).join(''),
      'aaaqeayeaudaocajbifqydiob4ibceqtcqkrmfyydenbwha5dypq',
    ],
  ]
  for (const [hex, base32] of vectors) {
    const name = studioPythonInspectionSandboxId(hex)
    expect(name).toBe(`py-inspect-${base32}`)
    expect(name).toHaveLength(63)
    expect(name).toMatch(/^[a-z0-9-]+$/)
  }
  expect(studioPythonInspectionSandboxId(`${'0'.repeat(63)}1`)).not.toBe(
    studioPythonInspectionSandboxId('0'.repeat(64)),
  )
  expect(() => studioPythonInspectionSandboxId('a'.repeat(63))).toThrow()
})

test('job ownership is stable, detached and separated by generation/nonce/owner/revision', async () => {
  const input = reference()
  const original = structuredClone(input)
  const pending = studioPythonInspectionJobId(input)
  input.owner = 'd'.repeat(64)
  const id = await pending
  expect(id).toMatch(/^[a-f0-9]{64}$/)
  expect(await studioPythonInspectionJobId(original)).toBe(id)
  for (const changed of [
    { ...original, owner: 'd'.repeat(64) },
    { ...original, generation: crypto.randomUUID() },
    { ...original, requestId: crypto.randomUUID() },
    { ...original, revision: 'd'.repeat(64) },
    { ...original, projectId: 'other-project' },
  ])
    expect(await studioPythonInspectionJobId(changed)).not.toBe(id)
})

test('stored jobs bind their immutable input and keep bounded deadlines and cleanup requirements', async () => {
  const input = reference()
  const state = StudioPythonInspectionJobStateSchema.parse({
    version: 1,
    stateVersion: 1,
    jobId: await studioPythonInspectionJobId(input),
    input,
    structure: true,
    status: 'running',
    createdAt: 1_000,
    deadline: 121_000,
    sandboxCreated: false,
    cleanupConfirmed: false,
  })
  expect(await verifyStudioPythonInspectionJobState(state)).toEqual(state)
  await expect(
    verifyStudioPythonInspectionJobState({ ...state, jobId: 'f'.repeat(64) }),
  ).rejects.toThrow('identidade')
  for (const invalid of [
    { ...state, stateVersion: 0 },
    { ...state, deadline: 121_001 },
    { ...state, deadline: 1_000 },
    { ...state, input: { ...input, expiresAt: 120_000 } },
    { ...state, status: 'succeeded' },
    { ...state, status: 'succeeded', sandboxCreated: true },
    { ...state, sandboxId: 'chosen-by-caller' },
  ])
    expect(StudioPythonInspectionJobStateSchema.safeParse(invalid).success).toBe(false)
  expect(
    StudioPythonInspectionJobStateSchema.safeParse({
      ...state,
      status: 'succeeded',
      sandboxCreated: true,
      cleanupConfirmed: true,
    }).success,
  ).toBe(true)
})
