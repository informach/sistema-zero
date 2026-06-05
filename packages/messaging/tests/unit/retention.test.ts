import { describe, expect, it } from 'bun:test'
import { Message } from '../../src/domain/message/message.aggregate'
import { InMemoryMessageRepository } from '../fakes/in-memory'

const OLD = new Date('2026-01-01T12:00:00Z')
const RECENT = new Date('2026-06-01T12:00:00Z')
const CUTOFF = new Date('2026-03-01T00:00:00Z')

function seed(repo: InMemoryMessageRepository, id: string, createdAt: Date, terminal: boolean) {
  const m = Message.create({
    id,
    channel: 'whatsapp',
    templateKey: 'welcome',
    recipient: { name: 'Zé', phone: '5511999999999' },
    renderedBody: 'Oi',
    now: createdAt,
  })
  if (terminal) {
    m.startSending()
    m.markSent({ providerMessageId: `p-${id}`, sentAt: createdAt })
  }
  m.pullEvents()
  repo.store.set(m.id, m)
}

describe('retenção de messages (cleanup)', () => {
  it('remove SÓ terminais mais antigas que o corte; pendentes NUNCA', async () => {
    const repo = new InMemoryMessageRepository()
    seed(repo, 'velha-terminal', OLD, true) // remove
    seed(repo, 'velha-pendente', OLD, false) // fica (QUEUED nunca é tocada)
    seed(repo, 'recente-terminal', RECENT, true) // fica (dentro da janela)

    const removed = await repo.cleanup(CUTOFF)

    expect(removed).toBe(1)
    expect(repo.store.has('velha-terminal')).toBe(false)
    expect(repo.store.has('velha-pendente')).toBe(true)
    expect(repo.store.has('recente-terminal')).toBe(true)
  })
})
