import { desc, eq, inArray } from 'drizzle-orm'
import type { GmailConnection } from '../../../domain/connection/gmail-connection'
import type { ConnectionRepository } from '../../../domain/ports/connection-repository.port'
import type { Database, DbConnection } from './db'
import { gmailConnections } from './schema'

export class DrizzleConnectionRepository implements ConnectionRepository {
  private readonly db: Database

  constructor(private readonly connection: DbConnection) {
    this.db = connection.db
  }

  async create(conn: GmailConnection): Promise<void> {
    await this.db.insert(gmailConnections).values(conn)
  }

  async byId(id: string): Promise<GmailConnection | null> {
    const [row] = await this.db
      .select()
      .from(gmailConnections)
      .where(eq(gmailConnections.id, id))
      .limit(1)
    return row ?? null
  }

  async byExternalId(externalId: string): Promise<GmailConnection | null> {
    const [row] = await this.db
      .select()
      .from(gmailConnections)
      .where(eq(gmailConnections.externalId, externalId))
      .limit(1)
    return row ?? null
  }

  async current(): Promise<GmailConnection | null> {
    const [row] = await this.db
      .select()
      .from(gmailConnections)
      .where(inArray(gmailConnections.status, ['connected', 'needs_reauth']))
      .orderBy(desc(gmailConnections.updatedAt))
      .limit(1)
    return row ?? null
  }

  async update(conn: GmailConnection): Promise<void> {
    await this.db
      .update(gmailConnections)
      .set({
        version: conn.version,
        emailAddress: conn.emailAddress,
        accessTokenEnc: conn.accessTokenEnc,
        refreshTokenEnc: conn.refreshTokenEnc,
        tokenExpiresAt: conn.tokenExpiresAt,
        scopes: conn.scopes,
        status: conn.status,
        lastHistoryId: conn.lastHistoryId,
        lastSyncAt: conn.lastSyncAt,
        syncNextAt: conn.syncNextAt,
        syncAttempts: conn.syncAttempts,
        lastSyncError: conn.lastSyncError,
        metadata: conn.metadata,
        updatedAt: conn.updatedAt,
      })
      .where(eq(gmailConnections.id, conn.id))
  }

  async claimDue(leaseMs: number, at: Date): Promise<GmailConnection | null> {
    // Claim atômico com lease (padrão send-worker do messaging): SKIP LOCKED
    // deixa réplicas concorrentes pegarem conexões diferentes; o `sync_next_at`
    // empurrado adiante é o lease (crash → volta a ficar elegível ao vencer).
    // ⚠️ Date como param em SQL cru só via .toISOString() (gotcha Bun+postgres.js).
    const nowIso = at.toISOString()
    const leaseIso = new Date(at.getTime() + leaseMs).toISOString()
    const rows = await this.connection.sql`
      update helpdesk.gmail_connections
      set sync_next_at = ${leaseIso}, sync_attempts = sync_attempts + 1
      where id = (
        select id from helpdesk.gmail_connections
        where status = 'connected' and sync_next_at <= ${nowIso}
        order by sync_next_at
        limit 1
        for update skip locked
      )
      returning id
    `
    const claimedId = rows[0]?.id as string | undefined
    if (!claimedId) return null
    return this.byId(claimedId)
  }
}
