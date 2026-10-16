import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  activationViewSchema,
  configureChannelSchema,
  contextRequestSchema,
} from '@sistemazero/marketing-contracts'
import { and, eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { EngagementService } from '../src/application/engagement/engagement.service'
import { ExecutionService } from '../src/application/workspace/execution.service'
import type { IncomingEvent } from '../src/domain/engagement/policy'
import { quarantineRestoredWork } from '../src/infrastructure/backup/postgres-archive'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleEngagementRepository } from '../src/infrastructure/persistence/drizzle/engagement.repository'
import { DrizzleEngagementConversations } from '../src/infrastructure/persistence/drizzle/engagement-conversations.repository'
import { DrizzleEngagementEngine } from '../src/infrastructure/persistence/drizzle/engagement-engine.repository'
import {
  engagementActivations,
  engagementChannels,
  engagementConversations,
  engagementInbound,
  engagementOutbound,
} from '../src/infrastructure/persistence/drizzle/engagement-schema'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { publications, socialAccounts } from '../src/infrastructure/persistence/drizzle/schema'
import { engagementFixture, reviewBox, reviewKey } from './helpers/engagement'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.ENGAGEMENT_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('engajamento PostgreSQL isolado', () => {
  let connection: DbConnection
  beforeAll(async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      !['15465', '15466'].includes(new URL(url).port) ||
      new URL(url).pathname !== '/marketing_review'
    )
      throw new Error('Use o banco exclusivo da revisão de engajamento')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
  })
  afterAll(async () => connection?.close())
  beforeEach(async () => {
    // Dedicated disposable database, guarded above: no previous test may feed a worker.
    await connection.sql`truncate marketing.engagement_inbound, marketing.engagement_outbound`
  })
  async function liveFixture() {
    const f = await engagementFixture(connection)
    await f.repo.approve(f.owner.userId, f.projectId, {
      operationId: randomUUID(),
      revisionId: f.revisionId,
      checkedOffer: true,
      checkedExits: true,
    })
    await f.repo.activate(f.owner.userId, f.projectId, {
      operationId: randomUUID(),
      publicationId: f.publicationId,
      accountId: f.accountId,
      revisionId: f.revisionId,
      checkedPublication: true,
    })
    const engine = new DrizzleEngagementEngine(
      connection.db,
      reviewBox,
      reviewKey,
      'v25.0',
      true,
      fixtureDirectory,
    )
    const binding = (await engine.bindings()).find((b) => b.account.id === f.accountId)
    if (!binding) throw new Error('Vínculo de teste ausente')
    await engine.bind(binding, true)
    const event = (patch: Partial<IncomingEvent> = {}): IncomingEvent => ({
      key: randomUUID(),
      accountExternalId: f.externalId,
      recipient: 'recipient-review',
      at: new Date().toISOString(),
      kind: 'comment',
      text: 'Quero FÉRIAS!',
      mediaId: `media-${f.externalId}`,
      commentId: randomUUID(),
      postback: null,
      externalId: null,
      ...patch,
    })
    return {
      ...f,
      engine,
      event,
      conversations: new DrizzleEngagementConversations(connection.db, 'v25.0', true),
    }
  }
  test('replay e workers concorrentes produzem uma abertura; silêncio não produz oferta', async () => {
    const f = await liveFixture(),
      event = f.event()
    await Promise.all([f.engine.ingest([event, event]), f.engine.ingest([event])])
    await Promise.all([f.engine.process(new Date()), f.engine.process(new Date())])
    const sends = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.accountId, f.accountId))
    expect(sends).toHaveLength(1)
    const claimed = await Promise.all([f.engine.claim(new Date()), f.engine.claim(new Date())])
    const dispatch = claimed.find((d) => d?.account.id === f.accountId)
    expect(claimed.filter(Boolean)).toHaveLength(1)
    if (!dispatch) throw new Error('Abertura ausente')
    await f.engine.finish(dispatch, { status: 'accepted', externalId: 'opening-id' }, new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    const button = dispatch.message.buttons[0]
    if (button?.type !== 'postback') throw new Error('Botão ausente')
    const click = f.event({
      kind: 'postback',
      text: null,
      commentId: null,
      postback: button.payload,
    })
    await f.engine.ingest([click, click])
    await f.engine.process(new Date())
    const offer = await f.engine.claim(new Date())
    expect(offer?.message.buttons[0]?.type).toBe('web_url')
    if (!offer) throw new Error('Oferta ausente')
    await f.engine.finish(offer, { status: 'accepted', externalId: 'offer-id' }, new Date())
    await f.engine.ingest([
      f.event({ kind: 'postback', commentId: null, text: null, postback: button.payload }),
    ])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('postback antecipado aguarda a confirmação e texto livre suspende oferta pendente', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (!opening) throw new Error('Abertura ausente')
    const button = opening.message.buttons[0]
    if (button?.type !== 'postback') throw new Error('Botão ausente')
    await f.engine.ingest([
      f.event({ kind: 'postback', text: null, commentId: null, postback: button.payload }),
    ])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    await f.engine.finish(opening, { status: 'accepted', externalId: randomUUID() }, new Date())
    await f.engine.process(new Date(Date.now() + 3000))
    await f.engine.ingest([f.event({ kind: 'message', text: 'Tenho uma dúvida', commentId: null })])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    const list = await f.repo.listConversations(f.owner.userId, f.accountId)
    expect(list.items[0]?.state).toBe('waiting-human')
  })
  test('timeout e perda de lease não são reenviados; exclusão não restaura identificadores', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const sending = await f.engine.claim(new Date())
    if (!sending) throw new Error('Envio ausente')
    await f.engine.maintain(new Date(Date.now() + 61000))
    expect(await f.engine.claim(new Date())).toBeNull()
    const [conversation] = (await f.repo.listConversations(f.owner.userId, f.accountId)).items
    if (!conversation) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, conversation.id, {
      operationId: randomUUID(),
      expectedVersion: conversation.version,
      action: 'erase',
    })
    await f.engine.finish(
      sending,
      { status: 'accepted', externalId: 'must-not-survive' },
      new Date(),
    )
    await f.engine.ingest([f.event({ kind: 'message', text: 'PARAR', commentId: null })])
    await f.engine.process(new Date())
    const [stored] = await connection.db
      .select()
      .from(engagementConversations)
      .where(eq(engagementConversations.id, conversation.id))
    expect(stored?.suppression).toBe('erased')
    expect(stored?.recipientEnc).toBeNull()
    const outgoing = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.conversationId, conversation.id))
    expect(outgoing.every((o) => o.message === null && o.externalId === null)).toBe(true)
    const incoming = await connection.db
      .select()
      .from(engagementInbound)
      .where(
        and(
          eq(engagementInbound.accountId, f.accountId),
          eq(engagementInbound.conversationId, conversation.id),
        ),
      )
    expect(incoming.every((i) => i.event === null)).toBe(true)
  })
  test('DM sem campanha segue para equipe e supressão precede nova palavra', async () => {
    const f = await liveFixture()
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Como acesso minha aula?', commentId: null }),
    ])
    await f.engine.process(new Date())
    const [c] = (await f.repo.listConversations(f.owner.userId, f.accountId)).items
    if (!c) throw new Error('Conversa ausente')
    expect(c.state).toBe('waiting-human')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'suppress',
      reason: 'child',
    })
    await f.engine.ingest([f.event({ kind: 'message', text: 'FERIAS', commentId: null })])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('aprovação referencia revisão real e ativação explícita aguarda prova do post', async () => {
    const f = await engagementFixture(connection)
    expect(await f.repo.listActivations(f.owner.userId, f.projectId, f.pieceId)).toHaveLength(0)
    expect(await f.repo.commercialOrigins(f.owner.userId, f.projectId, f.pieceId)).toHaveLength(0)
    const request = {
      operationId: randomUUID(),
      revisionId: f.revisionId,
      checkedOffer: true,
      checkedExits: true,
    }
    const service = new EngagementService(
      f.repo,
      new DrizzleEngagementConversations(connection.db, 'v25.0', true),
      fixtureDirectory,
    )
    await service.approve(f.owner, f.projectId, request)
    expect(await service.approve(f.owner, f.projectId, request)).toEqual({
      revisionId: f.revisionId,
      approved: true,
    })
    const activate = {
      operationId: randomUUID(),
      publicationId: f.publicationId,
      accountId: f.accountId,
      revisionId: f.revisionId,
      checkedPublication: true,
    }
    const results = await Promise.all([
      service.activate(f.owner, f.projectId, activate),
      service.activate(f.owner, f.projectId, activate),
    ])
    expect(results[0]).toEqual(results[1])
    expect(activationViewSchema.parse(results[0]).state).toBe('awaiting-link')
    expect(await f.repo.commercialOrigins(f.owner.userId, f.projectId, f.pieceId)).toHaveLength(1)
    await rejects(
      () => service.activate(f.owner, f.projectId, { ...activate, revisionId: randomUUID() }),
      /outro pedido/,
    )
  })
  test('acesso editorial não concede acesso à conta e estado de configuração exige versão', async () => {
    const f = await engagementFixture(connection),
      colleague = { ...f.owner, role: 'staff', userId: randomUUID() }
    await f.workspace.setMember(f.owner, f.projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read', 'edit'],
    })
    expect(await f.repo.channels(colleague.userId, false)).toEqual([])
    await rejects(() => f.repo.listConversations(colleague.userId, f.accountId), /não disponível/)
    const command = configureChannelSchema.parse({
      operationId: randomUUID(),
      expectedVersion: 1,
      enabled: false,
      proof: null,
      retentionDays: 60,
      maxSendsPerHour: 10,
    })
    expect(await f.repo.configure(f.owner.userId, true, f.accountId, command)).toEqual({
      version: 2,
    })
    expect(await f.repo.configure(f.owner.userId, true, f.accountId, command)).toEqual({
      version: 2,
    })
    await rejects(
      () =>
        f.repo.configure(f.owner.userId, true, f.accountId, {
          ...command,
          operationId: randomUUID(),
        }),
      /estado mudou/,
    )
  })
  test('envio global desligado não aceita ativação mesmo com prova cadastrada', async () => {
    const f = await engagementFixture(connection),
      disabled = new DrizzleEngagementRepository(connection.db, 'v25.0', false)
    const views = await disabled.channels(f.owner.userId, false)
    expect(views.find((v) => v.id === f.accountId)?.available).toBe(false)
    const command = configureChannelSchema.parse({
      operationId: randomUUID(),
      expectedVersion: 1,
      enabled: true,
      proof: views[0]?.proof,
      retentionDays: 90,
      maxSendsPerHour: 30,
    })
    await rejects(() => disabled.configure(f.owner.userId, true, f.accountId, command), /global/)
  })
  test('criança conserva só supressão; PARAR e ações humanas não enfraquecem o bloqueio', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event({ kind: 'message', text: 'Sou criança', commentId: null })])
    await f.engine.process(new Date())
    const [c] = (await f.repo.listConversations(f.owner.userId, f.accountId)).items
    if (!c) throw new Error('Conversa ausente')
    const disabled = new DrizzleEngagementConversations(connection.db, 'v25.0', false)
    await rejects(
      () =>
        disabled.action(f.owner.userId, f.accountId, c.id, {
          operationId: randomUUID(),
          expectedVersion: c.version,
          action: 'reply',
          text: 'Resposta não autorizada com envio desligado',
        }),
      { code: 'ENGAGEMENT_UNAVAILABLE' },
    )
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'saved-reply',
      key: 'child',
    })
    const exit = await f.engine.claim(new Date())
    expect(exit?.message.buttons).toEqual([])
    if (!exit) throw new Error('Saída ausente')
    await f.engine.finish(exit, { status: 'accepted', externalId: 'child-exit' }, new Date())
    await f.engine.ingest([f.event({ kind: 'message', text: 'PARAR', commentId: null })])
    await f.engine.process(new Date())
    const [stored] = await connection.db
      .select()
      .from(engagementConversations)
      .where(eq(engagementConversations.id, c.id))
    expect(stored?.suppression).toBe('child')
    expect(stored?.recipientEnc).toBeNull()
    const detail = await f.repo.detail(f.owner.userId, f.accountId, c.id)
    expect(detail.messages.every((m) => m.text === null && m.externalId === null)).toBe(true)
    await rejects(
      () =>
        f.conversations.action(f.owner.userId, f.accountId, c.id, {
          operationId: randomUUID(),
          expectedVersion: c.version + 1,
          action: 'suppress',
          reason: 'stop',
        }),
      /criança/,
    )
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('postback de outra pessoa não avança; parada pendente precede o próximo envio', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (opening?.message.buttons[0]?.type !== 'postback') throw new Error('Abertura ausente')
    await f.engine.finish(opening, { status: 'accepted', externalId: randomUUID() }, new Date())
    const click = {
      kind: 'postback' as const,
      text: null,
      commentId: null,
      postback: opening.message.buttons[0].payload,
    }
    await f.engine.ingest([f.event({ ...click, recipient: 'another-person' })])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    await f.engine.ingest([f.event(click)])
    await f.engine.process(new Date())
    await f.engine.ingest([f.event({ kind: 'message', text: 'PARAR', commentId: null })])
    expect(await f.engine.claim(new Date())).toBeNull()
    await f.engine.process(new Date())
    const sends = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.accountId, f.accountId))
    expect(sends.find((s) => s.kind === 'offer')?.state).toBe('cancelled')
    expect((await f.engine.claim(new Date()))?.message.text).toBe(f.plan.responses.stop)
  })
  test('reconexão e operador desativado invalidam pendências antes do envio', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event({ kind: 'message', text: 'Dúvida', commentId: null })])
    await f.engine.process(new Date())
    const [c] = (await f.repo.listConversations(f.owner.userId, f.accountId)).items
    if (!c) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'reply',
      text: 'Resposta humana',
    })
    const noStaff = new DrizzleEngagementEngine(
      connection.db,
      reviewBox,
      reviewKey,
      'v25.0',
      true,
      {
        async lookup() {
          return []
        },
      },
    )
    expect(await noStaff.claim(new Date())).toBeNull()
    const [send] = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.accountId, f.accountId))
    expect(send?.state).toBe('cancelled')
    await f.engine.ingest([f.event({ recipient: 'new-person' })])
    await f.engine.process(new Date())
    await connection.db
      .update(socialAccounts)
      .set({ metadata: { pageId: '123', engagementConnectionId: randomUUID() } })
      .where(eq(socialAccounts.id, f.accountId))
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('post de outra conta, story e falta de conferência não podem ser ativados', async () => {
    const f = await engagementFixture(connection)
    const service = new EngagementService(
      f.repo,
      new DrizzleEngagementConversations(connection.db, 'v25.0', true),
      fixtureDirectory,
    )
    await service.approve(f.owner, f.projectId, {
      operationId: randomUUID(),
      revisionId: f.revisionId,
      checkedOffer: true,
      checkedExits: true,
    })
    const command = {
      operationId: randomUUID(),
      publicationId: f.publicationId,
      accountId: f.accountId,
      revisionId: f.revisionId,
      checkedPublication: true,
    }
    expect(() =>
      service.activate(f.owner, f.projectId, { ...command, checkedPublication: false }),
    ).toThrow()
    await connection.db
      .update(publications)
      .set({ format: 'ig_story' })
      .where(eq(publications.id, f.publicationId))
    await rejects(() => service.activate(f.owner, f.projectId, command), /mesma peça/)
    const other = await engagementFixture(connection)
    await connection.db
      .update(publications)
      .set({ format: 'ig_feed', socialAccountId: other.accountId })
      .where(eq(publications.id, f.publicationId))
    await rejects(() => service.activate(f.owner, f.projectId, command), /mesma peça/)
  })
  test('parada global descarta pendências; restauração exige nova prova e nunca repete filas', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const disabled = new DrizzleEngagementEngine(
      connection.db,
      reviewBox,
      reviewKey,
      'v25.0',
      false,
      fixtureDirectory,
    )
    await disabled.maintain(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    expect((await f.repo.listActivations(f.owner.userId, f.projectId, f.pieceId))[0]?.state).toBe(
      'blocked',
    )
    const g = await liveFixture()
    await g.engine.ingest([g.event()])
    await g.engine.process(new Date())
    expect(await g.engine.claim(new Date())).not.toBeNull()
    await g.engine.ingest([g.event({ kind: 'message', text: 'nova entrada', commentId: null })])
    await quarantineRestoredWork(connection)
    const [channel] = await connection.db
      .select()
      .from(engagementChannels)
      .where(eq(engagementChannels.accountId, g.accountId))
    expect(channel?.enabled).toBe(false)
    expect(channel?.proof).toBeNull()
    expect((await g.repo.listActivations(g.owner.userId, g.projectId, g.pieceId))[0]?.state).toBe(
      'paused',
    )
    const [send] = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.accountId, g.accountId))
    expect(send?.state).toBe('uncertain')
    expect((await g.repo.health(g.owner.userId, g.accountId)).pendingInbound).toBe(0)
    expect(await g.engine.claim(new Date())).toBeNull()
  }, 30000)
  test('expurgo remove conteúdo sem remover supressão ou contadores; classificação não vaza texto', async () => {
    const f = await liveFixture()
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Texto privado de revisão', commentId: null }),
    ])
    await f.engine.process(new Date())
    const [c] = (await f.repo.listConversations(f.owner.userId, f.accountId)).items
    if (!c) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'suppress',
      reason: 'stop',
    })
    await connection.db
      .update(engagementChannels)
      .set({ retentionDays: 1 })
      .where(eq(engagementChannels.accountId, f.accountId))
    await f.engine.maintain(new Date(Date.now() + 2 * 86400000))
    const detail = await f.repo.detail(f.owner.userId, f.accountId, c.id)
    expect(detail.messages).toHaveLength(0)
    expect(detail.conversation.suppression).toBe('stop')
    const [stored] = await connection.db
      .select()
      .from(engagementConversations)
      .where(eq(engagementConversations.id, c.id))
    expect(stored?.recipientEnc).toBeNull()
    expect(stored?.recipientKey).toHaveLength(64)
    await rejects(() => f.repo.health(randomUUID(), f.accountId), /não disponível/)
  }, 30000)
  test('quota conta o instante do envio mesmo quando a intenção ficou antiga na fila', async () => {
    const f = await liveFixture()
    await connection.db
      .update(engagementChannels)
      .set({ maxSendsPerHour: 1 })
      .where(eq(engagementChannels.accountId, f.accountId))
    await f.engine.ingest([f.event(), f.event({ recipient: 'second-person' })])
    await f.engine.process(new Date())
    await connection.db
      .update(engagementOutbound)
      .set({ createdAt: new Date(Date.now() - 2 * 3600000) })
      .where(eq(engagementOutbound.accountId, f.accountId))
    const first = await f.engine.claim(new Date())
    expect(first).not.toBeNull()
    expect(await f.engine.claim(new Date())).toBeNull()
    if (!first) throw new Error('Reserva ausente')
    await f.engine.finish(first, { status: 'uncertain', reason: 'Timeout simulado' }, new Date())
    expect(await f.engine.claim(new Date(Date.now() + 61000))).toBeNull()
  })
  test.each([
    'postback',
    'echo',
  ] as const)('interrupção %s pendente impede oferta antes do processamento', async (kind) => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (opening?.message.buttons[0]?.type !== 'postback') throw new Error('Abertura ausente')
    const payload = opening.message.buttons[0].payload
    await f.engine.finish(opening, { status: 'accepted', externalId: randomUUID() }, new Date())
    await f.engine.ingest([
      f.event({ kind: 'postback', text: null, commentId: null, postback: payload }),
    ])
    await f.engine.process(new Date())
    await f.engine.ingest([
      f.event({
        kind,
        text: kind === 'echo' ? 'Atendimento externo' : null,
        commentId: null,
        postback: kind === 'postback' ? payload.replace(':offer', ':stop') : null,
      }),
    ])
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('duas respostas humanas preservam a ordem e não cancelam a primeira pendência', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event({ kind: 'message', text: 'Preciso de ajuda', commentId: null })])
    await f.engine.process(new Date())
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    for (const text of ['Primeira resposta', 'Complemento da resposta']) {
      const detail = await f.repo.detail(f.owner.userId, f.accountId, c.id)
      await f.conversations.action(f.owner.userId, f.accountId, c.id, {
        operationId: randomUUID(),
        expectedVersion: detail.conversation.version,
        action: 'reply',
        text,
      })
    }
    const pending = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.conversationId, c.id))
    expect(pending.filter((row) => row.state === 'pending')).toHaveLength(2)
    const first = await f.engine.claim(new Date())
    expect(first?.message.text).toBe('Primeira resposta')
    if (!first) throw new Error('Primeira resposta ausente')
    await f.engine.finish(
      first,
      { status: 'retryable', reason: 'Rejeição explícita 429' },
      new Date(),
    )
    expect(await f.engine.claim(new Date())).toBeNull()
    expect((await f.engine.claim(new Date(Date.now() + 30000)))?.message.text).toBe(
      'Primeira resposta',
    )
  })
  test('encerrar não permite que palavra atrasada reabra o percurso comercial', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (!opening) throw new Error('Abertura ausente')
    await f.engine.finish(opening, { status: 'accepted', externalId: randomUUID() }, new Date())
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'close',
    })
    await f.engine.ingest([
      f.event({
        kind: 'message',
        text: 'FERIAS',
        commentId: null,
        at: new Date(Date.now() - 5000).toISOString(),
      }),
    ])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    expect((await f.repo.detail(f.owner.userId, f.accountId, c.id)).conversation.state).toBe(
      'closed',
    )
    await f.engine.ingest([f.event({ kind: 'message', text: 'FERIAS', commentId: null })])
    await f.engine.process(new Date())
    expect((await f.engine.claim(new Date()))?.message.text).toBe(f.plan.opening)
  })
  test.each([
    'erase',
    'child',
  ] as const)('ingestão minimiza novas entradas de contato %s antes do worker, inclusive comentário sem campanha', async (action) => {
    const f = await liveFixture()
    await f.engine.ingest([f.event({ kind: 'message', text: 'Contato inicial', commentId: null })])
    await f.engine.process(new Date())
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Entrada pendente durante exclusão', commentId: null }),
    ])
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      ...(action === 'erase'
        ? { action: 'erase' as const }
        : { action: 'suppress' as const, reason: 'child' as const }),
    })
    await f.engine.ingest([
      f.event({ text: 'Texto que não deve ser retido', mediaId: 'outro-post' }),
      f.event({ kind: 'message', text: 'Mensagem privada posterior', commentId: null }),
    ])
    const rows = await connection.db
      .select()
      .from(engagementInbound)
      .where(eq(engagementInbound.accountId, f.accountId))
    expect(rows.every((row) => row.event === null && row.conversationId === c.id)).toBe(true)
    expect(rows.every((row) => row.state !== 'pending')).toBe(true)
    expect((await f.repo.health(f.owner.userId, f.accountId)).pendingInbound).toBe(0)
  })
  test('saída comercial salva revalida validade no despacho', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (!opening) throw new Error('Abertura ausente')
    await f.engine.finish(opening, { status: 'accepted', externalId: randomUUID() }, new Date())
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Quero saber sobre outros cursos', commentId: null }),
    ])
    await f.engine.process(new Date())
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'saved-reply',
      key: 'community',
    })
    await connection.db
      .update(engagementActivations)
      .set({ plan: { ...f.plan, validUntil: new Date(Date.now() - 1000).toISOString() } })
      .where(eq(engagementActivations.accountId, f.accountId))
    expect(await f.engine.claim(new Date())).toBeNull()
  })
  test('saída comercial salva exige uma oferta conferida mesmo em DM sem campanha', async () => {
    const f = await liveFixture()
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Quais são os outros cursos?', commentId: null }),
    ])
    await f.engine.process(new Date())
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    await rejects(
      () =>
        f.conversations.action(f.owner.userId, f.accountId, c.id, {
          operationId: randomUUID(),
          expectedVersion: c.version,
          action: 'saved-reply',
          key: 'community',
        }),
      { code: 'ENGAGEMENT_UNAVAILABLE' },
    )
  })
  test('reconciliação libera R01 uma vez, exige novo botão e não repete a abertura', async () => {
    const f = await liveFixture()
    await f.engine.ingest([f.event()])
    await f.engine.process(new Date())
    const opening = await f.engine.claim(new Date())
    if (opening?.message.buttons[0]?.type !== 'postback') throw new Error('Abertura ausente')
    await f.engine.maintain(new Date(Date.now() + 61000))
    const c = (await f.repo.listConversations(f.owner.userId, f.accountId)).items[0]
    if (!c) throw new Error('Conversa ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: c.version,
      action: 'resolve',
      intentId: opening.id,
      result: 'accepted',
      externalId: 'conferido-na-meta',
      evidence: 'Teste local: aceitação conferida no servidor controlado',
    })
    await f.engine.ingest([
      f.event({ kind: 'message', text: 'Pode continuar, quero ver o projeto.', commentId: null }),
    ])
    await f.engine.process(new Date())
    const detail = await f.repo.detail(f.owner.userId, f.accountId, c.id),
      request = detail.messages.find((m) => m.kind === 'message')
    if (!request) throw new Error('Solicitação ausente')
    await f.conversations.action(f.owner.userId, f.accountId, c.id, {
      operationId: randomUUID(),
      expectedVersion: detail.conversation.version,
      action: 'resume',
      requestEventId: request.id,
    })
    const typed = await f.engine.claim(new Date())
    expect(typed?.message.text).toBe(f.plan.responses.typed)
    if (!typed) throw new Error('R01 ausente')
    await f.engine.finish(typed, { status: 'accepted', externalId: randomUUID() }, new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    await f.engine.ingest([
      f.event({
        kind: 'postback',
        text: null,
        commentId: null,
        postback: opening.message.buttons[0].payload,
        at: new Date(Date.now() - 5000).toISOString(),
      }),
    ])
    await f.engine.process(new Date())
    expect(await f.engine.claim(new Date())).toBeNull()
    await f.engine.ingest([
      f.event({
        kind: 'postback',
        text: null,
        commentId: null,
        postback: opening.message.buttons[0].payload,
      }),
    ])
    await f.engine.process(new Date())
    expect((await f.engine.claim(new Date()))?.message.text).toBe(f.plan.offer)
    const sends = await connection.db
      .select()
      .from(engagementOutbound)
      .where(eq(engagementOutbound.accountId, f.accountId))
    expect(sends.filter((s) => s.kind === 'opening')).toHaveLength(1)
    expect(sends.filter((s) => s.kind === 'typed')).toHaveLength(1)
  }, 30000)
  test('ajuste de copy cria revisão e Desfazer preserva palavra, oferta, publicação e ativação', async () => {
    const f = await liveFixture(),
      execution = new ExecutionService(new DrizzleExecutionRepository(connection.db))
    const desktop = { ...f.owner, desktopDeviceId: randomUUID() }
    const request = contextRequestSchema.parse({
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: f.pieceId,
      revisionId: f.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Ajuste somente a abertura',
      selection: [],
      protectedIds: [],
      limits: {},
    })
    const context = await execution.context(f.owner, request)
    const run = await execution.create(f.owner, {
      ...request,
      id: randomUUID(),
      operationId: randomUUID(),
      contextHash: context.hash,
    })
    const claimed = await execution.claim(desktop, f.projectId, run.request.id, {
      operationId: randomUUID(),
      expectedEpoch: 0,
    })
    if (!claimed.attempt) throw new Error('Tentativa ausente')
    const opening = 'Resposta automática da Helena e do Júlio. Quer conhecer A Chave do Farol?'
    const finished = await execution.finish(desktop, f.projectId, run.request.id, {
      operationId: randomUUID(),
      attemptId: claimed.attempt.id,
      epoch: claimed.epoch,
      outcome: {
        status: 'succeeded',
        text: 'Abertura ajustada',
        assetIds: [],
        mode: 'teste controlado',
        durationMs: 1,
        inputTokens: null,
        outputTokens: null,
        editorial: {
          schemaVersion: 1,
          kind: 'copy',
          summary: 'Abertura ajustada',
          variants: [
            {
              label: 'Ajuste',
              changes: [{ entityId: f.pieceId, field: 'conversationOpening', value: opening }],
            },
          ],
        },
      },
    })
    expect(finished.application?.result?.status).toBe('applied')
    const item = (await f.workspace.snapshot(f.owner, f.projectId)).items.find(
      (i) => i.id === f.pieceId,
    )
    expect(item?.document.kind === 'piece' && item.document.conversation).toEqual({
      ...f.plan,
      opening,
    })
    expect(
      (await f.repo.listActivations(f.owner.userId, f.projectId, f.pieceId))[0]?.revisionId,
    ).toBe(f.revisionId)
    expect(
      (await execution.undo(f.owner, f.projectId, run.request.id)).application?.undo?.status,
    ).toBe('applied')
    const restored = (await f.workspace.snapshot(f.owner, f.projectId)).items.find(
      (i) => i.id === f.pieceId,
    )
    expect(restored?.document.kind === 'piece' && restored.document.conversation).toEqual(f.plan)
  })
})
