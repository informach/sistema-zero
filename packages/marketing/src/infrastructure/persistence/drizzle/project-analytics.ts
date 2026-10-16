import {
  type AnalyticsRow,
  approvedEditionSchema,
  documentSchema,
  projectAnalyticsSchema,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { metricSnapshotView } from '../../../domain/metrics/availability'
import type { Database } from './db'
import { DrizzleMetricsRepository } from './metrics.repository'
import { publications } from './schema'
import { snapshotProjectAccess } from './workspace.repository'
import { editorialDeliveries, editorialEditions, editorialItems } from './workspace-schema'

/** All dimensions come from the approved snapshot, never today's mutable draft. */
export function readProjectAnalytics(
  db: Database,
  actorId: string,
  projectId: string,
  days: number,
  now = new Date(),
) {
  return db.transaction(
    async (tx) => {
      await snapshotProjectAccess(tx, actorId, projectId)
      const since = new Date(now.getTime() - days * 86_400_000)
      const candidates = await tx
        .select({ publication: publications, edition: editorialEditions.edition })
        .from(editorialDeliveries)
        .innerJoin(publications, eq(publications.id, editorialDeliveries.publicationId))
        .innerJoin(editorialEditions, eq(editorialEditions.id, editorialDeliveries.editionId))
        .where(
          and(
            eq(editorialDeliveries.projectId, projectId),
            eq(publications.status, 'published'),
            gte(publications.publishedAt, since),
            lte(publications.publishedAt, now),
          ),
        )
        .orderBy(desc(publications.publishedAt), desc(publications.id))
        .limit(501)
      const selected = candidates.slice(0, 500)
      const references = await tx
        .select({
          id: editorialItems.id,
          revisionId: editorialItems.revisionId,
          document: editorialItems.document,
        })
        .from(editorialItems)
        .where(
          and(
            eq(editorialItems.projectId, projectId),
            eq(editorialItems.kind, 'evidence'),
            eq(editorialItems.archived, false),
            sql`(${editorialItems.document}->'observation'->>'collectedAt')::timestamptz >= ${since.toISOString()}::timestamptz`,
            sql`(${editorialItems.document}->'observation'->>'collectedAt')::timestamptz <= ${now.toISOString()}::timestamptz`,
          ),
        )
        .orderBy(
          desc(sql`(${editorialItems.document}->'observation'->>'collectedAt')::timestamptz`),
          desc(editorialItems.id),
        )
        .limit(201)
      const observations = references.slice(0, 200).map((row) => {
        const document = documentSchema.parse(row.document)
        if (document.kind !== 'evidence' || !document.observation)
          throw new Error('Observação editorial inválida')
        return {
          evidenceId: row.id,
          revisionId: row.revisionId,
          title: document.title,
          observation: document.observation,
        }
      })
      const stats = await new DrizzleMetricsRepository(tx).latestPublicationStats(
        selected.map((row) => row.publication.id),
        now,
      )
      const rows: AnalyticsRow[] = selected.map(({ publication, edition: raw }) => {
        const edition = approvedEditionSchema.parse(raw)
        const piece = edition.snapshot.revisions.find(
          (row) => row.entityId === edition.snapshot.pieceId,
        )?.document
        const representation = edition.snapshot.revisions.find(
          (row) => row.entityId === edition.snapshot.representationId,
        )?.document
        const snapshot = stats.get(publication.id)
        if (
          piece?.kind !== 'piece' ||
          representation?.kind !== 'representation' ||
          !publication.publishedAt
        )
          throw new Error('A edição publicada não contém a identidade editorial')
        return {
          publicationId: publication.id,
          editionId: edition.id,
          pieceId: edition.snapshot.pieceId,
          title: piece.title,
          network: publication.network,
          sourceType:
            publication.socialAccountId && publication.externalPostId
              ? 'connected-account'
              : 'unlinked',
          publishedAt: publication.publishedAt.toISOString(),
          dimensions: {
            objective: piece.objective,
            audienceNeed: piece.audienceNeed ?? '',
            series: piece.series ?? '',
            format: representation.format,
          },
          metrics: snapshot ? metricSnapshotView(snapshot) : null,
          collectionVersion: snapshot?.collectionVersion ?? null,
        }
      })
      return projectAnalyticsSchema.parse({
        projectId,
        since: since.toISOString(),
        until: now.toISOString(),
        rows,
        observations,
        coverage: {
          included: rows.length,
          limit: 500,
          truncated: candidates.length > 500,
          observationsTruncated: references.length > 200,
        },
      })
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
