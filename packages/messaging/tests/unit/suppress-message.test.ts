import { expect, test } from 'bun:test'
import { SendMessageService } from '../../src/application/send-message/send-message.service'
import { SuppressMessageService } from '../../src/application/suppress-message/suppress-message.service'
import { Message } from '../../src/domain/message/message.aggregate'
import {
  InMemoryMessageRepository,
  InMemorySenderRepository,
  InMemorySuppressionRepository,
  InMemoryTemplateRepository,
} from '../fakes/in-memory'

const now = new Date('2026-10-24T12:00:00Z')
const intent = {
  consumerId: 'payments',
  idempotencyKey: 'recovery-qa',
  channel: 'email' as const,
  templateKey: 'recovery-qa',
  recipient: { name: 'QA', email: 'qa@example.test' },
}

test('retirada antes do enqueue cria somente evidência SUPPRESSED e bloqueia POST tardio mesmo sem template', async () => {
  const messages = new InMemoryMessageRepository()
  const service = new SuppressMessageService(messages, { now: () => now })
  const result = await service.executeIntent(intent)
  expect(result.suppressed).toBe(true)
  expect(messages.events.map((event) => event.eventName)).toEqual(['message.suppressed'])
  const send = new SendMessageService(
    new InMemoryTemplateRepository(),
    messages,
    new InMemorySenderRepository(),
    new InMemorySuppressionRepository(),
    { now: () => now },
    () => crypto.randomUUID(),
    5,
  )
  const late = await send.execute(intent)
  expect(late.id).toBe(result.message.id)
  expect(late.status).toBe('SUPPRESSED')
  expect(await messages.claimDueEmail(10, now, 60_000)).toHaveLength(0)
})

test('retirada por intenção confere conteúdo, é idempotente e respeita envio iniciado', async () => {
  const { messages, item, service } = await setup()
  await expect(
    service.executeIntent({ ...intent, variables: { extra: 'QA different' } }),
  ).rejects.toThrow('diferente')
  expect((await messages.findById(item.id))?.status).toBe('QUEUED')
  const [sending] = await messages.claimDueEmail(1, now, 60_000)
  expect(sending?.id).toBe(item.id)
  expect((await service.executeIntent(intent)).suppressed).toBe(false)
})
async function setup() {
  const messages = new InMemoryMessageRepository()
  const item = Message.create({
    id: crypto.randomUUID(),
    channel: 'email',
    templateKey: 'recovery-qa',
    recipient: { name: 'QA', email: 'qa@example.test' },
    renderedSubject: 'Aviso QA',
    renderedBody: 'Aviso QA',
    consumerId: 'payments',
    idempotencyKey: 'recovery-qa',
    now,
  })
  await messages.create(item)
  return { messages, item, service: new SuppressMessageService(messages, { now: () => now }) }
}
test('retirada idempotente evita claim futuro e preserva um evento de supressão', async () => {
  const { messages, item, service } = await setup()
  expect((await service.execute(item.id, 'payments')).suppressed).toBe(true)
  expect((await service.execute(item.id, 'payments')).message.status).toBe('SUPPRESSED')
  expect(await messages.claimDueEmail(10, now, 60_000)).toHaveLength(0)
  expect(messages.events.filter((event) => event.eventName === 'message.suppressed')).toHaveLength(
    1,
  )
})
test('outro consumidor não retira nem consulta a mensagem alheia', async () => {
  const { messages, item, service } = await setup()
  await expect(service.execute(item.id, 'another')).rejects.toThrow('Mensagem não encontrada')
  expect((await messages.findById(item.id))?.status).toBe('QUEUED')
})
test('envio iniciado ou aceito não é declarado desfeito', async () => {
  const { messages, item, service } = await setup()
  const [sending] = await messages.claimDueEmail(1, now, 60_000)
  expect((await service.execute(item.id, 'payments')).suppressed).toBe(false)
  sending!.markSent({ providerMessageId: 'qa-provider', sentAt: now })
  await messages.update(sending!)
  const result = await service.execute(item.id, 'payments')
  expect(result.suppressed).toBe(false)
  expect(result.message.status).toBe('SENT')
})
test('corrida com claim produz conflito de versão, sem falso sucesso', async () => {
  const { messages, item, service } = await setup()
  const read = messages.findById.bind(messages)
  let first = true
  messages.findById = async (id) => {
    const current = await read(id)
    if (first) {
      first = false
      await messages.claimDueEmail(1, now, 60_000)
    }
    return current
  }
  await expect(service.execute(item.id, 'payments')).rejects.toThrow()
  expect((await messages.findById(item.id))?.status).toBe('SENDING')
  expect(messages.events.some((event) => event.eventName === 'message.suppressed')).toBe(false)
})
