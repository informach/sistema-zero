import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  defaultLessonSection,
  evaluateLearning,
  type InteractiveBlock,
  isLearningManifest,
  type LessonDraft,
  type LessonDraftChange,
} from '@sistemazero/core/learning'
import { createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import { eq, sql } from 'drizzle-orm'
import { LearningImportService } from '../../src/application/learning/learning-import.service'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import type { Database } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLearningRepository } from '../../src/infrastructure/persistence/drizzle/learning.repository'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import {
  courses,
  lessonAttachments,
  lessonBlocks,
  lessonCompletions,
  lessonStructures,
  lessons,
  modules,
  studioSubmissions,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'

const actor = randomUUID()
const interactive: InteractiveBlock = {
  kind: 'interactive',
  title: 'Ordene',
  instructions: 'Prepare e desenhe.',
  hints: [],
  required: true,
  activity: {
    type: 'sequence',
    mode: 'order',
    items: [
      { id: 'a', label: 'Preparar' },
      { id: 'b', label: 'Desenhar' },
    ],
    solution: ['a', 'b'],
    targets: [],
  },
}

/** Registered inside the upgrade suite, after actual migrations; all cases own their lesson fixtures. */
export function lessonDraftCases(getDb: () => Database) {
  async function fixture() {
    const db = getDb(),
      now = new Date(),
      courseId = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID()
    await db.insert(courses).values({
      id: courseId,
      slug: courseId,
      title: 'Curso',
      audience: 'kids',
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
      slug: 'aula',
      title: 'Publicada',
      sortOrder: 0,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    const repo = new DrizzleLessonDraftRepository(db, parsePublishedLessonBlock)
    const reader = new DrizzleCourseRepository(db),
      content = new DrizzleContentAdminRepository(db)
    const change = (draft: LessonDraft, change: LessonDraftChange) =>
      repo.change(lessonId, actor, {
        expectedRevision: draft.revision,
        operationId: randomUUID(),
        change,
      })
    const publish = (draft: LessonDraft, ready: string[] = []) =>
      repo.publish(lessonId, actor, draft.revision, randomUUID(), ready)
    return { db, now, courseId, moduleId, lessonId, repo, reader, content, change, publish }
  }
  describe('shared lesson draft and atomic publication', () => {
    test('publication refuses impossible Studio criteria and keeps the published snapshot unchanged', async () => {
      const f = await fixture()
      const workspace = await f.content.createBlock(f.lessonId, 'studio', {
        kind: 'studio',
        purpose: 'experiment',
        initialProject: {
          name: 'Jogo',
          files: {},
          installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
        },
        allowBlocks: ['sz_g2d_setup_stage'],
      })
      const section = {
        ...defaultLessonSection(randomUUID(), 'Praticar', [workspace.id]),
        workspaceBlockId: workspace.id,
        completion: {
          version: 1 as const,
          blockIds: [],
          projectChecks: [
            {
              id: 'stage',
              label: 'Preparar tela',
              rule: {
                type: 'usesBlock' as const,
                blockType: 'sz_g2d_setup_stage',
                area: 'appearance' as const,
              },
            },
          ],
        },
      }
      let draft = await f.repo.read(f.lessonId)
      draft = await f.change(draft, { type: 'structure', supportBlockIds: [], sections: [section] })
      const before = await f.reader.findLessonWithContent(f.lessonId)
      const failure = await f.publish(draft).then(
        () => null,
        (error: unknown) => error,
      )
      expect(failure).toBeInstanceOf(Error)
      expect(String(failure)).toContain('encaixado')
      expect(await f.reader.findLessonWithContent(f.lessonId)).toEqual(before)
      draft = await f.change(draft, {
        type: 'structure',
        supportBlockIds: [],
        sections: [
          {
            ...section,
            completion: {
              ...section.completion,
              projectChecks: [
                {
                  ...section.completion.projectChecks[0]!,
                  rule: {
                    type: 'usesBlock',
                    blockType: 'sz_g2d_setup_stage',
                    area: 'start',
                    inputs: { W: 480 },
                  },
                },
              ],
            },
          },
        ],
      })
      await f.publish(draft)
    })
    test('criteria migration preserves draft edits, adds previous implicit gates and rebases only the matching published snapshot', async () => {
      const f = await fixture()
      const first = await f.content.createBlock(f.lessonId, 'interactive', interactive)
      const second = await f.content.createBlock(f.lessonId, 'interactive', interactive)
      const section = {
        ...defaultLessonSection(randomUUID(), 'Etapa', [first.id, second.id]),
        completion: { version: 1 as const, blockIds: [first.id] },
      }
      await f.db
        .insert(lessonStructures)
        .values({ lessonId: f.lessonId, revision: randomUUID(), sections: [section] })
        .onConflictDoUpdate({ target: lessonStructures.lessonId, set: { sections: [section] } })
      let draft = await f.repo.read(f.lessonId)
      draft = await f.change(draft, {
        type: 'metadata',
        title: 'Minha edição pendente',
        slug: 'aula',
        estimatedMinutes: 3,
      })
      const statements = readFileSync(
        resolve(
          import.meta.dir,
          '../../src/infrastructure/persistence/drizzle/migrations/0085_explicit_section_criteria.sql',
        ),
        'utf8',
      ).split('--> statement-breakpoint')
      await f.db.transaction(async (tx) => {
        for (const statement of statements)
          if (statement.trim()) await tx.execute(sql.raw(statement))
      })
      const migrated = await f.repo.read(f.lessonId)
      expect(migrated.document.title).toBe('Minha edição pendente')
      expect(migrated.document.sections[0]?.completion?.blockIds).toEqual([first.id, second.id])
      expect(migrated.revision).not.toBe(draft.revision)
      await f.db
        .update(lessons)
        .set({ title: 'Publicação concorrente' })
        .where(eq(lessons.id, f.lessonId))
      const rejection = await f.publish(migrated).then(
        () => null,
        (error: unknown) => error,
      )
      expect(rejection).toBeInstanceOf(Error)
      await f.db.update(lessons).set({ title: 'Publicada' }).where(eq(lessons.id, f.lessonId))
      await f.publish(migrated)
      expect((await f.reader.findLessonWithContent(f.lessonId))?.title).toBe(
        'Minha edição pendente',
      )
    })
    test('incomplete edits remain private; failed publication leaves the entire published snapshot intact', async () => {
      const f = await fixture()
      const before = await f.reader.findLessonWithContent(f.lessonId)
      let draft = await f.repo.read(f.lessonId)
      draft = await f.change(draft, {
        type: 'metadata',
        title: 'Editando',
        slug: 'aula',
        estimatedMinutes: 3,
      })
      draft = await f.change(draft, {
        type: 'block',
        sectionId: f.lessonId,
        block: { id: randomUUID(), content: { kind: 'video', provider: 'vimeo', src: '' } },
      })
      expect((await f.repo.read(f.lessonId)).document.title).toBe('Editando')
      await expect(f.publish(draft)).rejects.toThrow()
      expect(await f.reader.findLessonWithContent(f.lessonId)).toEqual(before)
      expect((await f.repo.read(f.lessonId)).revision).toBe(draft.revision)
    })
    test('publication requires valid criteria in every section and keeps invalid edits private', async () => {
      const f = await fixture()
      const block = await f.content.createBlock(f.lessonId, 'interactive', interactive)
      const before = await f.reader.findLessonWithContent(f.lessonId)
      let draft = await f.repo.read(f.lessonId)
      const section = {
        ...defaultLessonSection(randomUUID(), 'Confira', [block.id]),
        completion: { version: 1 as const, blockIds: [] as string[] },
      }
      draft = await f.change(draft, { type: 'structure', sections: [section], supportBlockIds: [] })
      expect(
        (await f.repo.validate(f.lessonId, draft.revision, [])).some((issue) =>
          issue.message.includes('checagem'),
        ),
      ).toBe(true)
      await expect(f.publish(draft)).rejects.toThrow()
      expect(await f.reader.findLessonWithContent(f.lessonId)).toEqual(before)
      draft = await f.change(draft, {
        type: 'structure',
        sections: [{ ...section, completion: { version: 1, blockIds: [block.id] } }],
        supportBlockIds: [],
      })
      expect(await f.repo.validate(f.lessonId, draft.revision, [])).toEqual([])
      await f.publish(draft)
      expect(
        (await new DrizzleLearningRepository(f.db).getStructure(f.lessonId))?.sections[0]
          ?.completion?.blockIds,
      ).toEqual([block.id])
    })

    test('concurrent authors cannot overwrite one another; exact network retries are idempotent', async () => {
      const f = await fixture(),
        draft = await f.repo.read(f.lessonId)
      const command = {
        expectedRevision: draft.revision,
        operationId: randomUUID(),
        change: { type: 'metadata' as const, title: 'Autor A', slug: 'aula', estimatedMinutes: 5 },
      }
      const writes = await Promise.allSettled([
        f.repo.change(f.lessonId, actor, command),
        f.repo.change(f.lessonId, randomUUID(), {
          ...command,
          operationId: randomUUID(),
          change: { ...command.change, title: 'Autor B' },
        }),
      ])
      expect(writes.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      const current = await f.repo.read(f.lessonId)
      const retry = {
        expectedRevision: current.revision,
        operationId: randomUUID(),
        change: { ...command.change, title: 'Última versão' },
      }
      const saved = await f.repo.change(f.lessonId, actor, retry)
      expect((await f.repo.change(f.lessonId, actor, retry)).revision).toBe(saved.revision)
      const rejected = await Promise.allSettled([
        f.repo.change(f.lessonId, randomUUID(), retry),
        f.repo.change(f.lessonId, actor, {
          ...retry,
          change: { ...retry.change, title: 'Outro conteúdo' },
        }),
      ])
      expect(rejected.map((r) => r.status)).toEqual(['rejected', 'rejected'])
      expect((await f.repo.read(f.lessonId)).revision).toBe(saved.revision)
    })
    test('reorganizing and repeating the same workspace preserves content revisions, passes, submissions and completion', async () => {
      const f = await fixture(),
        owner = { userId: randomUUID(), accountId: randomUUID() }
      const studio = await f.content.createBlock(f.lessonId, 'studio', {
        kind: 'studio',
        initialProject: { name: 'Jogo', files: { 'index.html': '' } },
      })
      const activity = await f.content.createBlock(f.lessonId, 'interactive', interactive)
      if (!activity.contentRevision) throw new Error('Missing revision')
      const learning = new DrizzleLearningRepository(f.db)
      await learning.recordAttempt(owner, f.lessonId, {
        id: randomUUID(),
        blockId: activity.id,
        revision: activity.contentRevision,
        answers: { order: ['a', 'b'] },
        hintsUsed: 0,
        result: evaluateLearning(interactive, { order: ['a', 'b'] }),
        createdAt: f.now.toISOString(),
      })
      await f.db.insert(studioSubmissions).values({
        id: randomUUID(),
        ...owner,
        lessonId: f.lessonId,
        courseId: f.courseId,
        blockId: studio.id,
        project: { name: 'Trabalho da criança' },
        submittedAt: f.now,
      })
      await f.db.insert(lessonCompletions).values({
        id: randomUUID(),
        userId: owner.userId,
        lessonId: f.lessonId,
        courseId: f.courseId,
        completedAt: f.now,
      })
      let draft = await f.repo.read(f.lessonId)
      const first = {
        ...defaultLessonSection(randomUUID(), 'Descobrir', [activity.id, studio.id]),
        workspaceBlockId: studio.id,
      }
      const second = {
        ...defaultLessonSection(randomUUID(), 'Continuar', []),
        workspaceBlockId: studio.id,
      }
      draft = await f.change(draft, {
        type: 'structure',
        sections: [first, second],
        supportBlockIds: [],
      })
      await f.publish(draft)
      const published = await f.reader.findLessonWithContent(f.lessonId)
      expect(published?.blocks).toHaveLength(2)
      expect(published?.blocks.find((b) => b.id === activity.id)?.contentRevision).toBe(
        activity.contentRevision,
      )
      expect((await learning.getProgress(owner, f.lessonId)).blocks[0]?.result?.passed).toBe(true)
      expect(
        await f.db
          .select()
          .from(studioSubmissions)
          .where(eq(studioSubmissions.lessonId, f.lessonId)),
      ).toHaveLength(1)
      expect(
        await f.db
          .select()
          .from(lessonCompletions)
          .where(eq(lessonCompletions.lessonId, f.lessonId)),
      ).toHaveLength(1)
    })
    test('removed blocks are archived and disappear from content while historical work survives', async () => {
      const f = await fixture(),
        block = await f.content.createBlock(f.lessonId, 'studio', {
          kind: 'studio',
          initialProject: { name: 'Jogo', files: {} },
        })
      await f.db.insert(studioSubmissions).values({
        id: randomUUID(),
        userId: actor,
        lessonId: f.lessonId,
        courseId: f.courseId,
        blockId: block.id,
        project: { saved: 'original' },
        submittedAt: f.now,
      })
      const draft = await f.change(await f.repo.read(f.lessonId), {
        type: 'remove-block',
        blockId: block.id,
      })
      await f.publish(draft)
      expect((await f.reader.findLessonWithContent(f.lessonId))?.blocks).toHaveLength(0)
      expect(
        (await f.db.select().from(lessonBlocks).where(eq(lessonBlocks.id, block.id)))[0]
          ?.archivedAt,
      ).toBeInstanceOf(Date)
      expect(
        (
          await f.db.select().from(studioSubmissions).where(eq(studioSubmissions.blockId, block.id))
        )[0]?.project,
      ).toEqual({ saved: 'original' })
    })
    test('a final-set course validation rolls back blocks, metadata, attachments and the draft revision', async () => {
      const f = await fixture()
      await f.content.createBlock(f.lessonId, 'certificate', { kind: 'certificate' })
      const second = await f.content.createLesson(f.moduleId, f.courseId, {
        title: 'Segunda',
        slug: 'segunda',
        estimatedMinutes: null,
        isPublished: true,
      })
      const before = await f.reader.findLessonWithContent(second.id)
      let draft = await f.repo.read(second.id)
      const document = {
        ...draft.document,
        title: 'Não publicar parcialmente',
        blocks: [{ id: randomUUID(), content: { kind: 'certificate' } }],
        attachments: [
          {
            id: randomUUID(),
            label: 'Arquivo',
            url: 'https://example.com/a.pdf',
            fileType: null,
            sizeBytes: null,
          },
        ],
      }
      document.sections = [
        defaultLessonSection(
          second.id,
          'Diploma',
          document.blocks.map((b) => b.id),
        ),
      ]
      draft = await f.repo.replace(second.id, actor, draft.revision, randomUUID(), document)
      await expect(
        f.repo.publish(second.id, actor, draft.revision, randomUUID(), []),
      ).rejects.toThrow('certificado')
      expect(await f.reader.findLessonWithContent(second.id)).toEqual(before)
      expect((await f.repo.read(second.id)).revision).toBe(draft.revision)
    })
    test('publishing cannot steal block or attachment IDs from another lesson', async () => {
      const f = await fixture(),
        other = await fixture()
      const foreign = await other.content.createBlock(other.lessonId, 'rich_text', {
        kind: 'rich_text',
        markdown: 'Outra aula',
      })
      let draft = await f.change(await f.repo.read(f.lessonId), {
        type: 'block',
        sectionId: f.lessonId,
        block: { id: foreign.id, content: { ...foreign.content } },
      })
      await expect(f.publish(draft)).rejects.toThrow('outra aula')
      draft = await f.change(draft, { type: 'remove-block', blockId: foreign.id })
      const id = randomUUID()
      await f.db.insert(lessonAttachments).values({
        id,
        lessonId: other.lessonId,
        label: 'Original',
        url: 'https://example.com/a.pdf',
        sortOrder: 0,
      })
      draft = await f.change(draft, {
        type: 'attachments',
        attachments: [
          {
            id,
            label: 'Inválido',
            url: 'https://example.com/a.pdf',
            fileType: null,
            sizeBytes: null,
          },
        ],
      })
      await expect(f.publish(draft)).rejects.toThrow('outra aula')
    })
    test('planned Vimeo videos require a ready matching ID; publication retry returns the same revision', async () => {
      const f = await fixture(),
        id = randomUUID(),
        videoId = '123456789'
      let draft = await f.change(await f.repo.read(f.lessonId), {
        type: 'block',
        sectionId: f.lessonId,
        block: {
          id,
          content: {
            kind: 'video',
            provider: 'vimeo',
            src: `https://player.vimeo.com/video/${videoId}`,
          },
        },
      })
      draft = await f.change(draft, {
        type: 'planned-videos',
        plannedVideos: [{ blockId: id, instructions: 'Demonstre o pulo', videoId }],
      })
      await expect(f.publish(draft)).rejects.toThrow('Vimeo')
      draft = await f.change(draft, {
        type: 'block',
        block: {
          id,
          content: {
            kind: 'video',
            provider: 'vimeo',
            src: `https://player.vimeo.com/video/${videoId}0`,
          },
        },
      })
      await expect(f.publish(draft, [videoId])).rejects.toThrow('Vimeo')
      draft = await f.change(draft, {
        type: 'block',
        block: {
          id,
          content: {
            kind: 'video',
            provider: 'vimeo',
            src: `https://player.vimeo.com/video/${videoId}?h=private`,
          },
        },
      })
      const operationId = randomUUID()
      const published = await f.repo.publish(f.lessonId, actor, draft.revision, operationId, [
        videoId,
      ])
      expect(
        (await f.repo.publish(f.lessonId, actor, draft.revision, operationId, [])).revision,
      ).toBe(published.revision)
    })
    test('Pinta chain type remains consistent across final published content', async () => {
      const f = await fixture()
      await f.content.createBlock(f.lessonId, 'pinta', {
        kind: 'pinta',
        chain: 'heroi',
        initialAsset: pintaAssetToWire(createLessonAsset('pixel-sprite', 32, 'Herói')),
      })
      const second = await f.content.createLesson(f.moduleId, f.courseId, {
        title: 'Continuação',
        slug: 'continuacao',
        isPublished: true,
        estimatedMinutes: null,
      })
      const draft = await f.repo.read(second.id)
      const saved = await f.repo.change(second.id, actor, {
        expectedRevision: draft.revision,
        operationId: randomUUID(),
        change: {
          type: 'block',
          sectionId: second.id,
          block: {
            id: randomUUID(),
            content: {
              kind: 'pinta',
              chain: 'heroi',
              initialAsset: pintaAssetToWire(createLessonAsset('vector-background', 32, 'Cenário')),
            },
          },
        },
      })
      await expect(
        f.repo.publish(second.id, actor, saved.revision, randomUUID(), []),
      ).rejects.toThrow()
      expect((await f.reader.findLessonWithContent(second.id))?.blocks).toHaveLength(0)
    })
    test('every sequential manifest imports into drafts; retry and reimport retain linked videos and required work', async () => {
      const root = resolve(import.meta.dir, '../../../../docs/aulas-interativas')
      const paths = [...new Bun.Glob('**/manifesto.json').scanSync(root)]
      // ⚠️ Piso, não número exato. O `27` cravado aqui quebrava o CI toda vez que uma
      // aula NOVA entrava no catálogo (virou 40) — e o que este teste guarda é que TODO
      // manifesto do repositório importa, não quantos existem hoje. O piso continua
      // sendo o anti-vácuo: um glob que parasse de achar os arquivos reprovaria.
      expect(paths.length).toBeGreaterThanOrEqual(27)
      const VERSOES_SUPORTADAS = [3, 4]
      const versoesVistas = new Set<number>()
      let plannedCount = 0
      // ⚠️ O esperado sai dos PRÓPRIOS manifestos, não de um número cravado. O 144 de
      // antes quebrava o CI toda vez que a autora acrescentava um vídeo a uma aula — e
      // foi o que aconteceu (virou 145). Derivar não enfraquece o teste: o que ele
      // guarda é que TODO vídeo planejado atravessa a importação e chega ao rascunho, e
      // isso continua sendo uma comparação entre dois lados independentes.
      let plannedEsperado = 0
      for (const path of paths) {
        const manifest: unknown = await Bun.file(resolve(root, path)).json()
        if (!isLearningManifest(manifest)) throw new Error(`Invalid ${path}`)
        plannedEsperado += manifest.blocks.filter(
          (block) => typeof (block as { plannedVideo?: unknown }).plannedVideo === 'string',
        ).length
        // ⚠️ A versão é CONFERIDA, não cravada por pasta. O mapa antigo ("corre-dino é 4,
        // o resto é 3") reprovou assim que um curso novo (`corre-dino-v6`) nasceu em 4 e
        // o prefixo não o alcançou. O que precisa valer é que todo manifesto declare uma
        // versão que o importador conhece — e que as duas apareçam no conjunto (abaixo).
        expect(VERSOES_SUPORTADAS).toContain(manifest.version)
        versoesVistas.add(manifest.version)
        const f = await fixture()
        await f.db
          .update(courses)
          .set({ slug: `${manifest.courseSlug}-${f.courseId}` })
          .where(eq(courses.id, f.courseId))
        const linkedManifest = {
          ...manifest,
          courseSlug: `${manifest.courseSlug}-${f.courseId}`,
          lessonSlug: 'aula',
        }
        const studio = await f.content.createBlock(f.lessonId, 'studio', {
          kind: 'studio',
          initialProject: { name: 'Jogo existente', files: {} },
        })
        const video = await f.content.createBlock(f.lessonId, 'video', {
          kind: 'video',
          provider: 'vimeo',
          src: 'https://player.vimeo.com/video/987654321',
        })
        const before = await f.reader.findLessonWithContent(f.lessonId)
        const service = new LearningImportService(f.repo, f.reader)
        const plan = await service.preview(f.lessonId, linkedManifest),
          operationId = randomUUID()
        const result = await service.apply(
          f.lessonId,
          linkedManifest,
          plan.fingerprint,
          actor,
          operationId,
        )
        const retry = await service.apply(
          f.lessonId,
          linkedManifest,
          plan.fingerprint,
          actor,
          operationId,
        )
        expect(retry.revision).toBe(result.revision)
        let draft = await f.repo.read(f.lessonId)
        plannedCount += draft.document.plannedVideos.length
        expect(draft.document.blocks.some((b) => b.id === studio.id)).toBe(true)
        expect(draft.document.supportBlockIds).toContain(video.id)
        const planned = draft.document.plannedVideos[0]
        if (planned) {
          draft = await f.change(draft, {
            type: 'block',
            block: {
              id: planned.blockId,
              content: {
                kind: 'video',
                provider: 'vimeo',
                src: 'https://player.vimeo.com/video/123456789',
              },
            },
          })
          draft = await f.change(draft, {
            type: 'planned-videos',
            plannedVideos: draft.document.plannedVideos.map((v) =>
              v.blockId === planned.blockId ? { ...v, videoId: '123456789' } : v,
            ),
          })
          const next = await service.preview(f.lessonId, linkedManifest)
          await service.apply(f.lessonId, linkedManifest, next.fingerprint, actor, randomUUID())
          expect(
            (await f.repo.read(f.lessonId)).document.plannedVideos.find(
              (v) => v.blockId === planned.blockId,
            )?.videoId,
          ).toBe('123456789')
        }
        expect(await f.reader.findLessonWithContent(f.lessonId)).toEqual(before)
      }
      // Sem isto o teste deixaria de cobrir uma das versões em silêncio, no dia em que o
      // catálogo inteiro migrasse para a mais nova.
      expect([...versoesVistas].sort()).toEqual(VERSOES_SUPORTADAS)
      expect(plannedCount).toBe(plannedEsperado)
      // Anti-vácuo: a régua acima compararia 0 com 0 se a leitura dos manifestos
      // parasse de enxergar os vídeos planejados.
      expect(plannedEsperado).toBeGreaterThan(100)
    }, 30000)
  })
}
