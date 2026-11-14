import { randomUUID } from 'node:crypto'
import type { MoradaHouse } from '@sistemazero/core/morada'
import { and, eq } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../../domain/ports/morada-house-repository.port'
import type { Database } from './db'
import { moradaHouses } from './schema'

export class DrizzleMoradaHouseRepository implements MoradaHouseRepository {
  constructor(private readonly db: Database) {}
  async get(userId: string, audience: CourseAudience): Promise<MoradaHouseRecord | null> {
    const [row] = await this.db
      .select({ house: moradaHouses.house, revision: moradaHouses.revision })
      .from(moradaHouses)
      .where(and(eq(moradaHouses.userId, userId), eq(moradaHouses.audience, audience)))
      .limit(1)
    return row ?? null
  }
  async compareAndSwap(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    expectedRevision: number,
    house: MoradaHouse,
    now: Date,
  ): Promise<MoradaHouseRecord | null> {
    if (expectedRevision === 0) {
      const [row] = await this.db
        .insert(moradaHouses)
        .values({
          id: randomUUID(),
          userId,
          accountId,
          audience,
          house,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: [moradaHouses.userId, moradaHouses.audience] })
        .returning({ house: moradaHouses.house, revision: moradaHouses.revision })
      return row ?? null
    }
    const [row] = await this.db
      .update(moradaHouses)
      // O perfil e o público identificam os dados, como na leitura. A conta vem do
      // contexto autenticado e corrige o metadado legado que às vezes guardava o perfil.
      .set({ house, accountId, revision: expectedRevision + 1, updatedAt: now })
      .where(
        and(
          eq(moradaHouses.userId, userId),
          eq(moradaHouses.audience, audience),
          eq(moradaHouses.revision, expectedRevision),
        ),
      )
      .returning({ house: moradaHouses.house, revision: moradaHouses.revision })
    return row ?? null
  }
}
