import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Content } from '../../src/domain/content/content'
import type { Publication } from '../../src/domain/publication/publication-record'
import { PublisherWorker } from '../../src/infrastructure/workers/publisher-worker'
import {
  FakeReminderNotifier,
  InMemoryContentRepository,
  InMemoryPublicationRepository,
} from '../fakes/in-memory'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

const CONFIG = {
  intervalMs: 1000,
  batchSize: 10,
  claimLeaseMs: 10 * 60_000,
  maxAttempts: 3,
  retryBaseMs: 60_000,
  retryMaxMs: 30 * 60_000,
}

function makeContent(): Content {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    title: 'Reels da semana',
    contentType: 'reels',
    stage: 'scheduled',
    brief: null,
    script: null,
    ownerUserId: null,
    ownerName: null,
    dueDate: null,
    ideaId: null,
    createdBy: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
}

function makePublication(contentId: string, overrides: Partial<Publication> = {}): Publication {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    contentId,
    socialAccountId: null,
    network: 'instagram',
    format: 'ig_reels',
    caption: '',
    title: null,
    tags: [],
    coverAssetId: null,
    scheduledAt: new Date(now.getTime() - 60_000),
    publishMode: 'manual',
    status: 'scheduled',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    providerSession: {},
    externalPostId: null,
    externalUrl: null,
    publishedAt: null,
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function setup(overrides: { phones?: string[]; clockStart?: Date } = {}) {
  const publications = new InMemoryPublicationRepository()
  const contents = new InMemoryContentRepository()
  publications.contentsRef = contents
  const notifier = new FakeReminderNotifier()
  let currentTime = overrides.clockStart ?? new Date()
  const worker = new PublisherWorker({
    publications,
    contents,
    notifier,
    reminder: {
      phones: overrides.phones ?? ['5511999999999', '5511888888888'],
      recipientName: 'Equipe',
      appUrl: 'http://app.test',
    },
    now: () => currentTime,
    logger: silentLogger,
    config: CONFIG,
  })
  return {
    publications,
    contents,
    notifier,
    worker,
    advance(ms: number) {
      currentTime = new Date(currentTime.getTime() + ms)
    },
  }
}

describe('publisher-worker (ramo manual + lembrete)', () => {
  it('agendada vencida → awaiting_manual + 1 lembrete por fone + reminderSentAt', async () => {
    const s = setup()
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id)
    await s.publications.create(pub)

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('awaiting_manual')
    expect(stored?.reminderSentAt).not.toBeNull()
    expect(stored?.nextAttemptAt).toBeNull()
    expect(s.notifier.sent).toHaveLength(2)
    expect(s.notifier.sent.map((r) => r.phone).sort()).toEqual(['5511888888888', '5511999999999'])
    expect(s.notifier.sent[0]?.variables.titulo).toBe('Reels da semana')
    expect(s.notifier.sent[0]?.variables.link).toContain(
      `/conteudos/${content.id}/publicacoes/${pub.id}`,
    )
  })

  it('crash entre claim e envio: lease vence → re-claim com a MESMA idempotência (pub+fone)', async () => {
    const s = setup({ phones: ['5511999999999'] })
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id)
    await s.publications.create(pub)

    // 1º tick "morre" no envio (falha transitória inesperada não persiste envio).
    s.notifier.failWith = 'transient'
    await s.worker.tick()
    let stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('awaiting_manual')
    expect(stored?.reminderSentAt).toBeNull()
    expect(stored?.attempts).toBe(1)

    // Backoff/lease vencem → re-claim envia com o MESMO par publicação+fone
    // (a chave determinística no messaging deduplica de verdade).
    s.notifier.failWith = null
    s.advance(31 * 60_000)
    await s.worker.tick()
    stored = s.publications.rows.get(pub.id)
    expect(stored?.attempts).toBe(2)
    expect(stored?.reminderSentAt).not.toBeNull()
    expect(s.notifier.sent).toHaveLength(1)
    expect(s.notifier.sent[0]?.publicationId).toBe(pub.id)
  })

  it('teto de tentativas → desiste do lembrete mas MANTÉM awaiting_manual', async () => {
    const s = setup({ phones: ['5511999999999'] })
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id)
    await s.publications.create(pub)

    s.notifier.failWith = 'transient'
    for (let i = 0; i < CONFIG.maxAttempts; i++) {
      await s.worker.tick()
      s.advance(31 * 60_000)
    }
    await s.worker.tick() // nada mais elegível (attempts >= max)

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('awaiting_manual')
    expect(stored?.attempts).toBe(CONFIG.maxAttempts)
    expect(stored?.reminderSentAt).toBeNull()
    expect(stored?.lastError).toBeTruthy()
    expect(s.notifier.sent).toHaveLength(0)
  })

  it('falha PERMANENTE (template quebrado) desiste imediatamente', async () => {
    const s = setup({ phones: ['5511999999999'] })
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id)
    await s.publications.create(pub)

    s.notifier.failWith = 'permanent'
    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('awaiting_manual')
    expect(stored?.nextAttemptAt).toBeNull()
    expect(stored?.attempts).toBe(1)
  })

  it('publicação AUTO vencida fica intocada (ramo é só manual)', async () => {
    const s = setup()
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id, {
      publishMode: 'auto',
      format: 'yt_video',
      network: 'youtube',
    })
    await s.publications.create(pub)

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled')
    expect(s.notifier.sent).toHaveLength(0)
  })

  it('agendada no FUTURO não é claimada', async () => {
    const s = setup()
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id, { scheduledAt: new Date(Date.now() + 3600_000) })
    await s.publications.create(pub)

    await s.worker.tick()

    expect(s.publications.rows.get(pub.id)?.status).toBe('scheduled')
  })

  it('sem fones configurados: move p/ awaiting_manual, zera o lease e não envia', async () => {
    const s = setup({ phones: [] })
    const content = makeContent()
    await s.contents.create(content)
    const pub = makePublication(content.id)
    await s.publications.create(pub)

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('awaiting_manual')
    expect(stored?.nextAttemptAt).toBeNull()
    expect(s.notifier.sent).toHaveLength(0)
    // Próximo tick não re-claima em loop.
    await s.worker.tick()
    expect(s.publications.rows.get(pub.id)?.attempts).toBe(1)
  })
})
