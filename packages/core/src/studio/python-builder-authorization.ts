import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioRuntimeSelectionSchema, StudioSha256Schema } from './project-environment'
import {
  assertPythonLanguageBootstrapSize,
  createPythonLanguageBootstrap,
} from './python-language-bootstrap'
import { type StudioRuntimeRelease, StudioRuntimeReleaseSchema } from './runtime-catalog'

export const StudioPythonBuilderPolicyResultSchema = z.strictObject({
  runtimeRelease: StudioRuntimeReleaseSchema.optional(),
})
export type StudioPythonBuilderPolicyResult = Readonly<{
  runtimeRelease?: StudioRuntimeRelease
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
  if (!release) return Object.freeze({})
  if (
    release.profileId !== selection.profileId ||
    release.releaseId !== selection.releaseId ||
    release.manifestSha256 !== selection.manifestSha256 ||
    release.manifest.python?.providedModules === undefined
  )
    throw new Error('A autorização não corresponde à release Python da revisão.')
  return Object.freeze({ runtimeRelease: release })
}

/** One attempt may never downgrade a configured session to legacy after a fresh policy read. */
export function pythonBuilderPolicyFence(runtime: unknown) {
  const selection = StudioRuntimeSelectionSchema.parse(runtime)
  let identity: string | undefined
  return async (raw: unknown): Promise<StudioPythonBuilderPolicyResult> => {
    const verified = await createPythonBuilderPolicyResult(raw, selection)
    const next = verified.runtimeRelease?.manifestSha256 ?? 'legacy'
    if (identity !== undefined && identity !== next)
      throw new Error('A configuração Python mudou durante a autorização.')
    identity = next
    return verified
  }
}
