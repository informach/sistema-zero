import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { GmailConnection } from '../../../domain/connection/gmail-connection'
import type { ConnectionRepository } from '../../../domain/ports/connection-repository.port'
import type { Database, DbConnection } from './db'
import { gmailConnections } from './schema'

const SINGLE_ACTIVE_CONNECTION_LOCK = '71130324050607096'

export class DrizzleConnectionRepository implements ConnectionRepository {
  private readonly db: Database

  constructor(private readonly connection: DbConnection) {
    this.db = connection.db
  }

  async activate(conn: GmailConnection): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Serializa callbacks concorrentes de OAuth. Sem o lock, duas transações
      // que começam com a tabela vazia poderiam disputar o índice parcial e
      // transformar uma reconexão válida em erro 500.
      await tx.execute(sql`
        select pg_advisory_xact_lock(${SINGLE_ACTIVE_CONNECTION_LOCK}::bigint)
      `)
      // Defesa no banco além da validação OAuth: uma nova conexão sempre
      // invalida as credenciais das demais caixas antes de se tornar elegível
      // ao worker. A migration cria também um índice único parcial para cobrir
      // qualquer escritor futuro que escape deste adapter.
      await tx
        .update(gmailConnections)
        .set({
          version: sql`${gmailConnections.version} + 1`,
          accessTokenEnc: null,
          refreshTokenEnc: null,
          tokenExpiresAt: null,
          status: 'disabled',
          lastSyncError: null,
          updatedAt: conn.updatedAt,
        })
        .where(
          and(
            ne(gmailConnections.id, conn.id),
            inArray(gmailConnections.status, ['connected', 'needs_reauth']),
          ),
        )

      const [existing] = await tx
        .select({ id: gmailConnections.id })
        .from(gmailConnections)
        .where(eq(gmailConnections.id, conn.id))
        .limit(1)
      if (!existing) {
        await tx.insert(gmailConnections).values(conn)
        return
      }
      await tx
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
          connectedBy: conn.connectedBy,
          connectedByName: conn.connectedByName,
          metadata: conn.metadata,
          updatedAt: conn.updatedAt,
        })
        .where(eq(gmailConnections.id, conn.id))
    })
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
