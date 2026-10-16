import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { KbService } from '../../src/application/kb/kb.service'
import { chunkKnowledge } from '../../src/domain/kb/chunking'
import { KnowledgeNotReadyError } from '../../src/domain/kb/knowledge-errors'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from '../../src/infrastructure/persistence/drizzle/kb.repository'

const url = process.env.HELPDESK_TEST_DATABASE_URL
if (url && !/helpdesk_test/i.test(url)) throw new Error('Use banco descartável helpdesk_test')
const suite = url ? describe : describe.skip
const actor = {
  userId: '11111111-1111-4111-8111-111111111111',
  displayName: 'Editora',
  role: 'admin',
  status: 'active',
}
const at = new Date('2026-10-15T12:00:00Z')

suite('conhecimento no PostgreSQL', () => {
  let db: DbConnection
  let repo: DrizzleKbRepository
  let service: KbService
  beforeAll(() => {
    if (!url) return
    db = createDbConnection(url)
    repo = new DrizzleKbRepository(db.db)
    service = new KbService(
      repo,
      () => at,
      () => crypto.randomUUID(),
    )
  })
  beforeEach(async () => {
    await db.sql`truncate helpdesk.kb_articles, helpdesk.kb_revisions, helpdesk.kb_chunks, helpdesk.kb_publication_events cascade`
  })
  afterAll(async () => {
    await db.close()
  })
  const index = async () => {
    const job = await repo.claimIndex(at, 60_000)
    if (!job?.indexLeaseToken) throw new Error('Job não criado')
    expect(
      await repo.finishIndex(
        job.id,
        job.indexLeaseToken,
        chunkKnowledge(job.id, job.content, () => crypto.randomUUID()),
        at,
      ),
    ).toBe(true)
    return job
  }

  it('não publica parcial, mantém revisão publicada ao editar e retira imediatamente', async () => {
    const article = await service.create(actor, {
      title: 'Orientações',
      content: `${'Apresentação geral. '.repeat(300)}\n\nAutorize o aparelho na área dos pais.`,
      audience: 'customer_parent',
      product: 'kids',
      validUntil: '2027-01-01T00:00:00Z',
    })
    if (!article.draftRevisionId) throw new Error('Revisão ausente')
    const publication = await repo
      .publish(article.id, article.draftRevisionId, 0, actor.userId, at)
      .then(
        () => ({ error: null }),
        (error: unknown) => ({ error }),
      )
    expect(publication.error).toBeInstanceOf(KnowledgeNotReadyError)
    await index()
    await service.publish(actor, article.id, { revisionId: article.draftRevisionId, version: 0 })
    const search = {
      query: 'autorizar aparelho',
      audience: 'customer_parent' as const,
      product: 'kids' as const,
      limit: 6,
    }
    const found = await repo.search(search, at)
    expect(found).toHaveLength(1)
    expect(found[0]?.text).toContain('Autorize o aparelho')
    expect(await repo.search({ ...search, audience: 'customer_adult' }, at)).toEqual([])
    await service.update(actor, article.id, {
      content: 'Instrução ainda não revisada.',
      version: 1,
    })
    expect((await repo.search(search, at))[0]?.revisionId).toBe(article.draftRevisionId)
    await service.withdraw(actor, article.id, 2)
    expect(await repo.search(search, at)).toEqual([])
    expect(await repo.revisions(article.id)).toHaveLength(2)
  })

  it('recupera lease vencido sem permitir conclusão do worker antigo', async () => {
    await service.create(actor, { title: 'Acesso', content: 'Acesse a plataforma.' })
    const old = await repo.claimIndex(at, 1000)
    if (!old?.indexLeaseToken) throw new Error('Job ausente')
    expect(await repo.claimIndex(at, 1000)).toBeNull()
    const later = new Date(at.getTime() + 1001)
    const next = await repo.claimIndex(later, 1000)
    if (!next?.indexLeaseToken) throw new Error('Lease não retomado')
    const chunks = chunkKnowledge(old.id, old.content, () => crypto.randomUUID())
    expect(await repo.finishIndex(old.id, old.indexLeaseToken, chunks, later)).toBe(false)
    expect(await repo.finishIndex(next.id, next.indexLeaseToken, chunks, later)).toBe(true)
    expect(await repo.finishIndex(next.id, next.indexLeaseToken, chunks, later)).toBe(false)
  })

  it('índice parcial e revisão alheia nunca tornam uma fonte pronta', async () => {
    const article = await service.create(actor, {
      title: 'Acesso',
      content: 'Acesse a plataforma.',
    })
    const job = await repo.claimIndex(at, 1000)
    if (!job?.indexLeaseToken) throw new Error('Job ausente')
    expect(await repo.finishIndex(job.id, job.indexLeaseToken, [], at)).toBe(false)
    expect(
      await repo.finishIndex(
        job.id,
        job.indexLeaseToken,
        [
          {
            id: crypto.randomUUID(),
            revisionId: crypto.randomUUID(),
            position: 0,
            section: '',
            text: 'Texto',
          },
        ],
        at,
      ),
    ).toBe(false)
    expect((await repo.revisions(article.id))[0]?.indexState).toBe('processing')
  })
})
