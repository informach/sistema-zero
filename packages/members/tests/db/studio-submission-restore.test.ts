import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { restoreStudioSubmissions } from '../../src/infrastructure/persistence/drizzle/studio-submission-restore'
import { prepareTestDatabase } from './test-database'

/**
 * A restauração de entregas apagadas (incidente 08/2026), contra Postgres real: o que
 * importa provar é o SQL — `ON CONFLICT (user_id, block_id) DO NOTHING` (nunca
 * sobrescreve a entrega viva), `lesson_id`/`course_id` lidos do BLOCO, o `account_id`
 * herdado de outra entrega da criança e o dry-run que não escreve.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — restauração de entregas PULADA.')
}

describe.skipIf(!testDatabaseUrl)('restauração de entregas apagadas (Postgres real)', () => {
  let conn: DbConnection

  const courseId = randomUUID()
  const moduleId = randomUUID()
  const lessonId = randomUUID()
  const studioBlockId = randomUUID()
  const pintaBlockId = randomUUID()
  const quizBlockId = randomUUID()
  const crianca = randomUUID()
  const responsavel = randomUUID()
  const project = { name: 'Projeto da aula', files: { 'index.html': '<p>oi</p>', 'script.js': '' } }
  const pintaProject = pintaAssetToWire({
    ...createLessonAsset('pixel-sprite', 16, 'heroi'),
    id: 'desenho-recuperado',
  })

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos da pasta (regra do CLAUDE.md): toda coluna
    // usada aqui está no `create` E num `add column if not exists`; colunas extras nullable.
    await conn.sql.unsafe(`create table if not exists members.courses (
      id uuid primary key,
      slug text,
      title text
    )`)
    for (const col of ['slug text', 'title text']) {
      await conn.sql.unsafe(`alter table members.courses add column if not exists ${col}`)
    }
    await conn.sql.unsafe(`create table if not exists members.modules (
      id uuid primary key,
      course_id uuid,
      title text,
      sort_order integer
    )`)
    for (const col of ['course_id uuid', 'title text', 'sort_order integer']) {
      await conn.sql.unsafe(`alter table members.modules add column if not exists ${col}`)
    }
    await conn.sql.unsafe(`create table if not exists members.lessons (
      id uuid primary key,
      module_id uuid,
      course_id uuid,
      slug text,
      title text,
      sort_order integer
    )`)
    for (const col of [
      'module_id uuid',
      'course_id uuid',
      'slug text',
      'title text',
      'sort_order integer',
    ]) {
      await conn.sql.unsafe(`alter table members.lessons add column if not exists ${col}`)
    }
    await conn.sql.unsafe(`create table if not exists members.lesson_blocks (
      id uuid primary key,
      lesson_id uuid,
      kind text,
      sort_order integer,
      content jsonb
    )`)
    for (const col of ['lesson_id uuid', 'kind text', 'sort_order integer', 'content jsonb']) {
      await conn.sql.unsafe(`alter table members.lesson_blocks add column if not exists ${col}`)
    }
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
      reviewed_by uuid
    )`)
    for (const col of [
      'id uuid',
      'account_id uuid',
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
    ]) {
      await conn.sql.unsafe(
        `alter table members.studio_submissions add column if not exists ${col}`,
      )
    }
    await conn.sql.unsafe(
      'create unique index if not exists studio_submissions_user_block_uq on members.studio_submissions (user_id, block_id)',
    )
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    await conn.sql.unsafe('truncate table members.studio_submissions cascade')
    await conn.sql.unsafe('truncate table members.lesson_blocks cascade')
    await conn.sql.unsafe('truncate table members.lessons cascade')
    await conn.sql.unsafe('truncate table members.modules cascade')
    await conn.sql.unsafe('truncate table members.courses cascade')
    await conn.sql`insert into members.courses (id, slug, title) values (${courseId}, ${`curso-${courseId.slice(0, 8)}`}, 'Curso')`
    await conn.sql`insert into members.modules (id, course_id, title, sort_order) values (${moduleId}, ${courseId}, 'M1', 0)`
    await conn.sql`insert into members.lessons (id, module_id, course_id, slug, title, sort_order)
      values (${lessonId}, ${moduleId}, ${courseId}, ${`aula-${lessonId.slice(0, 8)}`}, 'Dia 1', 0)`
    await conn.sql`insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content)
      values (${studioBlockId}, ${lessonId}, 'studio', 0, '{"kind":"studio"}'::jsonb),
             (${pintaBlockId}, ${lessonId}, 'pinta', 1, '{"kind":"pinta"}'::jsonb),
             (${quizBlockId}, ${lessonId}, 'quiz', 2, '{"kind":"quiz"}'::jsonb)`
  })

  const item = (extra: Record<string, unknown> = {}) => ({
    userId: crianca,
    blockId: studioBlockId,
    project,
    submittedAt: '2026-08-02T14:05:20.602Z',
    accountId: responsavel,
    source: 'teste',
    ...extra,
  })

  test('insere quando não há linha, com lesson/course do BLOCO e os metadados do manifesto', async () => {
    const result = await restoreStudioSubmissions(
      conn.sql,
      [item({ message: '  oi professora  ', passedAt: '2026-08-02T14:06:00.000Z' })],
      { dryRun: false, newId: randomUUID },
    )
    expect(result.inserted).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)

    const rows = await conn.sql`
      select user_id::text as user_id, account_id::text as account_id, block_id::text as block_id,
             lesson_id::text as lesson_id, course_id::text as course_id, project, submitted_at, passed_at,
             message, score, checked_at
        from members.studio_submissions`
    expect(rows).toHaveLength(1)
    const row = rows[0] as Record<string, unknown>
    expect(row.user_id).toBe(crianca)
    expect(row.account_id).toBe(responsavel)
    expect(row.lesson_id).toBe(lessonId)
    expect(row.course_id).toBe(courseId)
    expect(row.project).toEqual(project)
    expect(new Date(row.submitted_at as string).toISOString()).toBe('2026-08-02T14:05:20.602Z')
    expect(new Date(row.passed_at as string).toISOString()).toBe('2026-08-02T14:06:00.000Z')
    expect(row.message).toBe('oi professora')
    expect(row.score).toBeNull()
    expect(row.checked_at).toBeNull()
  })

  test('restaura uma entrega Pinta no formato real do asset, sem exigir `files`', async () => {
    const result = await restoreStudioSubmissions(
      conn.sql,
      [item({ blockId: pintaBlockId, project: pintaProject, source: 'pinta' })],
      { dryRun: false, newId: randomUUID },
    )
    expect(result.inserted).toEqual([
      expect.objectContaining({ blockId: pintaBlockId, source: 'pinta' }),
    ])
    expect(result.skipped).toHaveLength(0)
    const [row] =
      await conn.sql`select project from members.studio_submissions where block_id = ${pintaBlockId}`
    expect((row as { project: unknown }).project).toEqual(pintaProject)
  })

  test('🚨 NUNCA sobrescreve uma entrega viva (a criança que reenviou vence)', async () => {
    const vivo = { name: 'reenvio da criança', files: { 'index.html': '<p>novo</p>' } }
    await conn.sql`insert into members.studio_submissions (id, user_id, account_id, block_id, lesson_id, course_id, project, submitted_at)
      values (${randomUUID()}, ${crianca}, ${responsavel}, ${studioBlockId}, ${lessonId}, ${courseId}, ${JSON.stringify(vivo)}::jsonb, now())`

    const result = await restoreStudioSubmissions(conn.sql, [item()], {
      dryRun: false,
      newId: randomUUID,
    })
    expect(result.inserted).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]?.reason).toContain('já existe')

    const [row] =
      await conn.sql`select project from members.studio_submissions where user_id = ${crianca}`
    expect((row as { project: unknown }).project).toEqual(vivo)
  })

  test('dry-run valida tudo e não escreve nada', async () => {
    const result = await restoreStudioSubmissions(conn.sql, [item()], {
      dryRun: true,
      newId: randomUUID,
    })
    expect(result.dryRun).toBe(true)
    expect(result.inserted).toHaveLength(1)
    const [count] = await conn.sql`select count(*)::int as n from members.studio_submissions`
    expect((count as { n: number }).n).toBe(0)
  })

  test('herda o account_id de outra entrega da criança quando o manifesto não traz', async () => {
    const outroBloco = randomUUID()
    await conn.sql`insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content)
      values (${outroBloco}, ${lessonId}, 'studio', 3, '{"kind":"studio"}'::jsonb)`
    await conn.sql`insert into members.studio_submissions (id, user_id, account_id, block_id, lesson_id, course_id, project, submitted_at)
      values (${randomUUID()}, ${crianca}, ${responsavel}, ${outroBloco}, ${lessonId}, ${courseId}, '{"files":{}}'::jsonb, now())`

    const result = await restoreStudioSubmissions(conn.sql, [item({ accountId: undefined })], {
      dryRun: false,
      newId: randomUUID,
    })
    expect(result.inserted).toHaveLength(1)
    const [row] =
      await conn.sql`select account_id::text as account_id from members.studio_submissions where block_id = ${studioBlockId}`
    expect((row as { account_id: string }).account_id).toBe(responsavel)
  })

  test('pula bloco inexistente, bloco que não é studio/pinta e project sem `files` — sem abortar os demais', async () => {
    const result = await restoreStudioSubmissions(
      conn.sql,
      [
        item({ blockId: randomUUID(), source: 'sumido' }),
        item({ blockId: quizBlockId, source: 'quiz' }),
        item({ project: { name: 'sem files' }, source: 'torto' }),
        item({ source: 'bom' }),
      ],
      { dryRun: false, newId: randomUUID },
    )
    expect(result.inserted.map((r) => r.source)).toEqual(['bom'])
    expect(result.skipped.map((r) => [r.source, r.reason])).toEqual([
      ['sumido', 'bloco não existe'],
      ['quiz', 'bloco é quiz, não studio/pinta'],
      ['torto', 'project não é um objeto com `files`'],
    ])
    const [count] = await conn.sql`select count(*)::int as n from members.studio_submissions`
    expect((count as { n: number }).n).toBe(1)
  })
})
