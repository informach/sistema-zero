import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import {
  type CreatorJourneySeedPlan,
  creatorSeedOutlineHash,
} from '../../../application/creator-journey/creator-journey-seed'
import type { Database } from './db'
import { courses, lessons, modules } from './schema'

/**
 * Editorial bootstrap only. Existing rows, content and learner facts are never updated.
 * Each new draft and its unpublished outline commit together; policy activation is separate.
 */
export class DrizzleCreatorJourneySeedRepository {
  constructor(private readonly db: Database) {}

  async apply(plan: CreatorJourneySeedPlan): Promise<{ created: number; preserved: number }> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('members-creator-curriculum-seed', 0))`,
      )
      const current = await tx
        .select({
          id: courses.id,
          slug: courses.slug,
          version: courses.version,
          audience: courses.audience,
          modality: courses.modality,
        })
        .from(courses)
        .where(
          inArray(
            courses.slug,
            plan.courses.map((course) => course.slug),
          ),
        )
      const bySlug = new Map(current.map((course) => [course.slug, course]))
      for (const course of plan.courses) {
        const found = bySlug.get(course.slug)
        if (
          course.action === 'create'
            ? found !== undefined
            : !found ||
              found.id !== course.id ||
              found.version !== course.version ||
              found.audience !== course.audience ||
              found.modality !== 'recorded'
        )
          throw new Error(`O catálogo mudou em ${course.slug}. Gere e confira o plano novamente.`)
      }
      let created = 0
      const now = new Date()
      for (const course of plan.courses) {
        if (course.action === 'reuse') continue
        const requiredLessonIds = course.outline.map(() => randomUUID())
        const [collision] = await tx
          .select({ id: courses.id })
          .from(courses)
          .where(eq(courses.id, course.id))
        if (collision)
          throw new Error(`Identidade reservada já existe com outro slug: ${course.id}`)
        await tx.insert(courses).values({
          id: course.id,
          version: 0,
          slug: course.slug,
          title: course.title,
          subtitle: 'Em preparação · Jornada do Criador',
          description: course.description,
          status: 'draft',
          audience: course.audience,
          level: course.level,
          track: course.track,
          careerSlot: null,
          // Historical tag must remain valid for Adult and Lenda course editing;
          // the new role is owned exclusively by curriculum, never by this tag.
          journeyRole: 'reward',
          sequentialLock: true,
          videoBeforeActivity: false,
          modality: 'recorded',
          metadata: {
            creatorSeed: {
              key: course.key,
              version: plan.version,
              outlineHash: creatorSeedOutlineHash(course.outline),
              requiredLessonIds,
            },
          },
          createdAt: now,
          updatedAt: now,
        })
        const moduleId = randomUUID()
        await tx.insert(modules).values({
          id: moduleId,
          courseId: course.id,
          title: 'Plano de produção',
          summary:
            'Estrutura editorial. Produzir aulas, atividades e critérios; revisar antes de publicar. Nenhuma aula deste seed está publicada.',
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        if (course.outline.length)
          await tx.insert(lessons).values(
            course.outline.map((title, index) => ({
              id: requiredLessonIds[index]!,
              moduleId,
              courseId: course.id,
              slug: `aula-${index + 1}`,
              title,
              sortOrder: index,
              isPublished: false,
              createdAt: now,
              updatedAt: now,
            })),
          )
        created++
      }
      return { created, preserved: plan.courses.length - created }
    })
  }
}
