import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioSubmissionRepository } from '../../src/infrastructure/persistence/drizzle/studio-submission.repository'
import { prepareTestDatabase } from './test-database'

/**
 * Os três SQLs novos da proteção contra perda de entrega, contra Postgres real:
 *
 * 1. O upsert copia a versão SOBRESCRITA para `previous_*` no PRÓPRIO ON
 *    CONFLICT — a semântica "coluna da tabela no SET lê o valor ANTIGO" (≠
 *    `excluded.*`) é exatamente o que o fake não consegue provar.
 * 2. `restorePrevious` troca atual↔anterior num UPDATE atômico (todas as
 *    expressões do SET leem a linha antiga), zera a correção e preserva o
 *    sticky/carimbo/recado.
 * 3. `countByCourseGrouped` (GROUP BY do aviso dos confirms de exclusão).
 *
 * O fake in-memory reimplementa os três em JS — nenhum teste de integração
 * alcança este SQL (mesma régua do `gating-block-sql.test.ts`).
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — versão anterior PULADO.')
}

describe.skipIf(!testDatabaseUrl)('versão anterior da entrega (Postgres real)', () => {
  let conn: DbConnection
  let repo: DrizzleStudioSubmissionRepository

  const aluno = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos da pasta: o `create` de quem chega
    // primeiro vence, então TODA coluna usada aqui entra também num `alter table
    // … add column if not exists` (nullable — a tabela pode já ter linhas), e as
    // colunas extras deste create ficam NULLABLE para não quebrar os INSERTs
    // mínimos das outras suítes (regra da pasta).
    await conn.sql.unsafe(`create table if not exists members.studio_submissions (
      user_id uuid not null,
      account_id uuid,
      id uuid,
      block_id uuid,
      lesson_id uuid,
      course_id uuid,
      project jsonb,
      submitted_at timestamptz,
      score integer,
      results jsonb,
      checked_at timestamptz,
      passed_at timestamptz,
      message varchar(1000),
      reviewed_at timestamptz,
      reviewed_by uuid,
      previous_project jsonb,
      previous_submitted_at timestamptz
    )`)
    for (const col of [
      'id uuid',
      'block_id uuid',
      'lesson_id uuid',
      'course_id uuid',
      'project jsonb',
      'submitted_at timestamptz',
      'score integer',
      'results jsonb',
      'checked_at timestamptz',
      'passed_at timestamptz',
      'message varchar(1000)',
      'reviewed_at timestamptz',
      'reviewed_by uuid',
      'previous_project jsonb',
      'previous_submitted_at timestamptz',
    ]) {
      await conn.sql.unsafe(
        `alter table members.studio_submissions add column if not exists ${col}`,
      )
    }
    // O ON CONFLICT do upsert mira a chave única real (user_id, block_id).
    await conn.sql.unsafe(
      'create unique index if not exists studio_submissions_user_block_uq on members.studio_submissions (user_id, block_id)',
    )
    repo = new DrizzleStudioSubmissionRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    // cascade: outra suíte pode ter criado FK apontando para esta tabela.
    await conn.sql.unsafe('truncate table members.studio_submissions cascade')
  })

  const entrega = (blockId: string, project: unknown, submittedAt: Date, extra = {}) => ({
    id: randomUUID(),
    userId: aluno,
    accountId: aluno,
    blockId,
    lessonId: randomUUID(),
    courseId: randomUUID(),
    project,
    submittedAt,
    ...extra,
  })

  test('🚨 o upsert copia a versão sobrescrita para previous_* (coluna antiga no SET)', async () => {
    const blockId = randomUUID()
    const t1 = new Date('2026-08-01T10:00:00.000Z')
    const t2 = new Date('2026-08-10T10:00:00.000Z')
    const t3 = new Date('2026-08-15T10:00:00.000Z')

    await repo.upsert(entrega(blockId, { name: 'v1' }, t1))
    // 1º envio: sem versão anterior.
    expect(await repo.getPrevious(aluno, blockId)).toBeNull()

    await repo.upsert(entrega(blockId, { name: 'v2' }, t2))
    const prev = await repo.getPrevious(aluno, blockId)
    expect(prev?.project).toEqual({ name: 'v1' })
    expect(prev?.submittedAt.toISOString()).toBe(t1.toISOString())

    // O caminho COM preservePassedAt (transação + advisory lock) também copia.
    await repo.upsert(entrega(blockId, { name: 'v3' }, t3), { preservePassedAt: true })
    const prev2 = await repo.getPrevious(aluno, blockId)
    expect(prev2?.project).toEqual({ name: 'v2' })
    expect(prev2?.submittedAt.toISOString()).toBe(t2.toISOString())

    const detail = await repo.getOne(aluno, blockId)
    expect(detail?.project).toEqual({ name: 'v3' })
    expect(detail?.previousSubmittedAt?.toISOString()).toBe(t2.toISOString())
  })

  test('restaurar troca atual↔anterior num UPDATE só, zera correção e preserva sticky/carimbo/recado', async () => {
    const blockId = randomUUID()
    const t1 = new Date('2026-08-01T10:00:00.000Z')
    const t2 = new Date('2026-08-10T10:00:00.000Z')
    const aprovadoEm = new Date('2026-08-01T10:05:00.000Z')

    await repo.upsert(
      entrega(blockId, { name: 'boa' }, t1, {
        score: 100,
        checkedAt: t1,
        passedAt: aprovadoEm,
        message: 'terminei!',
      }),
    )
    await repo.upsert(
      entrega(blockId, { name: 'template por engano' }, t2, {
        score: 0,
        checkedAt: t2,
        message: 'terminei!',
      }),
      { preservePassedAt: true },
    )
    const staff = randomUUID()
    await repo.markReviewed({ userId: aluno, blockId, reviewed: true, staffId: staff, now: t2 })

    expect(await repo.restorePrevious({ userId: aluno, blockId })).toBe(true)
    const detail = await repo.getOne(aluno, blockId)
    expect(detail?.project).toEqual({ name: 'boa' })
    expect(detail?.submittedAt.toISOString()).toBe(t1.toISOString())
    expect(detail?.score).toBeNull()
    expect(detail?.checkedAt).toBeNull()
    expect(detail?.passedAt?.toISOString()).toBe(aprovadoEm.toISOString()) // sticky fica
    expect(detail?.message).toBe('terminei!')
    expect(detail?.reviewedAt?.toISOString()).toBe(t2.toISOString()) // carimbo fica

    // Reversível: a versão descartada virou a anterior, e restaurar de novo volta.
    expect((await repo.getPrevious(aluno, blockId))?.project).toEqual({
      name: 'template por engano',
    })
    expect(await repo.restorePrevious({ userId: aluno, blockId })).toBe(true)
    expect((await repo.getOne(aluno, blockId))?.project).toEqual({ name: 'template por engano' })
  })

  test('restaurar sem versão anterior devolve false (linha nova ou inexistente)', async () => {
    const blockId = randomUUID()
    await repo.upsert(entrega(blockId, { name: 'única' }, new Date('2026-08-01T10:00:00.000Z')))
    expect(await repo.restorePrevious({ userId: aluno, blockId })).toBe(false)
    expect(await repo.restorePrevious({ userId: aluno, blockId: randomUUID() })).toBe(false)
  })

  test('countByCourseGrouped agrega por bloco/aula e ignora outros cursos', async () => {
    const courseId = randomUUID()
    const lesson1 = randomUUID()
    const lesson2 = randomUUID()
    const block1 = randomUUID()
    const block2 = randomUUID()
    const outroAluno = randomUUID()
    const t = new Date('2026-08-01T10:00:00.000Z')

    const linha = (userId: string, blockId: string, lessonId: string, cid = courseId) => ({
      id: randomUUID(),
      userId,
      accountId: userId,
      blockId,
      lessonId,
      courseId: cid,
      project: {},
      submittedAt: t,
    })
    await repo.upsert(linha(aluno, block1, lesson1))
    await repo.upsert(linha(outroAluno, block1, lesson1))
    await repo.upsert(linha(aluno, block2, lesson2))
    await repo.upsert(linha(aluno, randomUUID(), randomUUID(), randomUUID())) // outro curso

    const rows = await repo.countByCourseGrouped(courseId)
    const byBlock = new Map(rows.map((r) => [r.blockId, r]))
    expect(rows.length).toBe(2)
    expect(byBlock.get(block1)).toEqual({ blockId: block1, lessonId: lesson1, count: 2 })
    expect(byBlock.get(block2)).toEqual({ blockId: block2, lessonId: lesson2, count: 1 })
    expect(await repo.countByCourseGrouped(randomUUID())).toEqual([])
  })
})
