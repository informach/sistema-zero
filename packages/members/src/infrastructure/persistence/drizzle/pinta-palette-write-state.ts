import { randomUUID } from 'node:crypto'
import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import {
  type PintaPaletteHead,
  type PintaPaletteTicket,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { and, eq, sql } from 'drizzle-orm'
import { PintaPaletteWriteError } from '../../../domain/creations/pinta-palette-write'
import type { Database } from './db'
import { accountDeletionFences, creationInventoryFloors as floors } from './schema'

export const PALETTE_UPLOAD_TTL_MS = 10 * 60_000

type PaletteOwner = Pick<PintaCausalViewer, 'userId' | 'audience'> & { accountId?: string }
type Row = {
  id: string
  revision: number
  deletedAt: Date | null
  storageRef: string | null
}

function ownerScope({ userId, audience }: PaletteOwner) {
  return and(eq(floors.userId, userId), eq(floors.audience, audience), eq(floors.tool, 'pinta'))
}

export async function paletteGeneration(db: Pick<Database, 'select'>, owner: PaletteOwner) {
  const [scope] = await db
    .select({ generation: floors.paletteGeneration, accountId: floors.accountId })
    .from(floors)
    .where(ownerScope(owner))
  if (owner.accountId && scope && owner.accountId !== scope.accountId)
    throw new PintaPaletteWriteError('ticket-invalid')
  return scope?.generation ?? null
}

export function paletteHead(row: Row | undefined, generation: string | null): PintaPaletteHead {
  const exists = !!row && row.deletedAt === null && row.storageRef !== null
  return {
    protocol,
    adopted: generation !== null,
    generation: generation ?? (exists || row?.deletedAt ? (row?.id ?? null) : null),
    exists,
    revision: exists ? row.revision : 0,
  }
}

export function checkPaletteBase(
  head: PintaPaletteHead,
  revision: number | undefined,
  generation: string | null,
) {
  if (head.revision !== revision || head.generation !== generation)
    throw new PintaPaletteWriteError('head-changed', head)
}

export function requireLegacyPaletteWriter(
  head: PintaPaletteHead,
  ticket: PintaPaletteTicket | null | undefined,
  now: Date,
  commitRevision?: number,
) {
  if (
    head.adopted ||
    (ticket && (Date.parse(ticket.expiresAt) > now.getTime() || ticket.revision === commitRevision))
  )
    throw new PintaPaletteWriteError('protocol-required')
}

export function newPaletteTicket(
  head: PintaPaletteHead,
  revision: number,
  bytes: number,
  itemUpdatedAt: Date,
  now: Date,
): PintaPaletteTicket {
  return {
    protocol,
    nonce: randomUUID(),
    baseGeneration: head.generation,
    baseRevision: head.revision,
    revision,
    bytes,
    itemUpdatedAt: itemUpdatedAt.toISOString(),
    expiresAt: new Date(now.getTime() + PALETTE_UPLOAD_TTL_MS).toISOString(),
  }
}

export async function authorizePaletteTransaction(db: Pick<Database, 'execute'>) {
  await db.execute(sql`select set_config('members.pinta_palette_writer', 'palette-cas-v1', true)`)
}

export async function ensurePaletteAccount(db: Pick<Database, 'select'>, accountId: string) {
  const [fence] = await db
    .select({ accountId: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, accountId))
  if (fence) throw new PintaPaletteWriteError('account-deleting')
}

export async function publishPaletteGeneration(
  db: Pick<Database, 'insert'>,
  actor: PintaCausalViewer,
  generation: string,
) {
  await db
    .insert(floors)
    .values({
      ...actor,
      tool: 'pinta',
      requiredVersion: 1,
      paletteGeneration: generation,
    })
    .onConflictDoUpdate({
      target: [floors.userId, floors.audience, floors.tool],
      set: { paletteGeneration: generation },
    })
}
