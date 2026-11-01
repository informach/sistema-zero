import type {
  CoursePublicationOperation,
  CoursePublicationPreview,
  CoursePublicationStatus,
} from '@sistemazero/core/course/publication'
import type { CourseSyncPlan, Snapshot } from './course-sync'

export function coursePublicationPreview(
  snapshot: Snapshot,
  plan: CourseSyncPlan,
): CoursePublicationPreview {
  return {
    source: {
      id: snapshot.source.course.id,
      title: snapshot.source.course.title,
      slug: snapshot.source.course.slug,
      environment: snapshot.environment,
    },
    target: {
      id: plan.course.id,
      title: plan.course.title,
      slug: plan.course.slug,
      environment: snapshot.environment,
      audience: plan.course.audience,
      exists: !snapshot.target.missing,
    },
    modules: plan.modules.length,
    lessons: plan.lessons.length,
    retiredModules: plan.retirements.modules.length,
    retiredLessons: plan.retirements.lessons.length,
  }
}

export type StoredPublicationValue<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: StoredPublicationValue<T[K]> }
    : T
export type StoredPublicationSnapshot = StoredPublicationValue<Snapshot>

export function storePublicationSnapshot(snapshot: Snapshot): StoredPublicationSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StoredPublicationSnapshot
}
/** Only database row timestamps are hydrated. Dates inside projects remain authored strings. */
export function readPublicationSnapshot(stored: StoredPublicationSnapshot): Snapshot {
  const date = (value: string) => {
    const parsed = new Date(value)
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value)
      throw new Error('Data inválida no registro de publicação')
    return parsed
  }
  const rowDates = (row: { createdAt: string; updatedAt: string }) => ({
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  })
  const archivedDates = (row: {
    createdAt: string
    updatedAt: string
    archivedAt: string | null
  }) => ({ ...rowDates(row), archivedAt: row.archivedAt ? date(row.archivedAt) : null })
  const tree = (source: StoredPublicationSnapshot['source']): Snapshot['source'] => {
    const { archivedModules, archivedLessons, ...active } = source
    return {
      ...active,
      course: { ...source.course, ...rowDates(source.course) },
      modules: source.modules.map((row) => ({ ...row, ...archivedDates(row) })),
      lessons: source.lessons.map((lesson) => ({
        ...lesson,
        row: { ...lesson.row, ...archivedDates(lesson.row) },
      })),
      ...(archivedModules
        ? { archivedModules: archivedModules.map((row) => ({ ...row, ...archivedDates(row) })) }
        : {}),
      ...(archivedLessons
        ? { archivedLessons: archivedLessons.map((row) => ({ ...row, ...archivedDates(row) })) }
        : {}),
    }
  }
  return { ...stored, source: tree(stored.source), target: tree(stored.target) }
}

export interface CoursePublicationSeed {
  id: string
  requestKey: string
  actorId: string
  operation: CoursePublicationOperation
  snapshot: Snapshot
  snapshotHash: string
  planHash: string
  preview: CoursePublicationPreview
}
export interface PublicationTaskSeed {
  id: string
  kind: 'media-plan' | 'voice' | 'video' | 'r2-copy' | 'vimeo-copy'
  input: Record<string, unknown>
}
export const publicationTerminal = (status: CoursePublicationStatus) =>
  ['completed', 'failed', 'cancelled'].includes(status)
export class CoursePublicationConflictError extends Error {
  readonly code = 'COURSE_PUBLICATION_CONFLICT'
}
export class CoursePublicationLeaseError extends Error {
  readonly code = 'COURSE_PUBLICATION_LEASE_LOST'
}
