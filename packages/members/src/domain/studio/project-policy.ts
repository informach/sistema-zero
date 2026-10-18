import { createHash } from 'node:crypto'
import {
  type StudioAuthoringCatalog,
  StudioAuthoringCatalogSchema,
} from '@sistemazero/core/studio/authoring-catalog'
import {
  resolveStudioProjectCapabilities,
  type StudioCapabilityResolutionInput,
} from '@sistemazero/core/studio/project-capabilities'
import { pythonExternalDependenciesIssue } from '@sistemazero/core/studio/python-dependency-policy'
import {
  createStudioRuntimeCatalog,
  selectStudioRuntimeRelease,
  studioDependencyLockIssue,
} from '@sistemazero/core/studio/runtime-catalog'
import type { StudioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { InvalidContentCommandError } from '../course/course.errors'

export type StudioProjectPolicyAccess = Omit<
  StudioCapabilityResolutionInput,
  'project' | 'profile' | 'release' | 'releaseStatus' | 'grantedExtensionIds'
> & { grantedExtensionIds?: readonly string[] }

/** Deployment configuration only. Sharing compatibility does not share contextual authority. */
export async function createStudioProjectPolicy(raw: unknown) {
  const configuration = StudioAuthoringCatalogSchema.parse(raw)
  const catalog = await createStudioRuntimeCatalog(configuration.catalog)
  const policies = new Map(
    configuration.releases.map((policy) => [policy.runtime.manifestSha256, policy]),
  )
  if (policies.size !== configuration.releases.length || policies.size !== catalog.releases.length)
    throw new Error('A política de autoria precisa identificar cada release uma única vez.')
  for (const policy of policies.values()) {
    if (!selectStudioRuntimeRelease(catalog, policy.runtime))
      throw new Error('A política de autoria referencia uma release não aprovada.')
    for (const values of [policy.proTemplateIds, policy.blockIds, policy.categoryIds])
      if (new Set(values).size !== values.length)
        throw new Error('A política de autoria contém identificadores repetidos.')
  }
  return {
    describe: (): StudioAuthoringCatalog => structuredClone(configuration),
    resolve(
      project: StudioRuntimeSubject,
      access: StudioProjectPolicyAccess,
      validateDependencies = true,
    ) {
      const release = selectStudioRuntimeRelease(catalog, project.runtime)
      const policy = policies.get(project.runtime.manifestSha256)
      const profile = catalog.profiles.find((item) => item.id === project.runtime.profileId)
      if (!release || !profile || !policy)
        throw new InvalidContentCommandError(
          'O ambiente do projeto não pertence ao catálogo aprovado.',
        )
      const grantedExtensionIds =
        access.grantedExtensionIds ?? release.manifest.extensions.map(({ id }) => id)
      const resolved = resolveStudioProjectCapabilities({
        ...access,
        project: {
          programmingLanguage: project.programmingLanguage,
          kind: project.kind,
          runtime: project.runtime,
          installedExtensions: project.installedExtensions.map(({ id, version }) => ({
            id,
            version,
          })),
        },
        profile,
        release,
        releaseStatus: policy.status,
        grantedExtensionIds,
      })
      if (!resolved.valid || !resolved.modes.includes(project.mode))
        throw new InvalidContentCommandError(
          resolved.issues[0]?.message ?? 'O modo inicial precisa estar disponível nesta aula.',
        )
      if (
        project.kind === 'pro' &&
        (!project.proMeta || !policy.proTemplateIds.includes(project.proMeta.templateId))
      )
        throw new InvalidContentCommandError('Escolha um modelo Pro aprovado para este ambiente.')
      if (
        access.curation?.allowBlocks?.some((id) => !policy.blockIds.includes(id)) ||
        access.curation?.allowCategories?.some((id) => !policy.categoryIds.includes(id))
      )
        throw new InvalidContentCommandError(
          'A curadoria contém blocos ou categorias de outro ambiente.',
        )
      if (project.programmingLanguage === 'python' && validateDependencies) {
        const requirements = project.requirements
        const dependencyIssue = pythonExternalDependenciesIssue(
          requirements,
          project.python.dependencyLock,
        )
        if (dependencyIssue) throw new InvalidContentCommandError(dependencyIssue)
        const hash = createHash('sha256').update(requirements).digest('hex')
        if (studioDependencyLockIssue(project.python.dependencyLock, release, hash))
          throw new InvalidContentCommandError(
            'As dependências do projeto não correspondem ao ambiente aprovado e ao requirements.txt.',
          )
      }
      return {
        ...resolved,
        releaseStatus: policy.status,
        grantedExtensionIds: [...grantedExtensionIds],
        blockIds: [...policy.blockIds],
        catalog: {
          profiles: [
            {
              ...profile,
              releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
            },
          ],
          releases: [release],
        },
      }
    },
  }
}
