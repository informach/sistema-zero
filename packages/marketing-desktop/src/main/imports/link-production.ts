import {
  type ProductionLinkResult,
  productionLinkPreviewSchema,
  productionLinkSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import type { WorkspaceRequest } from '../../shared/connection'
import { rateLimitedTransport } from '../sync/rate-limit'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'

/** Confirmed originals remain immutable. Separate final artifacts retain their source identity. */
export async function linkProduction(
  manager: DesktopWorkspaceManager,
  scope: WorkspaceRequest['scope'],
  projectId: string,
  reportId: string,
  planHash: string,
  signal: AbortSignal,
  progress: (stage: string) => void,
): Promise<ProductionLinkResult> {
  const resources = await manager.resources(scope, projectId)
  const transport = rateLimitedTransport(resources.transport, signal, (ms) =>
    progress(`Aguardando o servidor por ${Math.ceil(ms / 1000)} s`),
  )
  const route = `/projects/${projectId}/production-reports/${reportId}/link`
  const preview = productionLinkPreviewSchema.parse(await transport.request(route))
  if (preview.status === 'linked') return preview
  if (preview.status === 'blocked') throw new Error(preview.reasons.join(' '))
  if (preview.planHash !== planHash)
    throw new Error('A peça mudou desde a prévia; confira novamente antes de vincular.')
  const assets = []
  let pending = 0
  for (const component of preview.components) {
    signal.throwIfAborted()
    progress(`Preparando arte ${component.position} de ${preview.components.length}`)
    const final = await manager.prepareImportedFinal(
      scope,
      projectId,
      component.originalAssetId,
      component.sha256,
      signal,
    )
    const uploaded = await manager.upload(
      scope,
      projectId,
      final.id,
      (fraction) =>
        progress(`Enviando arte ${component.position} · ${Math.round(fraction * 100)}%`),
      signal,
    )
    if (uploaded.state !== 'confirmed') pending++
    assets.push({ componentId: component.componentId, assetId: final.id })
  }
  if (pending) return { status: 'verifying', pending }
  signal.throwIfAborted()
  const link = productionLinkSchema.parse(
    await transport.request(route, 'POST', {
      operationId: await stableEditorialId(
        `${projectId}:${reportId}:${planHash}:production-link-v1`,
      ),
      planHash,
      assets,
    }),
  )
  await manager.synchronize()
  return { status: 'linked', link }
}
