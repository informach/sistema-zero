import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioRuntimeSelectionSchema, StudioSha256Schema } from './project-environment'
import {
  assertPythonLanguageBootstrapSize,
  createPythonLanguageBootstrap,
} from './python-language-bootstrap'
import { type StudioRuntimeRelease, StudioRuntimeReleaseSchema } from './runtime-catalog'

export const StudioPythonBuilderPolicyResultSchema = z.strictObject({
  runtimeRelease: StudioRuntimeReleaseSchema,
})
export type StudioPythonBuilderPolicyResult = Readonly<{
  runtimeRelease: StudioRuntimeRelease
}>

/** Private Members response, never browser input, persisted evidence or a bearer grant. */
export const StudioPythonBuilderAuthorizationSchema = z.strictObject({
  policy: StudioPythonBuilderPolicyResultSchema,
  revisionHash: StudioSha256Schema,
  executionRevision: StudioSha256Schema,
  parentOrigin: z.url(),
})

/** Integrity and exact selection only. The Members policy owns approval. */
export async function createPythonBuilderPolicyResult(
  raw: unknown,
  runtime: unknown,
): Promise<StudioPythonBuilderPolicyResult> {
  const snapshot = StudioPythonBuilderPolicyResultSchema.parse(raw)
  const selection = StudioRuntimeSelectionSchema.parse(runtime)
  assertPythonLanguageBootstrapSize(canonicalJson(snapshot))
  const bootstrap = await createPythonLanguageBootstrap({ protocolVersion: 1, ...snapshot })
  const release = bootstrap.runtimeRelease
  if (
    release.profileId !== selection.profileId ||
    release.releaseId !== selection.releaseId ||
    release.manifestSha256 !== selection.manifestSha256
  )
    throw new Error('A autorização não corresponde à release Python da revisão.')
  return Object.freeze({ runtimeRelease: release })
}

/** Every policy read belongs to the exact selection captured for this attempt. */
export function pythonBuilderPolicyFence(runtime: unknown) {
  const selection = StudioRuntimeSelectionSchema.parse(runtime)
  return (raw: unknown): Promise<StudioPythonBuilderPolicyResult> =>
    createPythonBuilderPolicyResult(raw, selection)
}
