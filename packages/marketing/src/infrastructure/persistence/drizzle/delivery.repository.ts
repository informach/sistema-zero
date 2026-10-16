import { randomUUID } from 'node:crypto'
import {
  type ApprovedEdition,
  approvedEditionSchema,
  type CreateDelivery,
  canonicalJson,
  type Delivery,
  type DeliveryAction,
  deliverySchema,
  type MetricsAnalysis,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { metricSnapshotView } from '../../../domain/metrics/availability'
import type {
  DeliveryRepository,
  ResolvedDelivery,
} from '../../../domain/ports/delivery-repository.port'
import type { MediaStore } from '../../../domain/ports/media-store.port'
import type { VerifiedPostResolver } from '../../../domain/ports/verified-post-resolver.port'
import { postUrl } from '../../../domain/publication/post-url'
import {
  canCancelPublication,
  canMarkPublished,
  canSchedule,
  captionLimitFor,
  FORMAT_NETWORK,
  forcesManualMode,
  hasProviderCheckpoint,
  type Network,
  type PublicationFormat,
} from '../../../domain/publication/publication'
import type { Publication } from '../../../domain/publication/publication-record'
import { canAutoPublish } from '../../../domain/social-account/social-account'
import { deliveryCopy } from '../../../domain/workspace/delivery'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { createMetricsAnalysis } from './metrics-analysis'
import { contents, metricPublicationSnapshots, publications, socialAccounts } from './schema'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialDeliveries as deliveries,
  editorialEditions as editions,
  editorialAssets,
  editorialItems,
  editorialProjects,
  editorialReceipts,
} from './workspace-schema'

type Binding = typeof deliveries.$inferSelect
const inaccessible = () => new WorkspaceError('OBJECT_INACCESSIBLE', 'Entrega não disponível')
const changed = () =>
  new WorkspaceError(
    'CONTEXT_CHANGED',
    'A entrega mudou. Atualize a conferência antes de continuar.',
  )
function view(
  binding: Binding,
  publication: Publication,
  edition: Pick<ApprovedEdition, 'id' | 'hash'>,
): Delivery {
  return deliverySchema.parse({
    schemaVersion: 1,
    id: publication.id,
    projectId: binding.projectId,
    editionId: edition.id,
    editionHash: edition.hash,
    representationId: binding.representationId,
    sourcePublicationId: binding.sourcePublicationId,
    version: publication.version,
    format: publication.format,
    caption: publication.caption,
    title: publication.title,
    status: publication.status,
    publishMode: publication.publishMode,
    socialAccountId: publication.socialAccountId,
    scheduledAt: publication.scheduledAt?.toISOString() ?? null,
    publishedAt: publication.publishedAt?.toISOString() ?? null,
    externalUrl: publication.externalUrl,
    externalPostId: publication.externalPostId,
    lastError: publication.lastError,
    started: hasProviderCheckpoint(publication.providerSession),
    createdAt: publication.createdAt.toISOString(),
  })
}

async function approved(tx: WorkspaceTransaction, projectId: string, id: string) {
  const [row] = await tx
    .select()
    .from(editions)
    .where(and(eq(editions.id, id), eq(editions.projectId, projectId)))
  if (!row) throw inaccessible()
  return approvedEditionSchema.parse(row.edition)
}

function validateBinding(binding: Binding, edition: ApprovedEdition, publication: Publication) {
  const copy = deliveryCopy(edition, publication.format)
  if (
    publication.contentId !== binding.contentId ||
    publication.network !== FORMAT_NETWORK[publication.format] ||
    binding.representationId !== edition.snapshot.representationId ||
    publication.caption !== copy.caption ||
    publication.title !== copy.title ||
    publication.coverAssetId !== null ||
    publication.tags.length
  )
    throw new WorkspaceError('INVALID_RESULT', 'A entrega diverge da edição aprovada')
}

function validateActionState(publication: Publication, input: DeliveryAction) {
  if (input.action === 'link-external') {
    if (publication.status !== 'published')
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Somente uma entrega publicada pode ser vinculada ao post real',
      )
    return
  }
  if (input.action === 'reconcile-published' || input.action === 'cancel-local') {
    if (publication.status !== 'failed' || !hasProviderCheckpoint(publication.providerSession))
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'A reconciliação exige um envio encerrado com erro e checkpoint; aguarde o publicador concluir',
      )
    return
  }
  if (hasProviderCheckpoint(publication.providerSession))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'O envio externo já começou. Reconcilie o resultado com o provedor antes de repetir ou alterar esta entrega.',
    )
}

/** Caller holds the project lock. Drafts may evolve; confirmed files and factual dependencies may not. */
async function validate(
  tx: WorkspaceTransaction,
  edition: ApprovedEdition,
  publication: Publication,
): Promise<ResolvedDelivery> {
  const copy = deliveryCopy(edition, publication.format)
  if (
    publication.caption !== copy.caption ||
    publication.title !== copy.title ||
    publication.coverAssetId !== null ||
    publication.tags.length
  )
    throw new WorkspaceError('INVALID_RESULT', 'Os dados da entrega divergem da edição aprovada')
  const facts = edition.snapshot.revisions.filter(
    (row) => row.document.kind === 'evidence' && row.document.classification === 'fact',
  )
  if (facts.length) {
    const current = await tx
      .select()
      .from(editorialItems)
      .where(
        and(
          eq(editorialItems.projectId, edition.snapshot.projectId),
          inArray(
            editorialItems.id,
            facts.map((row) => row.entityId),
          ),
        ),
      )
    if (
      facts.some(
        (fact) =>
          !current.some(
            (item) =>
              item.id === fact.entityId &&
              !item.archived &&
              item.revisionId === fact.id &&
              item.document.kind === 'evidence' &&
              item.document.validity === 'current',
          ),
      )
    )
      throw new WorkspaceError(
        'CONTEXT_CHANGED',
        'Uma evidência factual da edição foi alterada ou invalidada. Confira e aprove uma nova edição.',
      )
  }
  const ids = [...new Set(edition.snapshot.orderedAssets.map((file) => file.asset.id))]
  const rows = await tx
    .select()
    .from(editorialAssets)
    .where(
      and(
        eq(editorialAssets.projectId, edition.snapshot.projectId),
        eq(editorialAssets.confirmed, true),
        inArray(editorialAssets.id, ids),
      ),
    )
  const files = edition.snapshot.orderedAssets.map(({ asset }) => {
    const row = rows.find((candidate) => candidate.id === asset.id)
    if (!row || canonicalJson(row.manifest) !== canonicalJson(asset))
      throw new WorkspaceError(
        'ASSET_UNCONFIRMED',
        'Um arquivo aprovado não está confirmado ou sua identidade mudou',
      )
    // Adapter for the existing publishers. No second media catalog and no copied bytes.
    return {
      id: asset.id,
      version: 0,
      contentId: publication.contentId,
      kind: 'final' as const,
      r2Key: row.storageKey,
      driveFileId: null,
      filename: asset.name,
      contentType: asset.mime,
      sizeBytes: asset.size,
      status: 'ready' as const,
      transferAttempts: 0,
      transferNextAt: null,
      transferError: null,
      archivedAt: null,
      r2DeletedAt: null,
      createdBy: edition.approvedBy,
      createdAt: new Date(edition.approvedAt),
      updatedAt: new Date(edition.approvedAt),
    }
  })
  return {
    projectId: edition.snapshot.projectId,
    representationId: edition.snapshot.representationId,
    editionHash: edition.hash,
    title: copy.title,
    assets: files,
    orderedAssetIds: files.map((file) => file.id),
  }
}

export class DrizzleDeliveryRepository implements DeliveryRepository {
  analyze(actorId: string, projectId: string, id: string, input: MetricsAnalysis, hash: string) {
    return createMetricsAnalysis(this.db, actorId, projectId, id, input, hash)
  }
  metrics(actorId: string, projectId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(and(eq(deliveries.projectId, projectId), eq(deliveries.publicationId, id)))
      if (!binding) throw inaccessible()
      const rows = await tx
        .select()
        .from(metricPublicationSnapshots)
        .where(eq(metricPublicationSnapshots.publicationId, id))
        .orderBy(desc(metricPublicationSnapshots.capturedAt), desc(metricPublicationSnapshots.id))
        .limit(30)
      return { snapshots: rows.map(metricSnapshotView) }
    })
  }
  constructor(
    private readonly db: Database,
    private readonly store: MediaStore,
    private readonly capableNetworks: ReadonlySet<Network>,
    private readonly now = () => new Date(),
    private readonly postVerifier?: VerifiedPostResolver,
  ) {}

  options(actorId: string, projectId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.status, 'connected'))
      return {
        automaticFormats: (Object.keys(FORMAT_NETWORK) as PublicationFormat[]).filter(
          (format) => !forcesManualMode(format) && this.capableNetworks.has(FORMAT_NETWORK[format]),
        ),
        verifiableNetworks: [...(this.postVerifier?.networks ?? [])],
        accounts: rows.map(({ id, network, displayName }) => ({ id, network, displayName })),
      }
    })
  }

  private async checkStorage(resolved: ResolvedDelivery) {
    // HEAD never downloads a video. Upload confirmation already checked the whole-file SHA256;
    // immutable keys are not exposed to PUT or the legacy archiver.
    for (let offset = 0; offset < resolved.assets.length; offset += 4) {
      await Promise.all(
        resolved.assets.slice(offset, offset + 4).map(async (file) => {
          if (!file.r2Key)
            throw new WorkspaceError('ASSET_UNCONFIRMED', 'Arquivo aprovado sem localização')
          const head = await this.store.head(file.r2Key)
          if (
            !head.exists ||
            head.sizeBytes !== file.sizeBytes ||
            head.contentType !== file.contentType
          )
            throw new WorkspaceError(
              'ASSET_UNCONFIRMED',
              'Um arquivo aprovado não está disponível no armazenamento. Restaure-o antes de publicar.',
            )
        }),
      )
    }
  }

  create(
    actorId: string,
    projectId: string,
    input: CreateDelivery,
    hash: string,
  ): Promise<Delivery> {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'publish')
      const previous = await receipt(tx, projectId, actorId, input.operationId, hash)
      if (previous) return deliverySchema.parse(previous.result)
      const edition = await approved(tx, projectId, input.editionId)
      if (edition.hash !== input.expectedHash) throw changed()
      if (input.sourcePublicationId) {
        const [source] = await tx
          .select()
          .from(deliveries)
          .where(
            and(
              eq(deliveries.projectId, projectId),
              eq(deliveries.publicationId, input.sourcePublicationId),
            ),
          )
        if (!source || source.representationId !== edition.snapshot.representationId)
          throw inaccessible()
      }
      const copy = deliveryCopy(edition, input.format),
        at = this.now(),
        contentId = randomUUID(),
        id = randomUUID()
      const publication: Publication = {
        id,
        version: 0,
        contentId,
        socialAccountId: null,
        network: FORMAT_NETWORK[input.format],
        format: input.format,
        caption: copy.caption,
        title: copy.title,
        tags: [],
        coverAssetId: null,
        scheduledAt: null,
        publishMode: 'manual',
        status: 'draft',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        providerSession: {},
        externalPostId: null,
        externalUrl: null,
        publishedAt: null,
        reminderSentAt: null,
        metricsLastCollectedAt: null,
        metricsNextCollectAt: null,
        createdAt: at,
        updatedAt: at,
      }
      await validate(tx, edition, publication)
      await tx.insert(contents).values({
        id: contentId,
        title: copy.title,
        contentType: copy.contentType,
        stage: 'approved',
        createdBy: actorId,
        createdAt: at,
        updatedAt: at,
      })
      await tx.insert(publications).values(publication)
      const binding: Binding = {
        publicationId: id,
        contentId,
        projectId,
        editionId: edition.id,
        representationId: edition.snapshot.representationId,
        sourcePublicationId: input.sourcePublicationId,
        createdAt: at,
      }
      await tx.insert(deliveries).values(binding)
      const result = view(binding, publication, edition)
      await tx
        .insert(editorialReceipts)
        .values({ projectId, actorId, operationId: input.operationId, hash, result })
      await recordChange(
        tx,
        projectId,
        actorId,
        'approval',
        edition.snapshot.representationId,
        null,
      )
      return result
    })
  }

  async act(
    actorId: string,
    projectId: string,
    id: string,
    input: DeliveryAction,
    hash: string,
  ): Promise<Delivery> {
    // Validate storage outside a DB transaction, then recheck version, permission and dependencies
    // under the project lock. An idempotent replay needs no network and returns its original result.
    const preflight = await this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'publish')
      const previous = await receipt(tx, projectId, actorId, input.operationId, hash)
      if (previous) return { replay: deliverySchema.parse(previous.result) }
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(and(eq(deliveries.projectId, projectId), eq(deliveries.publicationId, id)))
      if (!binding) throw inaccessible()
      const [publication] = await tx.select().from(publications).where(eq(publications.id, id))
      if (!publication) throw inaccessible()
      const edition = await approved(tx, projectId, binding.editionId)
      if (publication.version !== input.version || edition.hash !== input.expectedHash)
        throw changed()
      validateBinding(binding, edition, publication)
      validateActionState(publication, input)
      return {
        network: publication.network,
        resolved: input.action === 'schedule' ? await validate(tx, edition, publication) : null,
      }
    })
    if (preflight.replay) return preflight.replay
    if (preflight.resolved) await this.checkStorage(preflight.resolved)
    const external =
      input.action === 'link-external' || input.action === 'reconcile-published'
        ? await (() => {
            if (!this.postVerifier || !preflight.network)
              throw new WorkspaceError(
                'INVALID_OPERATION',
                'A verificação de publicação não está configurada para esta rede',
              )
            return this.postVerifier.verify(
              preflight.network,
              input.socialAccountId,
              input.externalUrl,
            )
          })()
        : null
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'publish')
      const previous = await receipt(tx, projectId, actorId, input.operationId, hash)
      if (previous) return deliverySchema.parse(previous.result)
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(and(eq(deliveries.projectId, projectId), eq(deliveries.publicationId, id)))
      if (!binding) throw inaccessible()
      const [publication] = await tx
        .select()
        .from(publications)
        .where(eq(publications.id, id))
        .for('update')
      if (!publication) throw inaccessible()
      const edition = await approved(tx, projectId, binding.editionId),
        at = this.now()
      if (publication.version !== input.version || edition.hash !== input.expectedHash)
        throw changed()
      validateBinding(binding, edition, publication)
      validateActionState(publication, input)
      if (input.action === 'schedule') await validate(tx, edition, publication)
      if (input.action === 'schedule') {
        if (!canSchedule(publication.status))
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Esta entrega não pode ser agendada neste estado',
          )
        const scheduledAt = new Date(input.scheduledAt)
        if (
          scheduledAt.getTime() < at.getTime() - 300_000 ||
          scheduledAt.getTime() > at.getTime() + 2 * 365 * 86_400_000
        )
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Escolha um horário atual ou futuro, dentro dos próximos dois anos',
          )
        if (input.publishMode === 'auto') {
          const captionSize =
            publication.network === 'youtube'
              ? Buffer.byteLength(publication.caption, 'utf8')
              : publication.caption.length
          if (captionSize > captionLimitFor(publication.format))
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'A legenda aprovada excede o limite deste publicador. Revise a copy e aprove uma nova edição.',
            )
          if (
            publication.network === 'youtube' &&
            (!publication.title || publication.title.length > 100 || /[<>]/.test(publication.title))
          )
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'Revise o título para o YouTube e aprove uma nova edição (até 100 caracteres, sem < ou >).',
            )
          if (
            forcesManualMode(publication.format) ||
            !this.capableNetworks.has(publication.network) ||
            !input.socialAccountId
          )
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'Este envio automático não está disponível. Use a entrega manual ou conecte uma conta compatível.',
            )
          const [account] = await tx
            .select()
            .from(socialAccounts)
            .where(eq(socialAccounts.id, input.socialAccountId))
          if (!account || account.network !== publication.network || !canAutoPublish(account))
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'A conta escolhida não está apta a publicar neste destino',
            )
          // The existing image publishers consume JPEG. Conversion belongs before approval.
          if (
            publication.network === 'instagram' &&
            edition.snapshot.orderedAssets.some(
              ({ asset }) => asset.mime.startsWith('image/') && asset.mime !== 'image/jpeg',
            )
          )
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'Exporte a arte em JPEG e aprove essa edição antes do envio automático ao Instagram',
            )
        }
        Object.assign(publication, {
          status: 'scheduled',
          scheduledAt,
          publishMode: input.publishMode,
          socialAccountId: input.publishMode === 'auto' ? input.socialAccountId : null,
          nextAttemptAt: null,
          attempts: 0,
          lastError: null,
          reminderSentAt: null,
        })
      } else if (input.action === 'cancel' || input.action === 'cancel-local') {
        if (!canCancelPublication(publication.status))
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Esta entrega não pode ser cancelada neste estado',
          )
        Object.assign(publication, { status: 'canceled', nextAttemptAt: null, lastError: null })
      } else if (input.action === 'mark-published') {
        if (publication.publishMode !== 'manual' || !canMarkPublished(publication.status))
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Somente uma entrega manual pendente pode ser confirmada',
          )
        if (!postUrl(publication.network, input.externalUrl))
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Informe o link HTTPS da publicação nesta rede',
          )
        Object.assign(publication, {
          status: 'published',
          publishedAt: at,
          externalUrl: input.externalUrl,
          externalPostId: null,
          metricsNextCollectAt: null,
          nextAttemptAt: null,
          lastError: null,
        })
      } else {
        if (!external)
          throw new WorkspaceError('INVALID_RESULT', 'A publicação externa não foi verificada')
        const [account] = await tx
          .select()
          .from(socialAccounts)
          .where(eq(socialAccounts.id, external.socialAccountId))
          .for('share')
        if (
          account?.status !== 'connected' ||
          account.version !== external.accountVersion ||
          account.network !== publication.network
        )
          throw new WorkspaceError(
            'CONTEXT_CHANGED',
            'A conta mudou durante a verificação. Confira novamente.',
          )
        const known =
          publication.externalPostId ??
          publication.providerSession.publishedMediaId ??
          publication.providerSession.videoId
        if (
          (publication.socialAccountId && publication.socialAccountId !== account.id) ||
          (typeof known === 'string' && known !== external.externalPostId)
        )
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'O post ou a conta divergem do envio registrado. O checkpoint foi preservado.',
          )
        Object.assign(publication, {
          status: 'published',
          publishedAt: publication.publishedAt ?? at,
          externalPostId: external.externalPostId,
          externalUrl: external.externalUrl,
          socialAccountId: account.id,
          metricsNextCollectAt: at,
          nextAttemptAt: null,
          lastError: null,
        })
      }
      publication.version++
      publication.updatedAt = at
      await tx.update(publications).set(publication).where(eq(publications.id, id))
      await tx
        .update(contents)
        .set({
          stage:
            publication.status === 'published'
              ? 'published'
              : publication.status === 'scheduled'
                ? 'scheduled'
                : 'approved',
          version: sql`${contents.version} + 1`,
          updatedAt: at,
        })
        .where(eq(contents.id, binding.contentId))
      const result = view(binding, publication, edition)
      await tx
        .insert(editorialReceipts)
        .values({ projectId, actorId, operationId: input.operationId, hash, result })
      await recordChange(tx, projectId, actorId, 'approval', binding.representationId, null)
      return result
    })
  }

  list(actorId: string, projectId: string, representationId: string, before?: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [cursor] = before
        ? await tx
            .select()
            .from(deliveries)
            .where(
              and(
                eq(deliveries.projectId, projectId),
                eq(deliveries.representationId, representationId),
                eq(deliveries.publicationId, before),
              ),
            )
        : []
      if (before && !cursor) throw inaccessible()
      const rows = await tx
        .select({
          binding: deliveries,
          publication: publications,
          edition: { id: editions.id, hash: editions.hash },
        })
        .from(deliveries)
        .innerJoin(publications, eq(publications.id, deliveries.publicationId))
        .innerJoin(editions, eq(editions.id, deliveries.editionId))
        .where(
          and(
            eq(deliveries.projectId, projectId),
            eq(deliveries.representationId, representationId),
            cursor
              ? sql`(${deliveries.createdAt},${deliveries.publicationId})<(${cursor.createdAt.toISOString()}::timestamptz,${cursor.publicationId}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(deliveries.createdAt), desc(deliveries.publicationId))
        .limit(26)
      return {
        items: rows.slice(0, 25).map((row) => view(row.binding, row.publication, row.edition)),
        nextCursor: rows.length > 25 ? (rows[24]?.binding.publicationId ?? null) : null,
      }
    })
  }

  async resolve(publication: Publication): Promise<ResolvedDelivery | null> {
    const resolved = await this.db.transaction(async (tx) => {
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(eq(deliveries.publicationId, publication.id))
      if (!binding) return null
      await tx
        .select({ id: editorialProjects.id })
        .from(editorialProjects)
        .where(eq(editorialProjects.id, binding.projectId))
        .for('update')
      const edition = await approved(tx, binding.projectId, binding.editionId)
      validateBinding(binding, edition, publication)
      return validate(tx, edition, publication)
    })
    if (resolved) await this.checkStorage(resolved)
    return resolved
  }

  async syncContent(publication: Publication): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(eq(deliveries.publicationId, publication.id))
      if (!binding) return false
      // Reads after acquiring the row lock so a stale worker cannot undo a manual action.
      const [current] = await tx
        .select()
        .from(publications)
        .where(eq(publications.id, publication.id))
        .for('update')
      if (!current) throw inaccessible()
      await tx
        .update(contents)
        .set({
          stage:
            current.status === 'published'
              ? 'published'
              : ['scheduled', 'publishing', 'awaiting_manual', 'failed'].includes(current.status)
                ? 'scheduled'
                : 'approved',
          updatedAt: current.updatedAt,
          version: sql`${contents.version} + 1`,
        })
        .where(eq(contents.id, binding.contentId))
      return true
    })
  }
}
