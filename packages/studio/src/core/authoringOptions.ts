import {
  type StudioAuthoringOptions,
  StudioAuthoringOptionsSchema,
} from '@sistemazero/core/studio/authoring-catalog'
import { isStudioProTemplateId } from '@sistemazero/core/studio/pro-templates'
import type { StudioProjectKind } from '@sistemazero/core/studio/project-environment'
import {
  createStudioRuntimeCatalog,
  type StudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'

export interface PreparedStudioAuthoringOptions {
  options: StudioAuthoringOptions
  catalog: StudioRuntimeCatalog | null
}

/** Only the authenticated host response enters here, never an imported project. */
export async function prepareStudioAuthoringOptions(
  raw: unknown,
): Promise<PreparedStudioAuthoringOptions> {
  const options = StudioAuthoringOptionsSchema.parse(raw)
  const catalog = options.catalog ? await createStudioRuntimeCatalog(options.catalog.catalog) : null
  if (catalog && options.catalog) {
    const approved = new Set<string>()
    for (const policy of options.catalog.releases) {
      if (
        !selectStudioRuntimeRelease(catalog, policy.runtime) ||
        approved.has(policy.runtime.manifestSha256)
      )
        throw new Error('A configuração de autoria contém ambientes inconsistentes.')
      approved.add(policy.runtime.manifestSha256)
    }
    if (approved.size !== catalog.releases.length)
      throw new Error('A configuração de autoria está incompleta.')
  }
  return { options, catalog }
}

/** The legacy JS writer stays the default. Selecting a release never grants execution. */
export function studioAuthoringChoices(
  prepared: PreparedStudioAuthoringOptions,
  kind: StudioProjectKind,
) {
  const choices = [
    {
      key: 'javascript',
      label: 'JavaScript (padrão)',
      language: 'javascript' as 'javascript' | 'python',
      policy: null as NonNullable<StudioAuthoringOptions['catalog']>['releases'][number] | null,
    },
  ]
  if (!prepared.catalog || !prepared.options.catalog) return choices
  for (const policy of prepared.options.catalog.releases) {
    if (policy.status !== 'active') continue
    const release = selectStudioRuntimeRelease(prepared.catalog, policy.runtime)
    if (
      !release?.manifest.kinds.includes(kind) ||
      !release.manifest.capabilities.includes('edit') ||
      !release.manifest.modes.includes(kind === 'pro' ? 'code' : 'blocks')
    )
      continue
    const language = release.manifest.programmingLanguage
    if (
      kind === 'pro' &&
      ((language === 'javascript' && !policy.proTemplateIds.some(isStudioProTemplateId)) ||
        (language === 'python' && !policy.proTemplateIds.includes('python-blank')))
    )
      continue
    const label =
      language === 'python' ? `Python ${release.manifest.python!.version}` : 'JavaScript'
    choices.push({
      key: policy.runtime.manifestSha256,
      label: `${label} · ${policy.runtime.profileId}/${policy.runtime.releaseId}`,
      language,
      policy,
    })
  }
  return choices
}

export function studioAuthoringTemplate(
  choice: ReturnType<typeof studioAuthoringChoices>[number],
  preferred: string,
) {
  if (choice.language === 'python') return 'python-blank'
  const allowed = (id: string) =>
    isStudioProTemplateId(id) && (!choice.policy || choice.policy.proTemplateIds.includes(id))
  return allowed(preferred)
    ? preferred
    : (choice.policy?.proTemplateIds.find(allowed) ?? 'vanilla-js')
}

/** Exact identity: an unavailable saved release is not silently replaced by another one. */
export function studioAuthoringChoiceKey(
  project: { programmingLanguage?: string; runtime?: { manifestSha256: string } } | null,
) {
  return (
    project?.runtime?.manifestSha256 ??
    (project?.programmingLanguage === 'python' ? 'unavailable-python' : 'javascript')
  )
}
