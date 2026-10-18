import { z } from 'zod'
import { StudioSha256Schema } from './project-environment'
import { STUDIO_PYTHON_PREVIEW_LIFETIME_MS } from './python-preview-input'
import {
  StudioPythonInputReferenceSchema,
  StudioPythonValidationOperationSchema,
} from './python-validation-input'

export const STUDIO_PYTHON_JOB_DEADLINE_MS = 120_000

/** DNS-safe 63-character SDK name, preserving all 256 ownership bits without truncation. */
export function studioPythonInspectionSandboxId(rawJobId: unknown) {
  const jobId = StudioSha256Schema.parse(rawJobId)
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  let encoded = ''
  let accumulator = 0
  let bits = 0
  for (let offset = 0; offset < jobId.length; offset += 2) {
    accumulator = (accumulator << 8) | Number.parseInt(jobId.slice(offset, offset + 2), 16)
    bits += 8
    while (bits >= 5) {
      bits -= 5
      encoded += alphabet[(accumulator >>> bits) & 31]
    }
    accumulator &= (1 << bits) - 1
  }
  if (bits) encoded += alphabet[(accumulator << (5 - bits)) & 31]
  return `py-inspect-${encoded}`
}

/** One immutable input generation/nonce owns one inspection job. No caller supplies a sandbox ID. */
export async function studioPythonInspectionJobId(referenceInput: unknown) {
  const reference = StudioPythonInputReferenceSchema.parse(referenceInput)
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(reference)),
  )
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const StudioPythonInspectionJobStateSchema = z
  .strictObject({
    version: z.literal(1),
    stateVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    jobId: StudioSha256Schema,
    input: StudioPythonInputReferenceSchema,
    structure: z.boolean(),
    /** Absent in legacy compile-only jobs and pre-admission cancellation tombstones. */
    operation: StudioPythonValidationOperationSchema.optional(),
    status: z.enum(['running', 'succeeded', 'failed', 'cancelled']),
    createdAt: z.number().int().nonnegative(),
    deadline: z.number().int().nonnegative(),
    sandboxCreated: z.boolean(),
    cleanupConfirmed: z.boolean(),
    previewRetired: z.literal(true).optional(),
  })
  .superRefine((state, ctx) => {
    if (state.status === 'succeeded' && (!state.sandboxCreated || !state.cleanupConfirmed))
      ctx.addIssue({
        code: 'custom',
        message: 'Um job Python só pode concluir após confirmar a limpeza do sandbox.',
      })
    if (
      state.deadline <= state.createdAt ||
      state.deadline > state.createdAt + STUDIO_PYTHON_JOB_DEADLINE_MS ||
      state.deadline > state.input.expiresAt
    )
      ctx.addIssue({ code: 'custom', message: 'Prazo do job Python inválido.' })
  })

export type StudioPythonInspectionJobState = z.infer<typeof StudioPythonInspectionJobStateSchema>

export function studioPythonInspectionJobRetentionUntil(state: StudioPythonInspectionJobState) {
  return state.operation?.preview
    ? Math.max(state.input.expiresAt, state.deadline + STUDIO_PYTHON_PREVIEW_LIFETIME_MS)
    : state.input.expiresAt
}

/** Storage is private, but cleanup still verifies ownership before addressing any sandbox. */
export async function verifyStudioPythonInspectionJobState(raw: unknown) {
  const state = StudioPythonInspectionJobStateSchema.parse(raw)
  if (state.jobId !== (await studioPythonInspectionJobId(state.input)))
    throw new Error('A identidade do job Python não corresponde ao input.')
  return state
}
