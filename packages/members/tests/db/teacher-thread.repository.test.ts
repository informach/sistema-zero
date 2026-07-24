import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleTeacherThreadRepository } from '../../src/infrastructure/persistence/drizzle/teacher-thread.repository'

const TEST_DB_NAME = 'sistemazero_teacher_threads_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function prepareTestDatabase(): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    return withDatabase(baseUrl, TEST_DB_NAME)
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
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
      create table if not exists members.teacher_threads (
        id uuid primary key,
        user_id uuid not null,
        account_id uuid,
        audience text not null,
        context_type members.teacher_thread_context not null,
        context_ref text,
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
        add column if not exists course_id uuid,
        add column if not exists lesson_id uuid,
        add column if not exists title text,
        add column if not exists last_message_at timestamptz not null default now(),
        add column if not exists student_last_read_at timestamptz,
        add column if not exists teacher_last_read_at timestamptz,
        add column if not exists created_at timestamptz not null default now();
      alter table members.teacher_messages
        add column if not exists author_id uuid,
        add column if not exists author_name text;
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
      const duplicateAt = new Date(startedAt.getTime() + 60_000)
      await repo.appendMessage({
        threadId,
        authorRole: 'teacher',
        authorId: randomUUID(),
        authorName: 'Prof',
        body: 'Evento idempotente',
        now: duplicateAt,
        messageId: duplicateId,
      })
      const afterFirst = await repo.findById(threadId)
      await repo.appendMessage({
        threadId,
        authorRole: 'teacher',
        authorId: randomUUID(),
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
})
