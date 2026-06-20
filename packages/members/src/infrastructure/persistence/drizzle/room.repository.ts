import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { RoomRepository } from '../../../domain/ports/room-repository.port'
import type { RoomState } from '../../../domain/room/room-catalog'
import type { Database } from './db'
import { roomInventory, roomState } from './schema'

export class DrizzleRoomRepository implements RoomRepository {
  constructor(private readonly db: Database) {}

  async getState(userId: string, audience: CourseAudience): Promise<RoomState | null> {
    const [row] = await this.db
      .select({ state: roomState.state })
      .from(roomState)
      .where(and(eq(roomState.userId, userId), eq(roomState.audience, audience)))
      .limit(1)
    return row?.state ?? null
  }

  async upsertState(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    state: RoomState,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(roomState)
      .values({
        id: randomUUID(),
        userId,
        accountId,
        audience,
        state,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [roomState.userId, roomState.audience],
        // `accountId` fica de fora do update: IMUTÁVEL por perfil (só no INSERT).
        set: { state, updatedAt: now },
      })
  }

  async listInventory(userId: string, audience: CourseAudience): Promise<string[]> {
    const rows = await this.db
      .select({ itemId: roomInventory.itemId })
      .from(roomInventory)
      .where(and(eq(roomInventory.userId, userId), eq(roomInventory.audience, audience)))
    return rows.map((r) => r.itemId)
  }

  async addToInventory(
    userId: string,
    audience: CourseAudience,
    itemId: string,
    now: Date,
  ): Promise<{ added: boolean }> {
    const inserted = await this.db
      .insert(roomInventory)
      .values({ id: randomUUID(), userId, audience, itemId, acquiredAt: now })
      .onConflictDoNothing({
        target: [roomInventory.userId, roomInventory.audience, roomInventory.itemId],
      })
      .returning({ id: roomInventory.id })
    return { added: inserted.length > 0 }
  }
}
