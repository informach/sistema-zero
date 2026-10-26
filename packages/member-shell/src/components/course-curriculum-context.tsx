import type { CreatorCoursePlacement } from '@sistemazero/core/journey'
import Link from 'next/link'
import {
  CREATOR_POST_LABELS,
  type CreatorJourneySkin,
  creatorCourseAccessNote,
  creatorPostHref,
  curriculumRoleLabel,
} from '../lib/creator-journey-presentation'

export function CourseCurriculumContext({
  placement,
  accessReason,
  skin,
  compact = false,
}: {
  placement?: CreatorCoursePlacement
  accessReason?: string
  skin: CreatorJourneySkin
  compact?: boolean
}) {
  const note = creatorCourseAccessNote(accessReason)
  if (!placement && !note) return null
  const href = placement?.level
    ? creatorPostHref(placement.level, skin)
    : placement?.masteryId
      ? `/maestrias/${placement.masteryId}`
      : null
  return (
    <div className="space-y-2 text-sm">
      {placement ? (
        <p className="font-bold text-primary">
          {curriculumRoleLabel(placement.role)}
          {placement.level
            ? ` · ${CREATOR_POST_LABELS[placement.level]}`
            : placement.masteryLevel
              ? ` · nível ${placement.masteryLevel}`
              : ''}
        </p>
      ) : null}
      {note ? <p className="text-muted-foreground">{note}</p> : null}
      {!compact && href ? (
        <Link
          href={href}
          prefetch={false}
          className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
        >
          {placement?.masteryId ? 'Ver esta maestria' : 'Ver requisitos e próximos passos do posto'}
        </Link>
      ) : null}
    </div>
  )
}
