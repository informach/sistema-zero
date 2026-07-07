import { and, eq, gt, isNull } from 'drizzle-orm'
import type {
  OAuthStateRecord,
  OAuthStateRepository,
} from '../../../domain/ports/oauth-state-repository.port'
import type { Database } from './db'
import { oauthStates } from './schema'

export class DrizzleOAuthStateRepository implements OAuthStateRepository {
  constructor(private readonly db: Database) {}

  async create(record: OAuthStateRecord): Promise<void> {
    await this.db.insert(oauthStates).values(record)
  }

  async consume(state: string, now: Date): Promise<OAuthStateRecord | null> {
    // Single-use ATÔMICO: só um callback vence a corrida (0 linhas = reuso/vencido).
    const [row] = await this.db
      .update(oauthStates)
      .set({ usedAt: now })
      .where(
        and(
          eq(oauthStates.state, state),
          isNull(oauthStates.usedAt),
          gt(oauthStates.expiresAt, now),
        ),
      )
      .returning()
    return row ?? null
  }
}
