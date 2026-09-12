import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { Elysia } from 'elysia'
import { CheckAccessService } from '../../src/application/access/check-access.service'
import { TeacherBroadcastsService } from '../../src/application/teacher-threads/teacher-broadcasts.service'
import { TeacherThreadsService } from '../../src/application/teacher-threads/teacher-threads.service'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import {
  teacherBroadcastRecipients,
  teacherMessages,
  teacherThreads,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleTeacherBroadcastRepository } from '../../src/infrastructure/persistence/drizzle/teacher-broadcast.repository'
import { DrizzleTeacherThreadRepository } from '../../src/infrastructure/persistence/drizzle/teacher-thread.repository'
import { teacherBroadcastRoutes } from '../../src/interfaces/http/routes/teacher-broadcast.routes'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const url = process.env.LEARNING_QA_DATABASE_URL
if (url && !/^\/sz_aulas_qa_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error('Disposable database required')
const connection = url ? createDbConnection(url) : null
const get = () => {
  if (!connection) throw new Error('Missing disposable database')
  return connection
}

describe.skipIf(!url)('Kids teacher broadcasts against PostgreSQL', () => {
  beforeAll(async () => {
    const { sql } = get()
    // ⚠️ A pasta `tests/db` compartilha UM banco descartável, e desde 09/2026 são
    // TRÊS arquivos que rodam as migrations do zero nele. Exigir o banco vazio faz
    // só o PRIMEIRO passar: os outros encontram o schema que ele criou e reprovam
    // com "Database must be empty" — foi o CI de 12/09/2026. O nome já foi validado
    // acima como descartável (`sz_aulas_qa_*`), então limpar aqui é seguro e deixa
    // cada arquivo começar do zero de verdade.
    await sql.unsafe('drop schema if exists members cascade')
    // O journal do drizzle mora no schema `drizzle`: sem apagá-lo junto, a volta
    // seguinte encontra `members_migrations` e recusa recriar a tabela.
    await sql.unsafe('drop schema if exists drizzle cascade')
    for (const migration of readMigrationFiles({
      migrationsFolder: resolve(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
    })) {
      for (const statement of migration.sql) if (statement.trim()) await sql.unsafe(statement)
    }
  }, 60_000)
  afterAll(async () => {
    await connection?.close()
  })

  test('a frozen audience gets private deliveries exactly once across concurrent workers and retries', async () => {
    const { db } = get()
    const repo = new DrizzleTeacherBroadcastRepository(db)
    const threads = new TeacherThreadsService(
      new DrizzleTeacherThreadRepository(db),
      () => new Date(),
    )
    const authorId = randomUUID(),
      id = randomUUID()
    const children = Array.from({ length: 3 }, (_, i) => ({
      profileId: randomUUID(),
      accountId: randomUUID(),
      name: `Criança ${i}`,
      accountName: 'Responsável',
      accountEmail: `parent${i}@example.test`,
    }))
    await repo.create(
      {
        id,
        authorId,
        authorName: 'Professora',
        audience: { kind: 'kids' },
        title: 'Encontro',
        body: 'Vamos criar juntos!',
        createdAt: new Date(),
      },
      children,
    )
    expect(await repo.deliverBatch(new Date(), 10)).toBe(0)
    expect(await repo.confirm(id, randomUUID(), new Date())).toBe(false)
    expect(await repo.confirm(id, authorId, new Date())).toBe(true)
    await Promise.all([repo.deliverBatch(new Date(), 10), repo.deliverBatch(new Date(), 10)])
    expect(await repo.find(id)).toMatchObject({ recipients: 3, delivered: 3, failed: 0, read: 0 })
    await repo.confirm(id, authorId, new Date())
    await repo.retry(id)
    await repo.deliverBatch(new Date(), 10)
    const deliveries = await repo.recipients(id, 0, 50)
    expect(new Set(deliveries.map((r) => r.threadId)).size).toBe(3)
    for (const delivery of deliveries) {
      const thread = await threads.getForStudent(delivery.profileId, 'kids', delivery.threadId)
      expect(thread.messages).toHaveLength(1)
      await expect(threads.getForStudent(randomUUID(), 'kids', delivery.threadId)).rejects.toThrow()
    }
    const first = deliveries[0]
    if (!first) throw new Error('Missing delivery')
    expect(
      await threads.listForAdmin({ staffUserId: authorId, limit: 30, offset: 0 }),
    ).toHaveLength(0)
    await threads.markReadByStudent(first.profileId, 'kids', first.threadId)
    expect(await repo.find(id)).toMatchObject({ read: 1 })
    await threads.studentReply(first.profileId, 'kids', first.threadId, 'Qual horário?')
    const inbox = await threads.listForAdmin({
      staffUserId: authorId,
      workflowStatus: 'waiting_teacher',
      limit: 30,
      offset: 0,
    })
    expect(inbox.map((r) => r.id)).toEqual([first.threadId])
    await threads.markReadByTeacher(first.threadId, authorId)
    expect((await threads.getForAdmin(first.threadId)).workflowStatus).toBe('waiting_teacher')
    expect(await threads.markAllReadByTeacher(authorId, { userIds: [randomUUID()] })).toEqual({
      updated: 0,
    })
    expect(
      await threads.markAllReadByTeacher(authorId, {
        userIds: [first.profileId],
        workflowStatus: 'resolved',
      }),
    ).toEqual({ updated: 0 })
    await threads.setWorkflowStatus(first.threadId, 'resolved')
    await threads.studentReply(first.profileId, 'kids', first.threadId, 'Mais uma dúvida')
    expect((await threads.getForAdmin(first.threadId)).workflowStatus).toBe('waiting_teacher')
    expect(
      await threads.markAllReadByTeacher(authorId, {
        userIds: [first.profileId],
        workflowStatus: 'waiting_teacher',
      }),
    ).toEqual({ updated: 1 })
  })

  test('a failed delivery rolls back its conversation and can be retried without repeating successful deliveries', async () => {
    const { db, sql } = get()
    const repo = new DrizzleTeacherBroadcastRepository(db)
    const id = randomUUID(),
      authorId = randomUUID()
    const child = {
      profileId: randomUUID(),
      accountId: randomUUID(),
      name: 'Falha',
      accountName: 'Teste',
      accountEmail: 'test@example.test',
    }
    await repo.create(
      {
        id,
        authorId,
        authorName: 'Prof',
        audience: { kind: 'student', profileId: child.profileId },
        title: 'Teste',
        body: 'Mensagem',
        createdAt: new Date(),
      },
      [child],
    )
    await repo.confirm(id, authorId, new Date())
    const [delivery] = await repo.recipients(id, 0, 1)
    if (!delivery) throw new Error('Missing delivery')
    await sql.unsafe(
      `create function members.qa_fail_message() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$; create trigger qa_fail_message before insert on members.teacher_messages for each row execute function members.qa_fail_message()`,
    )
    try {
      await repo.deliverBatch(new Date(), 10)
    } finally {
      await sql.unsafe(
        'drop trigger qa_fail_message on members.teacher_messages; drop function members.qa_fail_message()',
      )
    }
    expect(await repo.find(id)).toMatchObject({ failed: 1, delivered: 0 })
    expect(
      await db.select().from(teacherThreads).where(eq(teacherThreads.id, delivery.threadId)),
    ).toHaveLength(0)
    await repo.retry(id)
    await repo.deliverBatch(new Date(), 10)
    expect(await repo.find(id)).toMatchObject({ failed: 0, delivered: 1 })
    expect(
      await db
        .select()
        .from(teacherMessages)
        .where(eq(teacherMessages.threadId, delivery.threadId)),
    ).toHaveLength(1)
  })

  test('server resolves all pages of eligible children, course access and fresh profiles with no prior conversation', async () => {
    const env = buildApp()
    const course = seedSampleCourse(env.courses, 'kids-message-qa', 'published', 'kids')
    const kids = Array.from({ length: 205 }, (_, index) => ({
      profileId: randomUUID(),
      accountId: randomUUID(),
      name: `Aluno ${index}`,
      accountName: 'Pai',
      accountEmail: `p${index}@example.test`,
    }))
    for (const child of kids.slice(0, 204))
      grantLifetime(env.entitlements, { userId: child.accountId, courseRef: course.slug })
    const repo = new DrizzleTeacherBroadcastRepository(get().db)
    const service = new TeacherBroadcastsService(
      repo,
      {
        list: async ({ offset, limit }) => ({
          total: kids.length,
          items: kids.slice(offset, offset + limit),
        }),
      },
      env.courses,
      env.entitlements,
      new CheckAccessService(
        env.courses,
        env.entitlements,
        env.gamification,
        () => env.clockRef.now,
      ),
      () => env.clockRef.now,
    )
    const input = {
      id: randomUUID(),
      authorId: randomUUID(),
      authorName: 'Prof',
      audience: { kind: 'kids' as const },
      title: 'Todos',
      body: 'Recado',
    }
    expect(await service.prepare(input)).toMatchObject({ recipients: 204 })
    kids.push({
      profileId: randomUUID(),
      accountId: randomUUID(),
      name: 'Novo',
      accountName: 'Pai',
      accountEmail: 'new@example.test',
    })
    expect(await service.prepare(input)).toMatchObject({ recipients: 204 })
    await expect(service.prepare({ ...input, body: 'Alterado' })).rejects.toThrow()
    expect(
      await service.prepare({
        ...input,
        id: randomUUID(),
        audience: { kind: 'course', courseId: course.courseId },
      }),
    ).toMatchObject({ recipients: 204 })
    const app = new Elysia().use(teacherBroadcastRoutes(service, true))
    expect(
      (await app.handle(new Request('http://localhost/teacher-threads/broadcasts'))).status,
    ).not.toBe(200)
    expect(
      await get()
        .db.select()
        .from(teacherBroadcastRecipients)
        .where(eq(teacherBroadcastRecipients.broadcastId, input.id)),
    ).toHaveLength(204)
  })
})
