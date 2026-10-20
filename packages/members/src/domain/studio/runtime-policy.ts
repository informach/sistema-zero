import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import type { StudioRuntimeOperation } from '@sistemazero/core/studio/runtime-authorization'
import type {
  StudioProjectCapability,
  StudioRuntimeCatalog,
  StudioRuntimeReleaseStatus,
} from '@sistemazero/core/studio/runtime-catalog'
import type { StudioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AccessDeniedError } from '../entitlement/entitlement.errors'
import { createStudioProjectPolicy } from './project-policy'
import type { StudioRuntimeHosts } from './runtime-hosts'

export interface StudioRuntimePolicy {
  /** Saved JS Pro builds have no Python frame; the BFF separately requires compiler config. */
  authorizeProBuild(input: {
    project: StudioRuntimeSubject
    operation: 'execute'
    curation: StudioProjectCuration
    grantedCapabilities: readonly StudioProjectCapability[]
  }): void
  authorize(input: {
    project: StudioRuntimeSubject
    operation: StudioRuntimeOperation
    curation: StudioProjectCuration
    grantedCapabilities: readonly StudioProjectCapability[]
    grantedExtensionIds?: readonly string[]
    /** A server-verified reader may parse source without receiving editing/execution rights. */
    allowReadOnlyAnalysis?: boolean
  }): {
    capabilities: readonly StudioProjectCapability[]
    grantedExtensionIds: readonly string[]
    catalog: StudioRuntimeCatalog
    blockIds: readonly string[]
    releaseStatus: StudioRuntimeReleaseStatus
    frame: { url: string; allowedOrigins: readonly string[] }
  }
}

/** Both inputs are host-owned; neither comes from an HTTP body or a project snapshot. */
export async function createStudioRuntimePolicy(
  catalog: unknown,
  hosts: StudioRuntimeHosts,
): Promise<StudioRuntimePolicy> {
  const policy = await createStudioProjectPolicy(catalog)
  return {
    authorizeProBuild({ project, operation, ...access }) {
      if (
        operation !== 'execute' ||
        project.programmingLanguage !== 'javascript' ||
        project.kind !== 'pro'
      )
        throw new AccessDeniedError('Esta operação precisa de um projeto JavaScript Pro.')
      const result = policy.resolve(project, {
        ...access,
        hostOperations: [
          { capability: 'edit', state: 'available' },
          { capability: 'execute', state: 'available' },
          { capability: 'export-source', state: 'available' },
        ],
      })
      if (
        result.releaseStatus === 'revoked' ||
        !result.capabilities.includes('execute') ||
        result.extensionIds.length !== project.installedExtensions.length
      )
        throw new AccessDeniedError('Este projeto ou ambiente não está autorizado para execução.')
    },
    authorize({ project, operation, allowReadOnlyAnalysis = false, ...access }) {
      if (allowReadOnlyAnalysis && operation !== 'analyze')
        throw new AccessDeniedError('A observação permite somente analisar o código.')
      const result = policy.resolve(
        project,
        {
          ...access,
          hostOperations: hosts.operations(project),
        },
        operation !== 'analyze',
      )
      // Offline edit/export remain possible for recovery. A revoked distribution must not
      // start a remote interpreter for analysis, even though local text editing is allowed.
      if (result.releaseStatus === 'revoked')
        throw new AccessDeniedError('Este ambiente foi revogado. Seu projeto foi preservado.')
      if (result.extensionIds.length !== project.installedExtensions.length)
        throw new AccessDeniedError(
          'Uma extensão deste projeto não está autorizada neste contexto.',
        )
      const capability = operation === 'analyze' ? 'edit' : operation
      if (!allowReadOnlyAnalysis && !result.capabilities.includes(capability))
        throw new AccessDeniedError('Esta operação não está disponível neste projeto.')
      if (operation !== 'execute' && project.programmingLanguage !== 'python')
        throw new AccessDeniedError('Esta operação precisa de um projeto Python.')
      const frame = hosts.frame(project)
      if (!frame) throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
      return {
        capabilities: allowReadOnlyAnalysis
          ? []
          : operation === 'analyze'
            ? result.capabilities.filter(
                (capability) => capability === 'edit' || capability === 'export-source',
              )
            : result.capabilities,
        grantedExtensionIds: result.grantedExtensionIds,
        catalog: result.catalog,
        blockIds: result.blockIds,
        releaseStatus: result.releaseStatus,
        frame,
      }
    },
  }
}
