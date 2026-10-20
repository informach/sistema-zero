import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import {
  createStudioRuntimeRelease,
  type StudioRuntimeRelease,
  StudioRuntimeReleaseSchema,
} from './runtime-catalog'

/** Total UTF-8 ceiling for internal Open, persisted lease metadata and configuration. */
export const STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES = 1_048_576
export const StudioPythonLanguageBootstrapSchema = z.strictObject({
  protocolVersion: z.literal(1),
  runtimeRelease: StudioRuntimeReleaseSchema.optional(),
})
export type StudioPythonLanguageBootstrap = Readonly<{
  protocolVersion: 1
  runtimeRelease?: StudioRuntimeRelease
}>

export function assertPythonLanguageBootstrapSize(text: string) {
  if (new TextEncoder().encode(text).byteLength > STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES)
    throw new Error('Language configuration exceeds its byte limit')
}

/** Integrity only; the authenticated BFF owns catalog approval and exact selection. */
export async function createPythonLanguageBootstrap(
  raw: unknown,
): Promise<StudioPythonLanguageBootstrap> {
  // Parse takes a deep snapshot before the first await. No optional default is materialized.
  const snapshot = StudioPythonLanguageBootstrapSchema.parse(raw)
  assertPythonLanguageBootstrapSize(canonicalJson(snapshot))
  if (!snapshot.runtimeRelease) return Object.freeze({ protocolVersion: 1 })
  const received = snapshot.runtimeRelease
  if (received.manifest.programmingLanguage !== 'python')
    throw new Error('Language configuration requires a Python release')
  const release = await createStudioRuntimeRelease(received.manifest)
  if (release.manifestSha256 !== received.manifestSha256)
    throw new Error('Language configuration release hash mismatch')
  return Object.freeze({ protocolVersion: 1, runtimeRelease: release })
}
