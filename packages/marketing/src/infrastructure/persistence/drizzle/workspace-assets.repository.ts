import { randomUUID } from 'node:crypto'
import { canonicalJson, type UploadStart } from '@sistemazero/marketing-contracts'
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm'
import type {
  UploadRecord,
  VerificationJob,
  WorkspaceAssetsRepository,
} from '../../../domain/ports/workspace-assets-repository.port'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import {
  projectAccess,
  receipt,
  recordChange,
  snapshotProjectAccess,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialProjects as projects,
  editorialReceipts as receipts,
  editorialUploads as uploads,
} from './workspace-schema'

const inaccessible = () =>
  new WorkspaceError('OBJECT_INACCESSIBLE', 'Arquivo indisponível neste projeto')
async function load(
  tx: WorkspaceTransaction,
  projectId: string,
  assetId: string,
): Promise<UploadRecord> {
  const [row] = await tx
    .select({ asset: assets, upload: uploads })
    .from(assets)
    .innerJoin(uploads, eq(uploads.assetId, assets.id))
    .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)))
  if (!row) throw inaccessible()
  return {
    manifest: row.asset.manifest,
    storageKey: row.asset.storageKey,
    uploadId: row.upload.uploadId,
    state: row.upload.state,
    error: row.upload.error,
  }
}
async function authorize(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  assetId: string,
  write: boolean,
) {
  const access = await projectAccess(tx, actorId, projectId, write ? 'edit' : 'read')
  const [asset] = await tx
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)))
  if (!asset || (write && asset.createdBy !== actorId && !access.permissions.includes('admin')))
    throw inaccessible()
  return asset
}
export class DrizzleWorkspaceAssetsRepository implements WorkspaceAssetsRepository {
  constructor(private readonly db: Database) {}
  confirmed(actorId: string, projectId: string, ids: string[]) {
    return this.db.transaction(
      async (tx) => {
        await snapshotProjectAccess(tx, actorId, projectId)
        const rows = await tx
          .select({ manifest: assets.manifest })
          .from(assets)
          .innerJoin(uploads, eq(uploads.assetId, assets.id))
          .where(
            and(
              eq(assets.projectId, projectId),
              inArray(assets.id, ids),
              eq(assets.confirmed, true),
              eq(uploads.state, 'confirmed'),
            ),
          )
        return { projectId, manifests: rows.map((row) => row.manifest) }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  list(actorId: string, projectId: string, after?: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select({ manifest: assets.manifest, state: uploads.state, error: uploads.error })
        .from(assets)
        .innerJoin(uploads, eq(uploads.assetId, assets.id))
        .where(and(eq(assets.projectId, projectId), after ? gt(assets.id, after) : undefined))
        .orderBy(asc(assets.id))
        .limit(51)
      const items = rows.slice(0, 50)
      return { items, nextCursor: rows.length > 50 ? (items.at(-1)?.manifest.id ?? null) : null }
    })
  }
  allocate(actorId: string, input: UploadStart, hash: string) {
    return this.db.transaction(async (tx) => {
      const { manifest } = input
      await projectAccess(tx, actorId, manifest.projectId, 'edit')
      const saved = await receipt(tx, manifest.projectId, actorId, input.operationId, hash)
      if (saved) return load(tx, manifest.projectId, manifest.id)
      if (manifest.sourceAssetId) {
        const [source] = await tx
          .select({ id: assets.id })
          .from(assets)
          .where(
            and(
              eq(assets.id, manifest.sourceAssetId),
              eq(assets.projectId, manifest.projectId),
              eq(assets.confirmed, true),
            ),
          )
        if (!source)
          throw new WorkspaceError(
            'DEPENDENCY_MISSING',
            'O arquivo de origem ainda não foi confirmado neste projeto',
          )
      }
      const [inserted] = await tx
        .insert(assets)
        .values({
          id: manifest.id,
          projectId: manifest.projectId,
          manifest,
          storageKey: `editorial/${manifest.projectId}/${manifest.id}/${manifest.sha256}`,
          createdBy: actorId,
        })
        .onConflictDoNothing()
        .returning()
      if (!inserted)
        throw new WorkspaceError('OPERATION_REUSED', 'Identificador de arquivo já utilizado')
      await tx.insert(uploads).values({ assetId: manifest.id, state: 'preparing' })
      await tx.insert(receipts).values({
        projectId: manifest.projectId,
        actorId,
        operationId: input.operationId,
        hash,
        result: { assetId: manifest.id },
      })
      await recordChange(tx, manifest.projectId, actorId, 'asset', manifest.id, null)
      return load(tx, manifest.projectId, manifest.id)
    })
  }
  get(actorId: string, projectId: string, assetId: string, write: boolean) {
    return this.db.transaction(async (tx) => {
      await authorize(tx, actorId, projectId, assetId, write)
      return load(tx, projectId, assetId)
    })
  }
  attach(actorId: string, projectId: string, assetId: string, uploadId: string) {
    return this.db.transaction(async (tx) => {
      await authorize(tx, actorId, projectId, assetId, true)
      await tx
        .update(uploads)
        .set({ uploadId, state: 'uploading' })
        .where(and(eq(uploads.assetId, assetId), eq(uploads.state, 'preparing')))
      return load(tx, projectId, assetId)
    })
  }
  resetExpiredUpload(
    actorId: string,
    projectId: string,
    assetId: string,
    expectedUploadId: string,
  ) {
    return this.db.transaction(async (tx) => {
      await authorize(tx, actorId, projectId, assetId, true)
      const [changed] = await tx
        .update(uploads)
        .set({ uploadId: null, state: 'preparing', error: null })
        .where(
          and(
            eq(uploads.assetId, assetId),
            eq(uploads.state, 'uploading'),
            eq(uploads.uploadId, expectedUploadId),
          ),
        )
        .returning()
      if (changed) await recordChange(tx, projectId, actorId, 'asset', assetId, null)
      return load(tx, projectId, assetId)
    })
  }
  verify(actorId: string, projectId: string, assetId: string) {
    return this.db.transaction(async (tx) => {
      await authorize(tx, actorId, projectId, assetId, true)
      const [changed] = await tx
        .update(uploads)
        .set({ state: 'verifying', error: null, nextAttemptAt: sql`clock_timestamp()` })
        .where(and(eq(uploads.assetId, assetId), eq(uploads.state, 'uploading')))
        .returning()
      if (changed) await recordChange(tx, projectId, actorId, 'asset', assetId, null)
      return load(tx, projectId, assetId)
    })
  }
  retry(actorId: string, projectId: string, assetId: string) {
    return this.db.transaction(async (tx) => {
      await authorize(tx, actorId, projectId, assetId, true)
      const [changed] = await tx
        .update(uploads)
        .set({
          state: 'verifying',
          error: null,
          attempts: 0,
          verificationToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: sql`clock_timestamp()`,
        })
        .where(and(eq(uploads.assetId, assetId), eq(uploads.state, 'failed')))
        .returning()
      if (changed) await recordChange(tx, projectId, actorId, 'asset', assetId, null)
      return load(tx, projectId, assetId)
    })
  }
  claimVerification() {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(uploads)
        .where(
          and(
            eq(uploads.state, 'verifying'),
            sql`${uploads.nextAttemptAt}<=clock_timestamp()`,
            sql`(${uploads.leaseExpiresAt} IS NULL OR ${uploads.leaseExpiresAt}<=clock_timestamp())`,
          ),
        )
        .orderBy(uploads.nextAttemptAt)
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      const [asset] = await tx.select().from(assets).where(eq(assets.id, row.assetId))
      if (!asset) throw new Error('Arquivo da verificação ausente')
      const token = randomUUID()
      await tx
        .update(uploads)
        .set({
          verificationToken: token,
          leaseExpiresAt: sql`clock_timestamp()+interval '2 minutes'`,
          attempts: row.attempts + 1,
        })
        .where(eq(uploads.assetId, row.assetId))
      return {
        id: row.assetId,
        token,
        storageKey: asset.storageKey,
        manifest: asset.manifest,
        attempt: row.attempts + 1,
      }
    })
  }
  async renewVerification(job: VerificationJob) {
    const rows = await this.db
      .update(uploads)
      .set({ leaseExpiresAt: sql`clock_timestamp()+interval '2 minutes'` })
      .where(
        and(
          eq(uploads.assetId, job.id),
          eq(uploads.verificationToken, job.token),
          eq(uploads.state, 'verifying'),
          sql`${uploads.leaseExpiresAt}>clock_timestamp()`,
        ),
      )
      .returning({ id: uploads.assetId })
    return rows.length === 1
  }
  finishVerification(
    job: VerificationJob,
    result: { valid: boolean; error: string | null; retryable: boolean },
  ) {
    return this.db.transaction(async (tx) => {
      // Same lock order as user mutations: project, then upload. Workers have a fenced lease, not user authority.
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, job.manifest.projectId))
        .for('update')
      const state = result.valid
        ? 'confirmed'
        : result.retryable && job.attempt < 3
          ? 'verifying'
          : 'failed'
      const [changed] = await tx
        .update(uploads)
        .set({
          state,
          error: result.error,
          verificationToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: sql`clock_timestamp()+interval '30 seconds'`,
        })
        .where(
          and(
            eq(uploads.assetId, job.id),
            eq(uploads.verificationToken, job.token),
            eq(uploads.state, 'verifying'),
            sql`${uploads.leaseExpiresAt}>clock_timestamp()`,
          ),
        )
        .returning()
      if (!changed) return
      const [asset] = await tx.select().from(assets).where(eq(assets.id, job.id))
      if (!asset || canonicalJson(asset.manifest) !== canonicalJson(job.manifest))
        throw new Error('Manifesto alterado durante verificação')
      if (result.valid)
        await tx.update(assets).set({ confirmed: true }).where(eq(assets.id, job.id))
      await recordChange(tx, job.manifest.projectId, asset.createdBy, 'asset', job.id, null)
    })
  }
}
