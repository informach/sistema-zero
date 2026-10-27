import type { CreatorCoursePlacement } from '@sistemazero/core/journey'
import Link from 'next/link'
import {
  CREATOR_POST_LABELS,
  type CreatorJourneySkin,
  creatorCourseAccessNote,
  creatorPostHref,
  curriculumRoleLabel,
} from '../lib/creator-journey-presentation'

/**
 * O papel do curso na Jornada do Criador, como um chip de cada plataforma: o amarelo do Kids
 * ou o `sz-chip` do Estúdio à noite, com o posto ao lado e a nota do acesso avulso. `compact`
 * (cartões) esconde o link de volta para a trilha.
 */
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
  const where = placement?.level
    ? `Trilha ${CREATOR_POST_LABELS[placement.level]}`
    : placement?.masteryLevel
      ? `Nível ${placement.masteryLevel}`
      : null
  return (
    <div className={compact ? 'mb-2 space-y-1.5' : 'space-y-2'}>
      {placement ? (
        <p className="flex flex-wrap items-center gap-1.5">
          <span
            className={
              skin === 'kids'
                ? 'inline-flex items-center rounded-full bg-(--band-amarelo) px-2.5 py-0.5 font-extrabold text-(--sz-kids-tinta) text-[0.75rem]'
                : 'sz-chip sz-chip-acao'
            }
          >
            {curriculumRoleLabel(placement.role)}
          </span>
          {where ? <span className="font-bold text-muted-foreground text-xs">{where}</span> : null}
        </p>
      ) : null}
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}
      {!compact && href ? (
        <Link
          href={href}
          prefetch={false}
          className={
            skin === 'kids'
              ? 'inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline'
              : 'sz-link inline-flex min-h-11 items-center'
          }
        >
          {placement?.masteryId ? 'Ver esta Maestria' : 'Ver a trilha deste curso'}
        </Link>
      ) : null}
    </div>
  )
}
