import { beforeEach, describe, expect, it } from 'bun:test'
import { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import { Message } from '../../src/domain/message/message.aggregate'
import type { Rng } from '../../src/domain/ports/rng.port'
import { EmailSender } from '../../src/domain/sender/email-sender.aggregate'
import { SendWorker, type SendWorkerConfig } from '../../src/infrastructure/workers/send-worker'
import { FakeEmailGateway, FakeWhatsAppGateway } from '../fakes/fake-gateways'
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
    emailBatchSize: 2,
    whatsappBatchSize: 10,
    laneLeaseMs: 60_000,
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
  whatsapp: FakeWhatsAppGateway
}

function harness(cfg: SendWorkerConfig = config()): Harness {
  const messages = new InMemoryMessageRepository()
  const instances = new InMemoryWhatsAppInstanceRepository()
  const senders = new InMemorySenderRepository()
  const suppressions = new InMemorySuppressionRepository()
  const email = new FakeEmailGateway()
  const whatsapp = new FakeWhatsAppGateway()
  const worker = new SendWorker({
    messages,
    instances,
    senders,
    suppressions,
    emailGateway: email,
    whatsappGateway: whatsapp,
    clock,
    rng,
    logger: silentLogger,
    config: cfg,
  })
  return { worker, messages, instances, senders, suppressions, email, whatsapp }
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
