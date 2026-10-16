import { createHash } from 'node:crypto'
import {
  approvedEditionSchema,
  batchOperationSchema,
  batchResultSchema,
  canonicalJson,
  type MetricsAnalysis,
  metricKeys,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { and, eq } from 'drizzle-orm'
import { metricSnapshotView } from '../../../domain/metrics/availability'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { metricPublicationSnapshots, publications } from './schema'
import { DrizzleWorkspaceRepository, projectAccess, receipt } from './workspace.repository'
import { editorialDeliveries, editorialEditions } from './workspace-schema'

const labels = {
  views: 'Visualizações',
  likes: 'Curtidas',
  comments: 'Comentários',
  shares: 'Compartilhamentos',
  saves: 'Salvamentos',
}

/** Derives observations from a server snapshot, never from client-supplied counts. */
export function createMetricsAnalysis(
  db: Database,
  actorId: string,
  projectId: string,
  deliveryId: string,
  input: MetricsAnalysis,
  hash: string,
) {
  return db.transaction(async (tx) => {
    const { project } = await projectAccess(tx, actorId, projectId, 'edit')
    const previous = await receipt(tx, projectId, actorId, input.operationId, hash)
    if (previous) return batchResultSchema.parse(previous.result)
    const [record] = await tx
      .select({ edition: editorialEditions.edition, publication: publications })
      .from(editorialDeliveries)
      .innerJoin(editorialEditions, eq(editorialEditions.id, editorialDeliveries.editionId))
      .innerJoin(publications, eq(publications.id, editorialDeliveries.publicationId))
      .where(
        and(
          eq(editorialDeliveries.projectId, projectId),
          eq(editorialDeliveries.publicationId, deliveryId),
        ),
      )
    if (!record) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Entrega não disponível')
    const edition = approvedEditionSchema.parse(record.edition)
    if (edition.hash !== input.expectedHash || record.publication.status !== 'published')
      throw new WorkspaceError(
        'CONTEXT_CHANGED',
        'Confira a edição publicada antes de analisar os resultados',
      )
    const [snapshot] = await tx
      .select()
      .from(metricPublicationSnapshots)
      .where(
        and(
          eq(metricPublicationSnapshots.id, input.snapshotId),
          eq(metricPublicationSnapshots.publicationId, deliveryId),
        ),
      )
    if (!snapshot)
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Coleta não disponível nesta entrega')
    const metrics = metricSnapshotView(snapshot)
    const evidenceId = await stableEditorialId(
        `${projectId}:metrics-evidence:${input.operationId}`,
      ),
      analysisId = await stableEditorialId(`${projectId}:metrics-analysis:${input.operationId}`)
    const piece = edition.snapshot.revisions.find(
        (row) => row.entityId === edition.snapshot.pieceId,
      ),
      title = piece?.document.title ?? record.publication.title ?? 'Publicação'
    const observation = {
      publicationId: deliveryId,
      editionId: edition.id,
      editionHash: edition.hash,
      externalPostId: record.publication.externalPostId,
      publishedAt: record.publication.publishedAt?.toISOString() ?? null,
      metrics,
    }
    const sourceHash = createHash('sha256').update(canonicalJson(observation)).digest('hex')
    const body = [
      `Resultados acumulados de “${title}”.`,
      `Entrega: ${deliveryId}. Edição aprovada: ${edition.id}.`,
      `Coleta: ${metrics.capturedAt}. Publicação registrada em: ${observation.publishedAt ?? 'data indisponível'}.`,
      ...metricKeys.map(
        (key) =>
          `${labels[key]}: ${metrics[key] === null ? (metrics.availability[key] === 'legacy-unknown' ? 'zero histórico não confirmado' : 'não fornecido pela rede') : metrics[key]}.`,
      ),
      'Esta coleta descreve os contadores observados. Não mede conversão, causalidade, investimento em anúncios ou comparação justa entre idades de publicação.',
      `Identidade da observação: ${sourceHash}.`,
    ].join('\n')
    const batch = batchOperationSchema.parse({
      schemaVersion: 1,
      operationId: input.operationId,
      projectId,
      changes: [
        {
          entityId: evidenceId,
          baseRevisionId: null,
          action: 'save',
          document: {
            schemaVersion: 1,
            kind: 'evidence',
            title: `Resultados · ${title}`.slice(0, 300),
            body,
            classification: 'fact',
            source: {
              label: 'Métricas da publicação vinculada',
              ...(record.publication.externalUrl ? { url: record.publication.externalUrl } : {}),
              sourceKey: `marketing:delivery:${deliveryId}:snapshot:${snapshot.id}`,
              sha256: sourceHash,
              observedAt: metrics.capturedAt,
            },
            product: project.product,
            validity: 'historical',
            tags: ['resultado-publicado', 'observação'],
          },
        },
        {
          entityId: analysisId,
          baseRevisionId: null,
          action: 'save',
          document: {
            schemaVersion: 1,
            kind: 'analysis',
            title: `Analisar resultados · ${title}`.slice(0, 300),
            body: `Análise pendente.\n\n${body}\n\nObjetivo da peça: ${piece?.document.kind === 'piece' ? piece.document.objective : 'não informado'}.\n\nAvaliar esses resultados e propor uma hipótese verificável para a próxima peça.`,
            objective: input.objective,
            evidenceIds: [evidenceId],
            hypothesis: '',
            proposedPieceId: null,
            analysisType: 'research',
            basis: edition.snapshot.revisions
              .filter((row) =>
                ['piece', 'representation', 'component', 'video'].includes(row.document.kind),
              )
              .map((row) => ({ entityId: row.entityId, revisionId: row.id })),
          },
        },
      ],
    })
    return new DrizzleWorkspaceRepository(db).applyBatchInTransaction(tx, actorId, batch, hash)
  })
}
