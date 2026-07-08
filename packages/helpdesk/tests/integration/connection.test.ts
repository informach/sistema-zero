import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import { buildTestApp, json, request, STAFF_USER_ID, type TestApp } from '../helpers'

function seedConnection(t: TestApp): GmailConnection {
  const at = new Date('2026-07-08T12:00:00Z')
  const conn: GmailConnection = {
    id: randomUUID(),
    version: 0,
    emailAddress: 'contato@sistemazero.com.br',
    externalId: 'sub-1',
    accessTokenEnc: t.secretBox.seal('access-1'),
    refreshTokenEnc: t.secretBox.seal('refresh-1'),
    tokenExpiresAt: new Date(at.getTime() + 3600_000),
    scopes: [],
    status: 'connected',
    lastHistoryId: '100',
    lastSyncAt: at,
    syncNextAt: at,
    syncAttempts: 0,
    lastSyncError: null,
    connectedBy: STAFF_USER_ID,
    connectedByName: null,
    metadata: {},
    createdAt: at,
    updatedAt: at,
  }
  t.repos.connections.rows.set(conn.id, conn)
  return conn
}

describe('conexão Gmail', () => {
  it('GET sem conexão → connected: false', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/connection')
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ connected: false })
  })

  it('GET com conexão → connected: true (sem expor tokens)', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const res = await request(t.app, 'GET', '/helpdesk/connection')
    const body = await json(res)
    expect(body.connected).toBe(true)
    expect(body.emailAddress).toBe('contato@sistemazero.com.br')
    expect(body.status).toBe('connected')
    expect(JSON.stringify(body)).not.toContain('sealed(') // nada de token na view
  })

  it('DELETE desconecta: revoga, zera tokens e marca revoked', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const conn = seedConnection(t)
    const res = await request(t.app, 'DELETE', '/helpdesk/connection')
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ connected: false })

    const stored = await t.repos.connections.byId(conn.id)
    expect(stored?.status).toBe('revoked')
    expect(stored?.accessTokenEnc).toBeNull()
    expect(stored?.refreshTokenEnc).toBeNull()
    expect(t.provider.revoked).toContain('refresh-1') // revogou no Google
  })

  it('DELETE sem conexão → 409 CONNECTION_NOT_CONNECTED', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const res = await request(t.app, 'DELETE', '/helpdesk/connection')
    expect(res.status).toBe(409)
    expect((await json(res)).error.code).toBe('CONNECTION_NOT_CONNECTED')
  })
})
