import 'server-only'
import { createHash } from 'node:crypto'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  isStudioProPublication,
  isStudioPublicationId,
  STUDIO_PRO_PUBLICATION_LIMITS,
  type StudioProPublication,
} from '@sistemazero/core/studio'
import type { Project } from '@sistemazero/studio'
import { getEnv } from '../lib/env'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  proProjectTemplateId,
} from './studio-pro-runtime'

export class StudioPublicationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Publish game content, never private tutoring notes or links to the author's workspace. */
export function studioPublicProject(project: Project): Project {
  if (project.kind !== 'pro' || !project.proMeta) return project
  return {
    ...project,
    proMeta: { templateId: project.proMeta.templateId, devScript: project.proMeta.devScript },
    assets: project.assets?.map(
      ({ libId: _libId, libOrigin: _origin, libRevision: _revision, ...asset }) => asset,
    ),
  }
}

export function studioPublicationOwner(userId: string, accountId: string): string {
  return createHash('sha256')
    .update(JSON.stringify(['studio-publication-v1', accountId, userId]))
    .digest('hex')
}

/** Stable across a lost publish response; never based on a browser-supplied play id. */
export function studioPublicationPlayId(owner: string, context: string, requestId: string): string {
  const hash = createHash('sha256')
    .update(JSON.stringify([owner, context, requestId]))
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

type PublicationResponse =
  | StudioProPublication
  | { source: string; publication: StudioProPublication }
  | { png: string }
  | { deleted: true }
  | null
export async function callStudioPublication(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<PublicationResponse> {
  const env = getEnv()
  if (!env.STUDIO_PRO_RUNTIME_URL || !env.STUDIO_PRO_RUNTIME_TOKEN)
    throw new StudioPublicationError(
      503,
      'A publicação Pro ainda não está disponível neste ambiente.',
    )
  const serialized = JSON.stringify(body)
  if (Buffer.byteLength(serialized) > STUDIO_PRO_PUBLICATION_LIMITS.maxRequestBytes)
    throw new StudioPublicationError(413, 'O projeto ficou grande demais para publicar.')
  const response = await fetch(`${env.STUDIO_PRO_RUNTIME_URL.replace(/\/$/, '')}/v1/publications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STUDIO_PRO_RUNTIME_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: serialized,
    redirect: 'error',
    cache: 'no-store',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
      : AbortSignal.timeout(45_000),
  })
  const value: unknown = await readJsonBodyWithLimit(
    response,
    STUDIO_PRO_PUBLICATION_LIMITS.maxRequestBytes,
  )
  if (!response.ok) {
    let message = 'Não foi possível atualizar a publicação. Consulte o histórico antes de repetir.'
    if (
      value &&
      typeof value === 'object' &&
      'error' in value &&
      value.error &&
      typeof value.error === 'object' &&
      'message' in value.error &&
      typeof value.error.message === 'string'
    )
      message = value.error.message.slice(0, 1000)
    throw new StudioPublicationError(
      [400, 403, 404, 409, 413, 429].includes(response.status) ? response.status : 502,
      message,
    )
  }
  if (value === null) return value
  if (isStudioProPublication(value) && value.playId === body.playId) return value
  if (
    body.operation === 'purge' &&
    value &&
    typeof value === 'object' &&
    'deleted' in value &&
    value.deleted === true
  )
    return { deleted: true }
  if (
    value &&
    typeof value === 'object' &&
    'png' in value &&
    typeof value.png === 'string' &&
    value.png.length <= 3_333_336 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value.png)
  )
    return { png: value.png }
  if (
    value &&
    typeof value === 'object' &&
    'source' in value &&
    typeof value.source === 'string' &&
    'publication' in value &&
    isStudioProPublication(value.publication) &&
    value.publication.playId === body.playId
  )
    return { source: value.source, publication: value.publication }
  throw new StudioPublicationError(502, 'O serviço devolveu uma publicação inválida.')
}

export async function publishStudioProRevision(options: {
  project: Project
  source: string
  playId: string
  owner: string
  requestId: string
  expectedVersion: number
  parentOrigin: string
  signal?: AbortSignal
}): Promise<StudioProPublication> {
  const env = getEnv()
  const { project } = options
  const templateId = proProjectTemplateId(project)
  if (!isProStudioProject(project) || !templateId)
    throw new StudioPublicationError(400, 'Projeto Pro inválido.')
  if (!env.STUDIO_PRO_RUNTIME_URL || !env.STUDIO_PRO_RUNTIME_TOKEN)
    throw new StudioPublicationError(
      503,
      'A publicação Pro ainda não está disponível neste ambiente.',
    )
  if (!isStudioPublicationId(options.playId))
    throw new StudioPublicationError(400, 'Publicação inválida.')
  const sourceHash = createHash('sha256').update(options.source).digest('hex')
  const replay = await callStudioPublication(
    {
      operation: 'lookup',
      playId: options.playId,
      owner: options.owner,
      requestId: options.requestId,
      sourceHash,
    },
    options.signal,
  )
  if (isStudioProPublication(replay)) return replay
  const previous = await callStudioPublication(
    { operation: 'get', playId: options.playId, owner: options.owner },
    options.signal,
  )
  if (
    previous &&
    isStudioProPublication(previous) &&
    previous.version !== options.expectedVersion
  ) {
    throw new StudioPublicationError(
      409,
      'A publicação mudou. Atualize o histórico antes de publicar outra versão.',
    )
  }
  const built = await buildStudioProProject({
    project,
    templateId,
    executionId: await opaqueStudioRuntimeExecutionId('publication', options.owner, project.id),
    runtimeUrl: env.STUDIO_PRO_RUNTIME_URL,
    runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN,
    parentOrigin: options.parentOrigin,
    signal: options.signal,
    validate: true,
  })
  if (!built.artifact)
    throw new StudioPublicationError(502, 'A compilação não produziu um artefato publicável.')
  const result = await callStudioPublication(
    {
      operation: 'promote',
      playId: options.playId,
      owner: options.owner,
      requestId: options.requestId,
      expectedVersion: options.expectedVersion,
      projectId: project.id,
      parentOrigin: options.parentOrigin,
      source: options.source,
      artifactId: built.artifact.id,
      artifactHash: built.artifact.sha256,
    },
    options.signal,
  )
  if (!isStudioProPublication(result))
    throw new StudioPublicationError(502, 'Não foi possível confirmar a revisão publicada.')
  return result
}
