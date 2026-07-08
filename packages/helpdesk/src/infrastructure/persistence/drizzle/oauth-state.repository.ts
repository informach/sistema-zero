import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import type {
  OAuthState,
  OAuthStateRepository,
} from '../../../domain/ports/oauth-state-repository.port'
import type { Database } from './db'
import { oauthStates } from './schema'

export class DrizzleOAuthStateRepository implements OAuthStateRepository {
  constructor(private readonly db: Database) {}

  async create(state: OAuthState): Promise<void> {
    await this.db.insert(oauthStates).values(state)
  }

  async consume(state: string, at: Date): Promise<OAuthState | null> {
    // Single-use ATÔMICO: marca `used_at` condicionado a não usado e não
    // expirado — replay/corrida perde na cláusula WHERE (0 linhas).
    const [row] = await this.db
      .update(oauthStates)
      .set({ usedAt: at })
      .where(
        and(
          eq(oauthStates.state, state),
          isNull(oauthStates.usedAt),
          gt(oauthStates.expiresAt, at),
        ),
      )
      .returning()
    return row ?? null
  }

  async deleteExpired(before: Date): Promise<number> {
    const deleted = await this.db
      .delete(oauthStates)
      .where(lt(oauthStates.expiresAt, before))
      .returning({ state: oauthStates.state })
    return deleted.length
  }
}
