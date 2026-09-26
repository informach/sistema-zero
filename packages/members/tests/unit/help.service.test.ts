import { describe, expect, test } from 'bun:test'
import type { HelpTutorialDocument } from '@sistemazero/core/help'
import { HelpService } from '../../src/application/help/help.service'
import {
  HelpCollectionInUseError,
  HelpTutorialConflictError,
  HelpTutorialInvalidError,
  HelpTutorialNotFoundError,
} from '../../src/domain/help/help.errors'
import {
  InMemoryHelpCollectionRepository,
  InMemoryHelpTutorialRepository,
} from '../fakes/help-in-memory'

const NOW = new Date('2026-09-26T12:00:00.000Z')

const pronto: HelpTutorialDocument = {
  title: 'Como ver meu jogo na Pré-visualização',
  summary: 'Onde o jogo aparece enquanto você monta os blocos.',
  keywords: ['prévia', 'olhinho'],
  toolRef: 'estudio-completo',
  steps: [
    { id: 'a', title: 'Abra a aba', body: 'Toque em **Pré-visualização**.' },
    { id: 'b', title: 'Use o olhinho', body: 'Em tela larga, o botão Mostrar pré-visualização.' },
  ],
}

function build() {
  const collections = new InMemoryHelpCollectionRepository()
  const tutorials = new InMemoryHelpTutorialRepository(collections)
  let seq = 0
  const service = new HelpService(
    collections,
    tutorials,
    () => NOW,
    () => `id-${++seq}`,
  )
  return { collections, tutorials, service }
}

async function comColecao() {
  const ctx = build()
  const estudio = await ctx.service.createCollection({
    slug: 'estudio',
    title: 'Estúdio',
    description: 'Blocos, projetos e jogos',
    icon: 'blocks',
    tone: 'estudio',
  })
  return { ...ctx, estudio }
}

describe('HelpService: tutoriais', () => {
  test('publicar copia o rascunho, grava o texto de busca e a criança passa a ver', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create(
      { slug: 'estudio-pre-visualizacao', collectionId: estudio.id, draft: pronto },
      'admin-1',
    )
    expect(created.status).toBe('draft')
    expect((await service.listPublished()).tutorials).toEqual([])
    await expect(service.getPublished('estudio-pre-visualizacao')).rejects.toBeInstanceOf(
      HelpTutorialNotFoundError,
    )

    const published = await service.publish(created.id, created.revision, 'admin-1')
    expect(published.status).toBe('published')
    expect(published.published).toEqual(pronto)
    expect(published.publishedAt).toBe(NOW.toISOString())

    const { tutorials } = await service.listPublished()
    expect(tutorials).toHaveLength(1)
    expect(tutorials[0]).toMatchObject({
      slug: 'estudio-pre-visualizacao',
      collectionSlug: 'estudio',
      title: pronto.title,
      toolRef: 'estudio-completo',
    })
    expect(tutorials[0]?.searchText).toContain('olhinho')
    expect(tutorials[0]?.searchText).toContain('mostrar pre visualizacao')

    const view = await service.getPublished('estudio-pre-visualizacao')
    expect(view.collectionTitle).toBe('Estúdio')
    expect(view.collectionTone).toBe('estudio')
    expect(view.steps).toHaveLength(2)
  })

  test('publicar rascunho incompleto reprova com os bloqueios campo a campo', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create({ slug: 'vazio', collectionId: estudio.id }, null)
    const erro = await service.publish(created.id, created.revision, null).catch((e) => e)
    expect(erro).toBeInstanceOf(HelpTutorialInvalidError)
    expect((erro as HelpTutorialInvalidError).issues.map((i) => i.field)).toEqual(
      expect.arrayContaining(['title', 'summary', 'steps.passo-1.body']),
    )
  })

  test('expectedRevision velho dá conflito com a revisão atual', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create(
      { slug: 'x', collectionId: estudio.id, draft: pronto },
      null,
    )
    const salvo = await service.update(
      created.id,
      { expectedRevision: created.revision, draft: { ...pronto, title: 'Novo título' } },
      null,
    )
    expect(salvo.revision).toBe(created.revision + 1)
    const erro = await service
      .update(created.id, { expectedRevision: created.revision, draft: pronto }, null)
      .catch((e) => e)
    expect(erro).toBeInstanceOf(HelpTutorialConflictError)
    expect((erro as HelpTutorialConflictError).currentRevision).toBe(salvo.revision)
  })

  test('editar depois de publicar não muda o que a criança lê; despublicar tira da lista', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create(
      { slug: 'x', collectionId: estudio.id, draft: pronto },
      null,
    )
    const published = await service.publish(created.id, created.revision, null)
    const editado = await service.update(
      created.id,
      { expectedRevision: published.revision, draft: { ...pronto, title: 'Rascunho novo' } },
      null,
    )
    expect(editado.hasUnpublishedChanges).toBe(true)
    expect((await service.getPublished('x')).title).toBe(pronto.title)

    const despublicado = await service.unpublish(created.id, editado.revision, null)
    expect(despublicado.status).toBe('draft')
    expect(despublicado.published).toBeNull()
    expect((await service.listPublished()).tutorials).toEqual([])
  })

  test('a busca do Zappy só enxerga o publicado e devolve um texto legível', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create(
      { slug: 'x', collectionId: estudio.id, draft: pronto },
      null,
    )
    expect(await service.searchForZappy('olhinho')).toEqual([])
    await service.publish(created.id, created.revision, null)
    const hits = await service.searchForZappy('olhinho')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      kind: 'help-tutorial',
      slug: 'x',
      title: pronto.title,
      collectionTitle: 'Estúdio',
    })
    expect(hits[0]?.content).toContain('1. Abra a aba')
  })

  test('import cria e atualiza SÓ o rascunho, nunca o publicado', async () => {
    const { service } = build()
    const first = await service.import(
      {
        collections: [
          { slug: 'pinta', title: 'Pinta', description: '', icon: 'palette', tone: 'pinta' },
        ],
        tutorials: [{ slug: 'camada', collection: 'pinta', draft: pronto }],
      },
      null,
    )
    expect(first).toMatchObject({
      collections: { created: 1, updated: 0 },
      tutorials: { created: 1, updated: 0 },
      rejected: [],
    })
    const [row] = (await service.list()).tutorials
    const published = await service.publish(row?.id ?? '', row?.revision ?? 0, null)

    const second = await service.import(
      {
        collections: [
          { slug: 'pinta', title: 'Pinta!', description: 'x', icon: 'palette', tone: 'pinta' },
        ],
        tutorials: [
          { slug: 'camada', collection: 'pinta', draft: { ...pronto, title: 'Editado' } },
          { slug: 'orfao', collection: 'nao-existe', draft: pronto },
          { slug: 'colecao', collection: 'pinta', draft: pronto },
        ],
      },
      null,
    )
    expect(second.collections).toEqual({ created: 0, updated: 1 })
    expect(second.tutorials).toEqual({ created: 0, updated: 1 })
    expect(second.rejected.map((r) => r.slug).sort()).toEqual(['colecao', 'orfao'])
    const depois = await service.get(published.id)
    expect(depois.draft.title).toBe('Editado')
    expect(depois.published?.title).toBe(pronto.title)
    expect(depois.status).toBe('published')
    expect((await service.listCollections()).collections[0]?.title).toBe('Pinta!')
  })
})

describe('HelpService: coleções', () => {
  test('arquivar coleção com tutorial publicado é recusado; sem publicado, some da criança', async () => {
    const { service, estudio } = await comColecao()
    const created = await service.create(
      { slug: 'x', collectionId: estudio.id, draft: pronto },
      null,
    )
    const published = await service.publish(created.id, created.revision, null)
    await expect(service.archiveCollection(estudio.id)).rejects.toBeInstanceOf(
      HelpCollectionInUseError,
    )
    await service.unpublish(created.id, published.revision, null)
    const archived = await service.archiveCollection(estudio.id)
    expect(archived.status).toBe('archived')
    expect((await service.listCollectionsPublic()).collections).toEqual([])
    expect((await service.listCollections()).collections).toHaveLength(1)
  })

  test('reordenar regrava as posições e conta os publicados', async () => {
    const { service } = build()
    const a = await service.createCollection({
      slug: 'a',
      title: 'Aa',
      description: '',
      icon: 'book',
      tone: 'marca',
    })
    const b = await service.createCollection({
      slug: 'b',
      title: 'Bb',
      description: '',
      icon: 'book',
      tone: 'marca',
    })
    const t = await service.create({ slug: 't', collectionId: b.id, draft: pronto }, null)
    await service.publish(t.id, t.revision, null)
    const { collections } = await service.reorderCollections([b.id, a.id])
    expect(collections.map((c) => [c.slug, c.position, c.publishedCount])).toEqual([
      ['b', 0, 1],
      ['a', 1, 0],
    ])
  })
})
