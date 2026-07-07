import { and, asc, eq, lte, sql } from 'drizzle-orm'
import type { SocialAccountRepository } from '../../../domain/ports/social-account-repository.port'
import type { Network } from '../../../domain/publication/publication'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { Database } from './db'
import { socialAccounts } from './schema'

export class DrizzleSocialAccountRepository implements SocialAccountRepository {
  constructor(private readonly db: Database) {}

  async create(account: SocialAccount): Promise<void> {
    await this.db.insert(socialAccounts).values(account)
  }

  async byId(id: string): Promise<SocialAccount | null> {
    const [row] = await this.db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, id))
      .limit(1)
    return row ?? null
  }

  async list(): Promise<SocialAccount[]> {
    return this.db
      .select()
      .from(socialAccounts)
      .orderBy(asc(socialAccounts.network), asc(socialAccounts.createdAt), asc(socialAccounts.id))
  }

  async listByNetwork(network: Network): Promise<SocialAccount[]> {
    return this.db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.network, network))
      .orderBy(asc(socialAccounts.createdAt), asc(socialAccounts.id))
  }

  async update(account: SocialAccount, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(socialAccounts)
      .set({
        version: account.version,
        displayName: account.displayName,
        username: account.username,
        accessTokenEnc: account.accessTokenEnc,
        refreshTokenEnc: account.refreshTokenEnc,
        tokenExpiresAt: account.tokenExpiresAt,
        refreshExpiresAt: account.refreshExpiresAt,
        scopes: account.scopes,
        status: account.status,
        metadata: account.metadata,
        lastRefreshAt: account.lastRefreshAt,
        lastRefreshError: account.lastRefreshError,
        updatedAt: account.updatedAt,
      })
      .where(and(eq(socialAccounts.id, account.id), eq(socialAccounts.version, expectedVersion)))
      .returning({ id: socialAccounts.id })
    return updated.length > 0
  }

  async upsertByExternalId(account: SocialAccount): Promise<SocialAccount> {
    // Reconexão da MESMA conta = update atômico na unique (network, external_id).
    // `coalesce` preserva o refresh antigo quando o consent novo não devolve um
    // (o Google só manda refresh_token no 1º consent da conta).
    const [row] = await this.db
      .insert(socialAccounts)
      .values(account)
      .onConflictDoUpdate({
        target: [socialAccounts.network, socialAccounts.externalId],
        set: {
          version: sql`${socialAccounts.version} + 1`,
          displayName: account.displayName,
          username: account.username,
          accessTokenEnc: account.accessTokenEnc,
          refreshTokenEnc: sql`coalesce(excluded.refresh_token_enc, ${socialAccounts.refreshTokenEnc})`,
          tokenExpiresAt: account.tokenExpiresAt,
          refreshExpiresAt: sql`coalesce(excluded.refresh_expires_at, ${socialAccounts.refreshExpiresAt})`,
          scopes: account.scopes,
          status: account.status,
          metadata: account.metadata,
          connectedBy: account.connectedBy,
          lastRefreshError: null,
          updatedAt: account.updatedAt,
        },
      })
      .returning()
    if (!row) throw new Error('Upsert da conta social não retornou linha')
    return row
  }

  async listExpiring(now: Date, marginMs: number, limit: number): Promise<SocialAccount[]> {
    const cutoff = new Date(now.getTime() + marginMs)
    return this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.status, 'connected'),
          sql`${socialAccounts.refreshTokenEnc} is not null`,
          sql`${socialAccounts.tokenExpiresAt} is not null`,
          lte(socialAccounts.tokenExpiresAt, cutoff),
        ),
      )
      .orderBy(asc(socialAccounts.tokenExpiresAt), asc(socialAccounts.id))
      .limit(limit)
  }
}
