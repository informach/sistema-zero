import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import { BlockAdminService } from '../../src/application/content-admin/content-admin.service'
import { lessonArtSlotBlocks } from '../../src/domain/course/art-slot-course'
import { ArtSlotConflictError } from '../../src/domain/course/course.errors'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareContentReadinessTables } from './content-readiness-fixture'
import { prepareTestDatabase } from './test-database'

/**
 * A leitura das vagas de arte do curso (`listArtSlotBlocks`), rodando contra Postgres de verdade.
 *
 * O falso em memória a reimplementa pelas funções de domínio, então nenhum teste de integração
 * alcança o SQL. E há um espelho frágil de propósito: os nomes das imagens do jogo saem no BANCO
 * (`jsonb_array_elements` sobre `initialProject.assets`), para o projeto de até 1,5 MB não
 * atravessar a rede, e precisam bater com `studioGameImageNames`. Aqui os dois são comparados.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — SQL das vagas de arte PULADO.')
}

describe.skipIf(!testDatabaseUrl)('vagas de arte: a consulta SQL de verdade', () => {
  let conn: DbConnection
  let content: DrizzleContentAdminRepository
  const courseId = randomUUID()
  const otherCourseId = randomUUID()
  const moduleId = randomUUID()
  const otherModuleId = randomUUID()
  const aula1 = randomUUID()
  const aula2 = randomUUID()
  const aulaDeOutroCurso = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await prepareContentReadinessTables(conn)
    content = new DrizzleContentAdminRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    await conn.sql.unsafe(
      'truncate table members.lesson_blocks, members.lesson_structures, members.lessons, members.modules cascade',
    )
    for (const id of [courseId, otherCourseId])
      await conn.sql.unsafe(
        'insert into members.courses (id, slug, title) values ($1, $2, $3) on conflict (id) do nothing',
        [id, `curso-${id}`, 'Curso'],
      )
    await conn.sql.unsafe(
      'insert into members.modules (id, course_id, title, sort_order) values ($1, $2, $3, 2), ($4, $5, $6, 0)',
      [moduleId, courseId, 'Módulo', otherModuleId, otherCourseId, 'Outro'],
    )
    for (const [id, mod, course, order] of [
      [aula1, moduleId, courseId, 0],
      [aula2, moduleId, courseId, 1],
      [aulaDeOutroCurso, otherModuleId, otherCourseId, 0],
    ] as const)
      await conn.sql.unsafe(
        `insert into members.lessons (id, module_id, course_id, slug, title, sort_order)
         values ($1, $2, $3, $4, $5, $6)`,
        [id, mod, course, `aula-${order}`, `Aula ${order + 1}`, order],
      )
  })

  const inserir = async (
    lessonId: string,
    blockContent: Record<string, unknown>,
    sortOrder: number,
    archived = false,
  ) => {
    const id = randomUUID()
    await conn.sql.unsafe(
      `insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content, archived_at)
       values ($1, $2, $3, $4, $5, ${archived ? 'now()' : 'null'})`,
      [id, lessonId, String(blockContent.kind), sortOrder, JSON.stringify(blockContent)],
    )
    return { id, content: blockContent }
  }

  const desenho = (artSlot?: unknown) => ({
    kind: 'pinta',
    initialAsset: { id: 'a', name: 'n', kind: 'vector-sprite' },
    ...(artSlot === undefined ? {} : { artSlot }),
  })
  const jogo = (assets: unknown, artSlots: unknown = [{ name: 'minha-chave', mode: 'add' }]) => ({
    kind: 'studio',
    initialProject: { formatVersion: 2, name: 'p', files: {}, assets },
    artSlots,
  })

  test('lê só os blocos com vaga do curso, na posição do curso e com as imagens do jogo', async () => {
    const assets = [
      { id: '1', name: 'chave-dourada', kind: 'image', dataUrl: 'data:image/png;base64,AA==' },
      { id: '2', name: 'musica', kind: 'audio', dataUrl: 'data:audio/mp3;base64,AA==' },
      { id: '3', name: 42, kind: 'image' },
      { id: '4', name: 'farol', kind: 'image', source: 'library' },
    ]
    const p = await inserir(aula1, desenho({ name: 'minha-chave', replaces: 'chave-dourada' }), 3)
    await inserir(aula1, desenho(), 4)
    await inserir(aula1, desenho({ name: 'arquivado' }), 5, true)
    await inserir(aula1, desenho({ name: 'Nome Ruim' }), 6)
    const s = await inserir(aula2, jogo(assets), 7)
    const semAssets = await inserir(aula2, jogo('nada'), 8)
    await inserir(aulaDeOutroCurso, desenho({ name: 'minha-chave' }), 0)
    await conn.sql.unsafe(
      'insert into members.lesson_structures (lesson_id, sections) values ($1, $2)',
      [
        aula2,
        JSON.stringify([
          { id: 'a', blockIds: [] },
          { id: 'b', blockIds: [s.id] },
        ]),
      ],
    )

    const blocks = await content.listArtSlotBlocks(courseId)
    const byId = new Map(blocks.map((block) => [block.blockId, block]))
    expect([...byId.keys()].sort()).toEqual([p.id, s.id, semAssets.id].sort())
    // Sem estrutura, a aula é uma parte só; com ela, a parte que cita o bloco (ou depois da última).
    expect(byId.get(p.id)).toMatchObject({
      kind: 'pinta',
      lessonTitle: 'Aula 1',
      order: [2, 0, 0, 3],
    })
    expect(byId.get(s.id)).toMatchObject({ kind: 'studio', order: [2, 1, 1, 7] })
    expect(byId.get(semAssets.id)?.order).toEqual([2, 1, 2, 8])

    // O espelho: o mesmo bloco lido pelo domínio dá as mesmas imagens que o SQL tirou.
    const [pelaRegraDoDominio] = lessonArtSlotBlocks(
      { lessonId: aula2, lessonTitle: 'Aula 2', moduleOrder: 2, lessonOrder: 1 },
      [s],
      undefined,
    )
    const lidoNoBanco = byId.get(s.id)
    if (lidoNoBanco?.kind !== 'studio' || pelaRegraDoDominio?.kind !== 'studio')
      throw new Error('vaga do jogo não lida')
    expect(lidoNoBanco.imageNames).toEqual(['chave-dourada', 'farol'])
    expect(lidoNoBanco.imageNames).toEqual(pelaRegraDoDominio.imageNames)
    expect(byId.get(semAssets.id)).toMatchObject({ imageNames: [] })
  })

  test('curso sem vaga nenhuma não lê estrutura e devolve vazio', async () => {
    await inserir(aula1, desenho(), 0)
    expect(await content.listArtSlotBlocks(courseId)).toEqual([])
  })

  test('o desenho de cada vaga: Pinta de aula publicada, o primeiro do curso', async () => {
    const courses = new DrizzleCourseRepository(conn.db)
    const primeiro = await inserir(aula1, desenho({ name: 'minha-chave', replaces: 'chave' }), 2)
    await inserir(aula2, desenho({ name: 'minha-chave' }), 0)
    await inserir(aula1, desenho({ name: 'arquivada' }), 3, true)
    const farol = await inserir(aula2, desenho({ name: 'meu-farol', replaces: 7 }), 1)
    await inserir(aula1, desenho({ name: 'nao-pedida' }), 4)
    await inserir(aulaDeOutroCurso, desenho({ name: 'do-outro' }), 0)
    const aula3 = randomUUID()
    await conn.sql.unsafe(
      `insert into members.lessons (id, module_id, course_id, slug, title, sort_order, is_published)
       values ($1, $2, $3, 'rascunho', 'Rascunho', 9, false)`,
      [aula3, moduleId, courseId],
    )
    await inserir(aula3, desenho({ name: 'do-rascunho' }), 0)

    const fillers = await courses.findArtSlotFillers(courseId, [
      'minha-chave',
      'meu-farol',
      'arquivada',
      'do-outro',
      'do-rascunho',
      'sem-desenho',
    ])
    expect(Object.fromEntries(fillers)).toEqual({
      'minha-chave': { blockId: primeiro.id, replaces: 'chave' },
      'meu-farol': { blockId: farol.id, replaces: null },
    })
    expect((await courses.findArtSlotFillers(courseId, [])).size).toBe(0)
  })

  test('duas criações concorrentes da mesma vaga: a trava do curso deixa passar uma só', async () => {
    const service = new BlockAdminService(content)
    const initialAsset = pintaAssetToWire({
      ...createLessonAsset('vector-sprite', 64, 'chave'),
      id: 'asset-chave',
    })
    const results = await Promise.allSettled([
      service.create(aula1, { kind: 'pinta', initialAsset, artSlot: { name: 'minha-chave' } }),
      service.create(aula2, { kind: 'pinta', initialAsset, artSlot: { name: 'minha-chave' } }),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const [recusa] = results.filter((result) => result.status === 'rejected')
    expect((recusa as PromiseRejectedResult).reason).toBeInstanceOf(ArtSlotConflictError)
    // A recusa desfez a escrita: sobra um bloco só na base.
    expect(await content.listArtSlotBlocks(courseId)).toHaveLength(1)
    const [row] = await conn.sql.unsafe<{ count: number }[]>(
      "select count(*)::int as count from members.lesson_blocks where kind = 'pinta'",
    )
    expect(row?.count).toBe(1)
  })
})
