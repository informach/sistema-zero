import { randomUUID } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL,
  type StudioSealedRequirements,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  type StudioSealedCommitProof,
  type StudioSealedHead,
  type StudioSealedPlannedPart,
  type StudioSealedTicket,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { and, eq, sql } from 'drizzle-orm'
import { StudioSealedWriteError } from '../../../domain/creations/studio-sealed-write'
import type { Database } from './db'
import { accountDeletionFences, studioSealedHeads } from './schema'

export type StudioSealOwner = StudioSealedTicket['scope']
type VisibleRow = {
  id: string
  revision: number
  deletedAt: Date | null
  storageRef: string | null
}

const TTL_MS = 10 * 60_000

export function studioHead(
  row: VisibleRow | undefined,
  generation: string | null,
): StudioSealedHead {
  const exists = !!row && row.deletedAt === null && row.storageRef !== null
  return {
    protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
    generation: generation ?? (exists || row?.deletedAt ? (row?.id ?? null) : null),
    revision: exists ? row.revision : 0,
    exists,
    adopted: generation !== null,
  }
}

export async function studioGeneration(
  db: Pick<Database, 'select'>,
  owner: Omit<StudioSealOwner, 'accountId'> & { accountId?: string },
) {
  const [entry] = await db
    .select({ generation: studioSealedHeads.generation, accountId: studioSealedHeads.accountId })
    .from(studioSealedHeads)
    .where(
      and(
        eq(studioSealedHeads.userId, owner.userId),
        eq(studioSealedHeads.audience, owner.audience),
        eq(studioSealedHeads.itemId, owner.itemId),
      ),
    )
  if (owner.accountId && entry && entry.accountId !== owner.accountId)
    throw new StudioSealedWriteError('ticket-invalid')
  return entry?.generation ?? null
}

export async function ensureStudioAccount(db: Pick<Database, 'select'>, accountId: string) {
  const [fence] = await db
    .select({ accountId: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, accountId))
    .limit(1)
  if (fence) throw new StudioSealedWriteError('account-deleting')
}

export function checkStudioBase(
  head: StudioSealedHead,
  baseRevision: number | undefined,
  baseGeneration: string | null,
) {
  if (head.revision !== baseRevision || head.generation !== baseGeneration) {
    throw new StudioSealedWriteError('head-changed', head)
  }
}

export function activeStudioTicket(
  ticket: StudioSealedTicket | null | undefined,
  now: Date,
): boolean {
  return !!ticket && Date.parse(ticket.expiresAt) > Math.max(now.getTime(), Date.now())
}

export function requireLegacyStudioWriter(
  head: StudioSealedHead,
  ticket: StudioSealedTicket | null | undefined,
  now: Date,
  commitRevision?: number,
) {
  if (
    head.adopted ||
    activeStudioTicket(ticket, now) ||
    (ticket && ticket.revision === commitRevision)
  ) {
    throw new StudioSealedWriteError('protocol-required')
  }
}

export function newStudioTicket(
  owner: StudioSealOwner,
  head: StudioSealedHead,
  metadata: {
    revision: number
    bytes: number
    name: string
    kind: string
    itemUpdatedAt: Date
    now: Date
  },
  requirements: StudioSealedRequirements,
  parts: StudioSealedPlannedPart[],
): StudioSealedTicket {
  const { revision, bytes, name, kind, itemUpdatedAt, now } = metadata
  const ticket = StudioSealedTicketSchema.safeParse({
    protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
    scope: owner,
    nonce: randomUUID(),
    baseGeneration: head.generation,
    baseRevision: head.revision,
    revision,
    bytes,
    name,
    kind,
    itemUpdatedAt: itemUpdatedAt.toISOString(),
    expiresAt: new Date(Math.max(now.getTime(), Date.now()) + TTL_MS).toISOString(),
    requirements,
    parts,
  })
  if (!ticket.success) throw new StudioSealedWriteError('ticket-invalid')
  return ticket.data
}

export function proveStudioSealedParts(proof: StudioSealedCommitProof) {
  const { ticket, receipt, parts } = proof
  if (
    receipt.nonce !== ticket.nonce ||
    receipt.manifestBytes !== ticket.bytes ||
    canonicalJson(receipt.requirements) !== canonicalJson(ticket.requirements) ||
    parts.length !== ticket.parts.length ||
    ticket.parts.some((planned, index) => {
      const verified = parts[index]!
      return (
        verified.hash !== planned.hash ||
        verified.bytes !== planned.bytes ||
        (planned.source === 'sealed'
          ? verified.nonce !== planned.nonce || verified.gzipSha256 !== planned.gzipSha256
          : verified.nonce !== ticket.nonce)
      )
    })
  )
    throw new StudioSealedWriteError('ticket-invalid')
  return parts
}

export async function authorizeStudioTransaction(db: Pick<Database, 'execute'>) {
  await db.execute(sql`select set_config('members.studio_sealed_writer', 'studio-sealed-v1', true)`)
}

export async function publishStudioGeneration(
  db: Pick<Database, 'insert'>,
  owner: StudioSealOwner,
  generation: string,
) {
  await db
    .insert(studioSealedHeads)
    .values({ ...owner, generation })
    .onConflictDoUpdate({
      target: [studioSealedHeads.userId, studioSealedHeads.audience, studioSealedHeads.itemId],
      set: { generation },
    })
}
