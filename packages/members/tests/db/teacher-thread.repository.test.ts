import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleTeacherThreadRepository } from '../../src/infrastructure/persistence/drizzle/teacher-thread.repository'
import { prepareTestDatabase } from './test-database'

const TEST_DB_NAME = 'sistemazero_teacher_threads_test'

const testDatabaseUrl = await prepareTestDatabase(TEST_DB_NAME)
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste de recados PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleTeacherThreadRepository no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`
      do $$ begin
        create type members.teacher_thread_context as enum ('studio_submission', 'mural_publication', 'general');
      exception when duplicate_object then null; end $$;
      do $$ begin
        create type members.teacher_message_role as enum ('teacher', 'student');
      exception when duplicate_object then null; end $$;
      -- ⚠️ Os blocos \`add column if not exists\` abaixo NÃO são redundância do \`create table\`:
      -- o banco de tests/db é COMPARTILHADO e outro arquivo da pasta pode ter criado estas
      -- MESMAS tabelas antes, com menos colunas — aí o \`create table if not exists\` vira
      -- no-op e a tabela fica capenga. Quem chega primeiro vence, e a ordem dos arquivos não
      -- é contrato. Toda coluna usada aqui precisa aparecer NOS DOIS lugares (o bloco do
      -- \`teacher_messages\` estava pela metade e quebrava conforme a ordem do runner).
      create table if not exists members.teacher_threads (
        id uuid primary key,
        user_id uuid not null,
        account_id uuid,
        audience text not null,
        context_type members.teacher_thread_context not null,
        context_ref text,
        broadcast_id uuid,
        workflow_status text not null default 'waiting_student',
        course_id uuid,
        lesson_id uuid,
        title text,
        last_message_at timestamptz not null,
        student_last_read_at timestamptz,
        teacher_last_read_at timestamptz,
        created_at timestamptz not null
      );
       create table if not exists members.teacher_messages (
        id uuid primary key,
        thread_id uuid not null references members.teacher_threads(id) on delete cascade,
        author_role members.teacher_message_role not null,
        author_id uuid,
        author_name text,
        body varchar(8000) not null,
         created_at timestamptz not null
       );
       create table if not exists members.teacher_thread_staff_reads (
         thread_id uuid not null references members.teacher_threads(id) on delete cascade,
         staff_user_id uuid not null,
         read_at timestamptz not null,
         primary key (thread_id, staff_user_id)
       );
      alter table members.teacher_threads
        add column if not exists account_id uuid,
        add column if not exists audience text not null default 'kids',
        add column if not exists context_type members.teacher_thread_context not null default 'general',
        add column if not exists context_ref text,
        add column if not exists broadcast_id uuid,
        add column if not exists workflow_status text not null default 'waiting_student',
        add column if not exists course_id uuid,
        add column if not exists lesson_id uuid,
        add column if not exists title text,
        add column if not exists last_message_at timestamptz not null default now(),
        add column if not exists student_last_read_at timestamptz,
        add column if not exists teacher_last_read_at timestamptz,
        add column if not exists created_at timestamptz not null default now();
      alter table members.teacher_messages
        add column if not exists help_context jsonb,
        add column if not exists author_role members.teacher_message_role not null default 'teacher',
        add column if not exists author_id uuid,
        add column if not exists author_name text,
        add column if not exists body varchar(8000) not null default '',
        add column if not exists created_at timestamptz not null default now();
      -- A leitura junta com courses para devolver o título do curso. Outros arquivos da
      -- pasta criam esta tabela com colunas diferentes (alguns com slug/title NOT NULL sem
      -- default): por isso o insert do teste sempre manda slug e title.
      create table if not exists members.courses (id uuid primary key, slug text, title text);
      alter table members.courses
        add column if not exists slug text,
        add column if not exists title text;
    `)
  })

  afterAll(async () => {
    await conn?.close()
  })

  test('pagina no banco e não toca a ordem quando um id determinístico é repetido', async () => {
    const repo = new DrizzleTeacherThreadRepository(conn.db)
    const userId = randomUUID()
    const startedAt = new Date('2027-06-01T12:00:00.000Z')
    const threadId = await repo.ensureThread({
      userId,
      accountId: userId,
      audience: 'kids',
      contextType: 'general',
      contextRef: null,
      now: startedAt,
    })

    try {
      for (let i = 0; i < 51; i++) {
        await repo.appendMessage({
          threadId,
          authorRole: 'teacher',
          authorId: randomUUID(),
          authorName: 'Prof',
          body: `Mensagem ${i}`,
          now: new Date(startedAt.getTime() + i * 1_000),
        })
      }

      const latest = await repo.listMessages(threadId)
      expect(latest.messages).toHaveLength(50)
      expect(latest.messages[0]?.body).toBe('Mensagem 1')
      expect(latest.nextCursor).not.toBeNull()
      const older = await repo.listMessages(threadId, latest.nextCursor ?? undefined)
      expect(older.messages.map((message) => message.body)).toEqual(['Mensagem 0'])

      const beforeDuplicate = await repo.findById(threadId)
      const duplicateId = randomUUID()
      // ⚠️ O MESMO autor nas duas chamadas: o que se repete num retry é o evento
      // inteiro. Sorteando um `authorId` novo, a guarda de id reusado com conteúdo
      // diferente reprova com `ValidationError` antes de chegar ao que este teste
      // quer medir (que repetir não mexe no `last_message_at` nem na ordem).
      const duplicateAuthorId = randomUUID()
      const duplicateAt = new Date(startedAt.getTime() + 60_000)
      await repo.appendMessage({
        threadId,
        authorRole: 'teacher',
        authorId: duplicateAuthorId,
        authorName: 'Prof',
        body: 'Evento idempotente',
        now: duplicateAt,
        messageId: duplicateId,
      })
      const afterFirst = await repo.findById(threadId)
      await repo.appendMessage({
        threadId,
        authorRole: 'teacher',
        authorId: duplicateAuthorId,
        authorName: 'Prof',
        body: 'Evento idempotente',
        now: new Date(duplicateAt.getTime() + 60_000),
        messageId: duplicateId,
      })
      const afterRetry = await repo.findById(threadId)

      expect(afterFirst?.lastMessageAt).toEqual(duplicateAt)
      expect(afterRetry?.lastMessageAt).toEqual(afterFirst?.lastMessageAt)
      expect(afterFirst?.lastMessageAt).not.toEqual(beforeDuplicate?.lastMessageAt)
    } finally {
      await conn.sql`delete from members.teacher_threads where id = ${threadId}`
    }
  })

  test('devolve o título ATUAL do curso na conversa e na caixa do professor', async () => {
    const repo = new DrizzleTeacherThreadRepository(conn.db)
    const userId = randomUUID()
    const courseId = randomUUID()
    const semCursoId = randomUUID()
    const now = new Date('2027-06-02T12:00:00.000Z')
    await conn.sql`
      insert into members.courses (id, slug, title)
      values (${courseId}, ${`curso-${courseId}`}, 'Cadê Todo Mundo?')`
    const threadId = await repo.ensureThread({
      userId,
      accountId: userId,
      audience: 'kids',
      contextType: 'general',
      contextRef: null,
      courseId,
      title: 'Aula 1 · Seção 2',
      now,
    })
    // Curso que não existe mais (snapshot sem FK): o título vem null, sem quebrar a leitura.
    const orfaId = await repo.ensureThread({
      userId,
      accountId: userId,
      audience: 'kids',
      contextType: 'general',
      contextRef: null,
      courseId: semCursoId,
      now: new Date(now.getTime() + 1_000),
    })
    try {
      expect((await repo.findById(threadId))?.courseTitle).toBe('Cadê Todo Mundo?')
      expect((await repo.findById(orfaId))?.courseTitle).toBeNull()

      const caixa = await repo.listForAdmin({
        staffUserId: randomUUID(),
        userIds: [userId],
        limit: 10,
        offset: 0,
      })
      expect(caixa.find((t) => t.id === threadId)?.courseTitle).toBe('Cadê Todo Mundo?')
      expect(caixa.find((t) => t.id === orfaId)?.courseTitle).toBeNull()

      await conn.sql`update members.courses set title = 'Curso renomeado' where id = ${courseId}`
      expect((await repo.findById(threadId))?.courseTitle).toBe('Curso renomeado')
    } finally {
      await conn.sql`delete from members.teacher_threads where id in (${threadId}, ${orfaId})`
      await conn.sql`delete from members.courses where id = ${courseId}`
    }
  })
})
