import 'server-only'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { isStudioPythonPublication } from '@sistemazero/core/studio'
import { StudioPublicRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/python-snapshot'
import type { HubClient, MembersClient } from './clients'
import { callStudioPublication, StudioPublicationError } from './studio-publication'

export async function authorizeStudioPublicPython(options: {
  playId: string
  publicationRevision: string
  hub: Pick<HubClient, 'resolveStudioPlay'>
  members: Pick<MembersClient, 'authorizePublicRuntime'>
  signal: AbortSignal
}) {
  const { playId, publicationRevision, hub, members, signal } = options
  signal.throwIfAborted()
  await assertVisible(hub, playId)
  const retained = await callStudioPublication({ operation: 'resolve', playId }, signal)
  if (!retained || !('source' in retained) || !isStudioPythonPublication(retained.publication))
    throw new StudioPublicationError(404, 'Jogo não encontrado.')
  const publication = retained.publication
  if (publication.activeRevision !== publicationRevision)
    throw new StudioPublicationError(409, 'O jogo foi atualizado. Reabra a página para jogar.')
  const project = await prepareEditableStudioProject(JSON.parse(retained.source))
  if (
    project?.programmingLanguage !== 'python' ||
    project.kind !== publication.kind ||
    canonicalJson(project.runtime) !== canonicalJson(publication.runtime)
  )
    throw new StudioPublicationError(409, 'O pacote deste jogo está inválido.')
  const snapshot = await preparePythonExecutionSnapshot(project)
  const revision = publication.revisions.find((entry) => entry.id === publicationRevision)
  if (!revision || revision.approval.snapshotSha256 !== snapshot.revision)
    throw new StudioPublicationError(
      409,
      'O conteúdo deste jogo não corresponde à revisão publicada.',
    )
  signal.throwIfAborted()
  const subject = studioRuntimeSubject(project)
  const context = { kind: 'public' as const, playId, publicationRevision }
  const response = await members.authorizePublicRuntime({
    context,
    subject,
    operation: 'execute',
    revision: snapshot.revision,
  })
  if (response.status !== 200)
    throw new StudioPublicationError(
      response.status >= 500 ? 503 : 403,
      'O ambiente deste jogo não está disponível.',
    )
  const parsed = StudioPublicRuntimeDecisionSchema.safeParse(response.body)
  if (!parsed.success) throw new StudioPublicationError(502, 'A autorização do jogo está inválida.')
  const decision = parsed.data
  if (
    canonicalJson(decision.context) !== canonicalJson(context) ||
    decision.projectId !== project.id ||
    decision.revision !== snapshot.revision ||
    decision.subjectSha256 !== (await sha256Hex(canonicalJson(subject))) ||
    canonicalJson(decision.runtime) !== canonicalJson(project.runtime) ||
    !decision.capabilities.includes('execute') ||
    decision.releaseStatus === 'revoked' ||
    decision.expiresAt <= Date.now() ||
    decision.expiresAt - decision.issuedAt <= 0 ||
    decision.expiresAt - decision.issuedAt > 30_000
  )
    throw new StudioPublicationError(502, 'A autorização não corresponde ao jogo publicado.')
  // Moderation/rollback may win while Members resolves the runtime. Recheck lightweight
  // pointers after that wait, never transfer the full project/media bundle a second time.
  const [current] = await Promise.all([
    callStudioPublication({ operation: 'resolve-metadata', playId }, signal),
    assertVisible(hub, playId),
  ])
  signal.throwIfAborted()
  if (
    !isStudioPythonPublication(current) ||
    current.activeRevision !== publicationRevision ||
    current.version !== publication.version
  )
    throw new StudioPublicationError(409, 'A publicação mudou. Reabra a página para jogar.')
  return decision
}

async function assertVisible(hub: Pick<HubClient, 'resolveStudioPlay'>, playId: string) {
  const visible = await hub.resolveStudioPlay(playId, false)
  if (visible.status >= 500)
    throw new StudioPublicationError(503, 'Não foi possível consultar este jogo.')
  if (visible.status !== 200 || visible.body?.visible !== true)
    throw new StudioPublicationError(404, 'Jogo não encontrado.')
}
