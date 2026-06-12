import { beforeEach, describe, expect, it } from 'bun:test'
import { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import { Message } from '../../src/domain/message/message.aggregate'
import type { AttachmentFetcher } from '../../src/domain/ports/attachment-fetcher.port'
import type { Rng } from '../../src/domain/ports/rng.port'
import { EmailSender } from '../../src/domain/sender/email-sender.aggregate'
import { HttpAttachmentFetcher } from '../../src/infrastructure/gateways/http-attachment-fetcher'
import { SendWorker, type SendWorkerConfig } from '../../src/infrastructure/workers/send-worker'
import {
  FakeAttachmentFetcher,
  FakeEmailGateway,
  FakeWhatsAppGateway,
} from '../fakes/fake-gateways'
import {
  InMemoryMessageRepository,
  InMemorySenderRepository,
  InMemorySuppressionRepository,
  InMemoryWhatsAppInstanceRepository,
  silentLogger,
} from '../fakes/in-memory'

const NOW = new Date('2026-06-03T12:00:00Z')
const clock = { now: () => NOW }
const FIXED = 20_000
const rng: Rng = { float: () => 0, intBetween: () => FIXED }

function config(over: Partial<SendWorkerConfig> = {}): SendWorkerConfig {
  return {
    intervalMs: 1000,
    emailRatePerSec: 2,
    emailBatchSize: 2,
    whatsappBatchSize: 10,
    laneLeaseMs: 60_000,
    claimLeaseMs: 600_000,
    pacing: {
      minDelayMs: 15_000,
      maxDelayMs: 45_000,
      restAfterN: 50,
      restDurationMs: 600_000,
      warmupDays: 10,
      warmupStartCap: 20,
    },
    retry: { baseMs: 30_000, maxMs: 3_600_000 },
    typingMinMs: 800,
    typingMaxMs: 2500,
    ...over,
  }
}

interface Harness {
  worker: SendWorker
  messages: InMemoryMessageRepository
  instances: InMemoryWhatsAppInstanceRepository
  senders: InMemorySenderRepository
  suppressions: InMemorySuppressionRepository
  email: FakeEmailGateway
  attachments: FakeAttachmentFetcher
  whatsapp: FakeWhatsAppGateway
}

function harness(cfg: SendWorkerConfig = config(), fetcher?: AttachmentFetcher): Harness {
  const messages = new InMemoryMessageRepository()
  const instances = new InMemoryWhatsAppInstanceRepository()
  const senders = new InMemorySenderRepository()
  const suppressions = new InMemorySuppressionRepository()
  const email = new FakeEmailGateway()
  const attachments = new FakeAttachmentFetcher()
  const whatsapp = new FakeWhatsAppGateway()
  const worker = new SendWorker({
    messages,
    instances,
    senders,
    suppressions,
    emailGateway: email,
    attachmentFetcher: fetcher ?? attachments,
    whatsappGateway: whatsapp,
    clock,
    rng,
    logger: silentLogger,
    config: cfg,
  })
  return { worker, messages, instances, senders, suppressions, email, attachments, whatsapp }
}

let id = 0
function emailMessage(): Message {
  return Message.create({
    id: `m-${++id}`,
    channel: 'email',
    templateKey: 'welcome',
    recipient: { name: 'Helena', email: 'helena@example.com' },
    renderedSubject: 'Oi',
    renderedBody: '<p>Oi</p>',
    senderId: 'sender-1',
    now: NOW,
  })
}
function whatsappMessage(): Message {
  return Message.create({
    id: `m-${++id}`,
    channel: 'whatsapp',
    templateKey: 'welcome',
    recipient: { name: 'Zé', phone: '5511999999999' },
    renderedBody: 'Oi',
    now: NOW,
  })
}
function connectedLane(name: string, over: Partial<{ dailyCap: number }> = {}): WhatsAppInstance {
  const lane = WhatsAppInstance.create({
    id: `lane-${name}`,
    instanceName: name,
    phoneNumber: `55${name}`,
    dailyCap: over.dailyCap ?? 200,
    now: NOW,
  })
  lane.setStatus('CONNECTED', NOW)
  return lane
}

describe('SendWorker — e-mail (throttle por lote)', () => {
  let h: Harness
  beforeEach(async () => {
    h = harness(config({ emailBatchSize: 2 }))
    await h.senders.create(
      EmailSender.create({
        id: 'sender-1',
        fromEmail: 'no-reply@sistemazero.com',
        fromName: 'SZ',
        now: NOW,
      }),
    )
    for (let i = 0; i < 3; i++) await h.messages.create(emailMessage())
  })

  it('envia no máximo o tamanho do lote por tick (throttle)', async () => {
    await h.worker.tick()
    expect(h.email.sent).toHaveLength(2)
    const sent = [...h.messages.store.values()].filter((m) => m.status === 'SENT')
    const queued = [...h.messages.store.values()].filter((m) => m.status === 'QUEUED')
    expect(sent).toHaveLength(2)
    expect(queued).toHaveLength(1)
    expect(sent[0]?.state.providerMessageId).toMatch(/^sg-/)
  })

  it('falha transitória re-enfileira com backoff (não vira FAILED)', async () => {
    h.email.fail = 'transient'
    await h.worker.tick()
    const m = [...h.messages.store.values()][0]
    expect(m?.status).toBe('QUEUED')
    expect(m?.state.attempts).toBe(1)
    expect(m?.state.nextAttemptAt.getTime()).toBe(NOW.getTime() + FIXED)
  })

  it('falha permanente vira FAILED', async () => {
    h.email.fail = 'permanent'
    await h.worker.tick()
    const failed = [...h.messages.store.values()].filter((m) => m.status === 'FAILED')
    expect(failed.length).toBeGreaterThan(0)
  })

  it('sem remetente disponível → FAILED', async () => {
    h.senders.store.clear()
    await h.worker.tick()
    const m = [...h.messages.store.values()][0]
    expect(m?.status).toBe('FAILED')
    expect(m?.state.failureCode).toBe('NO_SENDER')
  })

  it('token bucket: ticks back-to-back (NOTIFY) não furam a taxa', async () => {
    // 1º tick consome o bucket inteiro (2); 2º tick no MESMO instante → 0 tokens.
    await h.worker.tick()
    expect(h.email.sent).toHaveLength(2)
    await h.worker.tick()
    expect(h.email.sent).toHaveLength(2)
    const queued = [...h.messages.store.values()].filter((m) => m.status === 'QUEUED')
    expect(queued).toHaveLength(1)
  })

  it('falha no update de UMA mensagem não derruba o resto do lote', async () => {
    const ids = [...h.messages.store.keys()]
    h.messages.failNextUpdateFor.add(ids[0] as string)
    await h.worker.tick()
    // A 1ª falhou o update (fica SENDING p/ o reaper); a 2ª foi enviada normalmente.
    expect(h.messages.store.get(ids[0] as string)?.status).toBe('SENDING')
    expect(h.messages.store.get(ids[1] as string)?.status).toBe('SENT')
  })
})

describe('SendWorker — reaper de SENDING preso (lease de claim)', () => {
  it('re-reivindica mensagem presa em SENDING com lease vencido e envia', async () => {
    const h = harness()
    await h.senders.create(
      EmailSender.create({
        id: 'sender-1',
        fromEmail: 'no-reply@sistemazero.com',
        fromName: 'SZ',
        now: NOW,
      }),
    )
    // Simula crash pós-claim: SENDING com nextAttemptAt (lease) já vencido.
    const stuck = emailMessage()
    stuck.startSending()
    await h.messages.create(stuck)

    await h.worker.tick()
    const m = h.messages.store.get(stuck.id)
    expect(m?.status).toBe('SENT')
    expect(m?.state.attempts).toBe(1) // re-claim de SENDING incrementa attempts
  })

  it('claim zumbi além do teto de tentativas → FAILED sem chamar o provedor', async () => {
    const h = harness()
    await h.senders.create(
      EmailSender.create({
        id: 'sender-1',
        fromEmail: 'no-reply@sistemazero.com',
        fromName: 'SZ',
        now: NOW,
      }),
    )
    const stuck = Message.create({
      id: 'm-zumbi',
      channel: 'email',
      templateKey: 'welcome',
      recipient: { name: 'Helena', email: 'helena@example.com' },
      renderedSubject: 'Oi',
      renderedBody: '<p>Oi</p>',
      senderId: 'sender-1',
      maxAttempts: 1,
      now: NOW,
    })
    stuck.startSending()
    await h.messages.create(stuck)

    await h.worker.tick()
    const m = h.messages.store.get('m-zumbi')
    expect(m?.status).toBe('FAILED')
    expect(h.email.sent).toHaveLength(0)
  })
})

describe('SendWorker — anexos por URL (e-mail)', () => {
  const ATTACHMENT_URL = 'http://fiscal.railway.internal:3008/internal/nfse/abc/danfse.pdf'

  function emailWithAttachment(over: Partial<{ contentType: string | null }> = {}): Message {
    return Message.create({
      id: `m-${++id}`,
      channel: 'email',
      templateKey: 'nfse-emitida',
      recipient: { name: 'Helena', email: 'helena@example.com' },
      renderedSubject: 'Sua nota fiscal',
      renderedBody: '<p>NF anexa</p>',
      senderId: 'sender-1',
      attachments: [
        {
          filename: 'danfse.pdf',
          url: ATTACHMENT_URL,
          contentType: over.contentType === undefined ? 'application/pdf' : over.contentType,
        },
      ],
      now: NOW,
    })
  }

  async function seedSender(h: Harness): Promise<void> {
    await h.senders.create(
      EmailSender.create({
        id: 'sender-1',
        fromEmail: 'no-reply@sistemazero.com',
        fromName: 'SZ',
        now: NOW,
      }),
    )
  }

  it('busca a URL e injeta o base64 + contentType no gateway (disposition attachment)', async () => {
    const h = harness()
    await seedSender(h)
    h.attachments.contents.set(ATTACHMENT_URL, {
      contentBase64: 'JVBERi0xLjQ=',
      contentType: 'application/octet-stream',
    })
    await h.messages.create(emailWithAttachment())

    await h.worker.tick()
    expect(h.attachments.fetched).toEqual([ATTACHMENT_URL])
    expect(h.email.sent[0]?.attachments).toEqual([
      // contentType do METADADO vence o da origem.
      { filename: 'danfse.pdf', contentType: 'application/pdf', contentBase64: 'JVBERi0xLjQ=' },
    ])
    expect([...h.messages.store.values()][0]?.status).toBe('SENT')
  })

  it('sem contentType no metadado usa o da origem', async () => {
    const h = harness()
    await seedSender(h)
    h.attachments.contents.set(ATTACHMENT_URL, {
      contentBase64: 'UERG',
      contentType: 'application/pdf',
    })
    await h.messages.create(emailWithAttachment({ contentType: null }))

    await h.worker.tick()
    expect(h.email.sent[0]?.attachments?.[0]?.contentType).toBe('application/pdf')
  })

  it('mensagem sem anexos não passa pelo fetcher (gateway sem attachments)', async () => {
    const h = harness()
    await seedSender(h)
    await h.messages.create(emailMessage())

    await h.worker.tick()
    expect(h.attachments.fetched).toHaveLength(0)
    expect(h.email.sent[0]?.attachments).toBeUndefined()
  })

  it('falha no fetch → RE-TENTÁVEL com backoff (não FAILED, SendGrid nem é chamado)', async () => {
    const h = harness()
    await seedSender(h)
    h.attachments.fail = 'transient'
    await h.messages.create(emailWithAttachment())

    await h.worker.tick()
    expect(h.email.sent).toHaveLength(0)
    const m = [...h.messages.store.values()][0]
    expect(m?.status).toBe('QUEUED')
    expect(m?.state.attempts).toBe(1)
    expect(m?.state.nextAttemptAt.getTime()).toBe(NOW.getTime() + FIXED)
  })

  it('falha permanente do fetch (host bloqueado) → FAILED', async () => {
    const h = harness()
    await seedSender(h)
    h.attachments.fail = 'permanent'
    await h.messages.create(emailWithAttachment())

    await h.worker.tick()
    expect(h.email.sent).toHaveLength(0)
    expect([...h.messages.store.values()][0]?.status).toBe('FAILED')
  })

  it('fim a fim: HttpAttachmentFetcher real busca num Bun.serve efêmero', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.4 danfse-de-teste')
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response(bytes, { headers: { 'content-type': 'application/pdf' } }),
    })
    try {
      const fetcher = new HttpAttachmentFetcher({ maxBytes: 1024, allowedHosts: [] })
      const h = harness(config(), fetcher)
      await seedSender(h)
      await h.messages.create(
        Message.create({
          id: `m-${++id}`,
          channel: 'email',
          templateKey: 'nfse-emitida',
          recipient: { name: 'Helena', email: 'helena@example.com' },
          renderedSubject: 'Sua nota fiscal',
          renderedBody: '<p>NF anexa</p>',
          senderId: 'sender-1',
          attachments: [
            { filename: 'danfse.pdf', url: `http://127.0.0.1:${server.port}/danfse.pdf` },
          ],
          now: NOW,
        }),
      )

      await h.worker.tick()
      expect(h.email.sent[0]?.attachments).toEqual([
        {
          filename: 'danfse.pdf',
          contentType: 'application/pdf',
          contentBase64: Buffer.from(bytes).toString('base64'),
        },
      ])
      expect([...h.messages.store.values()][0]?.status).toBe('SENT')
    } finally {
      server.stop(true)
    }
  })
})

describe('SendWorker — WhatsApp (rotação + ritmo anti-ban)', () => {
  it('serializa por número: 1 lane só envia 1 por tick (sem rajada)', async () => {
    const h = harness()
    await h.instances.create(connectedLane('a'))
    await h.messages.create(whatsappMessage())
    await h.messages.create(whatsappMessage())
    await h.worker.tick()
    expect(h.whatsapp.sent).toHaveLength(1)
    const queued = [...h.messages.store.values()].filter((m) => m.status === 'QUEUED')
    expect(queued).toHaveLength(1)
  })

  it('rotaciona entre números: 2 lanes enviam em números distintos', async () => {
    const h = harness()
    await h.instances.create(connectedLane('a'))
    await h.instances.create(connectedLane('b'))
    await h.messages.create(whatsappMessage())
    await h.messages.create(whatsappMessage())
    await h.messages.create(whatsappMessage())
    await h.worker.tick()
    expect(h.whatsapp.sent).toHaveLength(2)
    const usedInstances = new Set(h.whatsapp.sent.map((s) => s.instanceName))
    expect(usedInstances.size).toBe(2)
    // a 3ª mensagem fica para o próximo tick (lanes ocupadas pelo delay)
    expect([...h.messages.store.values()].filter((m) => m.status === 'QUEUED')).toHaveLength(1)
  })

  it('respeita o teto diário (lane esgotada não envia)', async () => {
    const h = harness()
    const lane = connectedLane('a', { dailyCap: 1 })
    lane.applyPacing(
      { sentToday: 1, messagesSinceRest: 1, dayCursor: '2026-06-03', nextAvailableAt: NOW },
      NOW,
    )
    await h.instances.create(lane)
    await h.messages.create(whatsappMessage())
    await h.worker.tick()
    expect(h.whatsapp.sent).toHaveLength(0)
  })

  it('passa o delay de "digitando" e avança o ritmo da lane após enviar', async () => {
    const h = harness()
    await h.instances.create(connectedLane('a'))
    await h.messages.create(whatsappMessage())
    await h.worker.tick()
    expect(h.whatsapp.sent[0]?.typingDelayMs).toBe(FIXED)
    const lane = await h.instances.findById('lane-a')
    expect(lane?.state.sentToday).toBe(1)
    expect(lane?.state.nextAvailableAt.getTime()).toBe(NOW.getTime() + FIXED)
  })

  it('não envia para número suprimido', async () => {
    const h = harness()
    await h.instances.create(connectedLane('a'))
    await h.suppressions.add('whatsapp', '5511999999999', 'blocked')
    await h.messages.create(whatsappMessage())
    await h.worker.tick()
    expect(h.whatsapp.sent).toHaveLength(0)
    const m = [...h.messages.store.values()][0]
    expect(m?.status).toBe('SUPPRESSED')
  })
})
