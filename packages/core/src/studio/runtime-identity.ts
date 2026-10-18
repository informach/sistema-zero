import type { StudioRuntimeSelection } from './project-environment'

/** Shared primitive rules; metadata lists do not need a schema engine or a runtime catalog. */
export const isStudioCatalogId = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 96 && /^[a-z0-9][a-z0-9._-]*$/.test(value)
export const isStudioSha256 = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
/** Existing S2S execution namespace shared by JavaScript builds and Python validation inputs. */
export const STUDIO_EXECUTION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{15,95}$/

/** Returns a detached identity only. Reading an identity never approves execution. */
export function readStudioRuntimeIdentity(value: unknown): StudioRuntimeSelection | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(descriptors)
  if (
    keys.length !== 3 ||
    keys.some((key) => !['profileId', 'releaseId', 'manifestSha256'].includes(key))
  )
    return
  const own = (key: string): unknown => {
    const descriptor = descriptors[key]
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  }
  const profileId = own('profileId'),
    releaseId = own('releaseId'),
    manifestSha256 = own('manifestSha256')
  if (
    isStudioCatalogId(profileId) &&
    isStudioCatalogId(releaseId) &&
    isStudioSha256(manifestSha256)
  )
    return { profileId, releaseId, manifestSha256 }
}
