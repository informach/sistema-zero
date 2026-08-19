import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import { BlockAdminService } from '../../src/application/content-admin/content-admin.service'
import type { ContentAdminRepository } from '../../src/domain/ports/content-admin-repository.port'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * As DUAS consultas da cadeia do Pinta, rodando contra Postgres de verdade.
 *
 * Nenhum teste de integração as alcança: o fake in-memory reimplementa as duas em JS, então lá
 * elas não podem divergir do que eu escrevi — é justamente uma divergência do SQL que passaria
 * batida (mesma razão do `gating-block-sql.test.ts`). E aqui há dois espelhos frágeis de
 * propósito: `content->'initialAsset'->>'kind'` espelha `pintaAssetKindOf`, e o
 * `btrim(content->>'chain', JS_WHITESPACE)` espelha o `chain.trim()` do serviço.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — SQL da cadeia do Pinta PULADO.')
}

describe.skipIf(!testDatabaseUrl)('cadeia do Pinta: as consultas SQL de verdade', () => {
  let conn: DbConnection
  let content: DrizzleContentAdminRepository
  let courses: DrizzleCourseRepository
  const courseId = randomUUID()
  const moduleId = randomUUID()
  const aula1 = randomUUID()
  const aula2 = randomUUID()
  const aula3 = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // Tabelas mínimas, com os nomes REAIS (é o que o Drizzle mira): o `kind` é enum no schema
    // de produção, mas aqui basta texto — o que se testa são os predicados (cadeia, tipo do
    // snapshot, ordem do curso), não o DDL.
    await conn.sql.unsafe(`create table if not exists members.modules (
      id uuid primary key, course_id uuid not null, title text not null, summary text,
      sort_order integer not null default 0,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`)
    await conn.sql.unsafe(`create table if not exists members.lessons (
      id uuid primary key, module_id uuid not null, course_id uuid not null,
      slug text not null, title text not null, sort_order integer not null default 0,
      estimated_minutes integer, is_published boolean not null default true,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`)
    // ⚠️ O banco de `tests/db` é COMPARTILHADO e `create table if not exists` é "quem chega
    // primeiro vence": o `studio-submission-restore.test.ts` cria `members.lessons` com MENOS
    // colunas e, quando roda antes (a ordem dos arquivos não é contrato — no CI foi assim em
    // 19/08), este `create` vira no-op e o `findPrecedingChainBlock` morre em
    // `column "is_published" does not exist`. Regra do CLAUDE.md: toda coluna USADA entra
    // também num `add column if not exists` (com default nas `not null`).
    for (const col of [
      'module_id uuid',
      'course_id uuid',
      'slug text',
      'title text',
      'sort_order integer not null default 0',
      'estimated_minutes integer',
      'is_published boolean not null default true',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.lessons add column if not exists ${col}`)
    }
    for (const col of [
      'course_id uuid',
      'title text',
      'summary text',
      'sort_order integer not null default 0',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.modules add column if not exists ${col}`)
    }
    await conn.sql.unsafe(`create table if not exists members.lesson_blocks (
      id uuid primary key, lesson_id uuid not null, kind text not null,
      sort_order integer not null default 0, content jsonb not null,
      content_revision varchar(32) not null default 'x'
    )`)
    for (const col of [
      'lesson_id uuid',
      'kind text',
      'sort_order integer not null default 0',
      'content jsonb',
      "content_revision varchar(32) not null default 'x'",
    ]) {
      await conn.sql.unsafe(`alter table members.lesson_blocks add column if not exists ${col}`)
    }
    await conn.sql.unsafe('truncate table members.lesson_blocks')
    await conn.sql.unsafe(
      'create unique index if not exists lesson_blocks_lesson_sort_order_uq on members.lesson_blocks (lesson_id, sort_order)',
    )
    content = new DrizzleContentAdminRepository(conn.db)
    courses = new DrizzleCourseRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    await conn.sql.unsafe('truncate table members.lesson_blocks')
    await conn.sql.unsafe('truncate table members.lessons')
    await conn.sql.unsafe('truncate table members.modules')
    await conn.sql.unsafe(
      'insert into members.modules (id, course_id, title, sort_order) values ($1, $2, $3, 0)',
      [moduleId, courseId, 'Módulo 1'],
    )
    for (const [i, id] of [aula1, aula2, aula3].entries()) {
      await conn.sql.unsafe(
        `insert into members.lessons (id, module_id, course_id, slug, title, sort_order, is_published)
         values ($1, $2, $3, $4, $5, $6, true)`,
        [id, moduleId, courseId, `aula-${i + 1}`, `Aula ${i + 1}`, i],
      )
    }
  })

  const inserirBloco = async (
    lessonId: string,
    kind: string,
    blockContent: Record<string, unknown>,
    sortOrder = 0,
  ) => {
    const id = randomUUID()
    await conn.sql.unsafe(
      'insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content) values ($1,$2,$3,$4,$5)',
      [id, lessonId, kind, sortOrder, JSON.stringify(blockContent)],
    )
    return id
  }

  const pinta = (assetKind: string, chain?: string) => ({
    kind: 'pinta',
    initialAsset: { id: 'a', name: 'n', kind: assetKind },
    ...(chain === undefined ? {} : { chain }),
  })

  describe('listPintaChainBlocks (a guarda de tipo da autoria)', () => {
    test('serializa criações concorrentes e nunca grava dois tipos na mesma cadeia', async () => {
      let releaseBarrier = () => {}
      const barrier = new Promise<void>((resolve) => {
        releaseBarrier = resolve
      })
      let readsCompleted = 0
      // Força as duas leituras do código antigo a enxergarem a cadeia vazia antes de qualquer
      // INSERT. Depois da correção, o serviço entra no lock e usa o repositório transacional
      // recebido no callback, portanto esta barreira externa nem é alcançada.
      const concurrentContent = new Proxy(content, {
        get(target, property) {
          if (property === 'listPintaChainBlocks') {
            return async (...args: Parameters<ContentAdminRepository['listPintaChainBlocks']>) => {
              const rows = await target.listPintaChainBlocks(...args)
              readsCompleted++
              if (readsCompleted === 2) releaseBarrier()
              await barrier
              return rows
            }
          }
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      }) as ContentAdminRepository
      const service = new BlockAdminService(concurrentContent)
      const pixel = pintaAssetToWire({
        ...createLessonAsset('pixel-sprite', 32, 'heroi'),
        id: 'asset-pixel',
      })
      const vector = pintaAssetToWire({
        ...createLessonAsset('vector-background', 240, 'cenario'),
        id: 'asset-vector',
      })

      const results = await Promise.allSettled([
        service.create(aula1, { kind: 'pinta', chain: 'heroi', initialAsset: pixel }),
        service.create(aula2, { kind: 'pinta', chain: 'heroi', initialAsset: vector }),
      ])

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
      expect(await content.listPintaChainBlocks(courseId, 'heroi')).toHaveLength(1)
    })

    test('acha os irmãos da cadeia com o tipo LIDO do snapshot, em ordem de curso', async () => {
      const b2 = await inserirBloco(aula2, 'pinta', pinta('vector-sprite', 'heroi'))
      const b1 = await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', 'heroi'))

      const irmaos = await content.listPintaChainBlocks(courseId, 'heroi')
      expect(irmaos.map((i) => i.blockId)).toEqual([b1, b2])
      expect(irmaos.map((i) => i.assetKind)).toEqual(['pixel-sprite', 'vector-sprite'])
      expect(irmaos.map((i) => i.lessonTitle)).toEqual(['Aula 1', 'Aula 2'])
    })

    test('🚨 a régua do `trim` do JS vale também sobre o valor armazenado', async () => {
      // Sem o trim no valor ARMAZENADO a guarda não casaria e o estado quebrado nasceria mesmo
      // assim — a mesma armadilha que o carryover já documentava.
      await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', '\t heroi\u00a0'))
      expect(await content.listPintaChainBlocks(courseId, 'heroi')).toHaveLength(1)
    })

    test('retry de sort_order continua utilizável dentro do lock transacional da cadeia', async () => {
      const service = new BlockAdminService(content)
      const pixel = pintaAssetToWire({
        ...createLessonAsset('pixel-sprite', 32, 'heroi'),
        id: 'asset-concorrente',
      })

      const results = await Promise.allSettled(
        Array.from({ length: 8 }, (_, index) =>
          service.create(aula1, {
            kind: 'pinta',
            chain: `cadeia-${index}`,
            initialAsset: pixel,
          }),
        ),
      )

      expect(results.filter((result) => result.status === 'rejected')).toEqual([])
      const rows = await conn.sql.unsafe(
        'select sort_order from members.lesson_blocks where lesson_id = $1 order by sort_order',
        [aula1],
      )
      expect(rows.map((row) => row.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    })

    test('exclui o PRÓPRIO bloco; não vaza de outro curso; ignora outra cadeia e bloco sem cadeia', async () => {
      const meu = await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', 'heroi'))
      await inserirBloco(aula2, 'pinta', pinta('pixel-sprite', 'cenario'))
      await inserirBloco(aula3, 'pinta', pinta('pixel-sprite'))

      expect(
        await content.listPintaChainBlocks(courseId, 'heroi', { excludeBlockId: meu }),
      ).toEqual([])
      expect(await content.listPintaChainBlocks(randomUUID(), 'heroi')).toEqual([])
      expect(await content.listPintaChainBlocks(courseId, 'heroi')).toHaveLength(1)
    })

    test('bloco de Estúdio com o MESMO nome de cadeia não entra', async () => {
      await inserirBloco(aula1, 'studio', { kind: 'studio', initialProject: {}, chain: 'heroi' })
      expect(await content.listPintaChainBlocks(courseId, 'heroi')).toEqual([])
    })

    test('snapshot ilegível vira `assetKind: null` (o serviço trata como "não conflita")', async () => {
      await inserirBloco(aula1, 'pinta', { kind: 'pinta', initialAsset: null, chain: 'heroi' })
      await inserirBloco(aula2, 'pinta', { kind: 'pinta', chain: 'heroi' })

      const irmaos = await content.listPintaChainBlocks(courseId, 'heroi')
      expect(irmaos.map((i) => i.assetKind)).toEqual([null, null])
    })

    test('aula RASCUNHO entra de propósito (a cadeia é da autoria)', async () => {
      await conn.sql.unsafe('update members.lessons set is_published = false where id = $1', [
        aula1,
      ])
      await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', 'heroi'))
      expect(await content.listPintaChainBlocks(courseId, 'heroi')).toHaveLength(1)
    })
  })

  describe('findPrecedingChainBlock (o carryover)', () => {
    test('pega o bloco do MESMO kind na aula anterior da cadeia', async () => {
      // A linha legada usa whitespace que o `trim(text)` padrão do Postgres não remove.
      const b1 = await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', '\t heroi\u00a0'))
      await inserirBloco(aula2, 'pinta', pinta('pixel-sprite', 'heroi'))

      expect(await courses.findPrecedingChainBlock(courseId, aula2, 'heroi', 'pinta')).toEqual({
        blockId: b1,
        lessonId: aula1,
      })
    })

    test('🚨 o kind entra na busca: cadeia de Pinta não enxerga bloco de Estúdio homônimo', async () => {
      await inserirBloco(aula1, 'studio', { kind: 'studio', initialProject: {}, chain: 'heroi' })
      await inserirBloco(aula2, 'pinta', pinta('pixel-sprite', 'heroi'))

      expect(await courses.findPrecedingChainBlock(courseId, aula2, 'heroi', 'pinta')).toBeNull()
      // Anti-vácuo: o MESMO bloco É achado quando quem pergunta é a cadeia do Estúdio.
      expect(
        await courses.findPrecedingChainBlock(courseId, aula2, 'heroi', 'studio'),
      ).not.toBeNull()
    })

    test('pula aula NÃO publicada e volta mais para trás', async () => {
      const b1 = await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', 'heroi'))
      await conn.sql.unsafe('update members.lessons set is_published = false where id = $1', [
        aula2,
      ])
      await inserirBloco(aula2, 'pinta', pinta('pixel-sprite', 'heroi'))

      expect(await courses.findPrecedingChainBlock(courseId, aula3, 'heroi', 'pinta')).toEqual({
        blockId: b1,
        lessonId: aula1,
      })
    })

    test('1ª aula da cadeia não tem antecessora', async () => {
      await inserirBloco(aula1, 'pinta', pinta('pixel-sprite', 'heroi'))
      expect(await courses.findPrecedingChainBlock(courseId, aula1, 'heroi', 'pinta')).toBeNull()
    })
  })
})
