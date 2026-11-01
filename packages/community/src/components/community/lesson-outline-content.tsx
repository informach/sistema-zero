'use client'
import { LessonOutlineContent as SharedOutline } from '@sistemazero/member-shell/components/lesson-ui/outline'
import type { CourseDetailView } from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'
import type { RatingViewer } from './course-rating-flow'
export function LessonOutlineContent(props: {
  course: Pick<CourseDetailView, 'title' | 'slug' | 'progress' | 'myRating' | 'modules'>
  courseHref: string
  currentLessonId: string
  shareUrl: string | null
  viewer: RatingViewer
}) {
  return (
    <SharedOutline
      {...props}
      viewer={{
        name: getUserDisplayName(props.viewer.firstName, props.viewer.lastName, props.viewer.email),
        age: null,
        avatarUrl: props.viewer.avatarUrl,
      }}
    />
  )
}
