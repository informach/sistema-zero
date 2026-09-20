import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { GallerySubmission } from '@sistemazero/core/learning'
import {
  defaultLessonSection,
  evaluateLearning,
  type InteractiveBlock,
  type LearningManifest,
  videoWatchedFraction,
} from '@sistemazero/core/learning'
import { eq } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { LearningImportService } from '../../src/application/learning/learning-import.service'
import { stableJson } from '../../src/domain/shared/stable-json'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLearningRepository } from '../../src/infrastructure/persistence/drizzle/learning.repository'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleProfilePreferencesRepository } from '../../src/infrastructure/persistence/drizzle/profile-preferences.repository'
import {
  courses,
  learningAttempts,
  lessonAttachments,
  lessonBlockProgress,
  lessonBlocks,
  lessonCompletions,
  lessonDrafts,
  lessonProgress,
  lessonSectionProgress,
  lessonStructures,
  lessons,
  modules,
  quizAttempts,
  studioSubmissions,
  zappyKnowledgeChunks,
  zappyKnowledgeSources,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioSubmissionRepository } from '../../src/infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { DrizzleVideoPositionRepository } from '../../src/infrastructure/persistence/drizzle/video-position.repository'
import { DrizzleZappyKnowledgeRepository } from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import { lessonDraftCases } from './lesson-draft-cases'

// An explicitly named EMPTY disposable database is required. Never connects to DATABASE_URL.
const url = process.env.LEARNING_QA_DATABASE_URL
if (url && !/^\/sz_aulas_qa_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error('LEARNING_QA_DATABASE_URL must name a disposable sz_aulas_qa_* database.')
const connection = url ? createDbConnection(url) : null
const get = () => {
  if (!connection) throw new Error('Missing disposable database')
  return connection
}
const courseId = randomUUID(),
  moduleId = randomUUID(),
  lessonId = randomUUID()
const videoId = randomUUID(),
  quizId = randomUUID(),
  studioId = randomUUID(),
  attemptId = randomUUID()
const legacyEbookLessonId = randomUUID(),
  legacyEbookMatchingId = randomUUID(),
  legacyEbookMissingId = randomUUID(),
  legacyEbookAttachmentId = randomUUID(),
  legacyZappySourceId = randomUUID(),
  legacyZappyChunkId = randomUUID()
const owner = { userId: randomUUID(), accountId: randomUUID() }
const now = new Date('2026-09-08T12:00:00Z')
const project = { id: 'student-work', code: 'my original game' }
const activity: InteractiveBlock = {
  kind: 'interactive',
  title: 'Ordem das ações',
  instructions: 'Prepare a cena antes de desenhar.',
  hints: ['O desenho usa a preparação.'],
  required: true,
  activity: { type: 'html', html: '<p>Prepare a cena antes de desenhar.</p>' },
  checkpoint: {
    prompt: 'O que vem primeiro?',
    choices: [
      { id: 'prepare', label: 'Preparar' },
      { id: 'draw', label: 'Desenhar' },
    ],
    correctChoiceId: 'prepare',
    explanation: 'A preparação cria o que será desenhado.',
  },
}

/**
 * ⚠️ O bloco de CENA, para o caso do checkpoint. Ele usava a fixture de pergunta acima e as
 * chaves do modelo anterior (`experienceVersion`/`sequence`), então exercitava um caminho que
 * não existe mais: a proteção real mora em `sceneSequence`, e era justamente ela que o SQL do
 * `recordAttempt` tinha deixado de enxergar.
 */
const scene: InteractiveBlock = {
  kind: 'interactive',
  title: 'Faça o Dino aparecer',
  instructions: 'Crie o Dino e ligue o desenho.',
  hints: ['Olhe os bastidores.'],
  required: true,
  activity: { type: 'experimentation', scene: 'world' },
}

describe.skipIf(!url)(
  'learning upgrade and real persistence in an empty disposable database',
  () => {
    lessonDraftCases(() => get().db)
    beforeAll(async () => {
      const { db, sql } = get()
      // ⚠️ A pasta compartilha UM banco descartável e hoje são TRÊS arquivos que
      // rodam migrations do zero nele; exigir vazio só deixa o PRIMEIRO passar (o CI
      // de 12/09/2026). O nome já foi validado como descartável acima, então limpar
      // aqui é seguro e cada arquivo volta a começar do zero de verdade.
      await sql.unsafe('drop schema if exists members cascade')
      // O journal do drizzle mora no schema `drizzle`: sem apagá-lo junto, a volta
      // seguinte encontra `members_migrations` e recusa recriar a tabela.
      await sql.unsafe('drop schema if exists drizzle cascade')
      const folder = resolve(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      )
      const migrations = readMigrationFiles({ migrationsFolder: folder })
      // Establish the exact pre-change schema at 0077; historical enum upgrades commit independently.
      for (const migration of migrations.slice(0, 78))
        for (const statement of migration.sql) if (statement.trim()) await sql.unsafe(statement)
      await db.insert(courses).values({
        id: courseId,
        slug: 'learning-qa',
        title: 'Curso existente',
        audience: 'kids',
        createdAt: now,
        updatedAt: now,
      })
      // A fixture ainda está no schema 0077; o modelo Drizzle atual inclui colunas posteriores.
      await sql`insert into members.modules (id,course_id,title,sort_order,created_at,updated_at)
        values (${moduleId},${courseId},'Unidade',0,${now.toISOString()},${now.toISOString()})`
      await db.insert(lessons).values({
        id: lessonId,
        moduleId,
        courseId,
        slug: 'aula-qa',
        title: 'Aula existente',
        sortOrder: 0,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      await sql`insert into members.lessons (id,module_id,course_id,slug,title,sort_order,is_published,created_at,updated_at)
        values (${legacyEbookLessonId},${moduleId},${courseId},'livro-antigo','Livro antigo',1,true,${now.toISOString()},${now.toISOString()})`
      await sql`insert into members.lesson_attachments (id,lesson_id,label,url,file_type,size_bytes,sort_order)
        values (${legacyEbookAttachmentId},${legacyEbookLessonId},'Caderno','r2priv:livro/existente.pdf','application/pdf',null,0)`
      await sql`insert into members.lesson_blocks (id,lesson_id,kind,sort_order,content)
        values (${legacyEbookMatchingId},${legacyEbookLessonId},'ebook',0,
                ${JSON.stringify({ kind: 'ebook', url: 'r2priv:livro/existente.pdf', title: 'Caderno', zappyStudentNotebook: true })}::jsonb),
               (${legacyEbookMissingId},${legacyEbookLessonId},'ebook',1,
                ${JSON.stringify({ kind: 'ebook', url: 'r2priv:livro/sem-anexo.pdf', title: 'Mapa' })}::jsonb)`
      await sql`insert into members.zappy_knowledge_sources
        (id,course_id,lesson_id,block_id,block_revision,source_type,source_ref,content_hash,status,created_at,updated_at)
        values (${legacyZappySourceId},${courseId},${legacyEbookLessonId},${legacyEbookMatchingId},'old-block-revision',
                'student-notebook',${`block:${legacyEbookMatchingId}`},${'a'.repeat(64)},'ready',${now.toISOString()},${now.toISOString()})`
      await sql`insert into members.zappy_knowledge_chunks (id,source_id,position,content,normalized_text)
        values (${legacyZappyChunkId},${legacyZappySourceId},0,'Texto já extraído','texto ja extraido')`
      const legacyBlocks = [
        {
          id: videoId,
          lessonId,
          kind: 'video',
          sortOrder: 0,
          content: { kind: 'video', provider: 'file', src: '/original.mp4' },
        },
        {
          id: quizId,
          lessonId,
          kind: 'quiz',
          sortOrder: 1,
          content: {
            kind: 'quiz',
            questions: [
              {
                id: 'q',
                prompt: 'Qual vem primeiro?',
                choices: [
                  { id: 'a', label: 'Preparar' },
                  { id: 'b', label: 'Desenhar' },
                ],
                correctChoiceIds: ['a'],
              },
            ],
            passingScore: 100,
          },
        },
        {
          id: studioId,
          lessonId,
          kind: 'studio',
          sortOrder: 2,
          content: {
            kind: 'studio',
            initialProject: { formatVersion: 2 },
            chain: 'projeto-continuo',
          },
        },
      ]
      for (const block of legacyBlocks)
        await sql`insert into members.lesson_blocks (id,lesson_id,kind,sort_order,content) values (${block.id},${block.lessonId},${block.kind},${block.sortOrder},${JSON.stringify(block.content)}::jsonb)`
      await db.insert(quizAttempts).values({
        id: attemptId,
        userId: owner.userId,
        lessonId,
        blockId: quizId,
        courseId,
        score: 100,
        passed: true,
        answers: { q: ['a'] },
        createdAt: now,
      })
      await db.insert(studioSubmissions).values({
        id: randomUUID(),
        ...owner,
        blockId: studioId,
        lessonId,
        courseId,
        project,
        submittedAt: now,
      })
      await db
        .insert(lessonCompletions)
        .values({ id: randomUUID(), userId: owner.userId, courseId, lessonId, completedAt: now })
      await db.insert(lessonProgress).values({
        id: randomUUID(),
        userId: owner.userId,
        courseId,
        lessonId,
        positionSeconds: 87,
        updatedAt: now,
      })
      await sql`insert into members.practice_sessions (id,user_id,account_id,course_id,course_slug,lesson_id,block_id,title,quiz,created_at) values (${randomUUID()},${owner.userId},${owner.accountId},${courseId},'learning-qa',${lessonId},${quizId},'Legacy practice','{}',${now.toISOString()})`
      await sql`create schema if not exists drizzle`
      await sql`create table drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)`
      const baseline = migrations[77]
      if (!baseline) throw new Error('Missing migration 0077')
      await sql`insert into drizzle.members_migrations (hash,created_at) values (${baseline.hash},${baseline.folderMillis})`
      // Production migration runner applies 0078 onward, with its actual transaction behavior.
      await migrate(db, {
        migrationsFolder: folder,
        migrationsSchema: 'drizzle',
        migrationsTable: 'members_migrations',
      })
    }, 60000)
    test('migra livros antigos para IDs de arquivos da mesma aula sem perder o caderno', async () => {
      const { db } = get()
      const blocks = await db
        .select()
        .from(lessonBlocks)
        .where(eq(lessonBlocks.lessonId, legacyEbookLessonId))
      const attachments = await db
        .select()
        .from(lessonAttachments)
        .where(eq(lessonAttachments.lessonId, legacyEbookLessonId))
      expect(blocks).toHaveLength(2)
      expect(attachments).toHaveLength(2)
      expect(blocks.find((block) => block.id === legacyEbookMatchingId)?.content).toEqual({
        kind: 'ebook',
        attachmentId: legacyEbookAttachmentId,
        title: 'Caderno',
      })
      const newAttachment = attachments.find(
        (attachment) => attachment.id !== legacyEbookAttachmentId,
      )
      if (!newAttachment) throw new Error('A migração não criou o PDF sem anexo')
      expect(blocks.find((block) => block.id === legacyEbookMissingId)?.content).toEqual({
        kind: 'ebook',
        attachmentId: newAttachment.id,
        title: 'Mapa',
      })
      expect(
        attachments.find((attachment) => attachment.id === legacyEbookAttachmentId)
          ?.zappyStudentNotebook,
      ).toBe(true)
      expect(newAttachment?.url).toBe('r2priv:livro/sem-anexo.pdf')
      const [source] = await db
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.id, legacyZappySourceId))
      expect(source).toMatchObject({
        blockId: null,
        sourceRef: `attachment:${legacyEbookAttachmentId}`,
        blockRevision: createHash('md5').update('r2priv:livro/existente.pdf').digest('hex'),
        status: 'ready',
      })
      const [chunk] = await db
        .select()
        .from(zappyKnowledgeChunks)
        .where(eq(zappyKnowledgeChunks.id, legacyZappyChunkId))
      expect(chunk?.content).toBe('Texto já extraído')
    })
    test('rascunho anterior à migração não sofre falso conflito ao despublicar', async () => {
      const { db } = get()
      const reader = new DrizzleCourseRepository(db)
      const lesson = await reader.findLessonWithContent(legacyEbookLessonId)
      if (!lesson) throw new Error('Aula antiga não encontrada')
      const [structure] = await db
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, legacyEbookLessonId))
      const oldBlocks = lesson.blocks.map((block) => {
        const content = block.content
        if (content.kind !== 'ebook') return block
        const attachment = lesson.attachments.find((item) => item.id === content.attachmentId)
        if (!attachment) throw new Error('PDF antigo não encontrado')
        return {
          ...block,
          content: {
            kind: 'ebook',
            url: attachment.url,
            ...(content.title ? { title: content.title } : {}),
            ...(attachment.zappyStudentNotebook ? { zappyStudentNotebook: true } : {}),
          },
        }
      })
      const oldHash = createHash('sha256')
        .update(
          stableJson({
            title: lesson.title,
            slug: lesson.slug,
            estimatedMinutes: lesson.estimatedMinutes,
            blocks: oldBlocks,
            attachments: lesson.attachments.map(
              ({ zappyStudentNotebook: _notebook, ...attachment }) => attachment,
            ),
            sections: structure?.sections,
          }),
        )
        .digest('hex')
      const repo = new DrizzleLessonDraftRepository(db, parsePublishedLessonBlock)
      const draft = await repo.read(legacyEbookLessonId)
      await db
        .update(lessonDrafts)
        .set({ publishedRevision: oldHash })
        .where(eq(lessonDrafts.lessonId, legacyEbookLessonId))
      const result = await repo.unpublish(
        legacyEbookLessonId,
        randomUUID(),
        draft.revision,
        randomUUID(),
      )
      expect(result.isPublished).toBe(false)
    })
    test('a conversão dos rascunhos cria o PDF faltante e mantém a marcação do Zappy', async () => {
      const { sql } = get()
      const folder = resolve(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      )
      const createFunction = readMigrationFiles({ migrationsFolder: folder })
        .flatMap((migration) => migration.sql)
        .find((statement) => statement.includes('CREATE FUNCTION members.migrate_ebook_document'))
      if (!createFunction) throw new Error('Função da migração de livros não encontrada')
      await sql.unsafe(createFunction)
      try {
        const original = {
          title: 'Aula com caderno',
          blocks: [
            {
              id: randomUUID(),
              content: {
                kind: 'ebook',
                title: 'Caderno',
                url: 'r2priv:rascunho/caderno.pdf',
                zappyStudentNotebook: true,
              },
            },
          ],
          attachments: [],
        }
        const [row] = await sql.unsafe(
          'select members.migrate_ebook_document($1::jsonb) as document',
          [JSON.stringify(original)],
        )
        const document = row?.document as {
          blocks: Array<{ content: Record<string, unknown> }>
          attachments: Array<Record<string, unknown>>
        }
        expect(document.attachments).toHaveLength(1)
        expect(document.attachments[0]).toMatchObject({
          label: 'Caderno',
          url: 'r2priv:rascunho/caderno.pdf',
          fileType: 'application/pdf',
          zappyStudentNotebook: true,
        })
        expect(document.blocks[0]?.content).toEqual({
          kind: 'ebook',
          title: 'Caderno',
          attachmentId: document.attachments[0]?.id,
        })
        const [repeated] = await sql.unsafe(
          'select members.migrate_ebook_document($1::jsonb) as document',
          [JSON.stringify(document)],
        )
        expect(repeated?.document).toEqual(document)
      } finally {
        await sql.unsafe('drop function members.migrate_ebook_document(jsonb)')
      }
    })
    test('Zappy lê o PDF marcado sem Livro 3D e descarta extração antiga após troca ou desmarcação', async () => {
      const { db } = get()
      const courseId = randomUUID(),
        moduleId = randomUUID(),
        lessonId = randomUUID(),
        attachmentId = randomUUID()
      const firstUrl = 'r2priv:zappy/caderno-v1.pdf'
      await db.insert(courses).values({
        id: courseId,
        slug: `zappy-${courseId}`,
        title: 'Curso com caderno',
        audience: 'kids',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(modules).values({
        id: moduleId,
        courseId,
        title: 'Módulo',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessons).values({
        id: lessonId,
        moduleId,
        courseId,
        slug: 'caderno',
        title: 'Caderno',
        sortOrder: 0,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessonAttachments).values({
        id: attachmentId,
        lessonId,
        label: 'Caderno do aluno',
        url: firstUrl,
        fileType: 'application/pdf',
        sizeBytes: 42,
        zappyStudentNotebook: true,
        sortOrder: 0,
      })
      const repo = new DrizzleZappyKnowledgeRepository(db)
      const ref = `attachment:${attachmentId}`
      const firstRevision = createHash('md5').update(firstUrl).digest('hex')
      expect(await repo.sourceAuthorityForRef(ref)).toMatchObject({
        blockId: null,
        courseId,
        lessonId,
        blockRevision: firstRevision,
      })
      const input = {
        courseId,
        lessonId,
        blockId: null,
        blockRevision: firstRevision,
        sourceType: 'student-notebook' as const,
        sourceRef: ref,
        contentHash: createHash('sha256').update('Texto do caderno').digest('hex'),
        status: 'ready' as const,
        chunks: [{ content: 'Texto do caderno', normalizedText: 'texto do caderno' }],
        now,
      }
      expect(await repo.upsert(input)).toMatchObject({ changed: true })
      expect((await repo.search([lessonId], 'caderno', 5)).map((hit) => hit.content)).toEqual([
        'Texto do caderno',
      ])
      expect(
        (await repo.report()).coursesWithoutStudentNotebook.some(
          (course) => course.courseId === courseId,
        ),
      ).toBe(false)
      const comingSoonId = randomUUID()
      await db.insert(lessonBlocks).values({
        id: comingSoonId,
        lessonId,
        kind: 'coming_soon',
        sortOrder: 0,
        content: { kind: 'coming_soon', message: 'Em produção' },
      })
      expect(await repo.search([lessonId], 'caderno', 5)).toEqual([])
      await db.delete(lessonBlocks).where(eq(lessonBlocks.id, comingSoonId))
      const newUrl = 'r2priv:zappy/caderno-v2.pdf'
      await db
        .update(lessonAttachments)
        .set({ url: newUrl })
        .where(eq(lessonAttachments.id, attachmentId))
      expect(await repo.search([lessonId], 'caderno', 5)).toEqual([])
      expect(await repo.upsert(input)).toBeNull()
      const newRevision = createHash('md5').update(newUrl).digest('hex')
      expect(await repo.upsert({ ...input, blockRevision: newRevision })).toMatchObject({
        changed: true,
      })
      await db
        .update(lessonAttachments)
        .set({ zappyStudentNotebook: false })
        .where(eq(lessonAttachments.id, attachmentId))
      expect(await repo.search([lessonId], 'caderno', 5)).toEqual([])
      expect(await repo.sourceAuthorityForRef(ref)).toBeNull()
      expect(
        (await repo.report()).coursesWithoutStudentNotebook.some(
          (course) => course.courseId === courseId,
        ),
      ).toBe(true)
      expect(await repo.reconcilePublishedSources()).toBeGreaterThan(0)
    })
    test('a cor do perfil sobrevive ao reload, fica isolada e não recria conta apagada', async () => {
      const { db } = get(),
        repo = new DrizzleProfilePreferencesRepository(db)
      const profile = { userId: randomUUID(), accountId: randomUUID() },
        sibling = randomUUID()
      expect(await repo.getPalette(profile.userId)).toBeNull()
      await repo.setPalette(profile, 'pink', now)
      expect(await new DrizzleProfilePreferencesRepository(db).getPalette(profile.userId)).toBe(
        'pink',
      )
      // ⚠️ A migração RENOMEIA a coluna e normaliza 'padrao' para null: uma cor gravada tem de
      // atravessar a pasta inteira de migrações rodada do zero, que é o que este arquivo faz.
      expect(await repo.getPalette(sibling)).toBeNull()
      await new DrizzleUserDataPurgeRepository(db).purgeForUser({
        userIds: [profile.userId],
        accountId: profile.accountId,
        cleanup: {
          id: randomUUID(),
          prefixes: [`creations/${profile.userId}/`],
          createdAt: now,
          notBefore: now,
        },
      })
      expect(await repo.getPalette(profile.userId)).toBeNull()
      await expect(repo.setPalette(profile, 'pink', now)).rejects.toThrow('excluída')
    })
    test('concurrent watched intervals merge without replacing the earlier half', async () => {
      const { db } = get(),
        repo = new DrizzleLearningRepository(db)
      const learner = { userId: randomUUID(), accountId: randomUUID() }
      const [video] = await db.select().from(lessonBlocks).where(eq(lessonBlocks.id, videoId))
      if (!video) throw new Error('Missing video fixture')
      const progress = {
        blockId: videoId,
        revision: video.contentRevision,
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
        positionSeconds: 99,
        updatedAt: now.toISOString(),
      }
      await Promise.all(
        [['0:45'], ['45:90']].map((videoRanges) =>
          repo.saveProgress({
            ...learner,
            lessonId,
            progress: { ...progress, answers: { videoDuration: 100, videoRanges } },
          }),
        ),
      )
      const saved = (await repo.getProgress(learner, lessonId)).blocks.find(
        (b) => b.blockId === videoId,
      )
      expect(videoWatchedFraction(saved?.answers ?? {})).toBe(0.9)
    })
    test('concurrent required downloads merge by profile and reject a stale block revision', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      // Este teste escreve blocos: não pode alterar a aula histórica cujo upgrade
      // abaixo verifica a identidade e a ordem EXATAS dos três blocos legados.
      const materialsLesson = await content.createLesson(moduleId, courseId, {
        slug: 'materials-download-qa',
        title: 'Materiais',
        estimatedMinutes: null,
        isPublished: true,
      })
      const block = await content.createBlock(materialsLesson.id, 'materials', {
        kind: 'materials',
        items: [],
      })
      if (!block.contentRevision) throw new Error('Missing material revision')
      const learner = { userId: randomUUID(), accountId: randomUUID() }
      const record = (itemId: string, revision = block.contentRevision!) =>
        repo.recordMaterialDownload({
          ...learner,
          lessonId: materialsLesson.id,
          blockId: block.id,
          revision,
          itemId,
          at: now,
        })
      await Promise.all([record('one'), record('two'), record('one')])
      const saved = (await repo.getProgress(learner, materialsLesson.id)).blocks.find(
        (entry) => entry.blockId === block.id,
      )
      expect((saved?.answers.downloadedMaterialItemIds as string[]).sort()).toEqual(['one', 'two'])
      expect(
        (await repo.getProgress({ ...learner, userId: randomUUID() }, materialsLesson.id)).blocks,
      ).toEqual([])
      await expect(record('three', 'stale')).rejects.toThrow()
    })
    test('gallery confirmations serialize retries and never restore an older request over a newer delivery', async () => {
      const { db } = get(),
        content = new DrizzleContentAdminRepository(db),
        submissions = new DrizzleStudioSubmissionRepository(db)
      const galleryLesson = await content.createLesson(moduleId, courseId, {
        slug: 'gallery-qa',
        title: 'Galeria',
        estimatedMinutes: null,
        isPublished: true,
      })
      const block = await content.createBlock(galleryLesson.id, 'pinta', {
        kind: 'pinta',
        initialAsset: null,
        gallery: { minItems: 1, maxItems: 2 },
      })
      const learner = { userId: randomUUID(), accountId: randomUUID() },
        requestId = randomUUID()
      const snapshot: GallerySubmission = {
        kind: 'gallery-delivery',
        version: 1,
        tool: 'pinta',
        requestId,
        items: [
          {
            itemId: 'dino',
            revision: 1,
            name: 'Dino',
            kind: 'pixel-sprite',
            storageKey: `creations/${learner.userId}/lesson-submissions/${block.id}/${requestId}/dino-1/project.gz`,
            parts: [],
          },
        ],
      }
      const submission = {
        id: randomUUID(),
        ...learner,
        blockId: block.id,
        lessonId: galleryLesson.id,
        courseId,
        submittedAt: now,
        project: snapshot,
      }
      const options = { revision: block.contentRevision, galleryRequestId: requestId }
      await Promise.all([
        submissions.upsert(submission, options),
        submissions.upsert({ ...submission, id: randomUUID() }, options),
      ])
      expect((await submissions.getOne(learner.userId, block.id))?.previousSubmittedAt).toBeNull()
      expect(
        (await new DrizzleLearningRepository(db).listEvidence(learner, galleryLesson.id)).length,
      ).toBe(1)
      const nextId = randomUUID(),
        next = { ...snapshot, requestId: nextId }
      await submissions.upsert(
        { ...submission, project: next },
        { ...options, galleryRequestId: nextId },
      )
      await expect(submissions.upsert(submission, options)).rejects.toThrow('atualizada')
      expect((await submissions.getOne(learner.userId, block.id))?.project).toEqual(next)
    })
    afterAll(async () => {
      await connection?.close()
    })

    test('upgrade removes only practice, keeps block identities, submissions, quiz history and completion', async () => {
      const { db, sql } = get()
      const [table] = await sql`select to_regclass('members.practice_sessions') as practice`
      expect(table?.practice).toBeNull()
      const [structure] = await db
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, lessonId))
      expect(structure?.sections[0]?.blockIds).toEqual([videoId, quizId, studioId])
      expect(structure?.sections[0]?.id).toBe(lessonId)
      expect(
        (await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)))[0]?.passed,
      ).toBe(true)
      expect(
        (
          await db.select().from(studioSubmissions).where(eq(studioSubmissions.blockId, studioId))
        )[0]?.project,
      ).toEqual(project)
      expect(
        await db.select().from(lessonCompletions).where(eq(lessonCompletions.lessonId, lessonId)),
      ).toHaveLength(1)
      expect(
        (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId)))[0]
          ?.positionSeconds,
      ).toBe(87)
    })

    test('resume and member activity include block progress and section navigation without replacing legacy video positions', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const positions = new DrizzleVideoPositionRepository(db)
      const learner = { userId: randomUUID(), accountId: randomUUID() }
      const first = await content.createLesson(moduleId, courseId, {
        slug: 'resume-first',
        title: 'Primeira',
        estimatedMinutes: null,
        isPublished: true,
      })
      const second = await content.createLesson(moduleId, courseId, {
        slug: 'resume-second',
        title: 'Segunda',
        estimatedMinutes: null,
        isPublished: true,
      })
      const video = await content.createBlock(second.id, 'video', {
        kind: 'video',
        provider: 'vimeo',
        src: 'https://vimeo.com/123456789',
      })
      const oldTime = new Date('2026-09-01T12:00:00Z')
      const recentTime = new Date('2026-09-08T13:00:00Z')
      await positions.upsert(learner.userId, first.id, courseId, 87, oldTime)
      await repo.saveProgress({
        ...learner,
        lessonId: second.id,
        progress: {
          blockId: video.id,
          revision: video.contentRevision!,
          positionSeconds: 24,
          answers: {},
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: recentTime.toISOString(),
        },
      })
      expect(await positions.lastAccessedLessonId(learner.userId, courseId)).toBe(second.id)
      expect(
        (await positions.lastAccessedByCourseIds(learner.userId, [courseId])).get(courseId),
      ).toBe(second.id)
      expect((await positions.lastAccessByCourse(learner.userId)).get(courseId)).toEqual(recentTime)
      expect(
        (await positions.lastAccessByUsers([learner.userId])).get(learner.userId)?.get(courseId),
      ).toEqual(recentTime)
      expect(
        (await positions.listRecentAccessed(learner.userId, 5)).map((r) => r.lessonId),
      ).toEqual([second.id, first.id])
      expect(await positions.lastAccessedLessonId(randomUUID(), courseId)).toBeNull()
      expect(await positions.findPosition(learner.userId, first.id)).toBe(87)
      await repo.saveNavigation(learner, first.id, first.id)
      expect(await positions.lastAccessedLessonId(learner.userId, courseId)).toBe(first.id)
      expect(
        (await positions.listRecentAccessed(learner.userId, 5)).map((r) => r.lessonId),
      ).toEqual([first.id, second.id])
    })

    test('block CRUD maintains section coverage; concurrent section edits have one winner', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const added = await content.createBlock(lessonId, 'rich_text', {
        kind: 'rich_text',
        markdown: 'Novo texto',
      })
      const structure = await repo.getStructure(lessonId)
      if (!structure) throw new Error('Missing structure')
      expect(structure.sections.flatMap((s) => s.blockIds)).toContain(added.id)
      const outcomes = await Promise.all([
        repo.saveStructure(lessonId, structure.revision, structure.sections),
        repo.saveStructure(lessonId, structure.revision, structure.sections),
      ])
      expect(outcomes.filter(Boolean)).toHaveLength(1)
      await content.deleteBlock(added.id)
      expect(
        (await repo.getStructure(lessonId))?.sections.flatMap((s) => s.blockIds),
      ).not.toContain(added.id)
    })

    test('attempts are idempotent and isolated, new revisions reset passes while preserving history', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const block = await content.createBlock(lessonId, 'interactive', activity)
      if (!block.contentRevision) throw new Error('Missing revision')
      // A resposta correta só vale depois da participação na atividade; sem ela, o
      // avaliador não marca o bloco como concluído.
      const answers = { participated: true, checkpoint: 'prepare' }
      const attempt = {
        id: randomUUID(),
        blockId: block.id,
        revision: block.contentRevision,
        answers,
        hintsUsed: 1,
        result: evaluateLearning(activity, answers),
        createdAt: now.toISOString(),
      }
      await Promise.all([
        repo.recordAttempt(owner, lessonId, attempt),
        repo.recordAttempt(owner, lessonId, attempt),
      ])
      expect((await repo.getProgress(owner, lessonId)).blocks[0]).toMatchObject({
        attemptsCount: 1,
        result: { passed: true },
      })
      expect(
        (await repo.getProgress({ ...owner, accountId: randomUUID() }, lessonId)).blocks,
      ).toHaveLength(0)
      const updated = await content.updateBlock(block.id, 'interactive', {
        ...activity,
        instructions: 'Uma nova explicação.',
      })
      if (!updated?.contentRevision) throw new Error('Missing new revision')
      await repo.saveProgress({
        ...owner,
        lessonId,
        progress: {
          blockId: block.id,
          revision: updated.contentRevision,
          answers: {},
          positionSeconds: null,
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: now.toISOString(),
        },
      })
      expect((await repo.getProgress(owner, lessonId)).blocks[0]).toMatchObject({
        result: null,
        hintsUsed: 0,
        attemptsCount: 0,
      })
      expect(await repo.listAttempts(owner, lessonId)).toHaveLength(1)
      await expect(repo.recordAttempt(owner, lessonId, attempt)).rejects.toThrow()
    })

    test('experience checkpoints compare sequence under the owner lock and an older attempt preserves the current state', async () => {
      const { db } = get()
      const repo = new DrizzleLearningRepository(db)
      const content = new DrizzleContentAdminRepository(db)
      const block = await content.createBlock(lessonId, 'interactive', scene)
      if (!block.contentRevision) throw new Error('Missing revision')
      const progress = {
        blockId: block.id,
        revision: block.contentRevision,
        answers: { sceneCheckpoint: ['{"scene":"world"}'], sceneSequence: 1 },
        hintsUsed: 0,
        positionSeconds: null,
        attemptsCount: 0,
        result: null,
        updatedAt: now.toISOString(),
      }
      const races = await Promise.allSettled([
        repo.saveProgress({ ...owner, lessonId, progress, expectedExperienceSequence: null }),
        repo.saveProgress({
          ...owner,
          lessonId,
          progress: {
            ...progress,
            answers: { sceneCheckpoint: ['{"scene":"world"}'], sceneSequence: 2 },
          },
          expectedExperienceSequence: null,
        }),
      ])
      expect(races.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(races.filter((r) => r.status === 'rejected')).toHaveLength(1)
      const saved = (await repo.getProgress(owner, lessonId)).blocks.find(
        (p) => p.blockId === block.id,
      )
      if (!saved) throw new Error('Missing saved checkpoint')
      await repo.recordAttempt(owner, lessonId, {
        id: randomUUID(),
        blockId: block.id,
        revision: block.contentRevision,
        answers: { sceneCheckpoint: ['{"scene":"world"}'], sceneSequence: 0 },
        hintsUsed: 0,
        result: {
          participated: true,
          passed: false,
          feedback: 'Earlier observation',
          verifiedBy: 'client',
        },
        createdAt: now.toISOString(),
      })
      expect(
        (await repo.getProgress(owner, lessonId)).blocks.find((p) => p.blockId === block.id)
          ?.answers,
      ).toEqual(saved.answers)
    })

    test('import previews are read-only and reimport preserves IDs and original student work', async () => {
      const { db } = get()
      const reader = new DrizzleCourseRepository(db)
      const service = new LearningImportService(
        new DrizzleLessonDraftRepository(db, parsePublishedLessonBlock),
        reader,
      )
      const document: LearningManifest = {
        version: 5,
        courseSlug: 'learning-qa',
        lessonSlug: 'aula-qa',
        title: 'Nova organização',
        blocks: [
          {
            key: 'jogo',
            content: {
              kind: 'studio',
              chain: 'projeto-continuo',
              initialProject: {
                formatVersion: 2,
                name: 'Jogo',
                files: { 'index.html': '', 'style.css': '', 'script.js': '' },
                installedExtensions: [],
              },
            },
          },
          { key: 'descoberta', content: activity },
        ],
        sections: [
          {
            key: 'investigar',
            title: 'Investigar',
            objective: 'Comparar a ordem de preparação e desenho',
            intent: 'exploration',
            blockKeys: ['descoberta', 'jogo'],
            workspaceKey: 'jogo',
            externalTool: null,
            pendingMedia: ['Gravar exemplo curto'],
            completion: { version: 1, blockIds: ['descoberta'] },
          },
        ],
      }
      const preview = await service.preview(lessonId, document)
      const publishedBefore = await reader.findLessonWithContent(lessonId)
      const first = await service.apply(
        lessonId,
        document,
        preview.fingerprint,
        owner.userId,
        randomUUID(),
      )
      expect(await reader.findLessonWithContent(lessonId)).toEqual(publishedBefore)
      const next = await service.preview(lessonId, document)
      const second = await service.apply(
        lessonId,
        document,
        next.fingerprint,
        owner.userId,
        randomUUID(),
      )
      expect(second.blocks.map((b) => b.id)).toEqual(first.blocks.map((b) => b.id))
      expect(second.blocks.every((b) => b.action === 'preserve')).toBe(true)
      expect(
        (
          await db.select().from(studioSubmissions).where(eq(studioSubmissions.blockId, studioId))
        )[0]?.project,
      ).toEqual(project)
      expect(
        await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)),
      ).toHaveLength(1)
      const pending = await new DrizzleLessonDraftRepository(
        db,
        parsePublishedLessonBlock,
      ).validate(lessonId, second.revision, [])
      expect(pending.some((issue) => issue.message.includes('Vimeo'))).toBe(true)
    })

    test('section milestones reject stale publication and block evidence, serialize retries and preserve completion', async () => {
      const { db } = get()
      const repo = new DrizzleLearningRepository(db)
      const structure = await repo.getStructure(lessonId)
      if (!structure?.sections[0]) throw new Error('Missing structure')
      const [block] = await db.select().from(lessonBlocks).where(eq(lessonBlocks.id, videoId))
      if (!block) throw new Error('Missing block')
      const evidence = [{ id: block.id, revision: block.contentRevision }]
      const record = {
        sectionId: structure.sections[0].id,
        revision: '12345678901234567890123456789012',
        completedAt: now.toISOString(),
        projectPassed: true,
      }
      await expect(
        repo.saveSectionProgress(owner, lessonId, randomUUID(), [record], evidence),
      ).rejects.toThrow()
      await expect(
        repo.saveSectionProgress(
          owner,
          lessonId,
          structure.revision,
          [record],
          [{ id: block.id, revision: 'stale' }],
        ),
      ).rejects.toThrow()
      expect(await repo.getSectionProgress(owner, lessonId)).toHaveLength(0)
      await Promise.all([
        repo.saveSectionProgress(owner, lessonId, structure.revision, [record], evidence),
        repo.saveSectionProgress(owner, lessonId, structure.revision, [record], evidence),
      ])
      await repo.saveSectionProgress(
        owner,
        lessonId,
        structure.revision,
        [{ ...record, revision: 'changed', completedAt: null, projectPassed: false }],
        evidence,
      )
      expect(await repo.getSectionProgress(owner, lessonId)).toEqual([record])
      expect(
        await repo.getSectionProgress({ ...owner, userId: randomUUID() }, lessonId),
      ).toHaveLength(0)
      // Include explicit criteria in the source so clone coverage verifies portable references too.
      await db
        .update(lessonStructures)
        .set({
          sections: structure.sections.map((section, i) =>
            i === 0
              ? {
                  ...section,
                  completion: { version: 1 as const, blockIds: section.blockIds.slice(0, 1) },
                }
              : section,
          ),
        })
        .where(eq(lessonStructures.lessonId, lessonId))
    })

    test('clone remaps every section and workspace reference without copying student progress', async () => {
      const { db } = get()
      const clone = await new DrizzleContentAdminRepository(db).cloneCourseTree(courseId, {
        expectedSourceVersion: 0,
        expectedSourceAudience: 'kids',
        audience: 'adult',
        slug: 'learning-qa-clone',
        title: 'Clone',
        dropStudioUnlockBlocks: true,
      })
      if (!clone) throw new Error('Missing clone')
      const [clonedLesson] = await db.select().from(lessons).where(eq(lessons.courseId, clone.id))
      if (!clonedLesson) throw new Error('Missing cloned lesson')
      const [structure] = await db
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, clonedLesson.id))
      const blocks = await db
        .select()
        .from(lessonBlocks)
        .where(eq(lessonBlocks.lessonId, clonedLesson.id))
      expect(
        structure?.sections.every(
          (s) =>
            s.blockIds.every((id) => blocks.some((b) => b.id === id)) &&
            (s.completion?.blockIds.every((id) => blocks.some((b) => b.id === id)) ?? true) &&
            (!s.workspaceBlockId || blocks.some((b) => b.id === s.workspaceBlockId)),
        ),
      ).toBe(true)
      expect(structure?.sections[0]?.workspaceBlockId).not.toBe(studioId)
      expect(structure?.sections[0]?.completion?.blockIds).toHaveLength(1)
      expect(
        await db
          .select()
          .from(lessonSectionProgress)
          .where(eq(lessonSectionProgress.lessonId, clonedLesson.id)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonBlockProgress)
          .where(eq(lessonBlockProgress.lessonId, clonedLesson.id)),
      ).toHaveLength(0)
    })

    test('weekly topics use only visited current content owned by the profile, in the right week and audience', async () => {
      const { db } = get()
      const repo = new DrizzleLearningRepository(db)
      const reportOwner = { userId: randomUUID(), accountId: randomUUID() }
      const reportCourse = randomUUID(),
        reportModule = randomUUID(),
        reportLesson = randomUUID()
      const visitedBlock = randomUUID(),
        untouchedBlock = randomUUID(),
        revision = randomUUID().replaceAll('-', '')
      await db.insert(courses).values({
        id: reportCourse,
        slug: 'weekly-learning',
        title: 'Descobertas',
        audience: 'kids',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(modules).values({
        id: reportModule,
        courseId: reportCourse,
        title: 'Unidade',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessons).values({
        id: reportLesson,
        courseId: reportCourse,
        moduleId: reportModule,
        title: 'O salto',
        slug: 'salto',
        sortOrder: 0,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessonBlocks).values([
        {
          id: visitedBlock,
          lessonId: reportLesson,
          kind: 'interactive',
          content: activity,
          contentRevision: revision,
          sortOrder: 0,
        },
        {
          id: untouchedBlock,
          lessonId: reportLesson,
          kind: 'interactive',
          content: activity,
          sortOrder: 1,
        },
      ])
      await repo.saveStructure(reportLesson, null, [
        {
          id: randomUUID(),
          title: 'Gravidade',
          objective: 'Comparar dois saltos',
          intent: 'exploration',
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
          blockIds: [visitedBlock],
        },
        {
          id: randomUUID(),
          title: 'Ainda não explorado',
          objective: 'Tema futuro',
          intent: 'exploration',
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
          blockIds: [untouchedBlock],
        },
      ])
      await repo.saveProgress({
        ...reportOwner,
        lessonId: reportLesson,
        progress: {
          blockId: visitedBlock,
          revision,
          answers: {},
          hintsUsed: 0,
          positionSeconds: null,
          attemptsCount: 0,
          result: null,
          updatedAt: now.toISOString(),
        },
      })
      const since = new Date('2026-09-07T03:00:00Z'),
        until = new Date('2026-09-09T03:00:00Z')
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([
        { lessonId: reportLesson, lessonTitle: 'O salto', topics: ['Comparar dois saltos'] },
      ])
      expect(await repo.listActiveAccounts('kids', since, until)).toContain(reportOwner.accountId)
      expect(await repo.listProfileIdsByAccount(reportOwner.accountId, 'kids')).toEqual([
        reportOwner.userId,
      ])
      expect(await repo.listProfileIdsByAccount(reportOwner.accountId, 'adult')).toEqual([])
      expect(await repo.listProfileIdsByAccount(randomUUID(), 'kids')).toEqual([])
      expect(
        await repo.weeklyTopics(randomUUID(), reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, randomUUID(), 'kids', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'adult', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', until, until),
      ).toEqual([])
      await db
        .update(lessonBlocks)
        .set({ contentRevision: randomUUID().replaceAll('-', '') })
        .where(eq(lessonBlocks.id, visitedBlock))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      await db
        .update(lessonBlocks)
        .set({ contentRevision: revision })
        .where(eq(lessonBlocks.id, visitedBlock))
      await db.update(courses).set({ status: 'draft' }).where(eq(courses.id, reportCourse))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      expect(await repo.listActiveAccounts('kids', since, until)).not.toContain(
        reportOwner.accountId,
      )
      await db.update(courses).set({ status: 'published' }).where(eq(courses.id, reportCourse))
      await db.update(lessons).set({ isPublished: false }).where(eq(lessons.id, reportLesson))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
    })

    test('account purge covers learning data and prevents later recreation', async () => {
      const { db } = get()
      await new DrizzleUserDataPurgeRepository(db).purgeForUser({
        ...owner,
        userIds: [owner.userId],
        cleanup: { id: randomUUID(), prefixes: [], notBefore: now, createdAt: now },
      })
      expect(
        await db.select().from(learningAttempts).where(eq(learningAttempts.userId, owner.userId)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonBlockProgress)
          .where(eq(lessonBlockProgress.userId, owner.userId)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonSectionProgress)
          .where(eq(lessonSectionProgress.userId, owner.userId)),
      ).toHaveLength(0)
      const structure = await new DrizzleLearningRepository(db).getStructure(lessonId)
      if (!structure?.sections[0]) throw new Error('Missing structure')
      await expect(
        new DrizzleLearningRepository(db).saveSectionProgress(
          owner,
          lessonId,
          structure.revision,
          [
            {
              sectionId: structure.sections[0].id,
              revision: 'deleted',
              completedAt: now.toISOString(),
              projectPassed: false,
            },
          ],
          [],
        ),
      ).rejects.toThrow('excluída')
      await expect(
        new DrizzleLearningRepository(db).saveNavigation(
          owner,
          lessonId,
          defaultLessonSection(lessonId, 'Aula', []).id,
        ),
      ).rejects.toThrow('excluída')
    })
  },
)
