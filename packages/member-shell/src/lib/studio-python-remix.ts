import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { prepareStudioFreeOptions } from '@sistemazero/studio/free-project-options'
import { refinePythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/python-snapshot'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from './studio-tier'

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
      allowedExtensions: release.manifest.extensions.map((extension) => extension.id),
    }
  })
}

/** Preflight for a new private copy, never a reusable execution grant. */
export async function authorizePythonPrivateCopy({
  snapshot: rawSnapshot,
  viewerId,
  audience,
  options,
  request,
  signal,
}: {
  snapshot: unknown
  viewerId: string
  audience: 'kids' | 'adult'
  options: unknown
  request: (request: StudioFreeRuntimeRequest) => Promise<unknown>
  signal: AbortSignal
}) {
  signal.throwIfAborted()
  const project = await refinePythonProjectDocument(rawSnapshot)
  signal.throwIfAborted()
  const python = await pythonRemixCapabilities(options)
  signal.throwIfAborted()
  if (
    !studioRemixCovered(
      { pro: true, allowedExtensions: [], python },
      remixRequirementFromSnapshot(project),
    )
  )
    throw new Error('Este ambiente Python ainda não está disponível para criar sua versão.')
  const subject = studioRuntimeSubject(project)
  const snapshot = await preparePythonExecutionSnapshot(project)
  const context = { kind: 'free' as const, audience, projectId: project.id }
  signal.throwIfAborted()
  const decision = StudioFreeRuntimeDecisionSchema.parse(
    await request({
      context,
      operation: 'analyze',
      subject,
      revision: snapshot.revision,
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
    decision.revision !== snapshot.revision ||
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
  return project
}

/** Existing Mural callers keep the same owner/revision-bound preflight. */
export function authorizePythonRemix(input: Parameters<typeof authorizePythonPrivateCopy>[0]) {
  return authorizePythonPrivateCopy(input)
}
