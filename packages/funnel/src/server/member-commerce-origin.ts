import type { CommerceOrigin } from '@sistemazero/core/commerce'

export function commerceOriginKey(origin: CommerceOrigin): string {
  if (origin.kind === 'lesson')
    return `lesson:${origin.courseSlug}:${origin.lessonId}:${origin.blockId}`
  if (origin.kind === 'promotion') return `promotion:${origin.offerRef}`
  if (origin.kind === 'offer') return `offer:${origin.offerRef}`
  return 'community'
}
