import type { LessonSection } from './index'
import { defaultLessonSection } from './index'

/** Also recognizes the automatic section inserted by migration 0080. No progress is invented. */
export function isLegacyLessonLayout(
  lessonId: string,
  sections: readonly LessonSection[] | undefined,
): boolean {
  if (!sections?.length) return true
  const section = sections[0]
  return (
    sections.length === 1 &&
    section?.id === lessonId &&
    section.intent === 'application' &&
    section.objective === '' &&
    section.completion === undefined &&
    section.workspaceBlockId === null &&
    section.externalTool === null
  )
}

/** Keep all material, with the original order within each group: watch, consult, create, quiz. */
export function legacyLessonBlockOrder<T extends { kind: string }>(blocks: readonly T[]): T[] {
  const rank = (kind: string) =>
    kind === 'video' ? 0 : kind === 'studio' || kind === 'pinta' ? 2 : kind === 'quiz' ? 3 : 1
  return [...blocks].sort((a, b) => rank(a.kind) - rank(b.kind))
}

/** A playback projection only: authors keep the original draft until they migrate it. */
export function legacyLessonSections(
  lessonId: string,
  title: string,
  blocks: readonly { id: string; kind: string }[],
): LessonSection[] {
  if (!blocks.length || blocks.some((b) => b.kind === 'certificate' || b.kind === 'coming_soon'))
    return [
      defaultLessonSection(
        lessonId,
        title,
        blocks.map((b) => b.id),
      ),
    ]
  const ordered = legacyLessonBlockOrder(blocks)
  const activity = ordered.filter((b) => b.kind !== 'quiz')
  const quizzes = ordered.filter((b) => b.kind === 'quiz')
  const workspace = activity.find((b) => b.kind === 'studio' || b.kind === 'pinta')
  const first = {
    ...defaultLessonSection(
      lessonId,
      workspace
        ? 'Assista e crie'
        : isLegacyMaterialLesson(blocks)
          ? 'Explore o material'
          : activity.some((b) => b.kind === 'video')
            ? 'Assista à aula'
            : title,
      activity.map((b) => b.id),
    ),
    intent: workspace ? ('delivery' as const) : ('explanation' as const),
    workspaceBlockId: workspace?.id ?? null,
    completion: { version: 1 as const, blockIds: activity.map((b) => b.id) },
  }
  return [
    ...(activity.length ? [first] : []),
    ...(quizzes[0]
      ? [
          {
            ...defaultLessonSection(
              quizzes[0].id,
              'Feche a aula',
              quizzes.map((b) => b.id),
            ),
            intent: 'closing' as const,
            completion: { version: 1 as const, blockIds: quizzes.map((b) => b.id) },
          },
        ]
      : []),
  ]
}

/** This compatibility rule does not apply to authored sections or mixed activity lessons. */
export function isLegacyMaterialLesson(blocks: readonly { kind: string }[]): boolean {
  return (
    blocks.some((b) => b.kind === 'ebook') &&
    blocks.every((b) => ['rich_text', 'dialogue', 'image', 'ebook'].includes(b.kind))
  )
}

export function playbackLessonStructure(
  lesson: { id: string; title: string; blocks: readonly { id: string; kind: string }[] },
  stored: { revision: string | null; sections: LessonSection[]; supportBlockIds?: string[] } | null,
) {
  const legacyLayout = isLegacyLessonLayout(lesson.id, stored?.sections)
  const supportBlockIds = stored?.supportBlockIds ?? []
  return {
    revision: stored?.revision ?? lesson.id,
    supportBlockIds,
    legacyLayout,
    sections: legacyLayout
      ? legacyLessonSections(
          lesson.id,
          lesson.title,
          lesson.blocks.filter((b) => !supportBlockIds.includes(b.id)),
        )
      : (stored?.sections ?? []),
  }
}

export function isVideoOnlySection(
  section: Pick<LessonSection, 'blockIds' | 'workspaceBlockId' | 'externalTool'>,
  blocks: readonly { id: string; kind: string }[],
): boolean {
  return (
    !section.workspaceBlockId &&
    !section.externalTool &&
    section.blockIds.length === 1 &&
    blocks.some((b) => b.id === section.blockIds[0] && b.kind === 'video')
  )
}
