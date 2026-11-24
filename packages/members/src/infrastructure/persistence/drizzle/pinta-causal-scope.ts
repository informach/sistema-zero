import { and, eq, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { CreationTool } from '../../../domain/creations/creation'
import { PALETTE_LIBRARY_ITEM_ID } from '../../../domain/creations/palette-library'
import { PintaCausalError } from '../../../domain/creations/pinta-causal-graph'
import type { Database } from './db'
import { creationInventoryFloors as floors } from './schema'

export interface PintaCausalActor {
  userId: string
  accountId: string
  audience: CourseAudience
}

export function personalPinta(tool: CreationTool, itemId?: string) {
  return tool === 'pinta' && itemId !== PALETTE_LIBRARY_ITEM_ID
}

export async function pintaScope(
  db: Pick<Database, 'select'>,
  userId: string,
  audience: CourseAudience,
) {
  const [state] = await db
    .select()
    .from(floors)
    .where(and(eq(floors.userId, userId), eq(floors.audience, audience), eq(floors.tool, 'pinta')))
  return {
    accountId: state?.accountId,
    epoch: state?.graphEpoch ?? 0n,
    floor: state?.requiredVersion ?? 1,
    protected: state?.requiresCausalRead ?? false,
  }
}

export async function assertIndividualPinta(
  db: Pick<Database, 'select'>,
  userId: string,
  audience: CourseAudience,
  tool: CreationTool,
  itemId?: string,
) {
  if (personalPinta(tool, itemId) && (await pintaScope(db, userId, audience)).protected)
    throw new PintaCausalError('protocol-required')
}

export async function bumpPintaEpoch(
  db: Pick<Database, 'insert'>,
  actor: PintaCausalActor,
  protect = false,
  floor = 1,
) {
  const [row] = await db
    .insert(floors)
    .values({
      ...actor,
      tool: 'pinta',
      graphEpoch: 1n,
      requiredVersion: floor,
      requiresCausalRead: protect,
    })
    .onConflictDoUpdate({
      target: [floors.userId, floors.audience, floors.tool],
      set: {
        graphEpoch: sql`${floors.graphEpoch} + 1`,
        requiredVersion: sql`greatest(${floors.requiredVersion},${floor})`,
        requiresCausalRead: sql`${floors.requiresCausalRead} or ${protect}`,
      },
    })
    .returning({ epoch: floors.graphEpoch })
  if (!row) throw new Error('Pinta graph epoch not persisted')
  return row.epoch
}
