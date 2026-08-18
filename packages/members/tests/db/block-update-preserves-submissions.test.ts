import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * Editar um bloco NUNCA pode apagar `studio_submissions`: a entrega é o trabalho
 * do aluno — o "save na nuvem" que restaura o editor num navegador novo, a fonte
 * do carryover da cadeia e o registro da fila do professor. A regra antiga
 * ("qualquer mudança de conteúdo apaga as entregas do bloco") destruiu entregas
 * reais em produção (08/2026): o snapshot do `initialProject` re-serializado pelo
 * admin quase nunca é byte-igual ao salvo, então TODO salvar de bloco Estúdio
 * descartava os projetos enviados de todos os alunos daquele bloco.
 *
 * O contrato novo: mudança na ATIVIDADE zera SÓ a correção (score/results/
 * checked_at/passed_at — o gate volta a travar por NOT_PASSED); mudança em
 * qualquer outra parte (initialProject/allowBlocks/vitrine/…) não toca nada; e o
 * projeto enviado NUNCA é apagado. Quiz segue apagando as TENTATIVAS quando as
 * questões/nota mudam.
 *
 * O fake in-memory reimplementa o updateBlock em JS (fingerprints espelhados),
 * então nenhum teste de integração alcança este SQL — mesma régua do
 * `gating-block-sql.test.ts`.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn(
    '[tests/db] Postgres indisponível (porta 5433?) — teste de preservação de entregas PULADO.',
  )
}

describe.skipIf(!testDatabaseUrl)('updateBlock preserva as entregas (Postgres real)', () => {
  let conn: DbConnection
  let repo: DrizzleContentAdminRepository

  const lessonId = randomUUID()
  const aluno = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos da pasta: o `create` de quem chega
    // primeiro vence, então TODA coluna usada aqui entra também num `alter table
    // … add column if not exists` (nullable — as tabelas podem já ter linhas de
    // outra suíte). E colunas extras deste create ficam NULLABLE para não quebrar
    // os INSERTs mínimos das outras suítes (regra da pasta).
    // ⚠️ `content_revision` NOT NULL + default, IGUAL ao DDL do pinta-chain-sql:
    // o `createBlock` real não manda a coluna (confia no default do banco), e um
    // create daqui SEM default deixaria o alter de lá como no-op — os testes de
    // criação concorrente do pinta quebravam conforme a ORDEM dos arquivos.
    await conn.sql.unsafe(`create table if not exists members.lesson_blocks (
      id uuid primary key,
      lesson_id uuid not null,
      kind text not null,
      sort_order integer not null default 0,
      content jsonb not null,
      content_revision varchar(32) not null default 'x'
    )`)
    await conn.sql.unsafe(
      "alter table members.lesson_blocks add column if not exists content_revision varchar(32) not null default 'x'",
    )
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
      message varchar(1000)
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
    ]) {
      await conn.sql.unsafe(
        `alter table members.studio_submissions add column if not exists ${col}`,
      )
    }
    await conn.sql.unsafe(`create table if not exists members.quiz_attempts (
      user_id uuid not null,
      block_id uuid
    )`)
    await conn.sql.unsafe(
      'alter table members.quiz_attempts add column if not exists block_id uuid',
    )
    repo = new DrizzleContentAdminRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    // cascade: outra suíte pode ter criado FK apontando para estas tabelas.
    await conn.sql.unsafe(
      'truncate table members.lesson_blocks, members.studio_submissions, members.quiz_attempts cascade',
    )
  })

  const atividadeLaco = {
    instructions: 'use um laço',
    passingScore: 100,
    checks: [{ id: 'loop', label: 'usa laço', kind: 'structure', rule: { type: 'usesLoop' } }],
  }

  const blocoEstudio = (activity?: unknown) => ({
    kind: 'studio',
    level: 'iniciante',
    initialProject: { name: 'x', files: { 'index.html': '', 'style.css': '', 'script.js': '' } },
    ...(activity ? { activity } : {}),
  })

  const insereBloco = async (content: unknown, kind = 'studio') => {
    const id = randomUUID()
    await conn.sql.unsafe(
      'insert into members.lesson_blocks (id, lesson_id, kind, content, content_revision) values ($1, $2, $3, $4, $5)',
      [id, lessonId, kind, JSON.stringify(content), 'rev0'],
    )
    return id
  }

  const insereEntrega = async (blockId: string) => {
    await conn.sql.unsafe(
      `insert into members.studio_submissions
        (id, user_id, block_id, lesson_id, course_id, project, submitted_at, score, results, checked_at, passed_at, message)
       values ($1, $2, $3, $4, $5, $6, now(), 100, $7, now(), now(), $8)`,
      [
        randomUUID(),
        aluno,
        blockId,
        lessonId,
        randomUUID(),
        JSON.stringify({ name: 'meu jogo', files: {} }),
        JSON.stringify([{ checkId: 'loop', passed: true }]),
        'terminei!',
      ],
    )
  }

  const leEntrega = async (blockId: string) => {
    const rows = await conn.sql.unsafe(
      `select project, message, score, results, checked_at, passed_at
         from members.studio_submissions where block_id = $1 and user_id = $2`,
      [blockId, aluno],
    )
    return rows[0] ?? null
  }

  test('🚨 salvar o bloco com OUTRO initialProject/curadoria não toca a entrega', async () => {
    const blockId = await insereBloco(blocoEstudio(atividadeLaco))
    await insereEntrega(blockId)

    // O caso real do incidente: a professora retoca o projeto inicial, liga a
    // vitrine, muda a lista de blocos — nada disso é a atividade.
    const updated = await repo.updateBlock(blockId, 'studio', {
      ...blocoEstudio(atividadeLaco),
      initialProject: { name: 'retocado', files: { 'index.html': '<h1>novo</h1>' } },
      allowBlocks: ['sz_js_var_create'],
      showcase: { enabled: true, title: 'Meu jogo' },
    } as never)
    expect(updated).not.toBeNull()

    const entrega = await leEntrega(blockId)
    expect(entrega).not.toBeNull()
    expect(entrega?.project).toMatchObject({ name: 'meu jogo' })
    expect(entrega?.message).toBe('terminei!')
    expect(entrega?.score).toBe(100)
    expect(entrega?.passed_at).not.toBeNull()
  })

  test('mudar a ATIVIDADE zera a correção mas PRESERVA o projeto enviado', async () => {
    const blockId = await insereBloco(blocoEstudio(atividadeLaco))
    await insereEntrega(blockId)

    const updated = await repo.updateBlock(blockId, 'studio', {
      ...blocoEstudio({
        instructions: 'crie a função go',
        passingScore: 100,
        checks: [
          { id: 'fn', label: 'função', kind: 'structure', rule: { type: 'definesFunction' } },
        ],
      }),
    } as never)
    expect(updated).not.toBeNull()

    const entrega = await leEntrega(blockId)
    expect(entrega).not.toBeNull()
    expect(entrega?.project).toMatchObject({ name: 'meu jogo' })
    expect(entrega?.message).toBe('terminei!')
    // A correção caiu: o gate com nota de corte volta a travar (NOT_PASSED).
    expect(entrega?.score).toBeNull()
    expect(entrega?.results).toBeNull()
    expect(entrega?.checked_at).toBeNull()
    expect(entrega?.passed_at).toBeNull()
  })

  test('quiz: mudar as questões apaga as TENTATIVAS (histórico, não trabalho)', async () => {
    const quizV1 = {
      kind: 'quiz',
      questions: [{ id: 'q1', prompt: 'a?', choices: [], correctChoiceIds: [] }],
      passingScore: 70,
    }
    const blockId = await insereBloco(quizV1, 'quiz')
    await conn.sql.unsafe('insert into members.quiz_attempts (user_id, block_id) values ($1, $2)', [
      aluno,
      blockId,
    ])

    await repo.updateBlock(blockId, 'quiz', {
      ...quizV1,
      questions: [{ id: 'q2', prompt: 'b?', choices: [], correctChoiceIds: [] }],
    } as never)

    const attempts = await conn.sql.unsafe(
      'select 1 from members.quiz_attempts where block_id = $1',
      [blockId],
    )
    expect(attempts.length).toBe(0)
  })

  test('pinta: editar o bloco não toca a entrega do desenho', async () => {
    const pintaV1 = {
      kind: 'pinta',
      initialAsset: { id: 'a', name: 'heroi', kind: 'pixel-sprite' },
    }
    const blockId = await insereBloco(pintaV1, 'pinta')
    await insereEntrega(blockId)

    await repo.updateBlock(blockId, 'pinta', {
      ...pintaV1,
      allowTools: ['pencil'],
    } as never)

    const entrega = await leEntrega(blockId)
    expect(entrega).not.toBeNull()
    expect(entrega?.project).toMatchObject({ name: 'meu jogo' })
  })
})
