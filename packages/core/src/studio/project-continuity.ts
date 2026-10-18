import { isStudioCatalogId, isStudioSha256 } from './runtime-identity'

export type StudioProjectContinuityIssue =
  | 'invalid-environment'
  | 'language'
  | 'kind'
  | 'runtime'
  | 'template'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Inputs have already crossed their document validation boundary. This is not a parser/grant. */
function environment(value: unknown) {
  if (!record(value)) return null
  const legacy =
    value.formatVersion === undefined || value.formatVersion === 1 || value.formatVersion === 2
  if (!legacy && value.formatVersion !== 3) return null
  const language = value.programmingLanguage ?? (legacy ? 'javascript' : null)
  const kind = value.kind ?? (legacy ? 'classic' : null)
  if (!['javascript', 'python'].includes(String(language))) return null
  if (kind !== 'classic' && kind !== 'pro') return null
  const runtime = value.runtime
  if (legacy) {
    if (language !== 'javascript' || runtime !== undefined || value.python !== undefined)
      return null
  } else if (
    !record(runtime) ||
    !isStudioCatalogId(runtime.profileId) ||
    !isStudioCatalogId(runtime.releaseId) ||
    !isStudioSha256(runtime.manifestSha256)
  )
    return null
  const template = kind === 'pro' && record(value.proMeta) ? value.proMeta.templateId : null
  if (kind === 'pro' && (typeof template !== 'string' || !template)) return null
  return { language, kind, runtime: record(runtime) ? runtime : null, template }
}

/**
 * A saved project can continue a lesson only in the same editor and pinned environment.
 * Source, entrypoint, assets, layouts and installed extensions are deliberately not compared:
 * those are editable work, with their own validation and capability checks. A release/format
 * migration must be explicit and verified, never inferred from a matching chain name.
 */
export function studioProjectContinuityIssue(
  saved: unknown,
  initial: unknown,
): StudioProjectContinuityIssue | null {
  const left = environment(saved)
  const right = environment(initial)
  if (!left || !right) return 'invalid-environment'
  if (left.language !== right.language) return 'language'
  if (left.kind !== right.kind) return 'kind'
  if (
    Boolean(left.runtime) !== Boolean(right.runtime) ||
    (left.runtime &&
      right.runtime &&
      ['profileId', 'releaseId', 'manifestSha256'].some(
        (key) => left.runtime![key] !== right.runtime![key],
      ))
  )
    return 'runtime'
  if (left.template !== right.template) return 'template'
  return null
}

/** A restrictive admission hint, containing no source, assets, curation or capability grant. */
export function studioProjectContinuityReference(value: unknown) {
  const parsed = environment(value)
  if (!parsed || !record(value)) throw new Error('O ambiente do projeto salvo é inválido.')
  return {
    formatVersion: parsed.runtime ? 3 : 2,
    programmingLanguage: parsed.language,
    kind: parsed.kind,
    ...(parsed.runtime
      ? {
          runtime: {
            profileId: parsed.runtime.profileId,
            releaseId: parsed.runtime.releaseId,
            manifestSha256: parsed.runtime.manifestSha256,
          },
        }
      : {}),
    ...(parsed.template ? { proMeta: { templateId: parsed.template } } : {}),
  }
}
