import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildHelpSearchText, type HelpTutorialDocument } from '@sistemazero/core/help'
import { HelpDuplicateSlugError } from '../../src/domain/help/help.errors'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  DrizzleHelpCollectionRepository,
  DrizzleHelpTutorialRepository,
} from '../../src/infrastructure/persistence/drizzle/help.repository'
import { prepareTestDatabase } from './test-database'

const TEST_DB_NAME = 'sistemazero_help_test'

const testDatabaseUrl = await prepareTestDatabase(TEST_DB_NAME)
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do Como fazer PULADO.')
}

const documento: HelpTutorialDocument = {
  title: 'Como ver meu jogo na Pré-visualização',
  summary: 'Onde o jogo aparece enquanto você monta os blocos.',
  keywords: ['prévia', 'olhinho'],
  steps: [
    { id: 'a', title: 'Abra a aba', body: 'Toque em **Pré-visualização**.' },
    { id: 'b', title: 'Use o olhinho', body: 'O botão Mostrar pré-visualização.' },
  ],
}

/**
 * O SQL que o fake in-memory reimplementa em JS: slug único (23505 → erro de domínio), o
 * lock otimista (`revision = ?` sem gravar em conflito), o import numa transação e a busca
 * tsvector em português sobre `published_search_text`.
 */
describe.skipIf(!testDatabaseUrl)('Drizzle do Como fazer no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos de tests/db: toda coluna aparece no `create`
    // E no `add column if not exists` (regra do CLAUDE.md do pacote).
    await conn.sql.unsafe(`
      create table if not exists members.help_collections (
        id uuid primary key,
        slug varchar(80) not null,
        title varchar(60) not null,
        description varchar(240) not null default '',
        icon varchar(32) not null,
        tone varchar(32) not null,
        position integer not null default 0,
        status varchar(16) not null default 'active',
        created_at timestamptz not null,
        updated_at timestamptz not null
      );
      alter table members.help_collections
        add column if not exists description varchar(240) not null default '',
        add column if not exists icon varchar(32) not null default 'book',
        add column if not exists tone varchar(32) not null default 'marca',
        add column if not exists position integer not null default 0,
        add column if not exists status varchar(16) not null default 'active',
        add column if not exists created_at timestamptz not null default now(),
        add column if not exists updated_at timestamptz not null default now();
      create unique index if not exists help_collections_slug_uq on members.help_collections (slug);
      create table if not exists members.help_tutorials (
        id uuid primary key,
        slug varchar(80) not null,
        collection_id uuid not null references members.help_collections(id),
        status varchar(16) not null default 'draft',
        draft jsonb not null,
        published jsonb,
        published_search_text text,
        revision integer not null default 1,
        position integer not null default 0,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        published_at timestamptz
      );
      alter table members.help_tutorials
        add column if not exists published jsonb,
        add column if not exists published_search_text text,
        add column if not exists revision integer not null default 1,
        add column if not exists position integer not null default 0,
        add column if not exists created_by uuid,
        add column if not exists updated_by uuid,
        add column if not exists created_at timestamptz not null default now(),
        add column if not exists updated_at timestamptz not null default now(),
        add column if not exists published_at timestamptz;
      create unique index if not exists help_tutorials_slug_uq on members.help_tutorials (slug);
      create index if not exists help_tutorials_fts_idx on members.help_tutorials
        using gin (to_tsvector('portuguese', coalesce(published_search_text, '')));
      truncate members.help_tutorials, members.help_collections cascade;
    `)
  })

  afterAll(async () => {
    await conn?.close()
  })

  test('slug único, lock otimista, import e busca', async () => {
    const collections = new DrizzleHelpCollectionRepository(conn.db)
    const tutorials = new DrizzleHelpTutorialRepository(conn.db)
    const now = new Date('2026-09-26T12:00:00.000Z')
    const colecao = await collections.create({
      id: randomUUID(),
      slug: `estudio-${randomUUID().slice(0, 8)}`,
      title: 'Estúdio',
      description: '',
      icon: 'blocks',
      tone: 'estudio',
      position: 0,
      now,
    })
    await expect(collections.create({ ...colecao, id: randomUUID(), now })).rejects.toBeInstanceOf(
      HelpDuplicateSlugError,
    )

    const slug = `pre-visualizacao-${randomUUID().slice(0, 8)}`
    const criado = await tutorials.create({
      id: randomUUID(),
      slug,
      collectionId: colecao.id,
      draft: documento,
      position: 0,
      actorId: null,
      now,
    })
    await expect(
      tutorials.create({ ...criado, actorId: null, now, id: randomUUID() }),
    ).rejects.toBeInstanceOf(HelpDuplicateSlugError)

    // Lock otimista: a revisão velha não grava nada.
    const salvo = await tutorials.update(
      criado.id,
      criado.revision,
      { draft: { ...documento, title: 'Editado' } },
      null,
      now,
    )
    expect(salvo).not.toBe('conflict')
    expect((salvo as { revision: number }).revision).toBe(2)
    expect(await tutorials.update(criado.id, 1, { draft: documento }, null, now)).toBe('conflict')
    expect((await tutorials.findById(criado.id))?.draft.title).toBe('Editado')
    expect(await tutorials.update(randomUUID(), 1, { draft: documento }, null, now)).toBeNull()

    // Publicar grava o texto de busca; a busca tsvector acha por acento e por radical.
    const publicado = await tutorials.setStatus(
      criado.id,
      2,
      {
        status: 'published',
        published: documento,
        publishedSearchText: buildHelpSearchText(documento),
        publishedAt: now,
      },
      null,
      now,
    )
    expect((publicado as { status: string }).status).toBe('published')
    const hits = await tutorials.searchPublished('pre visualizacao olhinho', 5)
    expect(hits.map((h) => h.slug)).toContain(slug)
    expect(await tutorials.searchPublished('foguete lunar', 5)).toEqual([])
    expect((await collections.publishedCounts()).get(colecao.id)).toBe(1)
    expect(await tutorials.countPublishedInCollection(colecao.id)).toBe(1)

    // Import: atualiza SÓ o rascunho do publicado e cria o novo, numa transação.
    const novo = `novo-${randomUUID().slice(0, 8)}`
    const resultado = await tutorials.upsertDraftsBySlug(
      [
        {
          slug,
          collectionId: colecao.id,
          draft: { ...documento, title: 'Importado' },
          position: 3,
        },
        { slug: novo, collectionId: colecao.id, draft: documento, position: 4 },
      ],
      null,
      now,
    )
    expect(resultado).toEqual({ created: 1, updated: 1 })
    const depois = await tutorials.findBySlug(slug)
    expect(depois?.draft.title).toBe('Importado')
    expect(depois?.published?.title).toBe(documento.title)
    expect(depois?.status).toBe('published')
    expect(depois?.position).toBe(3)
    expect((await tutorials.findBySlug(novo))?.status).toBe('draft')
    expect((await tutorials.listPublished()).map((t) => t.slug)).toContain(slug)
    expect((await tutorials.listAll({ q: 'IMPORTADO' })).map((t) => t.slug)).toEqual([slug])
  })
})
