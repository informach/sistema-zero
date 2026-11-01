import { createHash } from 'node:crypto'
import { type LessonDraftDocument, remapStudioExampleContent } from '@sistemazero/core/learning'
import { remapBlockAttachmentIds } from '../../src/domain/course/lesson-block'
import { stableJson } from '../../src/domain/shared/stable-json'
import type { courses, lessons, modules } from '../../src/infrastructure/persistence/drizzle/schema'

export type Environment = 'staging' | 'production' | 'local'
export type CourseRow = typeof courses.$inferSelect
export type ModuleRow = typeof modules.$inferSelect
export type LessonRow = typeof lessons.$inferSelect
export interface LessonSnapshot {
  row: LessonRow
  published: LessonDraftDocument
  draft: { revision: string; document: LessonDraftDocument } | null
  publishedRevision: string
}
export interface CourseSnapshot {
  missing?: true
  course: CourseRow
  modules: ModuleRow[]
  lessons: LessonSnapshot[]
  archivedModules?: ModuleRow[]
  archivedLessons?: LessonRow[]
}
export interface Snapshot {
  environment: Environment
  source: CourseSnapshot
  target: CourseSnapshot
}
export interface MediaProof {
  environment: Environment
  sourceHash: string
  checkedAt: string
  readyVideoIds: string[]
  voices: Record<string, Record<string, string>>
  generated: number
  reused: number
}
interface IdentityMap {
  version: 1
  sourceCourseId: string
  modules: Record<string, string>
  lessons: Record<string, string>
  blocks: Record<string, string>
  sections: Record<string, string>
  attachments: Record<string, string>
}
export const hash = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex')
export const same = (left: unknown, right: unknown) => stableJson(left) === stableJson(right)
export const sourceHash = (snapshot: Snapshot) =>
  hash({ environment: snapshot.environment, source: snapshot.source })
const newId = (target: string, kind: string, source: string) => {
  const h = hash(['course-audience-sync-v1', target, kind, source])
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/** A deterministic empty destination makes preparation read-only, even before it exists. */
export function missingAdultTarget(
  source: CourseRow,
  slug: string,
  environment: Environment,
): CourseSnapshot {
  return {
    missing: true,
    course: {
      ...source,
      id: newId(source.id, 'adult-course', `${environment}:${slug}`),
      slug,
      audience: 'adult',
      status: 'draft',
      version: 0,
      careerSlot: null,
      journeyRole: 'reward',
      metadata: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    modules: [],
    lessons: [],
  }
}
const withoutPlans = (document: LessonDraftDocument) => ({ ...document, plannedVideos: [] })

/** Opening the Studio can refresh this timestamp without changing its published program. */
function authoringComparable(document: LessonDraftDocument) {
  const copy = structuredClone(withoutPlans(document))
  for (const block of copy.blocks) {
    if (block.content.kind !== 'studio') continue
    const project = block.content.initialProject
    if (project && typeof project === 'object' && !Array.isArray(project))
      delete (project as Record<string, unknown>).updatedAt
  }
  return copy
}

/** Explicit commercial translation. Other paths and query strings are never rewritten. */
export function adultSalesUrl(source: unknown, current: unknown): string | undefined {
  if (!source) return typeof current === 'string' ? current : undefined
  if (typeof source !== 'string') throw new Error('URL comercial Kids inválida')
  const url = new URL(source)
  if (url.protocol !== 'https:' || !url.pathname.startsWith('/kids/'))
    throw new Error('A URL comercial Kids precisa começar por /kids/')
  url.pathname = `/pro/${url.pathname.slice('/kids/'.length)}`
  return url.href
}

function identities(snapshot: Snapshot): IdentityMap {
  const raw = snapshot.target.course.metadata?.contentMirror
  if (raw !== undefined) {
    const value = raw as IdentityMap
    if (value.version !== 1 || value.sourceCourseId !== snapshot.source.course.id)
      throw new Error('O destino já tem outra origem de sincronização')
    for (const key of ['modules', 'lessons', 'blocks', 'sections', 'attachments'] as const)
      if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key]))
        throw new Error('Mapa de identidades inválido')
      else if (
        Object.values(value[key]).some(
          (id) => typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id),
        )
      )
        throw new Error('Identidade de destino inválida')
    return structuredClone(value)
  }
  return {
    version: 1,
    sourceCourseId: snapshot.source.course.id,
    modules: {},
    lessons: {},
    blocks: {},
    sections: {},
    attachments: {},
  }
}

/** Reuse an established destination ID; bootstrap an existing independent clone by position. */
function identify(
  map: Record<string, string>,
  source: string,
  fallback: string | undefined,
  target: string,
  kind: string,
) {
  map[source] ??= fallback ?? newId(target, kind, source)
  return map[source]
}

export function planCourseSync(snapshot: Snapshot, media?: MediaProof) {
  const { source, target, environment } = snapshot
  if (
    source.course.id === target.course.id ||
    source.course.audience !== 'kids' ||
    target.course.audience !== 'adult'
  )
    throw new Error('A sincronização exige cursos distintos Kids e adulto')
  if (
    source.course.status !== 'published' ||
    source.course.modality !== 'recorded' ||
    target.course.modality !== 'recorded'
  )
    throw new Error('A origem precisa ser um curso gravado publicado e o destino gravado')
  if (
    !source.lessons.length ||
    source.lessons.some((l) => !l.row.isPublished || !l.published.blocks.length)
  )
    throw new Error('Publique e complete todas as aulas Kids antes de sincronizar')
  for (const lesson of source.lessons) {
    if (
      lesson.draft &&
      !same(authoringComparable(lesson.draft.document), authoringComparable(lesson.published))
    )
      throw new Error(`Há edição Kids ainda não publicada: ${lesson.row.slug}`)
  }
  if (media && (media.environment !== environment || media.sourceHash !== sourceHash(snapshot)))
    throw new Error('A mídia pertence a outra origem ou ambiente')
  const maps = identities(snapshot)
  const targetId = target.course.id
  const modulePlans = source.modules.map((module) => ({
    ...module,
    id: identify(
      maps.modules,
      module.id,
      [...target.modules, ...(target.archivedModules ?? [])].find(
        (m) => m.id === maps.modules[module.id],
      )?.id ?? target.modules.find((m) => m.sortOrder === module.sortOrder)?.id,
      targetId,
      'module',
    ),
    courseId: targetId,
    archivedAt: null,
  }))
  const lessonPlans = source.lessons.map((lesson) => {
    const existing =
      target.lessons.find((l) => l.row.id === maps.lessons[lesson.row.id]) ??
      target.lessons.find((l) => l.row.slug === lesson.row.slug)
    const retired =
      target.archivedLessons?.find((l) => l.id === maps.lessons[lesson.row.id]) ??
      target.archivedLessons?.find((l) => l.slug === lesson.row.slug)
    const id = identify(
      maps.lessons,
      lesson.row.id,
      existing?.row.id ?? retired?.id,
      targetId,
      'lesson',
    )
    // Student content always comes from the published version, even for volatile editor data.
    const document = structuredClone(lesson.published)
    document.plannedVideos = structuredClone(lesson.draft?.document.plannedVideos ?? [])
    const targetDocument = existing?.published
    document.blocks.forEach((b, index) => {
      const old = targetDocument?.blocks[index]
      identify(
        maps.blocks,
        b.id,
        old?.content.kind === b.content.kind ? old.id : undefined,
        id,
        'block',
      )
    })
    document.sections.forEach((s, index) => {
      identify(maps.sections, s.id, targetDocument?.sections[index]?.id, id, 'section')
    })
    document.attachments.forEach((a, index) => {
      identify(maps.attachments, a.id, targetDocument?.attachments[index]?.id, id, 'attachment')
    })
    const ref = (map: Record<string, string>, key: string) => {
      if (!map[key]) throw new Error(`Referência sem destino: ${key}`)
      return map[key]
    }
    document.blocks = document.blocks.map((b) => {
      let content = remapBlockAttachmentIds(
        remapStudioExampleContent(b.content, (key) => ref(maps.sections, key)),
        (key) => ref(maps.attachments, key),
      )
      const voices = media?.voices[b.id]
      if (voices) {
        content =
          content.kind === 'interactive'
            ? { ...content, activity: { ...(content.activity as object), vozes: voices } }
            : { ...content, vozes: voices }
      }
      return { id: ref(maps.blocks, b.id), content }
    })
    document.sections = document.sections.map((s) => ({
      ...s,
      id: ref(maps.sections, s.id),
      blockIds: s.blockIds.map((key) => ref(maps.blocks, key)),
      workspaceBlockId: s.workspaceBlockId ? ref(maps.blocks, s.workspaceBlockId) : null,
      ...(s.completion
        ? {
            completion: {
              ...s.completion,
              blockIds: s.completion.blockIds.map((key) => ref(maps.blocks, key)),
              ...(s.completion.materialItems
                ? {
                    materialItems: s.completion.materialItems.map((item) => ({
                      ...item,
                      blockId: ref(maps.blocks, item.blockId),
                    })),
                  }
                : {}),
            },
          }
        : {}),
    }))
    document.attachments = document.attachments.map((a) => ({
      ...a,
      id: ref(maps.attachments, a.id),
    }))
    document.plannedVideos = document.plannedVideos.map((v) => ({
      ...v,
      blockId: ref(maps.blocks, v.blockId),
    }))
    const row = {
      ...lesson.row,
      id,
      moduleId: ref(maps.modules, lesson.row.moduleId),
      courseId: targetId,
      isPublished: true,
      archivedAt: null,
    }
    const changed =
      !existing?.row.isPublished ||
      existing.row.moduleId !== row.moduleId ||
      existing.row.sortOrder !== row.sortOrder ||
      !same(document, existing.draft?.document ?? { ...existing.published, plannedVideos: [] }) ||
      !same(withoutPlans(document), withoutPlans(existing.published))
    return { row, document, changed }
  })
  for (const [kind, desired] of [
    ['módulo', modulePlans],
    ['aula', lessonPlans.map((l) => l.row)],
  ] as const) {
    if (new Set(desired.map((row) => row.id)).size !== desired.length)
      throw new Error(`Mapeamento ambíguo de ${kind}`)
  }
  const retirements = {
    modules: target.modules.filter((m) => !modulePlans.some((d) => d.id === m.id)).map((m) => m.id),
    lessons: target.lessons
      .filter((l) => !lessonPlans.some((d) => d.row.id === l.row.id))
      .map((l) => l.row.id),
  }
  const metadata = structuredClone(source.course.metadata ?? {})
  delete metadata.contentMirror
  delete metadata.clonedFrom
  const url = adultSalesUrl(metadata.salesPageUrl, target.course.metadata?.salesPageUrl)
  if (url) metadata.salesPageUrl = url
  else delete metadata.salesPageUrl
  if (metadata.creatorSeed) {
    const seed = metadata.creatorSeed as { requiredLessonIds?: string[] }
    if (seed.requiredLessonIds)
      seed.requiredLessonIds = seed.requiredLessonIds.map((id) => {
        if (!maps.lessons[id]) throw new Error('Aula planejada sem destino')
        return maps.lessons[id]
      })
  }
  metadata.contentMirror = maps
  const course: CourseRow = {
    ...source.course,
    id: targetId,
    slug: target.course.slug,
    audience: 'adult',
    careerSlot: target.course.careerSlot,
    journeyRole:
      source.course.careerSlot === null ? source.course.journeyRole : target.course.journeyRole,
    version: target.course.version,
    createdAt: target.course.createdAt,
    metadata,
  }
  const courseComparable = ({ version: _v, updatedAt: _u, createdAt: _c, ...rest }: CourseRow) =>
    rest
  const moduleComparable = ({ createdAt: _c, updatedAt: _u, ...rest }: ModuleRow) => rest
  const changed =
    retirements.modules.length > 0 ||
    retirements.lessons.length > 0 ||
    !same(courseComparable(course), courseComparable(target.course)) ||
    modulePlans.some(
      (m) =>
        !same(
          moduleComparable(m),
          moduleComparable(target.modules.find((t) => t.id === m.id) ?? m),
        ) || !target.modules.some((t) => t.id === m.id),
    ) ||
    lessonPlans.some((l) => l.changed)
  const body = {
    environment,
    snapshotHash: hash(snapshot),
    sourceHash: sourceHash(snapshot),
    course,
    modules: modulePlans,
    lessons: lessonPlans,
    retirements,
    mediaHash: media ? hash(media) : null,
    changed,
  }
  return { ...body, planHash: hash(body) }
}
export type CourseSyncPlan = ReturnType<typeof planCourseSync>
