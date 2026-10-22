import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { StudioProjectMode } from '@sistemazero/core/studio/project-environment'
import { resolvePythonLearningLevel } from '@sistemazero/core/studio/python-learning'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import {
  createStudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { prepareStudioFreeOptions } from '@sistemazero/studio/free-project-options'
import { refinePythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/python-snapshot'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from './studio-tier'

export interface PythonCopyAuthoringRequirements {
  requiredBlockIds: readonly string[]
  requiredModes: readonly StudioProjectMode[]
}

/** Active authoring discovery only. Existing retired public games remain playable. */
export async function pythonRemixCapabilities(
  raw: unknown,
): Promise<NonNullable<StudioRemixCapability['python']>> {
  const { environments } = await prepareStudioFreeOptions(raw)
  return environments.map(({ kind, context }) => {
    const release = selectStudioRuntimeRelease(context.catalog, context.runtime)
    if (!release) throw new Error('O ambiente Python não está disponível.')
    return {
      kind,
      runtime: context.runtime,
      allowedExtensions: release.manifest.extensions
        .map((extension) => extension.id)
        .filter((id) => context.grantedExtensionIds?.includes(id)),
    }
  })
}

/** Preflight for a new private copy, never a reusable execution grant. */
async function authorizePythonCopy(
  {
    snapshot: rawSnapshot,
    viewerId,
    audience,
    options,
    request,
    signal,
    authoringRequirements,
  }: {
    snapshot: unknown
    viewerId: string
    audience: 'kids' | 'adult'
    options: unknown
    request: (request: StudioFreeRuntimeRequest) => Promise<unknown>
    signal: AbortSignal
    authoringRequirements?: PythonCopyAuthoringRequirements
  },
  revisionKind: 'document' | 'execution',
) {
  const required = authoringRequirements && structuredClone(authoringRequirements)
  signal.throwIfAborted()
  const project = await refinePythonProjectDocument(rawSnapshot)
  signal.throwIfAborted()
  const python = await pythonRemixCapabilities(options)
  signal.throwIfAborted()
  if (
    !studioRemixCovered(
      { pro: true, javascript: false, allowedExtensions: [], python },
      remixRequirementFromSnapshot(project),
    )
  )
    throw new Error('Este ambiente Python ainda não está disponível para criar sua versão.')
  const subject = studioRuntimeSubject(project)
  // Import preserves editable drafts and source/lock differences. Its approval
  // binds this document only; Run still prepares and authorizes execution itself.
  const revision =
    revisionKind === 'document'
      ? await sha256Hex(canonicalJson(project))
      : (await preparePythonExecutionSnapshot(project)).revision
  const context = { kind: 'free' as const, audience, projectId: project.id }
  signal.throwIfAborted()
  const decision = StudioFreeRuntimeDecisionSchema.parse(
    await request({
      context,
      operation: 'analyze',
      subject,
      revision,
    }),
  )
  signal.throwIfAborted()
  const subjectSha256 = await sha256Hex(canonicalJson(subject))
  signal.throwIfAborted()
  const now = Date.now()
  if (
    decision.actor.userId !== viewerId ||
    canonicalJson(decision.context) !== canonicalJson(context) ||
    decision.operation !== 'analyze' ||
    decision.projectId !== project.id ||
    decision.revision !== revision ||
    decision.subjectSha256 !== subjectSha256 ||
    canonicalJson(decision.runtime) !== canonicalJson(project.runtime) ||
    decision.releaseStatus !== 'active' ||
    !decision.capabilities.includes('edit') ||
    project.installedExtensions.some(
      (extension) => !decision.grantedExtensionIds.includes(extension.id),
    ) ||
    decision.issuedAt > now ||
    decision.expiresAt <= now ||
    decision.expiresAt - decision.issuedAt > 30_000
  )
    throw new Error('O acesso mudou. Reabra a criação do projeto.')
  if (required) {
    // The final decision may revoke blocks or modes after discovery/preparation.
    // Its exact verified release and curation are the authority for this copy.
    const catalog = await createStudioRuntimeCatalog(decision.catalog)
    signal.throwIfAborted()
    const release = selectStudioRuntimeRelease(catalog, project.runtime)
    if (
      !release ||
      required.requiredModes.some(
        (mode) =>
          !release.manifest.modes.includes(mode) ||
          (decision.curation.allowedModes && !decision.curation.allowedModes.includes(mode)),
      )
    )
      throw new Error('A autoria deste exemplo mudou. Reabra a criação do projeto.')
    if (project.kind === 'classic' && required.requiredBlockIds.length) {
      const { loadPythonAuthoring, selectPythonPalette } = await import(
        '@sistemazero/studio/python-authoring'
      )
      signal.throwIfAborted()
      const authoring = await loadPythonAuthoring(project, {
        catalog,
        pythonAuthoring: [{ runtime: decision.runtime, blockIds: decision.blockIds }],
      })
      signal.throwIfAborted()
      const palette = selectPythonPalette({
        ...authoring,
        level: resolvePythonLearningLevel(decision.curation.pythonLevel),
        allowBlocks: decision.curation.allowBlocks,
        allowCategories: decision.curation.allowCategories,
      })
      const available = new Set(palette.entries.map(({ id }) => id))
      if (required.requiredBlockIds.some((id) => !available.has(id)))
        throw new Error('A autoria deste exemplo mudou. Reabra a criação do projeto.')
    }
    signal.throwIfAborted()
    if (decision.expiresAt <= Date.now())
      throw new Error('O acesso mudou. Reabra a criação do projeto.')
  }
  return project
}

export function authorizePythonPrivateCopy(input: Parameters<typeof authorizePythonCopy>[0]) {
  return authorizePythonCopy(input, 'execution')
}

/** Existing Mural callers keep the same owner/revision-bound preflight. */
export function authorizePythonRemix(input: Parameters<typeof authorizePythonPrivateCopy>[0]) {
  return authorizePythonPrivateCopy(input)
}

/** Import is an editing operation; neither settles drafts nor updates a dependency lock. */
export function authorizePythonImport(
  input: Omit<Parameters<typeof authorizePythonCopy>[0], 'authoringRequirements'>,
) {
  return authorizePythonCopy(input, 'document')
}
