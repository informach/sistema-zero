import { describe, expect, it } from 'bun:test'
import { SendMessageService } from '../../src/application/send-message/send-message.service'
import {
  CreateSenderService,
  UpdateSenderService,
} from '../../src/application/senders/sender-admin.service'
import type { Clock } from '../../src/domain/ports/clock.port'
import { Template } from '../../src/domain/template/template.aggregate'
import {
  InMemoryMessageRepository,
  InMemorySenderRepository,
  InMemorySuppressionRepository,
  InMemoryTemplateRepository,
} from '../fakes/in-memory'

const NOW = new Date('2026-06-03T12:00:00Z')
const clock: Clock = { now: () => NOW }

function makeSendService() {
  const templates = new InMemoryTemplateRepository()
  const messages = new InMemoryMessageRepository()
  const senders = new InMemorySenderRepository()
  const suppressions = new InMemorySuppressionRepository()
  let counter = 0
  const service = new SendMessageService(
    templates,
    messages,
    senders,
    suppressions,
    clock,
    () => `id-${++counter}`,
  )
  return { service, templates, messages, senders }
}

describe('SendMessageService — corrida da idempotência (check-then-insert)', () => {
  it('duas requisições CONCORRENTES com a mesma chave → a perdedora devolve a vencedora (sem 500)', async () => {
    const { service, templates } = makeSendService()
    await templates.create(
      Template.create({
        id: 't-1',
        key: 'welcome',
        channel: 'whatsapp',
        name: 'Boas-vindas',
        body: 'Olá {{nome}}',
        variables: ['nome'],
        now: NOW,
      }),
    )
    const input = {
      channel: 'whatsapp' as const,
      templateKey: 'welcome',
      recipient: { name: 'Zé', phone: '5511999999999' },
      variables: { nome: 'Zé' },
      consumerId: 'funnel',
      idempotencyKey: 'welcome-lead-1',
    }
    // Ambas passam o pre-check (nenhuma criou ainda); a 2ª colide na unique e
    // deve recuperar devolvendo a mensagem da 1ª — nunca um erro cru do banco.
    const [a, b] = await Promise.all([service.execute(input), service.execute(input)])
    expect(a.id).toBe(b.id)
  })
})

describe('Sender admin — promoção de default atômica', () => {
  it('criar um novo default desmarca o anterior na mesma gravação (sempre exatamente 1 default)', async () => {
    const senders = new InMemorySenderRepository()
    let counter = 0
    const create = new CreateSenderService(senders, clock, () => `s-${++counter}`)

    await create.execute({ fromEmail: 'a@sz.com', fromName: 'A', isDefault: true })
    await create.execute({ fromEmail: 'b@sz.com', fromName: 'B', isDefault: true })

    const defaults = [...senders.store.values()].filter((s) => s.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.fromEmail).toBe('b@sz.com')
  })

  it('promover default via update desmarca o anterior', async () => {
    const senders = new InMemorySenderRepository()
    let counter = 0
    const create = new CreateSenderService(senders, clock, () => `s-${++counter}`)
    const update = new UpdateSenderService(senders, clock)

    await create.execute({ fromEmail: 'a@sz.com', fromName: 'A', isDefault: true })
    await create.execute({ fromEmail: 'b@sz.com', fromName: 'B' })
    await update.execute('s-2', { isDefault: true })

    const defaults = [...senders.store.values()].filter((s) => s.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe('s-2')
  })
})
