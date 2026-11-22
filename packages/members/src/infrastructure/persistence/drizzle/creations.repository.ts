import { createHash, randomUUID } from 'node:crypto'
import {
  canonicalJson,
  PINTA_INVENTORY_READER_VERSION,
  pintaInventoryFloor,
} from '@sistemazero/core/creations'
import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import {
  type PintaPaletteBase,
  type PintaPaletteCommitProof,
  type PintaPaletteTicket,
  pintaPaletteBlobKey,
} from '@sistemazero/core/creations/pinta-palette-writer'
import {
  StudioSealedPartRefSchema,
  StudioSealedReceiptSchema,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  type StudioSealedBase,
  type StudioSealedCommitProof,
  type StudioSealedPlannedPart,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio'
import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import {
  CREATION_LIMITS,
  type CreationDraftState,
  type CreationPartRef,
  type CreationRecord,
  type CreationSummary,
  type CreationTool,
  emptyCountByTool,
  hasStudioSealedStorage,
  isStudioFormatTool,
} from '../../../domain/creations/creation'
import { StudioStorageProtocolError } from '../../../domain/creations/creation.errors'
import {
  classifyPintaPaletteLibraryCreation,
  isPintaPaletteLibraryCreation,
  PALETTE_LIBRARY_ITEM_ID,
  PALETTE_LIBRARY_KIND,
  PALETTE_LIBRARY_TOOL,
} from '../../../domain/creations/palette-library'
import { PintaCausalError } from '../../../domain/creations/pinta-causal-graph'
import { PintaPaletteWriteError } from '../../../domain/creations/pinta-palette-write'
import { StudioSealedWriteError } from '../../../domain/creations/studio-sealed-write'
import type {
  CreationCommitResult,
  CreationListPage,
  CreationsRepository,
  CreationUploadInput,
  CreationUploadReservation,
  CreationUsage,
} from '../../../domain/ports/creations-repository.port'
import type { Database } from './db'
import { clearPending, expirePintaUnits } from './pinta-causal-leases'
import { retirePintaPointer, trackPaletteTicket } from './pinta-causal-retirement'
import { assertIndividualPinta } from './pinta-causal-scope'
import {
  authorizePaletteTransaction,
  checkPaletteBase,
  ensurePaletteAccount,
  newPaletteTicket,
  paletteGeneration,
  paletteHead,
  publishPaletteGeneration,
  requireLegacyPaletteWriter,
} from './pinta-palette-write-state'
import { accountDeletionFences, creationInventoryFloors, creations } from './schema'
import { retireStudioRevision, trackStudioSeal } from './studio-sealed-retirement'
import {
  activeStudioTicket,
  authorizeStudioTransaction,
  checkStudioBase,
  ensureStudioAccount,
  newStudioTicket,
  proveStudioSealedParts,
  publishStudioGeneration,
  requireLegacyStudioWriter,
  type StudioSealOwner,
  studioGeneration,
  studioHead,
} from './studio-sealed-write-state'

async function inventoryFloor(
  db: Pick<Database, 'select'>,
  userId: string,
  audience: CourseAudience,
  tool: CreationTool,
) {
  if (tool !== 'pinta') return 1
  const [row] = await db
    .select({ version: creationInventoryFloors.requiredVersion })
    .from(creationInventoryFloors)
    .where(
      and(
        eq(creationInventoryFloors.userId, userId),
        eq(creationInventoryFloors.audience, audience),
        eq(creationInventoryFloors.tool, tool),
      ),
    )
  return row?.version ?? 1
}

export async function raiseInventoryFloor(
  db: Pick<Database, 'insert'>,
  input: { userId: string; accountId: string; tool: CreationTool },
  audience: CourseAudience,
  version: number,
) {
  await db
    .insert(creationInventoryFloors)
    .values({
      userId: input.userId,
      accountId: input.accountId,
      tool: input.tool,
      audience,
      requiredVersion: version,
    })
    .onConflictDoUpdate({
      target: [
        creationInventoryFloors.userId,
        creationInventoryFloors.audience,
        creationInventoryFloors.tool,
      ],
      set: {
        requiredVersion: sql`greatest(${creationInventoryFloors.requiredVersion}, ${version})`,
      },
    })
}

type Row = typeof creations.$inferSelect

function reservedReader(row: Row): number | undefined {
  const receipt = row.pendingInventoryReader
  return receipt &&
    receipt.revision === row.pendingRevision &&
    Number.isInteger(receipt.version) &&
    receipt.version >= 1 &&
    receipt.version <= PINTA_INVENTORY_READER_VERSION
    ? receipt.version
    : undefined
}

function samePaletteTicket(left: PintaPaletteTicket, right: PintaPaletteTicket) {
  return (
    left.nonce === right.nonce &&
    left.protocol === right.protocol &&
    left.baseGeneration === right.baseGeneration &&
    left.baseRevision === right.baseRevision &&
    left.revision === right.revision &&
    left.expiresAt === right.expiresAt &&
    left.itemUpdatedAt === right.itemUpdatedAt &&
    left.bytes === right.bytes
  )
}
type SummaryRow = Pick<
  Row,
  | 'tool'
  | 'itemId'
  | 'name'
  | 'kind'
  | 'itemUpdatedAt'
  | 'revision'
  | 'formatVersion'
  | 'bytes'
  | 'thumb'
  | 'syncedAt'
  | 'deletedAt'
> &
  Partial<Pick<Row, 'contentFingerprint'>>

const toSummary = (row: SummaryRow): CreationSummary => {
  const summary: CreationSummary = {
    tool: row.tool,
    itemId: row.itemId,
    name: row.name,
    kind: row.kind,
    itemUpdatedAt: row.itemUpdatedAt,
    revision: row.revision,
    formatVersion: row.formatVersion,
    bytes: row.bytes,
    thumb: row.thumb,
    syncedAt: row.syncedAt,
  }
  if (row.deletedAt) summary.deletedAt = row.deletedAt
  if (row.contentFingerprint) summary.contentFingerprint = row.contentFingerprint
  return summary
}

const toRecord = (row: Row): CreationRecord => ({
  ...toSummary(row),
  id: row.id,
  audience: row.audience,
  userId: row.userId,
  accountId: row.accountId,
  pending:
    row.pendingRevision !== null &&
    row.pendingBytes !== null &&
    row.pendingName !== null &&
    row.pendingKind !== null &&
    row.pendingItemUpdatedAt !== null
      ? {
          revision: row.pendingRevision,
          formatVersion: row.pendingFormatVersion ?? 1,
          ...(reservedReader(row) === undefined
            ? {}
            : { maxReadFormatVersion: reservedReader(row) }),
          bytes: row.pendingBytes,
          name: row.pendingName,
          kind: row.pendingKind,
          itemUpdatedAt: row.pendingItemUpdatedAt,
          thumb: row.pendingThumb,
          parts: sanitizeParts(row.pendingParts),
          contentFingerprint: row.pendingContentFingerprint,
        }
      : null,
  lastReservedRevision: row.lastReservedRevision,
  storageRef: row.storageRef,
  ...confirmedParts(row),
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
})

const sealedParts = StudioSealedPartRefSchema.array().max(128)

function confirmedParts(
  row: Pick<
    Row,
    | 'studioSealReceipt'
    | 'storageRef'
    | 'parts'
    | 'tool'
    | 'userId'
    | 'itemId'
    | 'audience'
    | 'formatVersion'
    | 'bytes'
  >,
): Pick<CreationRecord, 'parts' | 'studioSealReceipt'> {
  if (!hasStudioSealedStorage(row)) return { parts: sanitizeParts(row.parts) }
  const receipt = StudioSealedReceiptSchema.safeParse(row.studioSealReceipt)
  const parts = sealedParts.safeParse(row.parts)
  if (
    row.tool !== 'studio' ||
    !receipt.success ||
    !parts.success ||
    row.storageRef !== studioSealedBlobKey(row, receipt.data.nonce, 'sealed') ||
    row.formatVersion !== receipt.data.requirements.projectFormat ||
    row.bytes > CREATION_LIMITS.maxItemBytes ||
    new Set(parts.data.map((part) => part.hash)).size !== parts.data.length ||
    row.bytes !== receipt.data.manifestBytes + parts.data.reduce((sum, part) => sum + part.bytes, 0)
  ) {
    throw new StudioStorageProtocolError()
  }
  return { studioSealReceipt: receipt.data, parts: parts.data }
}

function planStudioParts(
  parts: readonly CreationPartRef[],
  missing: readonly CreationPartRef[],
): StudioSealedPlannedPart[] {
  const uploaded = new Set(missing.map((part) => part.hash))
  return parts.map((part) => {
    if (uploaded.has(part.hash)) return { source: 'upload', hash: part.hash, bytes: part.bytes }
    if ('rev' in part) return { source: 'legacy', ...part }
    return { source: 'sealed', ...part }
  })
}

/**
 * O JSONB vem de nós mesmos, mas o tipo é defensivo: só `{hash, bytes, rev}` válidos passam.
 * Uma entrada sem `rev` (não deveria existir) é descartada: a parte vira "faltante" e o
 * cliente a sobe de novo — o lado seguro.
 */
function sanitizeParts(raw: unknown): CreationPartRef[] {
  if (!Array.isArray(raw)) return []
  const out: CreationPartRef[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const { hash, bytes, rev } = entry as { hash?: unknown; bytes?: unknown; rev?: unknown }
    if (typeof hash !== 'string' || typeof bytes !== 'number') continue
    if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 1) continue
    out.push({ hash, bytes, rev })
  }
  return out
}

/** As mesmas três condições em toda query: o dono é sempre parte da chave. */
const whereItem = (userId: string, tool: CreationTool, itemId: string, audience: CourseAudience) =>
  and(
    eq(creations.userId, userId),
    eq(creations.audience, audience),
    eq(creations.tool, tool),
    eq(creations.itemId, itemId),
  )

/** Só o que já COMMITOU alguma vez e está vivo: reserva sem upload não é uma criação guardada. */
const whereAliveCommitted = () => and(isNull(creations.deletedAt), isNotNull(creations.storageRef))
/** Itens vivos confirmados + lápides que precisam convergir nos outros aparelhos. */
const whereIndexed = () => or(whereAliveCommitted(), isNotNull(creations.deletedAt))

/**
 * Índice das criações "guardadas na conta". Toda operação é keyada por
 * (user_id, tool, item_id) — a unique — então o dono é sempre parte da chave e um
 * perfil nunca alcança a linha de outro.
 */
export class DrizzleCreationsRepository implements CreationsRepository {
  constructor(
    private readonly db: Database,
    readonly audience: CourseAudience = 'kids',
  ) {}

  async list(userId: string, tool: CreationTool): Promise<CreationSummary[]> {
    // Só as colunas do resumo público: nada de `pending_*`/`storage_ref`/ids internos — e o
    // `thumb` pendente (TOAST) não atravessa o banco à toa a cada carga de galeria.
    const rows = await this.db
      .select({
        tool: creations.tool,
        itemId: creations.itemId,
        name: creations.name,
        kind: creations.kind,
        itemUpdatedAt: creations.itemUpdatedAt,
        revision: creations.revision,
        formatVersion: creations.formatVersion,
        bytes: creations.bytes,
        thumb: creations.thumb,
        syncedAt: creations.syncedAt,
        deletedAt: creations.deletedAt,
      })
      .from(creations)
      .where(
        and(
          eq(creations.userId, userId),
          eq(creations.audience, this.audience),
          eq(creations.tool, tool),
          whereIndexed(),
        ),
      )
      .orderBy(desc(creations.itemUpdatedAt))
    await assertIndividualPinta(this.db, userId, this.audience, tool)
    return rows.map((row) => {
      const summary: CreationSummary = { ...row }
      if (row.deletedAt === null) delete summary.deletedAt
      return summary
    })
  }

  async listPage(
    userId: string,
    tool: CreationTool,
    options: { limit: number; cursor?: { itemUpdatedAt: Date; itemId: string } },
  ): Promise<CreationListPage> {
    const cursorWhere = options.cursor
      ? or(
          lt(creations.itemUpdatedAt, options.cursor.itemUpdatedAt),
          and(
            eq(creations.itemUpdatedAt, options.cursor.itemUpdatedAt),
            lt(creations.itemId, options.cursor.itemId),
          ),
        )
      : undefined
    const rows = await this.db
      .select({
        tool: creations.tool,
        itemId: creations.itemId,
        name: creations.name,
        kind: creations.kind,
        itemUpdatedAt: creations.itemUpdatedAt,
        revision: creations.revision,
        bytes: creations.bytes,
        // A lápide não precisa buscar a miniatura TOAST; o payload público também a omite.
        formatVersion: creations.formatVersion,
        thumb: sql<
          string | null
        >`case when ${creations.deletedAt} is null then ${creations.thumb} else null end`,
        syncedAt: creations.syncedAt,
        deletedAt: creations.deletedAt,
      })
      .from(creations)
      .where(
        and(
          eq(creations.userId, userId),
          eq(creations.audience, this.audience),
          eq(creations.tool, tool),
          whereIndexed(),
          cursorWhere,
        ),
      )
      .orderBy(desc(creations.itemUpdatedAt), desc(creations.itemId))
      .limit(options.limit + 1)
    await assertIndividualPinta(this.db, userId, this.audience, tool)
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(toSummary),
      nextCursor:
        hasNext && last ? { itemUpdatedAt: last.itemUpdatedAt, itemId: last.itemId } : null,
    }
  }

  async compactTombstones(cutoff: Date, limit: number): Promise<number> {
    return this.db.transaction(async (tx) => {
      const doomed = await tx
        .select({ id: creations.id })
        .from(creations)
        .where(
          and(
            isNotNull(creations.deletedAt),
            isNull(creations.pendingUnit),
            or(
              isNull(creations.pendingPaletteWrite),
              sql`(${creations.pendingPaletteWrite}->>'expiresAt')::timestamptz <= clock_timestamp()`,
            ),
            or(
              isNull(creations.pendingStudioSeal),
              sql`(${creations.pendingStudioSeal}->>'expiresAt')::timestamptz <= clock_timestamp()`,
            ),
            lt(creations.deletedAt, cutoff),
          ),
        )
        .orderBy(creations.deletedAt)
        .limit(limit)
        .for('update', { skipLocked: true })
      if (doomed.length === 0) return 0
      const removed = await tx
        .delete(creations)
        .where(
          inArray(
            creations.id,
            doomed.map((row) => row.id),
          ),
        )
        .returning({ id: creations.id })
      return removed.length
    })
  }

  async get(
    userId: string,
    tool: CreationTool,
    itemId: string,
    audience: CourseAudience = this.audience,
  ): Promise<CreationRecord | null> {
    const [row] = await this.db
      .select()
      .from(creations)
      .where(whereItem(userId, tool, itemId, audience))
      .limit(1)
    await assertIndividualPinta(this.db, userId, audience, tool, itemId)
    return row ? toRecord(row) : null
  }

  async getPaletteHead(actor: PintaCausalViewer) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${actor.userId}`}, 0))`,
      )
      await ensurePaletteAccount(tx, actor.accountId)
      const [row] = await tx
        .select()
        .from(creations)
        .where(whereItem(actor.userId, 'pinta', PALETTE_LIBRARY_ITEM_ID, actor.audience))
        .limit(1)
      if (row && row.accountId !== actor.accountId)
        throw new PintaPaletteWriteError('ticket-invalid')
      const head = paletteHead(row, await paletteGeneration(tx, actor))
      const download =
        head.exists && row?.storageRef
          ? {
              storageKey: row.storageRef,
              revision: head.revision,
              bytes: row.bytes,
              summary: toSummary(row),
              parts: [],
            }
          : null
      return { paletteHead: head, download }
    })
  }

  private readStudioState<T>(
    owner: StudioSealOwner,
    read: (row: Row | undefined, generation: string | null) => T,
  ): Promise<T> {
    if (owner.audience !== this.audience) throw new StudioSealedWriteError('ticket-invalid')
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${owner.userId}`}, 0))`,
      )
      await ensureStudioAccount(tx, owner.accountId)
      const [row] = await tx
        .select()
        .from(creations)
        .where(whereItem(owner.userId, 'studio', owner.itemId, owner.audience))
        .limit(1)
      if (row && row.accountId !== owner.accountId)
        throw new StudioSealedWriteError('ticket-invalid')
      return read(row, await studioGeneration(tx, owner))
    })
  }

  getStudioSealHead(owner: StudioSealOwner) {
    return this.readStudioState(owner, (row, generation) => ({
      studioHead: studioHead(row, generation),
    }))
  }

  getStudioSealTicket(owner: StudioSealOwner, nonce: string, revision: number, now: Date) {
    return this.readStudioState(owner, (row, generation) => {
      if (!row) throw new StudioSealedWriteError('ticket-invalid')
      const head = studioHead(row, generation)
      if (
        head.adopted &&
        head.exists &&
        head.revision === revision &&
        row.studioSealReceipt?.nonce === nonce
      ) {
        const receipt = confirmedParts(row).studioSealReceipt
        if (!receipt) throw new StudioSealedWriteError('ticket-invalid')
        return {
          committed: true as const,
          studioHead: head,
          item: toSummary(row),
          studioSealReceipt: receipt,
        }
      }
      const pending = StudioSealedTicketSchema.safeParse(row.pendingStudioSeal)
      if (
        !pending.success ||
        pending.data.nonce !== nonce ||
        pending.data.revision !== revision ||
        row.pendingRevision !== revision ||
        canonicalJson(pending.data.scope) !== canonicalJson(owner) ||
        !activeStudioTicket(pending.data, now)
      )
        throw new StudioSealedWriteError('ticket-invalid')
      checkStudioBase(head, pending.data.baseRevision, pending.data.baseGeneration)
      return { committed: false as const, ticket: pending.data }
    })
  }

  async getPaletteTicket(actor: PintaCausalViewer, nonce: string, revision: number, now: Date) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${actor.userId}`}, 0))`,
      )
      await ensurePaletteAccount(tx, actor.accountId)
      const [row] = await tx
        .select()
        .from(creations)
        .where(whereItem(actor.userId, 'pinta', PALETTE_LIBRARY_ITEM_ID, actor.audience))
        .limit(1)
      if (!row || row.accountId !== actor.accountId)
        throw new PintaPaletteWriteError('ticket-invalid')
      const authority = await paletteGeneration(tx, actor)
      const receipt = row.paletteWriteReceipt
      if (
        receipt &&
        receipt.ticket.nonce === nonce &&
        receipt.ticket.revision === revision &&
        row.deletedAt === null &&
        row.revision === revision &&
        row.storageRef === pintaPaletteBlobKey(actor, receipt.ticket, 'sealed')
      ) {
        return {
          committed: true as const,
          paletteHead: paletteHead(row, authority),
          item: toSummary(row),
        }
      }
      const ticket = row.pendingPaletteWrite
      if (
        !ticket ||
        ticket.nonce !== nonce ||
        ticket.revision !== revision ||
        row.pendingRevision !== revision ||
        Date.parse(ticket.expiresAt) <= Math.max(now.getTime(), Date.now())
      )
        throw new PintaPaletteWriteError('ticket-invalid')
      checkPaletteBase(paletteHead(row, authority), ticket.baseRevision, ticket.baseGeneration)
      return { committed: false as const, ticket }
    })
  }

  async usage(userId: string): Promise<CreationUsage> {
    return usageWith(this.db, userId, this.audience)
  }

  async getDraftStates(
    userId: string,
    tool: CreationTool,
    itemIds: readonly string[],
    audience: CourseAudience = this.audience,
  ): Promise<CreationDraftState[]> {
    if (itemIds.length === 0) return []
    const rows = await this.db
      .select({
        itemId: creations.itemId,
        fingerprint: creations.contentFingerprint,
        syncedAt: creations.syncedAt,
      })
      .from(creations)
      .where(
        and(
          eq(creations.userId, userId),
          eq(creations.audience, audience),
          eq(creations.tool, tool),
          inArray(creations.itemId, [...itemIds]),
          whereAliveCommitted(),
        ),
      )
    return rows
  }

  async reserveUpload(input: CreationUploadInput): Promise<CreationUploadReservation> {
    return this.db.transaction(async (tx) => {
      // A quota é por PERFIL. Serializa a fotografia preliminar da reserva com os
      // commits do mesmo perfil; o commit volta a conferir porque o PUT acontece
      // fora desta transação.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${input.userId}`}, 0))`,
      )
      await assertIndividualPinta(tx, input.userId, this.audience, input.tool, input.itemId)
      const [deletionFence] = await tx
        .select({ accountId: accountDeletionFences.accountId })
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, input.accountId))
        .limit(1)
      if (deletionFence) return { ok: false, reason: 'account-deleting' as const }
      // Lock por CHAVE (não por linha): a primeira reserva de um item novo não tem linha
      // para o `FOR UPDATE` segurar, e duas abas reconciliando o mesmo item só-local
      // batiam na unique com 500. Mesmo idioma do studio-submission.repository.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation:${input.userId}:${input.tool}:${input.itemId}`}, 0))`,
      )
      const [existing] = await tx
        .select({
          revision: creations.revision,
          id: creations.id,
          accountId: creations.accountId,
          formatVersion: creations.formatVersion,
          pendingRevision: creations.pendingRevision,
          pendingFormatVersion: creations.pendingFormatVersion,
          pendingUnit: creations.pendingUnit,
          pendingPaletteWrite: creations.pendingPaletteWrite,
          lastReservedRevision: creations.lastReservedRevision,
          bytes: creations.bytes,
          storageRef: creations.storageRef,
          kind: creations.kind,
          parts: creations.parts,
          deletedAt: creations.deletedAt,
          studioSealReceipt: creations.studioSealReceipt,
          pendingStudioSeal: creations.pendingStudioSeal,
        })
        .from(creations)
        .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        .limit(1)
        .for('update')

      const actor = { userId: input.userId, accountId: input.accountId, audience: this.audience }
      const studioOwner = { ...actor, itemId: input.itemId }
      const studioAuthority =
        input.tool === 'studio' ? await studioGeneration(tx, studioOwner) : null
      const observedStudio =
        input.tool === 'studio' ? studioHead(existing, studioAuthority) : undefined
      if (input.studioSeal) {
        if (
          !observedStudio ||
          (existing && existing.accountId !== input.accountId) ||
          input.studioSeal.requirements.projectFormat !== input.formatVersion ||
          input.studioSeal.requirements.materials !== 'legacy' ||
          (existing && hasStudioSealedStorage(existing) && !observedStudio.adopted)
        )
          throw new StudioSealedWriteError('ticket-invalid')
        checkStudioBase(observedStudio, input.baseRevision, input.studioSeal.baseGeneration)
      } else {
        if (observedStudio)
          requireLegacyStudioWriter(observedStudio, existing?.pendingStudioSeal, input.now)
        if (existing && hasStudioSealedStorage(existing)) throw new StudioStorageProtocolError()
      }
      const reservedPalette =
        input.tool === PALETTE_LIBRARY_TOOL && input.itemId === PALETTE_LIBRARY_ITEM_ID
      const authority = reservedPalette ? await paletteGeneration(tx, actor) : null
      const observedPalette = reservedPalette ? paletteHead(existing, authority) : undefined
      if (input.paletteWrite) {
        if (!observedPalette || (existing && existing.accountId !== input.accountId))
          throw new PintaPaletteWriteError('ticket-invalid')
        checkPaletteBase(observedPalette, input.baseRevision, input.paletteWrite.baseGeneration)
      } else if (observedPalette) {
        requireLegacyPaletteWriter(observedPalette, existing?.pendingPaletteWrite, input.now)
      }

      if (existing?.pendingUnit) {
        const expired = await expirePintaUnits(
          tx,
          { userId: input.userId, accountId: input.accountId, audience: this.audience },
          input.now,
          true,
        )
        if (!expired.includes(existing.pendingUnit))
          throw new PintaCausalError('operation-conflict', input.itemId)
        existing.pendingFormatVersion = null
      }
      const formatVersion = input.formatVersion ?? 1
      const floor = await inventoryFloor(tx, input.userId, this.audience, input.tool)
      if (!input.paletteWrite && (input.maxReadFormatVersion ?? formatVersion) < floor)
        return { ok: false, reason: 'client-outdated', requiredVersion: floor }
      // Sob o mesmo lock da reserva: uma aba velha não cancela um upload novo em voo.
      const requiredVersion = Math.max(
        isStudioFormatTool(input.tool) ? STUDIO_PROJECT_FORMAT_VERSION : 1,
        existing?.formatVersion ?? 1,
        existing?.pendingFormatVersion ?? 1,
      )
      if (formatVersion < requiredVersion) {
        return { ok: false, reason: 'client-outdated', requiredVersion }
      }
      const nextIdentity = classifyPintaPaletteLibraryCreation(input)
      if (nextIdentity === 'invalid-partial') {
        return { ok: false, reason: 'palette-library-identity' }
      }
      const currentIdentity = existing
        ? classifyPintaPaletteLibraryCreation({
            tool: input.tool,
            itemId: input.itemId,
            kind: existing.kind,
          })
        : null
      if (
        existing &&
        currentIdentity !== nextIdentity &&
        (currentIdentity === 'palette-library' || nextIdentity === 'palette-library')
      ) {
        return { ok: false, reason: 'palette-library-identity' }
      }

      const alive = existing !== undefined && existing.deletedAt === null
      // PARTES: quais o item já tem (revisão corrente, viva e confirmada) e quais faltam. As
      // conhecidas levam os bytes do servidor; as faltantes precisam vir com `bytes` (senão
      // o cliente volta com eles — nada reservado até lá).
      const committedParts = new Map<string, CreationPartRef>(
        alive && existing.storageRef
          ? confirmedParts({ ...existing, ...studioOwner, tool: input.tool }).parts.map(
              (part) => [part.hash, part] as const,
            )
          : [],
      )
      if (input.studioSeal)
        for (const part of input.parts ?? []) if (part.upload) committedParts.delete(part.hash)
      // A revisão desta reserva (1 para linha nova; o contador NUNCA volta): é a chave no R2
      // do manifesto e das partes que subirem agora.
      const lastRevision = existing?.lastReservedRevision ?? 0
      // Uma reserva de paletas deve ultrapassar a revisão publicada e a pendente,
      // inclusive em linhas históricas com contador desalinhado.
      const revision =
        (reservedPalette || input.studioSeal
          ? Math.max(lastRevision, existing?.revision ?? 0, existing?.pendingRevision ?? 0)
          : lastRevision) + 1
      const paletteTicket =
        input.paletteWrite && observedPalette
          ? newPaletteTicket(observedPalette, revision, input.bytes, input.itemUpdatedAt, input.now)
          : undefined
      const resolved = resolveParts(input.parts ?? [], committedParts, revision)
      if (resolved.unsized.length > 0) {
        return { ok: false, reason: 'parts-need-bytes', hashes: resolved.unsized }
      }
      const totalBytes = input.bytes + resolved.all.reduce((sum, part) => sum + part.bytes, 0)
      if (totalBytes > input.limits.maxItemBytes) return { ok: false, reason: 'item-bytes' }

      // Quota DENTRO da transação (atômica com o lock): o total do perfil TROCA os bytes
      // correntes deste item pelos novos (reenviar 20 MB por 20 MB não gasta 40).
      const usage = await usageWith(tx, input.userId, this.audience)
      const currentBytes = alive && existing.storageRef ? existing.bytes : 0
      if (usage.totalBytes - currentBytes + totalBytes > input.limits.maxTotalBytes) {
        return { ok: false, reason: 'total-bytes' }
      }
      const committedAlive = alive && existing.storageRef !== null
      // Projeta a contribuição desta linha: atualização comum troca 1 por 1;
      // biblioteca troca 0 por 0; item novo soma conforme a identidade exata.
      const currentItemCount =
        committedAlive &&
        !isPintaPaletteLibraryCreation({
          tool: input.tool,
          itemId: input.itemId,
          kind: existing.kind,
        })
          ? 1
          : 0
      const nextItemCount = nextIdentity === 'palette-library' ? 0 : 1
      if (
        usage.countByTool[input.tool] - currentItemCount + nextItemCount >
        input.limits.maxItemsPerTool
      ) {
        return { ok: false, reason: 'items-per-tool' }
      }
      // A base é sempre comparada à revisão autoritativa, inclusive depois da compactação.
      // Isso impede uma edição velha de ressuscitar uma lápide ou item já removido do índice.
      const currentRevision = existing?.revision ?? 0
      if (
        !paletteTicket &&
        !input.studioSeal &&
        input.baseRevision !== undefined &&
        input.baseRevision !== currentRevision
      ) {
        return { ok: false, reason: 'stale-base', currentRevision }
      }

      const nextFloor = pintaInventoryFloor(input.tool, input.kind, formatVersion)
      if (nextFloor > floor) await raiseInventoryFloor(tx, input, this.audience, nextFloor)
      const studioSealTicket =
        input.studioSeal && observedStudio
          ? newStudioTicket(
              studioOwner,
              observedStudio,
              { ...input, revision },
              input.studioSeal.requirements,
              planStudioParts(resolved.all, resolved.missing),
            )
          : undefined
      const receipt = {
        ...(Math.max(floor, nextFloor) > 1 ? { inventoryFloor: Math.max(floor, nextFloor) } : {}),
        ...(paletteTicket ? { paletteTicket } : {}),
        ...(studioSealTicket ? { studioSealTicket } : {}),
      }
      if (paletteTicket) {
        await authorizePaletteTransaction(tx)
        await trackPaletteTicket(tx, actor, paletteTicket)
      }
      if (studioSealTicket) {
        await authorizeStudioTransaction(tx)
        await trackStudioSeal(tx, studioSealTicket)
      }
      const pending = {
        pendingRevision: 0,
        pendingInventoryReader:
          input.maxReadFormatVersion === undefined
            ? null
            : { revision, version: input.maxReadFormatVersion },
        pendingFormatVersion: formatVersion,
        pendingPaletteWrite: paletteTicket ?? null,
        pendingStudioSeal: studioSealTicket ?? null,
        pendingBytes: totalBytes,
        pendingName: input.name,
        pendingKind: input.kind,
        pendingItemUpdatedAt: input.itemUpdatedAt,
        pendingThumb: input.thumb,
        pendingParts: studioSealTicket ? null : resolved.all,
        pendingContentFingerprint: input.contentFingerprint ?? null,
      }
      if (!existing) {
        // Linha nova: as colunas "vivas" recebem os mesmos valores só porque são NOT NULL —
        // a lista não a mostra (sem `storage_ref`) até o primeiro commit.
        await tx.insert(creations).values({
          id: randomUUID(),
          userId: input.userId,
          audience: this.audience,
          accountId: input.accountId,
          tool: input.tool,
          itemId: input.itemId,
          name: input.name,
          kind: input.kind,
          itemUpdatedAt: input.itemUpdatedAt,
          revision: 0,
          lastReservedRevision: 1,
          ...pending,
          pendingRevision: 1,
          bytes: 0,
          storageRef: null,
          thumb: null,
          parts: [],
          deletedAt: null,
          createdAt: input.now,
          syncedAt: input.now,
        })
        return {
          ok: true,
          revision: 1,
          missingParts: studioSealTicket ? [] : resolved.missing,
          ...receipt,
        }
      }
      // Contador que NUNCA volta: mesmo com uma reserva em voo (ou depois de apagar e
      // ressuscitar), a próxima ganha número — e chave no R2 — novos.
      await tx
        .update(creations)
        .set({ ...pending, pendingRevision: revision, lastReservedRevision: revision })
        .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
      return {
        ok: true,
        revision,
        missingParts: studioSealTicket ? [] : resolved.missing,
        ...receipt,
      }
    })
  }

  async commit(input: {
    userId: string
    tool: CreationTool
    itemId: string
    revision: number
    storageRef: string
    uploadedParts?: readonly string[]
    verifiedPartHashes?: readonly string[]
    verifiedFormatVersion?: number
    paletteProof?: PintaPaletteCommitProof & { accountId: string }
    studioProof?: StudioSealedCommitProof
    now: Date
    limits: CreationUploadInput['limits']
  }): Promise<CreationCommitResult> {
    return this.db.transaction(async (tx) => {
      // Dois itens diferentes podem ter sido reservados antes de qualquer PUT. O
      // lock por PERFIL faz os commits entrarem um por vez e torna a quota final
      // atômica; confiar só na reserva permitiria confirmar todos os tickets.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${input.userId}`}, 0))`,
      )
      const [row] = await tx
        .select()
        .from(creations)
        .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        .limit(1)
        .for('update')
      await assertIndividualPinta(tx, input.userId, this.audience, input.tool, input.itemId)
      const reservedPalette =
        input.tool === PALETTE_LIBRARY_TOOL && input.itemId === PALETTE_LIBRARY_ITEM_ID
      const owner = { userId: input.userId, audience: this.audience } as const
      const studioProof = input.studioProof
      const studioScope = { ...owner, itemId: input.itemId }
      const studioOwner = studioProof
        ? { ...studioScope, accountId: studioProof.ticket.scope.accountId }
        : undefined
      const studioAuthority =
        input.tool === 'studio' ? await studioGeneration(tx, studioOwner ?? studioScope) : null
      const observedStudio = input.tool === 'studio' ? studioHead(row, studioAuthority) : undefined
      const studioProofSha256 = studioProof
        ? createHash('sha256').update(canonicalJson(studioProof)).digest('hex')
        : undefined
      if (studioProof && studioOwner) {
        if (
          !row ||
          !observedStudio ||
          canonicalJson(studioProof.ticket.scope) !== canonicalJson(studioOwner) ||
          row.accountId !== studioOwner.accountId ||
          studioProof.ticket.revision !== input.revision ||
          studioProof.ticket.requirements.materials !== 'legacy'
        )
          throw new StudioSealedWriteError('ticket-invalid')
        await ensureStudioAccount(tx, studioOwner.accountId)
        if (
          observedStudio.exists &&
          observedStudio.adopted &&
          row.revision === input.revision &&
          row.studioSealProofSha256 === studioProofSha256 &&
          row.studioSealReceipt?.nonce === studioProof.ticket.nonce
        ) {
          const studioSealReceipt = confirmedParts(row).studioSealReceipt
          if (!studioSealReceipt) throw new StudioSealedWriteError('ticket-invalid')
          return {
            ok: true,
            alreadyCommitted: true,
            previousStorageRef: null,
            releasedPartRefs: [],
            studioSeal: { studioHead: observedStudio, item: toSummary(row), studioSealReceipt },
          }
        }
        if (
          !row.pendingStudioSeal ||
          canonicalJson(row.pendingStudioSeal) !== canonicalJson(studioProof.ticket) ||
          !activeStudioTicket(row.pendingStudioSeal, input.now) ||
          row.pendingRevision !== input.revision ||
          row.pendingBytes !==
            studioProof.ticket.bytes +
              studioProof.ticket.parts.reduce((sum, part) => sum + part.bytes, 0)
        )
          throw new StudioSealedWriteError('ticket-invalid')
        checkStudioBase(
          observedStudio,
          studioProof.ticket.baseRevision,
          studioProof.ticket.baseGeneration,
        )
        await authorizeStudioTransaction(tx)
      } else if (observedStudio) {
        requireLegacyStudioWriter(observedStudio, row?.pendingStudioSeal, input.now, input.revision)
      }
      const authority = reservedPalette ? await paletteGeneration(tx, owner) : null
      const observedPalette = reservedPalette ? paletteHead(row, authority) : undefined
      const proof = input.paletteProof
      const actor = proof ? { ...owner, accountId: proof.accountId } : undefined
      if (proof && actor) {
        if (
          !observedPalette ||
          !row ||
          row.accountId !== actor.accountId ||
          input.revision !== proof.ticket.revision
        )
          throw new PintaPaletteWriteError('ticket-invalid')
        await ensurePaletteAccount(tx, actor.accountId)
        const sealed = pintaPaletteBlobKey(actor, proof.ticket, 'sealed')
        if (
          row.revision === input.revision &&
          row.storageRef === sealed &&
          row.paletteWriteReceipt &&
          samePaletteTicket(row.paletteWriteReceipt.ticket, proof.ticket) &&
          row.paletteWriteReceipt.sha256 === proof.sha256
        ) {
          return {
            ok: true,
            alreadyCommitted: true,
            previousStorageRef: null,
            releasedPartRefs: [],
            paletteHead: observedPalette,
            paletteItem: toSummary(row),
          }
        }
        if (
          !row.pendingPaletteWrite ||
          !samePaletteTicket(row.pendingPaletteWrite, proof.ticket) ||
          Date.parse(proof.ticket.expiresAt) <= Math.max(input.now.getTime(), Date.now()) ||
          row.pendingBytes !== proof.ticket.bytes
        )
          throw new PintaPaletteWriteError('ticket-invalid')
        checkPaletteBase(observedPalette, proof.ticket.baseRevision, proof.ticket.baseGeneration)
        await authorizePaletteTransaction(tx)
      } else if (observedPalette) {
        requireLegacyPaletteWriter(
          observedPalette,
          row?.pendingPaletteWrite,
          input.now,
          input.revision,
        )
      }
      if (row?.pendingUnit) throw new PintaCausalError('operation-conflict', input.itemId)
      if (!row) return { ok: false }
      if (!studioProof && hasStudioSealedStorage(row)) throw new StudioStorageProtocolError()
      // Retry de um 200 perdido: a revisão pedida JÁ é a corrente. Idempotente — MESMO com
      // outra reserva em voo (`pending_revision` de outra aba): dizer 409 aqui faria o BFF
      // tratar a revisão corrente como "recusada" e apagar o blob VIVO do R2.
      if (row.revision === input.revision && row.storageRef) {
        if (isStudioFormatTool(input.tool) && input.verifiedFormatVersion !== row.formatVersion)
          return { ok: false, reason: 'manifest-mismatch' }
        return { ok: true, alreadyCommitted: true, previousStorageRef: null, releasedPartRefs: [] }
      }
      // Só a revisão RESERVADA confirma: um upload velho (ou de outro navegador) não
      // pode virar corrente por cima de uma reserva mais nova.
      if (
        row.pendingRevision !== input.revision ||
        row.pendingBytes === null ||
        row.pendingName === null ||
        row.pendingKind === null ||
        row.pendingItemUpdatedAt === null
      ) {
        return { ok: false }
      }
      const floor = await inventoryFloor(tx, input.userId, this.audience, input.tool)
      if (!proof && (reservedReader(row) ?? row.pendingFormatVersion ?? 1) < floor) {
        await tx
          .update(creations)
          .set({ ...clearPending(), pendingStudioSeal: null })
          .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        return { ok: false, reason: 'client-outdated', requiredVersion: floor }
      }
      const usage = await usageWith(tx, input.userId, this.audience)
      const committedAlive = row.deletedAt === null && row.storageRef !== null
      const currentBytes = committedAlive ? row.bytes : 0
      const overBytes =
        usage.totalBytes - currentBytes + row.pendingBytes > input.limits.maxTotalBytes
      const currentIdentity = classifyPintaPaletteLibraryCreation(row)
      const pendingIdentity = classifyPintaPaletteLibraryCreation({
        tool: row.tool,
        itemId: row.itemId,
        kind: row.pendingKind,
      })
      const invalidIdentity =
        pendingIdentity === 'invalid-partial' ||
        (currentIdentity !== pendingIdentity &&
          (currentIdentity === 'palette-library' || pendingIdentity === 'palette-library'))
      if (invalidIdentity) {
        await tx
          .update(creations)
          .set({ ...clearPending(), pendingStudioSeal: null })
          .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        return { ok: false, reason: 'palette-library-identity' }
      }
      const currentItemCount = committedAlive && currentIdentity !== 'palette-library' ? 1 : 0
      const nextItemCount = pendingIdentity === 'palette-library' ? 0 : 1
      const overItems =
        usage.countByTool[input.tool] - currentItemCount + nextItemCount >
        input.limits.maxItemsPerTool
      if (overBytes || overItems) {
        // A reserva recusada por quota MORRE aqui: o BFF apaga o blob dela do R2, então
        // um `commit(N)` que chegasse depois de a criança abrir espaço promoveria uma chave
        // inexistente. Limpa o pendente — o cliente reserva de novo (revisão nova).
        await tx
          .update(creations)
          .set({ ...clearPending(), pendingStudioSeal: null })
          .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        return { ok: false, reason: overBytes ? 'total-bytes' : 'items-per-tool' }
      }
      // PARTES: as que a reserva exigia e o item ainda não tinha precisam ter sido PUTadas
      // (o cliente confirma em `uploadedParts`; o BFF confere no R2 best-effort). A reserva
      // NÃO morre: um retry honesto pode passar.
      const formatVersion = row.pendingFormatVersion ?? 1
      if (
        isStudioFormatTool(input.tool) &&
        (studioProof?.receipt.requirements.projectFormat ?? input.verifiedFormatVersion) !==
          formatVersion
      )
        return { ok: false, reason: 'manifest-mismatch' }
      // Defesa contra reservas legadas de um deploy misto; o corpo do commit não escolhe formato.
      const requiredVersion = Math.max(
        row.formatVersion,
        isStudioFormatTool(input.tool) ? STUDIO_PROJECT_FORMAT_VERSION : 1,
      )
      if (formatVersion < requiredVersion) {
        await tx
          .update(creations)
          .set({ ...clearPending(), pendingStudioSeal: null })
          .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
        return { ok: false, reason: 'client-outdated', requiredVersion }
      }
      const committed = row.deletedAt === null && row.storageRef ? confirmedParts(row).parts : []
      const committedSet = new Set(committed.map((part) => part.hash))
      const pendingParts = studioProof
        ? proveStudioSealedParts(studioProof)
        : sanitizeParts(row.pendingParts)
      if (
        input.verifiedPartHashes &&
        (input.verifiedPartHashes.length !== pendingParts.length ||
          pendingParts.some((part) => !input.verifiedPartHashes?.includes(part.hash)))
      )
        return { ok: false, reason: 'manifest-mismatch' }
      const uploaded = new Set(input.uploadedParts ?? [])
      const missing = pendingParts
        .filter((part) => !committedSet.has(part.hash) && !uploaded.has(part.hash))
        .map((part) => part.hash)
      if (!studioProof && missing.length > 0)
        return { ok: false, reason: 'parts-missing', hashes: missing }
      const storageRef =
        studioProof && studioOwner
          ? studioSealedBlobKey(studioOwner, studioProof.ticket.nonce, 'sealed')
          : proof && actor
            ? pintaPaletteBlobKey(actor, proof.ticket, 'sealed')
            : input.storageRef
      const publish = tx
        .update(creations)
        .set({
          revision: input.revision,
          causalManifest: null,
          causalSha256: null,
          layoutRevision: null,
          backfillTicket: null,
          formatVersion,
          storageRef,
          ...(proof ? { paletteWriteReceipt: { ticket: proof.ticket, sha256: proof.sha256 } } : {}),
          ...(studioProof ? { studioSealReceipt: studioProof.receipt, studioSealProofSha256 } : {}),
          bytes: row.pendingBytes,
          name: row.pendingName,
          kind: row.pendingKind,
          itemUpdatedAt: row.pendingItemUpdatedAt,
          thumb: row.pendingThumb,
          parts: pendingParts,
          contentFingerprint: row.pendingContentFingerprint,
          ...clearPending(),
          pendingStudioSeal: null,
          // Item na lixeira que voltou a ser editado ressuscita — AGORA, com o blob no lugar.
          deletedAt: null,
          syncedAt: input.now,
        })
        .where(whereItem(input.userId, input.tool, input.itemId, this.audience))
      const previous = row.storageRef && row.storageRef !== storageRef ? row.storageRef : null
      if (studioProof && studioOwner) {
        const generation = studioAuthority ?? randomUUID()
        await publishStudioGeneration(tx, studioOwner, generation)
        const [published] = await publish.returning()
        if (!published) throw new StudioSealedWriteError('ticket-invalid')
        await retireStudioRevision(
          tx,
          studioOwner,
          { storageRef: previous, revision: row.revision, parts: committed },
          pendingParts,
          input.now,
        )
        return {
          ok: true,
          alreadyCommitted: false,
          previousStorageRef: null,
          releasedPartRefs: [],
          studioSeal: {
            studioHead: studioHead(published, generation),
            item: toSummary(published),
            studioSealReceipt: studioProof.receipt,
          },
        }
      }
      if (actor) {
        const generation = authority ?? randomUUID()
        await publishPaletteGeneration(tx, actor, generation)
        const [published] = await publish.returning()
        if (!published) throw new PintaPaletteWriteError('ticket-invalid')
        await retirePintaPointer(tx, actor, input.itemId, row.revision, previous, input.now)
        return {
          ok: true,
          alreadyCommitted: false,
          previousStorageRef: null,
          releasedPartRefs: [],
          paletteHead: paletteHead(published, generation),
          paletteItem: toSummary(published),
        }
      }
      await publish
      const nextFloor = pintaInventoryFloor(input.tool, row.pendingKind, formatVersion)
      if (nextFloor > floor) await raiseInventoryFloor(tx, row, this.audience, nextFloor)
      const nextSet = new Set(pendingParts.map((part) => part.hash))
      return {
        ok: true,
        alreadyCommitted: false,
        previousStorageRef: previous,
        releasedPartRefs: committed.filter((part) => !nextSet.has(part.hash)),
      }
    })
  }

  async softDelete(
    userId: string,
    tool: CreationTool,
    itemId: string,
    baseRevision: number,
    now: Date,
    maxFormatVersion = 1,
    paletteWrite?: PintaPaletteBase & { accountId: string },
    studioSeal?: StudioSealedBase & { accountId: string },
  ): ReturnType<CreationsRepository['softDelete']> {
    return this.db.transaction(async (tx) => {
      if (tool === 'pinta' || tool === 'studio')
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${userId}`}, 0))`,
        )
      await assertIndividualPinta(tx, userId, this.audience, tool, itemId)
      const floor = await inventoryFloor(tx, userId, this.audience, tool)
      const [row] = await tx
        .select({
          storageRef: creations.storageRef,
          id: creations.id,
          parts: creations.parts,
          accountId: creations.accountId,
          pendingUnit: creations.pendingUnit,
          revision: creations.revision,
          deletedAt: creations.deletedAt,
          formatVersion: creations.formatVersion,
          pendingFormatVersion: creations.pendingFormatVersion,
          pendingRevision: creations.pendingRevision,
          pendingPaletteWrite: creations.pendingPaletteWrite,
          studioSealReceipt: creations.studioSealReceipt,
          pendingStudioSeal: creations.pendingStudioSeal,
          bytes: creations.bytes,
        })
        .from(creations)
        .where(whereItem(userId, tool, itemId, this.audience))
        .limit(1)
        .for('update')
      const reservedPalette = tool === PALETTE_LIBRARY_TOOL && itemId === PALETTE_LIBRARY_ITEM_ID
      const owner = { userId, audience: this.audience } as const
      const studioScope = { ...owner, itemId }
      const studioOwner = studioSeal
        ? { ...studioScope, accountId: studioSeal.accountId }
        : undefined
      const studioAuthority =
        tool === 'studio' ? await studioGeneration(tx, studioOwner ?? studioScope) : null
      const observedStudio = tool === 'studio' ? studioHead(row, studioAuthority) : undefined
      if (studioSeal && studioOwner) {
        if (
          !observedStudio ||
          (row && row.accountId !== studioOwner.accountId) ||
          (row && hasStudioSealedStorage(row) && !observedStudio.adopted)
        )
          throw new StudioSealedWriteError('ticket-invalid')
        await ensureStudioAccount(tx, studioOwner.accountId)
        checkStudioBase(observedStudio, baseRevision, studioSeal.baseGeneration)
        if (!row || (!observedStudio.exists && row.pendingRevision === null)) {
          return {
            ok: true,
            deleted: false,
            storageRef: null,
            partRefs: [],
            revision: 0,
            studioHead: observedStudio,
          }
        }
        await authorizeStudioTransaction(tx)
      } else {
        if (observedStudio) requireLegacyStudioWriter(observedStudio, row?.pendingStudioSeal, now)
        if (row && hasStudioSealedStorage(row)) throw new StudioStorageProtocolError()
      }
      const authority = reservedPalette ? await paletteGeneration(tx, owner) : null
      const observed = reservedPalette ? paletteHead(row, authority) : undefined
      const actor = paletteWrite ? { ...owner, accountId: paletteWrite.accountId } : undefined
      if (paletteWrite && actor) {
        if (!observed || (row && row.accountId !== actor.accountId))
          throw new PintaPaletteWriteError('ticket-invalid')
        await ensurePaletteAccount(tx, actor.accountId)
        checkPaletteBase(observed, baseRevision, paletteWrite.baseGeneration)
        if (!row || (!observed.exists && row.pendingRevision === null))
          return {
            ok: true,
            deleted: false,
            storageRef: null,
            partRefs: [],
            revision: 0,
            paletteHead: observed,
          }
        await authorizePaletteTransaction(tx)
      } else if (observed) {
        requireLegacyPaletteWriter(observed, row?.pendingPaletteWrite, now)
      }
      if (!row) {
        return baseRevision === 0
          ? { ok: true, deleted: false, storageRef: null, partRefs: [], revision: 0 }
          : { ok: false, reason: 'stale-base', currentRevision: 0 }
      }
      if (row.pendingUnit) {
        const expired = await expirePintaUnits(
          tx,
          { userId, accountId: row.accountId, audience: this.audience },
          now,
          true,
        )
        if (!expired.includes(row.pendingUnit))
          throw new PintaCausalError('operation-conflict', itemId)
        row.pendingFormatVersion = null
        row.pendingRevision = null
      }
      if (!actor && !studioOwner && baseRevision !== row.revision) {
        return { ok: false, reason: 'stale-base', currentRevision: row.revision }
      }
      const requiredVersion = Math.max(floor, row.formatVersion, row.pendingFormatVersion ?? 1)
      if (!actor && maxFormatVersion < requiredVersion) {
        return { ok: false, reason: 'client-outdated', requiredVersion }
      }
      if (row.deletedAt !== null && row.pendingRevision === null) {
        return { ok: true, deleted: false, storageRef: null, partRefs: [], revision: row.revision }
      }
      const confirmedStudio =
        studioOwner && row.storageRef ? confirmedParts({ ...row, ...studioOwner, tool }) : undefined
      if (
        confirmedStudio?.studioSealReceipt &&
        confirmedStudio.studioSealReceipt.requirements.materials !== 'legacy'
      ) {
        throw new StudioStorageProtocolError()
      }
      await tx
        .update(creations)
        .set({
          deletedAt: row.deletedAt ?? now,
          causalManifest: null,
          causalSha256: null,
          layoutRevision: null,
          backfillTicket: null,
          ...(actor ? { paletteWriteReceipt: null } : {}),
          ...(studioOwner ? { studioSealReceipt: null, studioSealProofSha256: null } : {}),
          // Cancela a reserva em voo (o commit dela cai em 409); o contador NÃO volta.
          ...clearPending(),
          pendingStudioSeal: null,
          // O blob (e as partes) saem da linha — e do R2, pelo BFF: apagado não ocupa espaço
          // fora da quota.
          storageRef: null,
          parts: [],
          bytes: 0,
          thumb: null,
          syncedAt: now,
        })
        .where(whereItem(userId, tool, itemId, this.audience))
      if (studioOwner) {
        const generation = randomUUID()
        await publishStudioGeneration(tx, studioOwner, generation)
        await retireStudioRevision(
          tx,
          studioOwner,
          { ...row, parts: confirmedStudio?.parts ?? [] },
          [],
          now,
        )
        return {
          ok: true,
          deleted: row.deletedAt === null && row.storageRef !== null,
          storageRef: null,
          partRefs: [],
          revision: 0,
          studioHead: studioHead(undefined, generation),
        }
      }
      if (actor) {
        const generation = randomUUID()
        await publishPaletteGeneration(tx, actor, generation)
        await retirePintaPointer(tx, actor, itemId, row.revision, row.storageRef, now)
        return {
          ok: true,
          deleted: row.deletedAt === null && row.storageRef !== null,
          storageRef: null,
          partRefs: [],
          revision: 0,
          paletteHead: paletteHead(undefined, generation),
        }
      }
      return {
        ok: true,
        deleted: row.deletedAt === null,
        storageRef: row.storageRef,
        partRefs: sanitizeParts(row.parts),
        revision: row.revision,
      }
    })
  }
}

/**
 * Resolve as partes pedidas contra as que o item já tem: as conhecidas levam os bytes do
 * servidor (o declarado é ignorado); as faltantes precisam de `bytes` declarados.
 * Hashes repetidos contam uma vez.
 */
export function resolveParts(
  requested: ReadonlyArray<{ hash: string; bytes?: number }>,
  committed: ReadonlyMap<string, CreationPartRef>,
  revision: number,
): { all: CreationPartRef[]; missing: CreationPartRef[]; unsized: string[] } {
  const all: CreationPartRef[] = []
  const missing: CreationPartRef[] = []
  const unsized: string[] = []
  const seen = new Set<string>()
  for (const part of requested) {
    if (seen.has(part.hash)) continue
    seen.add(part.hash)
    const known = committed.get(part.hash)
    if (known !== undefined) {
      // Conhecida: bytes e CHAVE (rev) são os do servidor — o declarado é ignorado.
      all.push({ ...known })
      continue
    }
    if (part.bytes === undefined) {
      unsized.push(part.hash)
      continue
    }
    // Faltante: sobe nesta reserva, com a chave desta revisão.
    all.push({ hash: part.hash, bytes: part.bytes, rev: revision })
    missing.push({ hash: part.hash, bytes: part.bytes, rev: revision })
  }
  return { all, missing, unsized }
}

/**
 * Uso do perfil: só itens vivos e JÁ CONFIRMADOS (reserva sem upload não ocupa vaga nem byte).
 * A biblioteca de paletas do Pinta (kind `palette-library`, item especial do canal) fica FORA da
 * CONTAGEM de itens — não é desenho e não pode ocupar vaga do teto por ferramenta (alinha com o
 * cartão do admin em tool-usage.repository). Os BYTES dela CONTAM: `totalBytes` é o retrato do
 * que ocupa o R2, e a aritmética `totalBytes - currentBytes + novos` assume a própria linha
 * dentro do total.
 */
export async function usageWith(
  db: Pick<Database, 'select'>,
  userId: string,
  audience: CourseAudience,
): Promise<CreationUsage> {
  const rows = await db
    .select({
      tool: creations.tool,
      count: sql<number>`count(*) filter (where not (
        ${creations.tool} = ${PALETTE_LIBRARY_TOOL}
        and ${creations.itemId} = ${PALETTE_LIBRARY_ITEM_ID}
        and ${creations.kind} = ${PALETTE_LIBRARY_KIND}
      ))::int`,
      bytes: sql<number>`coalesce(sum(${creations.bytes}), 0)::bigint`,
    })
    .from(creations)
    .where(
      and(eq(creations.userId, userId), eq(creations.audience, audience), whereAliveCommitted()),
    )
    .groupBy(creations.tool)
  const countByTool = emptyCountByTool()
  let totalBytes = 0
  for (const row of rows) {
    countByTool[row.tool] = Number(row.count)
    totalBytes += Number(row.bytes)
  }
  return { totalBytes, countByTool }
}
